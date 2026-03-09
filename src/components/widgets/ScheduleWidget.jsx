import { useState, useEffect } from 'react';
import GlassCard from '../GlassCard';
import { api } from '../../lib/api';
import { timeAgo } from '../../lib/utils';

export default function ScheduleWidget() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      const schedule = [];
      try {
        const tasks = await api.tasks({ limit: 100 }, controller.signal);
        const list = tasks?.tasks || tasks || [];
        list
          .filter(t => t.status === 'active' || t.status === 'waiting')
          .sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0))
          .slice(0, 5)
          .forEach(t => {
            schedule.push({
              title: t.title,
              time: t.created_at,
              type: 'task',
              status: t.status,
              agent: t.agent,
            });
          });
      } catch {}
      setItems(schedule);
      setLoading(false);
    };
    load();
    return () => controller.abort();
  }, []);

  const AGENT_COLORS = {
    programmer: 'var(--blue)',
    writer: 'var(--purple)',
    researcher: 'var(--amber)',
    reviewer: 'var(--green)',
    architect: 'var(--teal)',
  };

  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>Schedule</div>
        <span style={{ marginLeft: 'auto', color: 'var(--teal)', fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>{timeStr}</span>
      </div>
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3].map(i => <div key={i} className="shimmer" style={{ height: 40, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />)}
        </div>
      ) : items.length === 0 ? (
        <div style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '16px 0' }}>
          No upcoming items
        </div>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 20 }}>
          {/* Timeline line */}
          <div style={{ position: 'absolute', left: 6, top: 4, bottom: 4, width: 1, background: 'var(--border)' }} />
          {/* Current time marker */}
          <div style={{ position: 'absolute', left: 2, top: 0, width: 9, height: 9, borderRadius: '50%', background: 'var(--teal)', boxShadow: '0 0 8px var(--teal)' }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {items.map((item, i) => {
              const color = AGENT_COLORS[item.agent] || 'var(--muted)';
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -16, top: 6, width: 7, height: 7, borderRadius: '50%', background: color + '44', border: `1.5px solid ${color}` }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 500, lineHeight: 1.4 }}>{item.title}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 3 }}>
                      {item.agent && <span style={{ fontSize: '0.68rem', color, fontFamily: 'var(--mono)', textTransform: 'capitalize' }}>{item.agent}</span>}
                      {item.time && <span style={{ fontSize: '0.68rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>{timeAgo(item.time)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </GlassCard>
  );
}
