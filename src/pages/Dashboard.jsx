import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import { timeAgo, formatDuration, formatUptime, AGENT_COLORS } from '../lib/utils';

function CountUp({ value, duration = 1000 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!value) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <>{display}</>;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: status } = usePolling(() => api.status(), 10000);
  const { data: activity } = usePolling(() => api.activity(), 10000);
  const { data: workerStatus } = usePolling(() => api.workerStatus(), 5000);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const workers = workerStatus?.workers || [];
  const activities = (activity || []).slice(0, 10);

  const activityIcons = {
    worker_completed: { icon: '✓', color: 'var(--green)' },
    worker_failed: { icon: '✗', color: 'var(--red)' },
    worker_spawned: { icon: '⚡', color: 'var(--teal)' },
  };

  return (
    <div style={{ position: 'relative' }}>
      {/* Orbs */}
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-3" style={{ position: 'fixed', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Hero header */}
        <div style={{ marginBottom: 40 }}>
          <span className="section-label">Command Center</span>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: 8 }}>
            <span className="gradient-text">Lobs Nexus</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1rem' }}>
            Real-time PAW multi-agent system dashboard
          </p>
        </div>

        {/* Hero Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            {
              label: 'Tasks Completed', 
              value: status?.tasks?.completed_today,
              sub: 'today',
              color: 'var(--teal)',
            },
            {
              label: 'Active Workers',
              value: status?.workers?.active,
              sub: `${status?.workers?.total_completed || 0} total runs`,
              color: 'var(--blue)',
            },
            {
              label: 'Active Tasks',
              value: status?.tasks?.active,
              sub: `${status?.tasks?.waiting || 0} waiting`,
              color: 'var(--purple)',
            },
            {
              label: 'System Uptime',
              value: null,
              display: formatUptime(status?.server?.uptime_seconds),
              sub: status?.server?.status || 'checking',
              color: 'var(--green)',
            },
          ].map((stat, i) => (
            <GlassCard key={i} style={{ animationDelay: `${i * 0.1}s` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 8 }}>{stat.label}</div>
                  <div style={{ fontSize: '2.4rem', fontWeight: 800, color: stat.color, lineHeight: 1 }}>
                    {stat.display || (stat.value != null ? <CountUp value={stat.value} /> : '--')}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 4 }}>{stat.sub}</div>
                </div>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: stat.color, marginTop: 4 }} className="pulse-dot" />
              </div>
            </GlassCard>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Active Workers */}
            <GlassCard>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ color: 'var(--text)', fontWeight: 700 }}>Active Workers</h3>
                <Badge
                  label={`${workers.length} running`}
                  color={workers.length > 0 ? 'var(--teal)' : 'var(--muted)'}
                  dot
                />
              </div>
              {workers.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontSize: '0.9rem', padding: '20px 0', textAlign: 'center' }}>
                  No active workers — system idle
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {workers.map(w => (
                    <div key={w.id || w.workerId} style={{ background: 'rgba(11,15,30,0.5)', border: '1px solid var(--border)', borderRadius: 10, padding: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: AGENT_COLORS[w.agentType] || 'var(--teal)', display: 'inline-block' }} className="pulse-dot" />
                          <span style={{ color: AGENT_COLORS[w.agentType] || 'var(--teal)', fontWeight: 600, textTransform: 'capitalize' }}>{w.agentType}</span>
                        </div>
                        <span style={{ color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>
                          {formatDuration(w.startedAt, null)}
                        </span>
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 4 }}>
                        {w.taskId ? `Task: ${w.taskId.slice(0, 8)}...` : 'Running...'}
                      </div>
                      {w.model && (
                        <span style={{ fontSize: '0.72rem', color: 'var(--blue)', fontFamily: 'var(--mono)' }}>{w.model}</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* Quick Actions */}
            <GlassCard>
              <h3 style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 16 }}>Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                {[
                  { label: 'New Task', color: 'var(--teal)', to: '/tasks' },
                  { label: 'View Inbox', color: 'var(--blue)', to: '/inbox' },
                  { label: 'Workflows', color: 'var(--purple)', to: '/workflows' },
                  { label: 'Projects', color: 'var(--amber)', to: '/projects' },
                  { label: 'Usage', color: 'var(--green)', to: '/usage' },
                  { label: 'Team', color: 'var(--red)', to: '/team' },
                ].map(a => (
                  <button
                    key={a.to}
                    onClick={() => navigate(a.to)}
                    style={{ background: a.color + '11', border: `1px solid ${a.color}33`, borderRadius: 8, padding: '12px 8px', color: a.color, fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', textAlign: 'center' }}
                    onMouseEnter={e => { e.target.style.background = a.color + '22'; e.target.style.boxShadow = `0 0 20px ${a.color}33`; }}
                    onMouseLeave={e => { e.target.style.background = a.color + '11'; e.target.style.boxShadow = 'none'; }}
                  >
                    {a.label}
                  </button>
                ))}
              </div>
            </GlassCard>
          </div>

          {/* Activity Feed */}
          <GlassCard>
            <h3 style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 20 }}>Activity Feed</h3>
            {activities.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {activities.map((a, i) => {
                  const meta = activityIcons[a.type] || { icon: '·', color: 'var(--muted)' };
                  return (
                    <div key={i} className="timeline-item" style={{ marginBottom: 16 }}>
                      <div className="timeline-dot" style={{ background: meta.color + '22', borderColor: meta.color, color: meta.color, fontSize: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16 }}>
                        {meta.icon}
                      </div>
                      <div style={{ marginLeft: 4 }}>
                        <div style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 500, lineHeight: 1.3 }}>{a.title}</div>
                        <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: 2 }}>{timeAgo(a.timestamp)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
