import { useState, useEffect, useRef, useCallback } from 'react';
import { useApi } from '../hooks/useApi';

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
// Main Agent Chat
// ---------------------------------------------------------------------------

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load conversation history on mount
  useEffect(() => {
    fetch('/api/agent/messages')
      .then(r => r.json())
      .then(data => {
        const msgs = data.messages || [];
        setMessages(msgs.map(m => ({
          role: m.role,
          content: m.content,
          author: m.author_name || (m.role === 'assistant' ? 'Lobs' : 'You'),
          timestamp: m.created_at,
        })));
      })
      .catch(err => console.error('Failed to load history:', err));
  }, []);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    setError(null);

    // Optimistic add
    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      author: 'You',
      timestamp: new Date().toISOString(),
    }]);

    try {
      const res = await fetch('/api/agent/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const data = await res.json();
      if (data?.error) throw new Error(data.error);
      
      if (data?.reply) {
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.reply,
          author: 'Lobs',
          timestamp: data.timestamp || new Date().toISOString(),
        }]);
      }
    } catch (err) {
      console.error('Failed to send:', err);
      setError(err.message || 'Failed to send message');
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    try {
      return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    } catch { return ''; }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxHeight: '100vh' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--teal), var(--purple))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', fontWeight: 700, color: 'white',
        }}>L</div>
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text)' }}>Lobs</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
            {sending ? '⏳ Thinking...' : '● Online'}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 24px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '60px 0' }}>
            <div style={{ fontSize: '2rem', marginBottom: 8 }}>👋</div>
            <div style={{ fontWeight: 600 }}>Hey! I'm Lobs.</div>
            <div style={{ fontSize: '0.85rem', marginTop: 4 }}>
              This is the main agent — same conversation whether you're here or on Discord.
            </div>
          </div>
        )}

        {messages.filter(m => !m.content?.startsWith('[System Event]')).map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
          }}>
            <div style={{
              maxWidth: '75%',
              padding: '10px 14px',
              borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: msg.role === 'user'
                ? 'linear-gradient(135deg, var(--teal), rgba(45, 212, 191, 0.7))'
                : 'var(--card)',
              color: msg.role === 'user' ? 'white' : 'var(--text)',
              border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
            }}>
              <div
                style={{ fontSize: '0.9rem', lineHeight: 1.5, wordBreak: 'break-word' }}
                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
              />
              <div style={{
                fontSize: '0.65rem',
                color: msg.role === 'user' ? 'rgba(255,255,255,0.6)' : 'var(--muted)',
                marginTop: 4, textAlign: 'right',
              }}>
                {formatTime(msg.timestamp)}
              </div>
            </div>
          </div>
        ))}

        {sending && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '10px 14px', borderRadius: '16px 16px 16px 4px',
              background: 'var(--card)', border: '1px solid var(--border)',
              color: 'var(--muted)', fontSize: '0.85rem',
            }}>
              ⏳ Thinking...
            </div>
          </div>
        )}

        {error && (
          <div style={{
            padding: '8px 12px', borderRadius: 8,
            background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444', fontSize: '0.85rem', textAlign: 'center',
          }}>
            ❌ {error}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '12px 24px 16px',
        borderTop: '1px solid var(--border)',
        display: 'flex', gap: 8,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Talk to Lobs..."
          rows={1}
          style={{
            flex: 1, padding: '10px 14px', borderRadius: 12,
            background: 'var(--card)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '0.9rem', resize: 'none',
            outline: 'none', fontFamily: 'inherit',
            minHeight: 42, maxHeight: 120,
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          style={{
            padding: '10px 20px', borderRadius: 12,
            background: (!input.trim() || sending) ? 'var(--border)' : 'var(--teal)',
            color: 'white', border: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: '0.9rem',
            opacity: (!input.trim() || sending) ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}
