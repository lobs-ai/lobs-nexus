import { useState, useEffect, useRef, useCallback } from 'react';

// ---------------------------------------------------------------------------
// Markdown renderer (simple)
// ---------------------------------------------------------------------------

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/```([\s\S]*?)```/g, '<pre class="chat-code">$1</pre>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(45,212,191,0.08);border-radius:4px;padding:1px 5px;font-family:var(--mono);font-size:0.85em;color:var(--teal)">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" style="color:var(--teal)">$1</a>')
    .replace(/\n/g, '<br>');
}

// ---------------------------------------------------------------------------
// Chat Sessions Sidebar
// ---------------------------------------------------------------------------

function SessionsSidebar({ sessions, currentSession, onSelectSession, onNewSession, onDeleteSession, processingSet }) {
  return (
    <div style={{
      width: 280,
      background: 'var(--card)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--teal), var(--purple))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 700, color: 'white',
          }}>L</div>
          <div>
            <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.95rem' }}>Lobs Chat</div>
          </div>
        </div>
        <button
          onClick={onNewSession}
          style={{
            width: 32, height: 32,
            background: 'var(--teal)',
            border: 'none',
            borderRadius: '50%',
            color: 'white',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
          }}
          title="New chat"
        >+</button>
      </div>

      {/* Sessions list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
        {sessions.length === 0 ? (
          <div style={{ 
            padding: '40px 20px', 
            textAlign: 'center', 
            color: 'var(--muted)', 
            fontSize: '0.85rem' 
          }}>
            No chats yet
          </div>
        ) : (
          sessions.map(session => {
            const isProcessing = processingSet.has(session.key);
            return (
              <div
                key={session.id}
                onClick={() => onSelectSession(session)}
                style={{
                  padding: '12px 16px',
                  margin: '2px 0',
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: session.id === currentSession?.id ? 'rgba(45, 212, 191, 0.1)' : 'transparent',
                  border: session.id === currentSession?.id ? '1px solid var(--teal)' : '1px solid transparent',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
                onMouseEnter={e => {
                  if (session.id !== currentSession?.id) {
                    e.currentTarget.style.background = 'rgba(45, 212, 191, 0.05)';
                  }
                }}
                onMouseLeave={e => {
                  if (session.id !== currentSession?.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    color: 'var(--text)',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}>
                    {session.title}
                    {isProcessing && (
                      <span style={{
                        width: 8, height: 8,
                        borderRadius: '50%',
                        background: 'var(--teal)',
                        display: 'inline-block',
                        animation: 'pulse 2s infinite',
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                  <div style={{
                    color: 'var(--muted)',
                    fontSize: '0.75rem',
                    marginTop: 2,
                  }}>
                    {formatSessionTime(session.updatedAt || session.createdAt)}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSession(session.id);
                  }}
                  style={{
                    width: 24, height: 24,
                    background: 'none',
                    border: 'none',
                    color: 'var(--muted)',
                    cursor: 'pointer',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.opacity = '1';
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.opacity = '0';
                    e.currentTarget.style.color = 'var(--muted)';
                  }}
                  title="Delete chat"
                >×</button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function formatSessionTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}

// ---------------------------------------------------------------------------
// Main Chat Interface
// ---------------------------------------------------------------------------

function ChatInterface({ session, onSendMessage, processing }) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.messages]);

  // Focus input when session changes
  useEffect(() => {
    inputRef.current?.focus();
  }, [session?.id]);

  const handleSend = () => {
    const text = input.trim();
    if (!text || processing) return;
    
    setInput('');
    onSendMessage(text);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch { return ''; }
  };

  if (!session) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        background: 'var(--background)',
      }}>
        <div style={{ fontSize: '2rem', marginBottom: 16 }}>💬</div>
        <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--text)' }}>
          Select a chat to get started
        </div>
        <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
          Choose an existing conversation or create a new one
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* Chat header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--card)',
      }}>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{session.title}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4 }}>
          {processing ? '⏳ Thinking...' : '● Online'}
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, 
        overflowY: 'auto', 
        padding: '16px 24px',
        background: 'var(--background)',
        display: 'flex', 
        flexDirection: 'column', 
        gap: 16,
      }}>
        {(!session.messages || session.messages.length === 0) && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '60px 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>👋</div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>Start a conversation</div>
            <div style={{ fontSize: '0.85rem' }}>
              Ask me anything — I'm here to help!
            </div>
          </div>
        )}

        {session.messages?.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '75%',
              padding: '12px 16px',
              borderRadius: msg.role === 'user' ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, var(--teal), rgba(45, 212, 191, 0.8))'
                : 'var(--card)',
              color: msg.role === 'user' ? 'white' : 'var(--text)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}>
              <div
                style={{ 
                  fontSize: '0.9rem', 
                  lineHeight: 1.6, 
                  wordBreak: 'break-word',
                }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
              />
              <div style={{
                fontSize: '0.7rem',
                color: msg.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--muted)',
                marginTop: 6, 
                textAlign: 'right',
              }}>
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {processing && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 16px', 
              borderRadius: '18px 18px 18px 6px',
              background: 'var(--card)', 
              border: '1px solid var(--border)',
              color: 'var(--muted)', 
              fontSize: '0.9rem',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}>
              <div style={{
                width: 16, height: 16,
                background: 'var(--teal)',
                borderRadius: '50%',
                animation: 'pulse 2s infinite',
              }} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span>Lobs is thinking...</span>
                <span style={{ fontSize: '0.75rem', opacity: 0.7, marginTop: 2 }}>
                  This may take a moment
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div style={{
        padding: '16px 24px 20px',
        borderTop: '1px solid var(--border)',
        background: 'var(--card)',
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message Lobs..."
            rows={1}
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 12,
              background: 'var(--background)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              minHeight: 44,
              maxHeight: 120,
              overflow: 'auto',
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || processing}
            style={{
              width: 44, height: 44,
              background: (!input.trim() || processing) ? 'var(--border)' : 'var(--teal)',
              color: 'white',
              border: 'none',
              borderRadius: 12,
              cursor: (!input.trim() || processing) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.1rem',
              transition: 'all 0.2s',
              opacity: (!input.trim() || processing) ? 0.5 : 1,
            }}
          >
            ⬆
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Chat Component
// ---------------------------------------------------------------------------

export default function Chat() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  // Per-session processing state: Set of session keys currently awaiting responses
  const [processingKeys, setProcessingKeys] = useState(new Set());
  const [error, setError] = useState(null);
  // Track active pollers so we can clean up
  const pollersRef = useRef(new Map()); // sessionKey -> abort controller

  const isCurrentProcessing = currentSession ? processingKeys.has(currentSession.key) : false;

  // Cleanup pollers on unmount
  useEffect(() => {
    return () => {
      for (const [, controller] of pollersRef.current) {
        controller.abort();
      }
    };
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const res = await fetch('/api/chat/sessions');
      const data = await res.json();
      setSessions(data.sessions || []);
      
      // Auto-select first session if none selected
      if (!currentSession && data.sessions?.length > 0) {
        selectSession(data.sessions[0]);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
      setError('Failed to load chat sessions');
    }
  };

  const selectSession = async (session) => {
    try {
      setCurrentSession({ ...session, messages: [] }); // Temporary while loading
      const res = await fetch(`/api/chat/sessions/${session.key}/messages`);
      const data = await res.json();
      
      setCurrentSession({
        ...session,
        messages: data.messages || [],
      });
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load session messages');
    }
  };

  const createNewSession = async () => {
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const newSession = await res.json();
      
      const fullSession = {
        id: newSession.id,
        key: newSession.key,
        title: newSession.title,
        createdAt: newSession.createdAt,
        updatedAt: newSession.createdAt,
        messages: [],
      };
      
      setSessions(prev => [fullSession, ...prev]);
      setCurrentSession(fullSession);
    } catch (err) {
      console.error('Failed to create session:', err);
      setError('Failed to create new chat');
    }
  };

  const deleteSession = async (sessionId) => {
    const session = sessions.find(s => s.id === sessionId);
    if (!session) return;
    
    // Cancel any active poller for this session
    const controller = pollersRef.current.get(session.key);
    if (controller) {
      controller.abort();
      pollersRef.current.delete(session.key);
    }
    
    try {
      await fetch(`/api/chat/sessions/${session.key}`, { method: 'DELETE' });
      
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      setProcessingKeys(prev => {
        const next = new Set(prev);
        next.delete(session.key);
        return next;
      });
      
      if (currentSession?.id === sessionId) {
        const remainingSessions = sessions.filter(s => s.id !== sessionId);
        if (remainingSessions.length > 0) {
          selectSession(remainingSessions[0]);
        } else {
          setCurrentSession(null);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
      setError('Failed to delete chat');
    }
  };

  const sendMessage = async (content) => {
    if (!currentSession) return;
    
    const sessionKey = currentSession.key;
    const sessionId = currentSession.id;
    
    // Don't block if this specific session is already processing —
    // let the backend queue it. But do show a processing indicator.
    if (processingKeys.has(sessionKey)) return;
    
    setProcessingKeys(prev => new Set(prev).add(sessionKey));
    setError(null);

    // Optimistically add user message
    const userMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    };
    
    setCurrentSession(prev => {
      if (prev?.key !== sessionKey) return prev;
      return {
        ...prev,
        messages: [...(prev.messages || []), userMessage],
      };
    });

    try {
      const res = await fetch(`/api/chat/sessions/${sessionKey}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
      
      if (!res.ok) throw new Error('Failed to send message');
      const data = await res.json();
      
      if (!data.accepted) throw new Error('Message not accepted');
      
      // Update session title from first message
      if (currentSession.title === 'New Chat' && content) {
        const newTitle = content.slice(0, 50).replace(/\n/g, ' ');
        setCurrentSession(prev => {
          if (prev?.key !== sessionKey) return prev;
          return { ...prev, title: newTitle };
        });
        setSessions(prev => 
          prev.map(s => s.id === sessionId ? { ...s, title: newTitle } : s)
        );
      }
      
      // Start polling for response
      pollForResponse(sessionKey, data.timestamp);
      
    } catch (err) {
      console.error('Failed to send message:', err);
      setError(err.message || 'Failed to send message');
      
      // Remove the optimistic user message on error
      setCurrentSession(prev => {
        if (prev?.key !== sessionKey) return prev;
        return {
          ...prev,
          messages: prev.messages?.slice(0, -1) || [],
        };
      });
      setProcessingKeys(prev => {
        const next = new Set(prev);
        next.delete(sessionKey);
        return next;
      });
    }
  };

  const pollForResponse = (sessionKey, sinceTimestamp) => {
    // Cancel any existing poller for this session
    const existing = pollersRef.current.get(sessionKey);
    if (existing) existing.abort();
    
    const controller = new AbortController();
    pollersRef.current.set(sessionKey, controller);
    
    let attempts = 0;
    const maxAttempts = 120; // 4 minutes at 2s intervals
    
    const poll = async () => {
      if (controller.signal.aborted) return;
      
      try {
        const res = await fetch(
          `/api/chat/sessions/${sessionKey}/poll?since=${encodeURIComponent(sinceTimestamp)}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        
        if (data.messages && data.messages.length > 0) {
          // Update messages — works whether or not this session is currently selected
          setCurrentSession(prev => {
            if (prev?.key !== sessionKey) return prev;
            
            const newMessages = data.messages.filter(msg => 
              !prev.messages?.some(existing => 
                existing.timestamp === msg.timestamp && existing.content === msg.content
              )
            );
            
            if (newMessages.length > 0) {
              return {
                ...prev,
                messages: [...(prev.messages || []), ...newMessages],
              };
            }
            return prev;
          });
          
          // Check if we got an assistant response
          const hasAssistantReply = data.messages.some(msg => msg.role === 'assistant');
          if (hasAssistantReply) {
            setProcessingKeys(prev => {
              const next = new Set(prev);
              next.delete(sessionKey);
              return next;
            });
            pollersRef.current.delete(sessionKey);
            return;
          }
        }
        
        attempts++;
        if (attempts < maxAttempts && !controller.signal.aborted) {
          setTimeout(poll, 2000);
        } else if (!controller.signal.aborted) {
          setProcessingKeys(prev => {
            const next = new Set(prev);
            next.delete(sessionKey);
            return next;
          });
          pollersRef.current.delete(sessionKey);
          setError('Response timeout - agent may still be processing');
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error('Polling error:', err);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setProcessingKeys(prev => {
            const next = new Set(prev);
            next.delete(sessionKey);
            return next;
          });
          pollersRef.current.delete(sessionKey);
          setError('Lost connection while waiting for response');
        }
      }
    };
    
    setTimeout(poll, 1000);
  };

  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      background: 'var(--background)',
    }}>
      <SessionsSidebar
        sessions={sessions}
        currentSession={currentSession}
        onSelectSession={selectSession}
        onNewSession={createNewSession}
        onDeleteSession={deleteSession}
        processingSet={processingKeys}
      />
      
      <ChatInterface
        session={currentSession}
        onSendMessage={sendMessage}
        processing={isCurrentProcessing}
      />
      
      {error && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.9)',
          color: 'white',
          borderRadius: 8,
          fontSize: '0.85rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
        }}>
          ❌ {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 12,
              background: 'none',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
            }}
          >×</button>
        </div>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
