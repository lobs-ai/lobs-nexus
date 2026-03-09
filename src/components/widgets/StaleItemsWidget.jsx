import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../GlassCard';
import { api } from '../../lib/api';

function hoursAgo(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
}

function formatAge(hours) {
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export default function StaleItemsWidget() {
  const navigate = useNavigate();
  const [stale, setStale] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const items = [];
      try {
        const tasks = await api.tasks({ limit: 200 }, controller.signal);
        const list = tasks?.tasks || tasks || [];
        list
          .filter(t => t.status === 'blocked' && hoursAgo(t.updated_at || t.created_at) >= 24)
          .forEach(t => items.push({
            title: t.title,
            age: hoursAgo(t.updated_at || t.created_at),
            type: 'blocked-task',
            icon: '🚧',
            color: 'var(--amber)',
            to: '/tasks',
          }));
      } catch {}
      try {
        const inbox = await api.inbox(controller.signal);
        const list = inbox?.items || inbox || [];
        list
          .filter(i => !i.read && !i.read_at && hoursAgo(i.created_at) >= 48)
          .forEach(i => items.push({
            title: i.title || i.subject || 'Inbox item',
            age: hoursAgo(i.created_at),
            type: 'unread-inbox',
            icon: '📬',
            color: 'var(--blue)',
            to: '/inbox',
          }));
      } catch {}
      items.sort((a, b) => b.age - a.age);
      setStale(items.slice(0, 8));
      setLoading(false);
    };
    load();
    return () => controller.abort();
  }, []);

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Stale Items</div>
        {stale.length > 0 && (
          <span style={{ fontSize: '0.68rem', background: 'rgba(251,191,36,0.15)', color: 'var(--amber)', borderRadius: 10, padding: '2px 8px', fontWeight: 700 }}>
            {stale.length}
          </span>
        )}
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[1, 2].map(i => <div key={i} className="shimmer" style={{ height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />)}
        </div>
      ) : stale.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
          ✅ Nothing stale — all items are fresh
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {stale.map((item, i) => (
            <div
              key={i}
              onClick={() => navigate(item.to)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 8, cursor: 'pointer',
                background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = `${item.color}44`; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <span style={{ fontSize: '0.9rem' }}>{item.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
              </div>
              <span style={{ fontSize: '0.7rem', color: item.color, fontFamily: 'var(--mono)', fontWeight: 700, flexShrink: 0 }}>
                {formatAge(item.age)}
              </span>
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
