import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../GlassCard';
import { api } from '../../lib/api';

export default function QuickActionsWidget() {
  const navigate = useNavigate();
  const [pills, setPills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const items = [];
      try {
        const tasks = await api.tasks({ limit: 200 }, controller.signal);
        const list = tasks?.tasks || tasks || [];
        const blocked = list.filter(t => t.status === 'blocked');
        if (blocked.length > 0) {
          items.push({ label: `${blocked.length} blocked task${blocked.length > 1 ? 's' : ''}`, icon: '🚧', color: 'var(--amber)', to: '/tasks' });
        }
        const active = list.filter(t => t.status === 'active');
        if (active.length > 0) {
          items.push({ label: `${active.length} active task${active.length > 1 ? 's' : ''}`, icon: '⚡', color: 'var(--teal)', to: '/tasks' });
        }
      } catch {}
      try {
        const inbox = await api.inbox(controller.signal);
        const list = inbox?.items || inbox || [];
        const unread = list.filter(i => !i.read && !i.read_at);
        if (unread.length > 0) {
          items.push({ label: `${unread.length} unread inbox`, icon: '📬', color: 'var(--blue)', to: '/inbox' });
        }
      } catch {}
      setPills(items.slice(0, 5));
      setLoading(false);
    };
    load();
    return () => controller.abort();
  }, []);

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Needs Attention</div>
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2].map(i => <div key={i} className="shimmer" style={{ height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />)}
        </div>
      ) : pills.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
          ✅ All clear — nothing needs attention
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {pills.map((p, i) => (
            <button
              key={i}
              onClick={() => navigate(p.to)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10,
                background: `${p.color}11`, border: `1px solid ${p.color}33`,
                color: 'var(--text)', cursor: 'pointer', width: '100%',
                transition: 'all 0.2s', textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = `${p.color}22`; e.currentTarget.style.borderColor = `${p.color}55`; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${p.color}11`; e.currentTarget.style.borderColor = `${p.color}33`; }}
            >
              <span style={{ fontSize: '1rem' }}>{p.icon}</span>
              <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{p.label}</span>
              <span style={{ marginLeft: 'auto', color: p.color, fontSize: '0.75rem' }}>→</span>
            </button>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
