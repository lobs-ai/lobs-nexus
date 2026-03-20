import { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [sessions, setSessions] = useState([]);
  const [archivedSessions, setArchivedSessions] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [currentSession, setCurrentSession] = useState(null);
  const [processingKeys, setProcessingKeys] = useState(new Set());
  const [error, setError] = useState(null);
  const [showTools, setShowTools] = useState(() => {
    try {
      const saved = localStorage.getItem('nexus-show-tools');
      return saved !== null ? JSON.parse(saved) : true;
    } catch { return true; }
  });
  const [toolConfigOpen, setToolConfigOpen] = useState(false);
  const [streamEvents, setStreamEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const eventSourceRef = useRef(null);
  const pollersRef = useRef(new Map());
  const currentSessionRef = useRef(null);

  // Keep ref in sync for polling closure
  useEffect(() => { currentSessionRef.current = currentSession; }, [currentSession]);

  // Persist showTools preference to localStorage
  useEffect(() => {
    try { localStorage.setItem('nexus-show-tools', JSON.stringify(showTools)); } catch {}
  }, [showTools]);

  // Load sessions on mount (only once)
  useEffect(() => {
    if (!loaded) {
      loadSessions();
    }

    // Poll session list every 5s for unread counts + processing status
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/chat/sessions');
        const data = await res.json();
        const sessionList = data.sessions || [];
        setSessions(sessionList);

        // Sync processing status from backend for all sessions
        // Don't clear the SSE-connected session — SSE is more real-time
        const sseKey = currentSessionRef.current?.key;
        setProcessingKeys(prev => {
          const next = new Set(prev);
          for (const s of sessionList) {
            if (s.processing) {
              next.add(s.key);
            } else if (s.key !== sseKey) {
              // Only clear non-SSE sessions via polling
              // SSE 'done' event handles the active session
              next.delete(s.key);
            }
          }
          return next;
        });
      } catch (err) {
        // Silently ignore polling errors
      }
    }, 5000);

    return () => {
      clearInterval(interval);
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      for (const controller of pollersRef.current.values()) {
        controller.abort();
      }
    };
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      const sessionList = data.sessions || [];
      setSessions(sessionList);
      setLoaded(true);

      // Update current session's metadata (title, etc.) if it changed
      setCurrentSession(prev => {
        if (!prev) {
          // Auto-select first session only if none selected
          if (sessionList.length > 0) {
            setTimeout(() => selectSession(sessionList[0]), 0);
          }
          return null;
        }
        const updated = sessionList.find(s => s.key === prev.key);
        if (updated) {
          return { ...prev, ...updated, messages: prev.messages || updated.messages };
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load chat sessions');
    }
  };

  // Connect SSE stream for a session
  const connectStream = useCallback((sessionKey) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    const es = new EventSource(`/api/chat/sessions/${sessionKey}/stream`);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'connected') return;

        if (data.type === 'thinking') {
          setProcessingKeys(prev => {
            const next = new Set(prev);
            next.add(sessionKey);
            return next;
          });
          setStreamEvents(prev => {
            const filtered = prev.filter(e => e.type !== 'thinking');
            return [...filtered, data];
          });
          return;
        }

        if (data.type === 'tool_start') {
          setProcessingKeys(prev => {
            const next = new Set(prev);
            next.add(sessionKey);
            return next;
          });
          setStreamEvents(prev => {
            const filtered = prev.filter(e => e.type !== 'thinking');
            return [...filtered, data];
          });
          return;
        }

        if (data.type === 'tool_result') {
          setStreamEvents(prev => {
            return prev.map(e => {
              if (e.type === 'tool_start' && e.toolUseId === data.toolUseId) {
                return { ...e, type: 'tool_result_done', result: data.result, isError: data.isError };
              }
              return e;
            });
          });
          return;
        }

        if (data.type === 'assistant_reply') {
          // Don't clear processingKeys or streamEvents here — agent may continue
          // with more tool calls after emitting a text reply. Only 'done' and
          // 'error' truly mean processing is finished.
          reloadMessages(sessionKey);
          // Refresh sessions after a delay to pick up auto-generated titles
          setTimeout(() => loadSessions(), 4000);
          return;
        }

        if (data.type === 'done') {
          setStreamEvents([]);
          setProcessingKeys(prev => {
            const next = new Set(prev);
            next.delete(sessionKey);
            return next;
          });
          reloadMessages(sessionKey);
          // Refresh sessions after a delay to pick up auto-generated titles
          setTimeout(() => loadSessions(), 4000);
          return;
        }

        if (data.type === 'error') {
          setStreamEvents([]);
          setProcessingKeys(prev => {
            const next = new Set(prev);
            next.delete(sessionKey);
            return next;
          });
          reloadMessages(sessionKey);
          return;
        }
      } catch (err) {
        console.error('SSE parse error:', err);
      }
    };

    es.onerror = () => {
      console.warn('SSE connection error, will auto-reconnect');
    };

    return es;
  }, []);

  const reloadMessages = async (sessionKey) => {
    try {
      const res = await fetch(`/api/chat/sessions/${sessionKey}/messages`);
      const data = await res.json();

      setCurrentSession(prev => {
        if (!prev || prev.key !== sessionKey) return prev;
        return {
          ...prev,
          messages: (data.messages || []).map(m => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp,
            metadata: m.metadata,
          })),
        };
      });

      // Mark as read since user is viewing this session
      await fetch(`/api/chat/sessions/${sessionKey}/read`, { method: 'POST' });
      setSessions(prev => prev.map(s =>
        s.key === sessionKey ? { ...s, unreadCount: 0 } : s
      ));
    } catch (err) {
      console.error('Failed to reload messages:', err);
    }
  };

  const selectSession = async (session) => {
    setCurrentSession(session);
    setStreamEvents([]);

    // Load messages
    try {
      const res = await fetch(`/api/chat/sessions/${session.key}/messages`);
      const data = await res.json();

      setCurrentSession(prev => ({
        ...prev,
        messages: (data.messages || []).map(m => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
          metadata: m.metadata,
        })),
      }));
    } catch (err) {
      console.error('Failed to load messages:', err);
    }

    // Mark session as read and clear unread badge
    try {
      await fetch(`/api/chat/sessions/${session.key}/read`, { method: 'POST' });
      setSessions(prev => prev.map(s =>
        s.key === session.key ? { ...s, unreadCount: 0 } : s
      ));
    } catch (err) {
      console.error('Failed to mark session as read:', err);
    }

    // Connect SSE stream
    connectStream(session.key);
  };

  const createSession = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: `Chat ${sessions.length + 1}` }),
      });
      const data = await res.json();

      const newSession = {
        id: data.id,
        key: data.key,
        title: data.title || `Chat ${sessions.length + 1}`,
        createdAt: data.createdAt,
        currentModel: data.currentModel,
        overrideModel: data.overrideModel,
        messages: [],
      };

      setSessions(prev => [newSession, ...prev]);
      selectSession(newSession);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create new chat');
    }
  };

  const archiveSession = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;

    if (currentSession?.id === sessionId && eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      await fetch(`/api/chat/sessions/${session.key}`, { method: 'DELETE' });

      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setArchivedSessions(prev => [{ ...session, archivedAt: new Date().toISOString() }, ...prev]);
      setProcessingKeys(prev => {
        const next = new Set(prev);
        next.delete(session.key);
        return next;
      });

      if (currentSession?.id === sessionId) {
        setCurrentSession(null);
        setStreamEvents([]);
      }
    } catch (err) {
      console.error('Failed to archive session:', err);
    }
  };

  const unarchiveSession = async (sessionId) => {
    const session = archivedSessions.find(s => s.id === sessionId);
    if (!session) return;

    try {
      await fetch(`/api/chat/sessions/${session.key}/unarchive`, { method: 'POST' });

      setArchivedSessions(prev => prev.filter(s => s.id !== sessionId));
      const restored = { ...session };
      delete restored.archivedAt;
      setSessions(prev => [restored, ...prev]);
    } catch (err) {
      console.error('Failed to unarchive session:', err);
    }
  };

  const permanentDeleteSession = async (sessionId) => {
    const session = archivedSessions.find(s => s.id === sessionId);
    if (!session) return;

    try {
      await fetch(`/api/chat/sessions/${session.key}?permanent=true`, { method: 'DELETE' });
      setArchivedSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch (err) {
      console.error('Failed to permanently delete session:', err);
    }
  };

  const loadArchivedSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions?archived=true');
      const data = await res.json();
      setArchivedSessions(data.sessions || []);
    } catch (err) {
      console.error('Failed to load archived sessions:', err);
    }
  };

  // Alias for backward compat — "delete" now archives
  const deleteSession = archiveSession;

  const sendMessage = async (content, images) => {
    if (!currentSession) return;

    const alreadyProcessing = processingKeys.has(currentSession.key);

    const userMsg = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      ...(images?.length ? { images } : {}),
    };

    setCurrentSession(prev => ({
      ...prev,
      messages: [...(prev.messages || []), userMsg],
    }));

    if (!alreadyProcessing) {
      setProcessingKeys(prev => {
        const next = new Set(prev);
        next.add(currentSession.key);
        return next;
      });
      setStreamEvents([]);
    }

    try {
      const payload = { content };
      if (images?.length) payload.images = images;
      const res = await fetch(`/api/chat/sessions/${currentSession.key}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Send failed: ${res.status}`);
      }

      if (!alreadyProcessing) {
        startFallbackPoller(currentSession.key);
      }
    } catch (err) {
      console.error('Failed to send message:', err);
      if (!alreadyProcessing) {
        setProcessingKeys(prev => {
          const next = new Set(prev);
          next.delete(currentSession.key);
          return next;
        });
      }
    }
  };

  const startFallbackPoller = (sessionKey) => {
    const existing = pollersRef.current.get(sessionKey);
    if (existing) existing.abort();

    const controller = new AbortController();
    pollersRef.current.set(sessionKey, controller);

    const poll = async () => {
      let attempts = 0;
      const maxAttempts = 1800;

      while (!controller.signal.aborted && attempts < maxAttempts) {
        attempts++;
        await new Promise(r => setTimeout(r, 2000));

        try {
          const res = await fetch(`/api/chat/sessions/${sessionKey}/status`, {
            signal: controller.signal,
          });
          const data = await res.json();

          if (!data.processing) {
            setProcessingKeys(prev => {
              if (!prev.has(sessionKey)) return prev;
              const next = new Set(prev);
              next.delete(sessionKey);
              return next;
            });
            reloadMessages(sessionKey);
            setStreamEvents([]);
            break;
          }
        } catch (err) {
          if (controller.signal.aborted) break;
          console.warn('Fallback poll error:', err);
        }
      }

      pollersRef.current.delete(sessionKey);
    };

    poll();
  };

  const value = {
    sessions,
    archivedSessions,
    showArchived,
    currentSession,
    processingKeys,
    error,
    showTools,
    toolConfigOpen,
    streamEvents,
    setError,
    setShowTools,
    setShowArchived,
    setToolConfigOpen,
    selectSession,
    createSession,
    deleteSession,
    archiveSession,
    unarchiveSession,
    permanentDeleteSession,
    loadArchivedSessions,
    sendMessage,
    loadSessions,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatState() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error('useChatState must be used inside ChatProvider');
  return ctx;
}
