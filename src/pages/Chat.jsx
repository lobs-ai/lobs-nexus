import { useState, useEffect, useRef } from 'react';
import { usePolling } from '../hooks/usePolling';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

async function sendChatMessage(message) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error('Failed to send message');
  return res.json();
}

export default function Chat() {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversation, setConversation] = useState([]);
  const messagesEndRef = useRef(null);

  const { data: sessionsData } = usePolling(
    (signal) => api.chatSessions(signal),
    30000
  );

  const sessions = sessionsData?.sessions || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    const userMessage = { role: 'user', content: message, timestamp: new Date().toISOString() };
    setConversation(prev => [...prev, userMessage]);
    setMessage('');
    setSending(true);

    try {
      const response = await sendChatMessage(message);
      const assistantMessage = {
        role: 'assistant',
        content: response.response || response.message || 'No response',
        timestamp: new Date().toISOString()
      };
      setConversation(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('Failed to send message:', err);
      const errorMessage = {
        role: 'assistant',
        content: 'Error: Failed to send message',
        timestamp: new Date().toISOString()
      };
      setConversation(prev => [...prev, errorMessage]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div style={{ padding: '32px', maxWidth: '1200px', margin: '0 auto', height: 'calc(100vh - 64px)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
          Chat
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
          Direct conversation with lobs-core
        </p>
      </div>

      {/* Sessions Summary */}
      {sessions.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
            {sessions.length} active session{sessions.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}

      {/* Conversation */}
      <GlassCard style={{ flex: 1, display: 'flex', flexDirection: 'column', marginBottom: '20px', padding: '24px', overflow: 'hidden' }}>
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: '16px' }}>
          {conversation.length === 0 ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
              Start a conversation...
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {conversation.map((msg, idx) => (
                <div
                  key={idx}
                  style={{
                    alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '70%'
                  }}
                >
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: msg.role === 'user' ? 'var(--teal)' : 'var(--faint)',
                      color: msg.role === 'user' ? '#fff' : 'var(--text)',
                      fontSize: '15px',
                      lineHeight: '1.6',
                      border: msg.role === 'assistant' ? '1px solid var(--border)' : 'none'
                    }}
                  >
                    {msg.content}
                  </div>
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--muted)',
                      marginTop: '4px',
                      textAlign: msg.role === 'user' ? 'right' : 'left',
                      fontFamily: 'var(--mono)'
                    }}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '12px' }}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={sending}
            placeholder="Type a message..."
            style={{
              flex: 1,
              padding: '12px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              background: 'var(--surface)',
              color: 'var(--text)',
              fontSize: '15px',
              outline: 'none'
            }}
          />
          <button
            type="submit"
            disabled={sending || !message.trim()}
            style={{
              padding: '12px 24px',
              borderRadius: '8px',
              border: 'none',
              background: sending ? 'var(--muted)' : 'var(--teal)',
              color: '#fff',
              fontSize: '14px',
              fontWeight: '600',
              cursor: sending ? 'not-allowed' : 'pointer',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => !sending && (e.target.style.opacity = '0.8')}
            onMouseLeave={(e) => !sending && (e.target.style.opacity = '1')}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </GlassCard>
    </div>
  );
}
