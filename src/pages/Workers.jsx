import { usePolling } from '../hooks/usePolling';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

export default function Workers() {
  const { data: statusData } = usePolling(
    (signal) => api.workerStatus(signal),
    10000
  );

  const { data: historyData } = usePolling(
    (signal) => api.workerHistory(50, signal),
    15000
  );

  const workers = statusData?.workers || [];
  const runs = historyData?.runs || [];

  // Active vs idle workers
  const activeWorkers = workers.filter(w => w.status === 'active');
  const idleWorkers = workers.filter(w => w.status === 'idle');

  // Recent runs stats
  const recentSuccesses = runs.filter(r => r.succeeded).length;
  const recentFailures = runs.length - recentSuccesses;
  const successRate = runs.length > 0 ? (recentSuccesses / runs.length) * 100 : 0;

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
          Workers
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
          Worker agent status and execution history
        </p>
      </div>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            TOTAL WORKERS
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--text)' }}>
            {workers.length}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            ACTIVE
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--teal)' }}>
            {activeWorkers.length}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            IDLE
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: 'var(--muted)' }}>
            {idleWorkers.length}
          </div>
        </GlassCard>

        <GlassCard>
          <div style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
            SUCCESS RATE
          </div>
          <div style={{ fontSize: '36px', fontWeight: '600', color: successRate >= 80 ? 'var(--teal)' : '#f59e0b' }}>
            {successRate.toFixed(0)}%
          </div>
          <div style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>
            last {runs.length} runs
          </div>
        </GlassCard>
      </div>

      {/* Active Workers */}
      {activeWorkers.length > 0 && (
        <GlassCard style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
            Active Workers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {activeWorkers.map((worker, idx) => (
              <div key={idx} style={{ padding: '16px', borderRadius: '8px', background: 'var(--faint)', border: '1px solid var(--teal)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ 
                      width: '10px', 
                      height: '10px', 
                      borderRadius: '50%', 
                      background: 'var(--teal)',
                      animation: 'pulse 2s infinite'
                    }} />
                    <div style={{ 
                      fontSize: '14px', 
                      padding: '4px 10px', 
                      borderRadius: '4px', 
                      background: worker.agentType === 'programmer' ? 'var(--blue)' : worker.agentType === 'writer' ? '#a855f7' : worker.agentType === 'researcher' ? '#f59e0b' : worker.agentType === 'reviewer' ? '#10b981' : 'var(--teal)',
                      color: '#fff',
                      fontFamily: 'var(--mono)',
                      fontWeight: '600'
                    }}>
                      {worker.agentType}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    {worker.currentTaskId ? `Task: ${worker.currentTaskId.substring(0, 8)}` : 'Active'}
                  </div>
                </div>
                {worker.model && (
                  <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                    Model: {worker.model}
                  </div>
                )}
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Worker Status */}
      {workers.length > 0 && (
        <GlassCard style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
            All Workers
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {workers.map((worker, idx) => (
              <div key={idx} style={{ padding: '16px', borderRadius: '8px', background: 'var(--faint)', border: `1px solid ${worker.status === 'active' ? 'var(--teal)' : 'var(--border)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <div style={{ 
                    fontSize: '12px', 
                    padding: '4px 10px', 
                    borderRadius: '4px', 
                    background: worker.agentType === 'programmer' ? 'var(--blue)' : worker.agentType === 'writer' ? '#a855f7' : worker.agentType === 'researcher' ? '#f59e0b' : worker.agentType === 'reviewer' ? '#10b981' : 'var(--teal)',
                    color: '#fff',
                    fontFamily: 'var(--mono)',
                    fontWeight: '600'
                  }}>
                    {worker.agentType}
                  </div>
                  <div style={{ 
                    fontSize: '11px', 
                    padding: '3px 8px', 
                    borderRadius: '4px', 
                    background: worker.status === 'active' ? 'var(--teal)' : 'var(--border)',
                    color: worker.status === 'active' ? '#fff' : 'var(--text)',
                    fontFamily: 'var(--mono)',
                    fontWeight: '600'
                  }}>
                    {worker.status}
                  </div>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  {worker.currentTaskId ? `Working on ${worker.currentTaskId.substring(0, 8)}` : 'Idle'}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Execution History */}
      <GlassCard>
        <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
          Recent Executions
        </div>
        {runs.length === 0 ? (
          <div style={{ padding: '32px', textAlign: 'center', color: 'var(--muted)' }}>
            No execution history
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {runs.map((run, idx) => {
              const startTime = new Date(run.startedAt);
              const duration = run.duration || 0;
              
              return (
                <div key={idx} style={{ padding: '16px', borderRadius: '8px', background: 'var(--faint)', border: `1px solid ${run.succeeded ? 'var(--border)' : '#ef4444'}` }}>
                  <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: '8px', 
                        height: '8px', 
                        borderRadius: '50%', 
                        background: run.succeeded ? 'var(--teal)' : '#ef4444',
                        flexShrink: 0
                      }} />
                      <div style={{ 
                        fontSize: '12px', 
                        padding: '4px 10px', 
                        borderRadius: '4px', 
                        background: run.agentType === 'programmer' ? 'var(--blue)' : run.agentType === 'writer' ? '#a855f7' : run.agentType === 'researcher' ? '#f59e0b' : run.agentType === 'reviewer' ? '#10b981' : 'var(--teal)',
                        color: '#fff',
                        fontFamily: 'var(--mono)',
                        fontWeight: '600'
                      }}>
                        {run.agentType}
                      </div>
                      <span style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                        {run.model}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--mono)', textAlign: 'right' }}>
                      {startTime.toLocaleDateString()} {startTime.toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                    {run.taskId && <span>Task: {run.taskId.substring(0, 8)}</span>}
                    <span>Duration: {duration}s</span>
                    <span>Tokens: {(run.totalTokens || 0).toLocaleString()}</span>
                    <span>Cost: ${(run.totalCost || 0).toFixed(4)}</span>
                  </div>

                  {run.error && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '8px 12px', 
                      borderRadius: '6px', 
                      background: '#ef444420',
                      border: '1px solid #ef4444',
                      fontSize: '13px',
                      color: '#ef4444',
                      fontFamily: 'var(--mono)'
                    }}>
                      {run.error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
