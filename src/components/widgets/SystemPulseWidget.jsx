import GlassCard from '../GlassCard';
import { usePolling } from '../../hooks/usePolling';
import { api } from '../../lib/api';

function PulseMetric({ label, value, status, icon }) {
  const colors = { ok: 'var(--green)', warning: 'var(--amber)', error: 'var(--red)', neutral: 'var(--muted)' };
  const color = colors[status] || colors.neutral;
  return (
    <div style={{ flex: 1, textAlign: 'center', padding: '8px 0' }}>
      <div style={{ fontSize: '1.1rem', marginBottom: 6 }}>{icon}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.68rem', color: 'var(--faint)', fontFamily: 'var(--mono)', marginTop: 6, letterSpacing: '1px', textTransform: 'uppercase' }}>{label}</div>
    </div>
  );
}

export default function SystemPulseWidget() {
  const { data: status } = usePolling(signal => api.status(signal), 10000);
  const { data: tasksData } = usePolling(signal => api.tasks({ limit: 200 }, signal), 15000);

  const tasks = tasksData?.tasks || tasksData || [];
  const active = tasks.filter(t => t.status === 'active').length;
  const completed = tasks.filter(t => t.status === 'completed').length;
  const total = active + completed;
  const successRate = total > 0 ? Math.round((completed / total) * 100) : 100;

  const metrics = [
    {
      label: 'Workers',
      value: status?.workers?.active ?? 0,
      status: (status?.workers?.active ?? 0) > 0 ? 'ok' : 'neutral',
      icon: '⚡',
    },
    {
      label: 'Queue',
      value: status?.tasks?.waiting ?? 0,
      status: (status?.tasks?.waiting ?? 0) > 10 ? 'warning' : (status?.tasks?.waiting ?? 0) > 0 ? 'ok' : 'neutral',
      icon: '📋',
    },
    {
      label: 'Success',
      value: `${successRate}%`,
      status: successRate >= 90 ? 'ok' : successRate >= 70 ? 'warning' : 'error',
      icon: '✓',
    },
    {
      label: 'Health',
      value: status?.server?.status === 'healthy' ? 'OK' : '??',
      status: status?.server?.status === 'healthy' ? 'ok' : 'warning',
      icon: '♥',
    },
  ];

  return (
    <GlassCard style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--green), var(--teal), transparent)', opacity: 0.6 }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div className="section-label" style={{ marginBottom: 0 }}>System Pulse</div>
      </div>
      <div style={{ display: 'flex', gap: 0 }}>
        {metrics.map((m, i) => (
          <div key={m.label} style={{ display: 'contents' }}>
            <PulseMetric {...m} />
            {i < metrics.length - 1 && (
              <div style={{ width: 1, background: 'var(--border)', margin: '8px 0' }} />
            )}
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
