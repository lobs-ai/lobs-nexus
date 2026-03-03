import { useState, useEffect, useRef } from 'react';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

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

export default function Chat() {
  const { data: sessionsData, reload: reloadSessions } = useApi(() => api.chatSessions());
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [creating, setCreating] = useState(false);
  const messagesEndRef = useRef(null);
  const prevSessionRef = useRef(null);

  const sessions = sessionsData?.sessions || sessionsData || [];

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  useEffect(() => {
    if (!activeSession) return;
    if (prevSessionRef.current === (activeSession.key || activeSession.id)) return;
    prevSessionRef.current = activeSession.key || activeSession.id;
    api.chatMessages(activeSession.key || activeSession.id)
      .then(data => setMessages(data?.messages || data || []))
      .catch(() => setMessages([]));
  }, [activeSession]);

  const newChat = async () => {
    setCreating(true);
    try {
      const session = await fetch('/api/chat/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'New Chat' }) }).then(r => r.json());
      await reloadSessions();
      prevSessionRef.current = null;
      setActiveSession(session);
      setMessages([]);
    } catch {} finally { setCreating(false); }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeSession || sending) return;
    const text = input.trim(); setInput(''); setSending(true);
    setMessages(m => [...m, { role: 'user', content: text, timestamp: new Date().toISOString() }]);
    try {
      const res = await fetch(`/api/chat/sessions/${activeSession.key || activeSession.id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: text }) }).then(r => r.json());
      if (res?.reply || res?.message) setMessages(m => [...m, { role: 'assistant', content: res.reply || res.message?.content || '', timestamp: new Date().toISOString() }]);
    } catch {} finally { setSending(false); }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 32px)', padding: '16px 0 16px 0' }}>
      {/* Session sidebar */}
      <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', padding: '16px 20px', background: 'rgba(6,9,20,0.5)' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '4px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 16 }}>CONVERSATIONS</div>
        <button className="btn-primary" onClick={newChat} disabled={creating} style={{ marginBottom: 16, width: '100%', fontSize: '0.82rem' }}>
          {creating ? 'Creating...' : '+ New Chat'}
        </button>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sessions.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem', textAlign: 'center', paddingTop: 20 }}>No sessions yet</div>
          ) : sessions.map(s => {
            const isActive = activeSession?.id === s.id || activeSession?.key === s.key;
            return (
              <div key={s.id || s.key} onClick={() => { prevSessionRef.current = null; setActiveSession(s); }}
                style={{ background: isActive ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.02)', border: `1px solid ${isActive ? 'rgba(45,212,191,0.3)' : 'var(--border)'}`, borderRadius: 8, padding: '12px 14px', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.borderColor = 'rgba(45,212,191,0.15)'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border)'; }}>
                <div style={{ color: isActive ? 'var(--teal)' : 'var(--text)', fontSize: '0.85rem', fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title || s.key || 'Chat'}</div>
                <div style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{timeAgo(s.updatedAt || s.createdAt)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: '0 24px' }}>
        {!activeSession ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: '2.5rem', opacity: 0.3 }}>💬</div>
            <div style={{ color: 'var(--text)', fontWeight: 600 }}>Select a session or start a new chat</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Conversations persist when you navigate away</div>
          </div>
        ) : (
          <>
            <div style={{ padding: '16px 0', borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 4 }}>ACTIVE SESSION</div>
              <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem' }}>{activeSession.title || activeSession.key || 'Chat'}</div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: 60 }}>
                  <div style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.4 }}>⬡</div>
                  <div>No messages yet. Say hi!</div>
                </div>
              ) : messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div className={m.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.6 }} />
                    <div style={{ color: 'var(--faint)', fontSize: '0.68rem', marginTop: 6, textAlign: m.role === 'user' ? 'right' : 'left', fontFamily: 'var(--mono)' }}>
                      {timeAgo(m.timestamp || m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              {sending && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div className="chat-bubble-ai"><span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontSize: '0.82rem' }}>Processing<span className="pulse-dot" style={{ display: 'inline-block', width: 4, height: 4, borderRadius: '50%', background: 'var(--teal)', color: 'var(--teal)', marginLeft: 4 }} /></span></div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16, paddingBottom: 8 }}>
              <input className="nx-input" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} placeholder="Send a message..." style={{ flex: 1 }} />
              <button className="btn-primary" onClick={sendMessage} disabled={!input.trim() || sending} style={{ padding: '10px 20px' }}>Send</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
