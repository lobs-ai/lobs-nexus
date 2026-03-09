import { useState, useEffect } from 'react';
import GlassCard from '../GlassCard';
import { useAIInvoke } from '../../hooks/useAIInvoke';

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DailySummaryWidget() {
  const { invoke, loading, error } = useAIInvoke();
  const [summary, setSummary] = useState(null);
  const [collapsed, setCollapsed] = useState(false);

  const fetchSummary = async () => {
    setSummary(null);
    const result = await invoke('paw', 'daily-summary', new Date().toISOString().slice(0, 10));
    if (result) setSummary(result);
  };

  useEffect(() => { fetchSummary(); }, []);

  return (
    <GlassCard style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--teal), var(--blue), transparent)', opacity: 0.6 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: collapsed ? 0 : 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>✨</span>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>{getGreeting()}, Rafe</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>AI Daily Brief</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={fetchSummary}
            disabled={loading}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--teal)'; e.currentTarget.style.color = 'var(--teal)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)'; }}
          >
            {loading ? '⟳' : '↻'} Refresh
          </button>
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem' }}
          >
            {collapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ transition: 'all 0.3s' }}>
          {loading && !summary && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="shimmer" style={{ height: 14, borderRadius: 6, background: 'rgba(255,255,255,0.04)', width: `${90 - i * 15}%` }} />
              ))}
            </div>
          )}
          {error && !summary && (
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '12px 0' }}>
              <span style={{ color: 'var(--amber)' }}>⚠</span> Couldn't generate summary. System may be warming up.
            </div>
          )}
          {summary && (
            <div style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
              {summary}
            </div>
          )}
          {!loading && !error && !summary && (
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '8px 0' }}>
              No summary available yet. Click refresh to generate one.
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
