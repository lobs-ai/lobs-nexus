import { useState, useEffect, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.4);border:1px solid var(--border);border-radius:6px;padding:10px;overflow-x:auto;font-family:var(--mono);font-size:0.8rem;margin:8px 0">$1</pre>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(0,0,0,0.4);border-radius:4px;padding:1px 5px;font-family:var(--mono);font-size:0.85em">$1</code>')
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

  const sessions = sessionsData?.sessions || sessionsData || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeSession) return;
    api.chatMessages(activeSession.key || activeSession.id)
      .then(data => setMessages(data?.messages || data || []))
      .catch(() => setMessages([]));
  }, [activeSession]);

  const newChat = async () => {
    setCreating(true);
    try {
      const session = await fetch('/api/chat/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Chat' }),
      }).then(r => r.json());
      await reloadSessions();
      setActiveSession(session);
      setMessages([]);
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeSession || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);
    const userMsg = { role: 'user', content: text, timestamp: new Date().toISOString() };
    setMessages(m => [...m, userMsg]);
    try {
      const res = await fetch(`/api/chat/sessions/${activeSession.key || activeSession.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      }).then(r => r.json());
      if (res?.reply || res?.message) {
        setMessages(m => [...m, { role: 'assistant', content: res.reply || res.message?.content || '', timestamp: new Date().toISOString() }]);
      }
    } catch {
      // ignore
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 64px)', gap: 0 }}>
      {/* Session list */}
      <div style={{ width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', borderRight: '1px solid var(--border)', paddingRight: 16, marginRight: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <span className="section-label">Conversations</span>
          <button
            onClick={newChat}
            disabled={creating}
            style={{ display: 'block', width: '100%', marginTop: 8, background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)', borderRadius: 8, color: 'var(--teal)', padding: '8px 12px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}
          >
            {creating ? 'Creating...' : '+ New Chat'}
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
          {sessions.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem', textAlign: 'center', paddingTop: 20 }}>No sessions yet</div>
          ) : sessions.map(s => (
            <div
              key={s.id || s.key}
              onClick={() => { setActiveSession(s); }}
              style={{
                background: (activeSession?.id === s.id || activeSession?.key === s.key) ? 'rgba(45,212,191,0.1)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${(activeSession?.id === s.id || activeSession?.key === s.key) ? 'rgba(45,212,191,0.3)' : 'var(--border)'}`,
                borderRadius: 8, padding: '10px 12px', cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <div style={{ color: 'var(--text)', fontSize: '0.85rem', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.title || s.key || 'Chat'}
              </div>
              <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{timeAgo(s.updatedAt || s.createdAt)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {!activeSession ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
            Select a session or start a new chat
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
              <div style={{ color: 'var(--text)', fontWeight: 700 }}>{activeSession.title || activeSession.key || 'Chat'}</div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>
              {messages.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--muted)', paddingTop: 40 }}>No messages yet. Say hi!</div>
              ) : messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '75%',
                    background: m.role === 'user' ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${m.role === 'user' ? 'rgba(45,212,191,0.3)' : 'var(--border)'}`,
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    padding: '10px 14px',
                    color: 'var(--text)',
                    fontSize: '0.88rem',
                    lineHeight: 1.5,
                  }}>
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }} />
                    <div style={{ color: 'var(--muted)', fontSize: '0.68rem', marginTop: 4, textAlign: m.role === 'user' ? 'right' : 'left' }}>
                      {timeAgo(m.timestamp || m.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
              {sending && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px', padding: '10px 14px', color: 'var(--muted)', fontSize: '0.88rem' }}>
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ display: 'flex', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                placeholder="Send a message..."
                style={{
                  flex: 1, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                  borderRadius: 10, padding: '10px 14px', color: 'var(--text)', fontSize: '0.88rem',
                  outline: 'none', fontFamily: 'inherit',
                }}
              />
              <button
                onClick={sendMessage}
                disabled={!input.trim() || sending}
                style={{
                  background: input.trim() ? 'rgba(45,212,191,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${input.trim() ? 'rgba(45,212,191,0.4)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 18px', color: input.trim() ? 'var(--teal)' : 'var(--muted)',
                  cursor: input.trim() ? 'pointer' : 'not-allowed', fontWeight: 600, fontSize: '0.85rem',
                  transition: 'all 0.2s',
                }}
              >
                Send
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
