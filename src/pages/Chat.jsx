import RichMessage from '../components/rich/RichMessage';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi';
import { useAffordances } from '../hooks/useAffordances';
import AISummarizeButton from '../components/ai/AISummarizeButton';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

// ---------------------------------------------------------------------------
// Helpers
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

function deriveTitle(text) {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  return cleaned.length <= 50 ? cleaned : cleaned.slice(0, 47) + '…';
}

// ---------------------------------------------------------------------------
// Custom-title localStorage store
// ---------------------------------------------------------------------------

const TITLE_STORE_KEY = 'nexus.chat.titles';

function loadTitleStore() {
  try { return JSON.parse(localStorage.getItem(TITLE_STORE_KEY) || '{}'); } catch { return {}; }
}
function saveTitleStore(store) {
  try { localStorage.setItem(TITLE_STORE_KEY, JSON.stringify(store)); } catch {}
}
function getCustomTitle(id) { return loadTitleStore()[id] || null; }
function setCustomTitle(id, title) {
  const store = loadTitleStore();
  store[id] = title;
  saveTitleStore(store);
}
function removeCustomTitle(id) {
  const store = loadTitleStore();
  delete store[id];
  saveTitleStore(store);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Chat() {
  const { data: sessionsData, reload: reloadSessions } = useApi(signal => api.chatSessions(signal));
  const [activeSession, setActiveSession] = useState(null);
  const [creating, setCreating] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState('');
  const [, titleTick] = useState(0);

  const messagesEndRef = useRef(null);
  const prevSessionRef = useRef(null);
  const pendingSessionsRef = useRef((() => {
    try {
      const raw = JSON.parse(localStorage.getItem('nexus.chat.pendingSessions') || '[]');
      return new Set(Array.isArray(raw) ? raw : []);
    } catch { return new Set(); }
  })());

  const sessionStateRef = useRef({});
  const [, forceUpdate] = useState(0);

  const sessions = sessionsData?.sessions || sessionsData || [];
  const activeKey = activeSession?.key || activeSession?.sessionKey;
  const activeId = activeSession?.id;

  const chatAffordances = useAffordances('chat-session');
  const summarizeAffordance = chatAffordances.find(a => a.type === 'button') || null;

  const getSessionState = useCallback((key) => {
    if (!key) return { messages: [], sending: false, sendError: null };
    if (!sessionStateRef.current[key]) {
      sessionStateRef.current[key] = { messages: [], sending: pendingSessionsRef.current.has(key), sendError: null };
    }
    return sessionStateRef.current[key];
  }, []);

  const updateSessionState = useCallback((key, updates) => {
    if (!key) return;
    const state = getSessionState(key);
    Object.assign(state, updates);
    forceUpdate(n => n + 1);
  }, [getSessionState]);

  const persistPendingSessions = useCallback(() => {
    try {
      localStorage.setItem('nexus.chat.pendingSessions', JSON.stringify([...pendingSessionsRef.current]));
    } catch {}
  }, []);

  const markSessionPending = useCallback((key, pending) => {
    if (!key) return;
    if (pending) pendingSessionsRef.current.add(key);
    else pendingSessionsRef.current.delete(key);
    persistPendingSessions();
  }, [persistPendingSessions]);

  const currentState = getSessionState(activeKey);

  const [inputMap, setInputMap] = useState({});
  const input = inputMap[activeKey] || '';
  const setInput = (val) => setInputMap(m => ({ ...m, [activeKey]: val }));

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [currentState.messages]);

  const loadMessages = useCallback(async (key, signal) => {
    if (!key) return;
    try {
      const data = await api.chatMessages(key, signal);
      const messages = data?.messages || [];
      const hasUnansweredUserMessage = messages.length > 0 && messages[messages.length - 1]?.role === 'user';
      const isPending = pendingSessionsRef.current.has(key) || hasUnansweredUserMessage;
      if (isPending) pendingSessionsRef.current.add(key);
      else pendingSessionsRef.current.delete(key);
      persistPendingSessions();
      updateSessionState(key, { messages, sending: isPending });
    } catch (e) {
      if (e.name === 'AbortError') return;
    }
  }, [persistPendingSessions, updateSessionState]);

  // Load messages when switching sessions
  useEffect(() => {
    if (!activeSession) return;
    const key = activeSession.key || activeSession.sessionKey;
    if (prevSessionRef.current === key) return;
    prevSessionRef.current = key;
    const cached = sessionStateRef.current[key];
    if (cached && cached.messages.length > 0) return;
    const controller = new AbortController();
    setLoadingMessages(true);
    loadMessages(key, controller.signal).finally(() => {
      if (!controller.signal.aborted) setLoadingMessages(false);
    });
    return () => controller.abort();
  }, [activeSession, loadMessages]);

  // Background polling for ALL pending sessions (including non-active ones)
  useEffect(() => {
    const poll = async () => {
      const pendingKeys = [...pendingSessionsRef.current];
      if (pendingKeys.length === 0) return;
      await Promise.allSettled(pendingKeys.map(key => loadMessages(key)));
    };
    const id = setInterval(poll, 4000);
    return () => clearInterval(id);
  }, [loadMessages]);

  // ---------------------------------------------------------------------------
  // Session management
  // ---------------------------------------------------------------------------

  const newChat = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      });
      const session = await res.json();
      if (session.error) throw new Error(session.error);
      await reloadSessions();
      prevSessionRef.current = null;
      setActiveSession(session);
    } catch (err) {
      console.error('Failed to create chat:', err);
    } finally {
      setCreating(false);
    }
  };

  const deleteChat = async (e, session) => {
    e.stopPropagation();
    const key = session.key || session.sessionKey;
    try {
      await fetch(`/api/chat/sessions/${encodeURIComponent(key)}`, { method: 'DELETE' });
      delete sessionStateRef.current[key];
      markSessionPending(key, false);
      removeCustomTitle(session.id);
      if (activeKey === key) {
        setActiveSession(null);
        prevSessionRef.current = null;
      }
      await reloadSessions();
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  const startRename = (e, session) => {
    e.stopPropagation();
    setRenamingId(session.id);
    setRenameValue(getCustomTitle(session.id) || session.title || session.label || 'New Chat');
  };

  const commitRename = (e, sessionId) => {
    e.stopPropagation();
    const trimmed = renameValue.trim();
    if (trimmed) { setCustomTitle(sessionId, trimmed); titleTick(n => n + 1); }
    setRenamingId(null);
  };

  const cancelRename = (e) => { e.stopPropagation(); setRenamingId(null); };

  // ---------------------------------------------------------------------------
  // Messaging
  // ---------------------------------------------------------------------------

  const sendMessage = async (overrideText) => {
    const text = (overrideText || input).trim();
    const key = activeKey;
    const sessionId = activeId;
    if (!text || !key) return;
    const state = getSessionState(key);
    if (state.sending) return;

    if (!overrideText) setInput('');
    updateSessionState(key, {
      sending: true,
      sendError: null,
      messages: [...state.messages, { role: 'user', content: text, timestamp: new Date().toISOString() }],
    });
    markSessionPending(key, true);

    // Auto-title on first message
    if (state.messages.length === 0 && !getCustomTitle(sessionId) && sessionId) {
      setCustomTitle(sessionId, deriveTitle(text));
      titleTick(n => n + 1);
    }

    try {
      const res = await fetch(`/api/chat/sessions/${encodeURIComponent(key)}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      const current = getSessionState(key);
      if (data?.reply) {
        updateSessionState(key, {
          sending: false,
          messages: [...current.messages, { role: 'assistant', content: data.reply, timestamp: data.timestamp || new Date().toISOString() }],
        });
        markSessionPending(key, false);
      } else {
        updateSessionState(key, { sending: false });
        markSessionPending(key, false);
        await loadMessages(key);
      }
    } catch (err) {
      console.error('Failed to send:', err);
      markSessionPending(key, false);
      updateSessionState(key, { sending: false, sendError: { text, key } });
    }
  };

  const retry = () => {
    if (!currentState.sendError) return;
    const { text, key } = currentState.sendError;
    if (activeKey !== key) return;
    updateSessionState(key, { sendError: null });
    sendMessage(text);
  };

  const isSessionSending = (key) =>
    sessionStateRef.current[key]?.sending || pendingSessionsRef.current.has(key) || false;

  const getDisplayTitle = (session) =>
    getCustomTitle(session.id) || session.title || session.label || 'New Chat';

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 32px)', padding: '16px 0 16px 0' }}>
      {/* Sidebar */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', padding: '16px 20px', background: 'rgba(6,9,20,0.5)' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '4px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 16 }}>CONVERSATIONS</div>
        <button className="btn-primary" onClick={newChat} disabled={creating} style={{ marginBottom: 16, width: '100%', fontSize: '0.82rem' }}>
          {creating ? 'Creating...' : '+ New Chat'}
        </button>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sessions.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem', textAlign: 'center', paddingTop: 20 }}>No sessions yet</div>
          ) : sessions.map(s => {
            const key = s.key || s.sessionKey;
            const isActive = activeKey === key;
            const isSending = isSessionSending(key);
            const displayTitle = getDisplayTitle(s);
            const isRenaming = renamingId === s.id;

            return (
              <div key={key}
                onClick={() => { if (!isRenaming) { prevSessionRef.current = null; setActiveSession(s); } }}
                style={{ background: isActive ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? 'rgba(45,212,191,0.3)' : 'var(--border)'}`, borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(45,212,191,0.15)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border)'; }}>

                {isRenaming ? (
                  <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 6 }}>
                    <input autoFocus value={renameValue} onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') commitRename(e, s.id); if (e.key === 'Escape') cancelRename(e); }}
                      style={{ flex: 1, background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 4, padding: '2px 6px', color: 'var(--text)', fontSize: '0.82rem', outline: 'none' }} />
                    <button onClick={e => commitRename(e, s.id)} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px' }} title="Save">✓</button>
                    <button onClick={cancelRename} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: '0.8rem', padding: '0 2px' }} title="Cancel">✕</button>
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, overflow: 'hidden' }}>
                        {isSending && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', flexShrink: 0, animation: 'pulse 1.5s infinite' }} />}
                        <div style={{ color: isActive ? 'var(--teal)' : 'var(--text)', fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                          {displayTitle}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 2, flexShrink: 0, marginLeft: 4 }}>
                        <button onClick={e => startRename(e, s)}
                          style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', padding: '1px 3px', fontSize: '0.72rem', opacity: 0.4, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--teal)'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = 'var(--faint)'; }}
                          title="Rename">✎</button>
                        <button onClick={e => deleteChat(e, s)}
                          style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', padding: '1px 3px', fontSize: '0.8rem', opacity: 0.4, transition: 'opacity 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = '#f87171'; }}
                          onMouseLeave={e => { e.currentTarget.style.opacity = '0.4'; e.currentTarget.style.color = 'var(--faint)'; }}
                          title="Delete chat">✕</button>
                      </div>
                    </div>
                    <div style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)', marginTop: 4 }}>
                      {timeAgo(s.updatedAt || s.lastMessageAt || s.createdAt)}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 24px' }}>
        {!activeSession ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '2.5rem', opacity: 0.3 }}>💬</div>
            <div style={{ color: 'var(--text)', fontWeight: 600 }}>Select a session or start a new chat</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Each chat runs as a persistent OpenClaw session</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 4 }}>ACTIVE SESSION</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem' }}>{getDisplayTitle(activeSession)}</div>
                {summarizeAffordance && currentState.messages.length > 0 && (
                  <AISummarizeButton
                    affordance={summarizeAffordance}
                    context={JSON.stringify({
                      sessionTitle: getDisplayTitle(activeSession),
                      messages: currentState.messages.slice(-20).map(m => ({ role: m.role, content: m.content })),
                    })}
                  />
                )}
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
              {loadingMessages ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: 60 }}>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem' }}>Loading messages...</div>
                </div>
              ) : currentState.messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: 60 }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.4 }}>⬡</div>
                  <div>No messages yet. Say hi!</div>
                </div>
              ) : currentState.messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.6 }} />
                    <div style={{ color: 'var(--faint)', fontSize: '0.68rem', marginTop: 6, textAlign: m.role === 'user' ? 'right' : 'left', fontFamily: 'var(--mono)' }}>
                      {timeAgo(m.timestamp || m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              {currentState.sending && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div className="chat-bubble-ai">
                    <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>Thinking...</span>
                  </div>
                </div>
              )}
              {currentState.sendError && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                  <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 8, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.85rem' }}>
                    <span style={{ color: 'var(--text)' }}>Message failed to send</span>
                    <button onClick={retry} className="btn-primary" style={{ padding: '4px 14px', fontSize: '0.8rem' }}>Retry</button>
                    <button onClick={() => updateSessionState(activeKey, { sendError: null })} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: '0.8rem' }}>Dismiss</button>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16, paddingBottom: 8 }}>
              <input className="nx-input" value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Send a message..." style={{ flex: 1 }} disabled={currentState.sending} />
              <button className="btn-primary" onClick={() => sendMessage()} disabled={!input.trim() || currentState.sending} style={{ padding: '10px 20px' }}>
                {currentState.sending ? '...' : 'Send'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
