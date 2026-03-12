/**
 * Explore page — AI-powered system exploration
 */

import { useState } from "react";
import GlassCard from "../components/GlassCard";

export default function Explore() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);

  const quickActions = [
    "What happened today?",
    "Show active tasks",
    "System health",
    "Recent completions",
    "Overdue items",
    "Agent status",
  ];

  const handleSubmit = async (q) => {
    const queryText = q || query;
    if (!queryText.trim()) return;

    setLoading(true);
    setMessages(prev => [...prev, { role: "user", text: queryText }]);
    setQuery("");

    try {
      const response = await fetch("/paw/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: queryText }),
      });

      if (!response.ok) throw new Error("Failed to get response");

      const data = await response.json();
      const reply = data.reply || data.message || "No response";

      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        { role: "assistant", text: `Error: ${err.message}`, error: true },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '28px 28px 40px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <svg width="22" height="22" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10"/>
            <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>
          </svg>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)' }}>Explore</h1>
        </div>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: '0.875rem' }}>Ask anything about your system</p>
      </div>

      {/* Search bar */}
      <GlassCard style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <svg width="16" height="16" fill="none" stroke="var(--muted)" strokeWidth="2" viewBox="0 0 24 24"
              style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }}>
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="Ask anything..."
              style={{
                width: '100%', padding: '12px 14px 12px 42px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)', fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>
          <button
            onClick={() => handleSubmit()}
            disabled={loading || !query.trim()}
            style={{
              padding: '10px 20px', borderRadius: 8, border: 'none',
              background: loading || !query.trim() ? 'rgba(45,212,191,0.2)' : 'linear-gradient(135deg, var(--teal), var(--blue))',
              color: '#fff', fontWeight: 600, fontSize: '0.85rem',
              cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
              opacity: loading || !query.trim() ? 0.5 : 1,
            }}
          >
            {loading ? "..." : "Ask"}
          </button>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() => handleSubmit(action)}
              disabled={loading}
              style={{
                padding: '6px 12px', borderRadius: 6, fontSize: '0.78rem',
                background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
                color: 'var(--muted)', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.5 : 1, transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!loading) e.target.style.background = 'rgba(255,255,255,0.08)'; }}
              onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.04)'; }}
            >
              {action}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Messages */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {messages.length === 0 ? (
          <GlassCard style={{ textAlign: 'center', padding: '48px 24px' }}>
            <svg width="40" height="40" fill="none" stroke="var(--faint)" strokeWidth="1.5" viewBox="0 0 24 24"
              style={{ margin: '0 auto 16px', opacity: 0.5 }}>
              <circle cx="12" cy="12" r="10"/>
              <path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/>
            </svg>
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              Ask questions about tasks, projects, agents, or system health.
            </div>
          </GlassCard>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: '80%', padding: '12px 16px', borderRadius: 10,
                  background: msg.role === "user"
                    ? 'rgba(45,212,191,0.08)'
                    : msg.error
                    ? 'rgba(239,68,68,0.08)'
                    : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${
                    msg.role === "user"
                      ? 'rgba(45,212,191,0.2)'
                      : msg.error
                      ? 'rgba(239,68,68,0.2)'
                      : 'var(--border)'
                  }`,
                  color: msg.error ? '#f87171' : 'var(--text)',
                  fontSize: '0.88rem', lineHeight: 1.6,
                }}
              >
                <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{msg.text}</div>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{
              padding: '12px 16px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', gap: 8,
              color: 'var(--muted)', fontSize: '0.85rem',
            }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Thinking...
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
