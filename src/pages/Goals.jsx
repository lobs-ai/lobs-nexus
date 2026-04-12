import { usePolling } from '../hooks/usePolling';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

const STATUS_COLOR = {
  completed: 'var(--teal)',
  active: 'var(--blue)',
  in_progress: 'var(--blue)',
  inbox: 'var(--muted)',
  rejected: '#ef4444',
  cancelled: '#ef4444',
};

const STATUS_LABEL = {
  completed: 'done',
  active: 'active',
  in_progress: 'in progress',
  inbox: 'inbox',
  rejected: 'rejected',
  cancelled: 'cancelled',
};

function timeAgo(isoStr) {
  if (!isoStr) return null;
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function PriorityBar({ priority }) {
  const pct = Math.min(100, Math.max(0, priority ?? 0));
  const color = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : 'var(--teal)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{
        flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden',
      }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px' }} />
      </div>
      <span style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--mono)', minWidth: '28px' }}>
        {pct}
      </span>
    </div>
  );
}

function TaskBadge({ status, title }) {
  const color = STATUS_COLOR[status] ?? 'var(--muted)';
  const label = STATUS_LABEL[status] ?? status;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '8px 0', borderBottom: '1px solid var(--border)',
    }}>
      <span style={{
        fontSize: '11px', fontFamily: 'var(--mono)', color,
        minWidth: '70px', paddingTop: '1px', textTransform: 'uppercase',
      }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', color: 'var(--text)', lineHeight: '1.4' }}>
        {title}
      </span>
    </div>
  );
}

function GoalCard({ goal }) {
  const totalTasks = goal.openTaskCount + goal.completedTaskCount;
  const progressPct = totalTasks > 0
    ? Math.round((goal.completedTaskCount / totalTasks) * 100)
    : 0;

  return (
    <GlassCard style={{ marginBottom: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '6px', margin: '0 0 6px 0' }}>
            {goal.title}
          </h2>
          {goal.description && (
            <p style={{ fontSize: '13px', color: 'var(--muted)', margin: 0, lineHeight: '1.5' }}>
              {goal.description}
            </p>
          )}
        </div>
        <div style={{ marginLeft: '16px', textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', marginBottom: '4px' }}>
            PRIORITY
          </div>
          <div style={{ fontSize: '20px', fontWeight: '700', color: goal.priority >= 80 ? '#ef4444' : goal.priority >= 50 ? '#f59e0b' : 'var(--teal)' }}>
            {goal.priority ?? 0}
          </div>
        </div>
      </div>

      {/* Priority bar */}
      <div style={{ marginBottom: '16px' }}>
        <PriorityBar priority={goal.priority} />
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '2px' }}>OPEN TASKS</div>
          <div style={{ fontSize: '22px', fontWeight: '600', color: 'var(--blue)' }}>{goal.openTaskCount}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '2px' }}>COMPLETED</div>
          <div style={{ fontSize: '22px', fontWeight: '600', color: 'var(--teal)' }}>{goal.completedTaskCount}</div>
        </div>
        <div>
          <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '2px' }}>PROGRESS</div>
          <div style={{ fontSize: '22px', fontWeight: '600', color: progressPct >= 70 ? 'var(--teal)' : 'var(--muted)' }}>
            {progressPct}%
          </div>
        </div>
        {goal.lastWorked && (
          <div>
            <div style={{ fontSize: '11px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '2px' }}>LAST WORKED</div>
            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text)' }}>{timeAgo(goal.lastWorked)}</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      {totalTasks > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <div style={{ height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
            <div style={{
              width: `${progressPct}%`, height: '100%',
              background: progressPct >= 70 ? 'var(--teal)' : 'var(--blue)',
              borderRadius: '3px', transition: 'width 0.3s ease',
            }} />
          </div>
        </div>
      )}

      {/* Recent tasks */}
      {goal.recentTasks && goal.recentTasks.length > 0 && (
        <div>
          <div style={{ fontSize: '11px', fontFamily: 'var(--mono)', color: 'var(--muted)', marginBottom: '8px' }}>
            RECENT TASKS
          </div>
          <div>
            {goal.recentTasks.map(t => (
              <TaskBadge key={t.id} status={t.status} title={t.title} />
            ))}
          </div>
        </div>
      )}

      {goal.recentTasks && goal.recentTasks.length === 0 && (
        <div style={{ fontSize: '13px', color: 'var(--muted)', fontStyle: 'italic' }}>
          No tasks yet — goals worker will generate tasks on its next run.
        </div>
      )}
    </GlassCard>
  );
}

export default function Goals() {
  const { data, loading } = usePolling(
    (signal) => api.goals(signal),
    30000,
  );

  const goals = data?.goals ?? [];
  const totalOpen = goals.reduce((sum, g) => sum + g.openTaskCount, 0);
  const totalCompleted = goals.reduce((sum, g) => sum + g.completedTaskCount, 0);
  const lastWorked = goals
    .map(g => g.lastWorked)
    .filter(Boolean)
    .sort()
    .at(-1);

  return (
    <div style={{ padding: '32px', maxWidth: '960px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
          Goals
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
          Active goals driving autonomous work between conversations
        </p>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <GlassCard>
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '6px' }}>ACTIVE GOALS</div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--text)' }}>{goals.length}</div>
        </GlassCard>
        <GlassCard>
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '6px' }}>OPEN TASKS</div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--blue)' }}>{totalOpen}</div>
        </GlassCard>
        <GlassCard>
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '6px' }}>COMPLETED</div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--teal)' }}>{totalCompleted}</div>
        </GlassCard>
        <GlassCard>
          <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: '6px' }}>LAST WORKED</div>
          <div style={{ fontSize: '20px', fontWeight: '600', color: 'var(--text)' }}>
            {lastWorked ? timeAgo(lastWorked) : '—'}
          </div>
        </GlassCard>
      </div>

      {/* Goal cards */}
      {loading && goals.length === 0 && (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '48px' }}>
          Loading goals…
        </div>
      )}

      {!loading && goals.length === 0 && (
        <GlassCard>
          <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '32px' }}>
            No active goals. Add goals in the database to get started.
          </div>
        </GlassCard>
      )}

      {goals.map(goal => (
        <GoalCard key={goal.id} goal={goal} />
      ))}
    </div>
  );
}
