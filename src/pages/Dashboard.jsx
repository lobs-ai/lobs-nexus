import { usePolling } from '../hooks/usePolling';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

export default function Dashboard() {
  const { data: overview, loading: loadingOverview } = usePolling(
    (signal) => api.status(signal),
    10000
  );
  
  const { data: tasksData } = usePolling(
    (signal) => api.tasks({ status: 'active' }, signal),
    15000
  );
  
  const { data: history } = usePolling(
    (signal) => api.workerHistory(5, signal),
    20000
  );

  const activeTasks = Array.isArray(tasksData) ? tasksData : (tasksData?.tasks || []);
  const recentRuns = Array.isArray(history) ? history : (history?.runs || []);
  
  // Compute stats
  const activeWorkers = typeof overview?.workers?.active === 'number' ? overview.workers.active : (Array.isArray(overview?.workers) ? overview.workers.filter(w => w.status === 'active').length : 0);
  const tasksCompletedToday = recentRuns.filter(r => {
    const startTime = new Date(r.startedAt);
    const today = new Date();
    return startTime.toDateString() === today.toDateString() && r.succeeded;
  }).length;
  
  const totalCostToday = recentRuns
    .filter(r => {
      const startTime = new Date(r.startedAt);
      const today = new Date();
      return startTime.toDateString() === today.toDateString();
    })
    .reduce((sum, r) => sum + (r.totalCost || 0), 0);

  const systemServices = [
    { name: 'lobs-core', status: overview?.server?.status || 'unknown' },
    { name: 'memory-server', status: overview?.memory?.status || 'unknown' },
    { name: 'LM Studio', status: overview?.lmstudio?.status || 'unknown' },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
          System overview and active work
        </p>
      </div>

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            ACTIVE WORKERS
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--teal)' }}>
            {activeWorkers}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            COMPLETED TODAY
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--blue)' }}>
            {tasksCompletedToday}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            COST TODAY
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--text)' }}>
            ${totalCostToday.toFixed(3)}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            ACTIVE TASKS
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--text)' }}>
            {activeTasks.length}
          </div>
        </GlassCard>
      </div>

      {/* System Status */}
      <GlassCard style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
          System Status
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {systemServices.map(service => (
            <div key={service.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '8px', background: 'var(--faint)' }}>
              <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '14px' }}>
                {service.name}
              </span>
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: service.status === 'healthy' || service.status === 'ok' ? 'var(--teal)' : service.status === 'unknown' ? 'var(--muted)' : '#f59e0b',
                fontFamily: 'var(--mono)'
              }}>
                {service.status.toUpperCase()}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Active Tasks */}
      <GlassCard style={{ marginBottom: '24px' }}>
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
          Active Tasks
        </div>
        {activeTasks.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
            No active tasks
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeTasks.slice(0, 5).map(task => (
              <div key={task.id} style={{ padding: '16px', borderRadius: '8px', background: 'var(--faint)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ fontSize: '15px', fontWeight: '500', color: 'var(--text)' }}>
                    {task.title}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    padding: '4px 8px', 
                    borderRadius: '4px', 
                    background: task.agent === 'programmer' ? 'var(--blue)' : task.agent === 'writer' ? '#a855f7' : task.agent === 'researcher' ? '#f59e0b' : 'var(--teal)',
                    color: '#fff',
                    fontFamily: 'var(--mono)',
                    fontWeight: '600'
                  }}>
                    {task.agent || 'unassigned'}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  {task.modelTier || 'standard'} • {task.project || 'no project'}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Recent Completions */}
      <GlassCard>
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
          Recent Completions
        </div>
        {recentRuns.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
            No recent worker runs
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentRuns.map((run, idx) => (
              <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', borderRadius: '6px', background: 'var(--faint)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    background: run.succeeded ? 'var(--teal)' : '#ef4444' 
                  }} />
                  <span style={{ fontSize: '14px', color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                    {run.agentType}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--muted)' }}>
                    {run.model}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  {run.totalTokens?.toLocaleString() || 0} tokens • ${(run.totalCost || 0).toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
