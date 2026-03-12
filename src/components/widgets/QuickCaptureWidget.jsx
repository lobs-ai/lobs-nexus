import { useState, useEffect } from 'react';
import GlassCard from '../GlassCard';
import { api } from '../../lib/api';

export default function QuickCaptureWidget() {
  const [text, setText] = useState('');
  const [type, setType] = useState('auto');
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState([]);

  const loadRecent = async () => {
    try {
      const data = await api.recentCaptures(5);
      setRecent(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load recent captures:', err);
    }
  };

  useEffect(() => { loadRecent(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    try {
      await api.capture({ text, type });
      setText('');
      setType('auto');
      await loadRecent();
    } catch (err) {
      console.error('Capture failed:', err);
      alert('Failed to capture: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: '1.3rem' }}>⚡</span>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Quick Capture</div>
      </div>

      <form onSubmit={handleSubmit} style={{ marginBottom: 16 }}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Capture a thought, task, or idea..."
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px 14px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            color: 'var(--text)',
            fontSize: '0.9rem',
            marginBottom: 10,
          }}
        />

        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          {['auto', 'task', 'note', 'idea', 'question'].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              style={{
                padding: '4px 10px',
                background: type === t ? 'var(--teal)' : 'rgba(255,255,255,0.04)',
                border: '1px solid',
                borderColor: type === t ? 'var(--teal)' : 'var(--border)',
                borderRadius: 4,
                color: type === t ? 'white' : 'var(--muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          type="submit"
          disabled={loading || !text.trim()}
          style={{
            width: '100%',
            padding: '8px',
            background: 'var(--teal)',
            border: 'none',
            borderRadius: 6,
            color: 'white',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading || !text.trim() ? 0.5 : 1,
          }}
        >
          {loading ? 'Capturing...' : 'Capture'}
        </button>
      </form>

      {recent.length > 0 && (
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '1px' }}>
            Recent
          </div>
          {recent.map((item, i) => (
            <div key={i} style={{ marginBottom: 6, fontSize: '0.8rem', color: 'var(--text)', display: 'flex', gap: 6 }}>
              <span style={{ color: 'var(--muted)' }}>
                {item.type === 'task' ? '✓' : item.type === 'idea' ? '💡' : item.type === 'question' ? '❓' : '📝'}
              </span>
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
