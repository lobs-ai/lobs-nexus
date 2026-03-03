import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatCost, formatTokens, formatDuration, timeAgo, AGENT_COLORS, TIER_COLORS } from '../lib/utils';

function HBar({ value, max, color, label, sublabel }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ color: 'var(--text)', fontSize: '0.82rem' }}>{label}</span>
        <span style={{ color, fontSize: '0.82rem', fontWeight: 600 }}>{sublabel}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 4, height: 8 }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
      </div>
    </div>
  );
}

export default function Usage() {
  const [window, setWindow] = useState('month');
  const [sortBy, setSortBy] = useState('startedAt');
  const [sortDir, setSortDir] = useState('desc');

  const { data: dashboard } = useApi(() => api.usageDashboard(window), [window]);
  const { data: workers } = useApi(() => api.workerHistory(100));

  const summary = dashboard?.summary || {};
  const costByModel = dashboard?.costByModel || {};
  const runsByAgent = dashboard?.runsByAgent || {};
  const successRate = dashboard?.successRate;
  const workerList = workers?.runs || workers || [];

  const maxCost = Math.max(...Object.values(costByModel), 0.001);
  const maxRuns = Math.max(...Object.values(runsByAgent), 1);

  const sorted = [...workerList].sort((a, b) => {
    let av = a[sortBy], bv = b[sortBy];
    if (typeof av === 'string') av = av.toLowerCase(), bv = bv?.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const winBtnStyle = (w) => ({
    background: window === w ? 'rgba(45,212,191,0.1)' : 'transparent',
    border: `1px solid ${window === w ? 'rgba(45,212,191,0.4)' : 'var(--border)'}`,
    borderRadius: 6, padding: '4px 12px', color: window === w ? 'var(--teal)' : 'var(--muted)',
    cursor: 'pointer', fontSize: '0.78rem', fontWeight: window === w ? 600 : 400,
  });

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <span className="section-label">Analytics</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>
          <span className="gradient-text">Usage</span>
        </h1>
        <p style={{ color: 'var(--muted)' }}>Cost, token, and run analytics</p>
      </div>

      {/* Window toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {['day', 'week', 'month'].map(w => (
          <button key={w} style={winBtnStyle(w)} onClick={() => setWindow(w)}>{w.charAt(0).toUpperCase() + w.slice(1)}</button>
        ))}
      </div>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Cost', value: formatCost(summary.totalCost), color: 'var(--teal)' },
          { label: 'Tokens Used', value: formatTokens(summary.totalTokens), color: 'var(--blue)' },
          { label: 'Total Runs', value: summary.totalRuns ?? '--', color: 'var(--purple)' },
          { label: 'Success Rate', value: successRate != null ? `${Math.round(successRate * 100)}%` : '--', color: 'var(--green)' },
        ].map((s, i) => (
          <GlassCard key={i}>
            <div style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: s.color }}>{s.value}</div>
          </GlassCard>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Cost by model */}
        <GlassCard>
          <h3 style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 16, fontSize: '0.95rem' }}>Cost by Model</h3>
          {Object.keys(costByModel).length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No data</div>
          ) : Object.entries(costByModel)
              .sort(([, a], [, b]) => b - a)
              .map(([model, cost]) => (
                <HBar key={model} value={cost} max={maxCost} color="var(--teal)" label={model} sublabel={formatCost(cost)} />
              ))
          }
        </GlassCard>

        {/* Runs by agent */}
        <GlassCard>
          <h3 style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 16, fontSize: '0.95rem' }}>Runs by Agent</h3>
          {Object.keys(runsByAgent).length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No data</div>
          ) : Object.entries(runsByAgent)
              .sort(([, a], [, b]) => b - a)
              .map(([agent, runs]) => (
                <HBar key={agent} value={runs} max={maxRuns} color={AGENT_COLORS[agent] || 'var(--blue)'} label={agent} sublabel={`${runs} runs`} />
              ))
          }
        </GlassCard>
      </div>

      {/* Success/failure bar */}
      {successRate != null && (
        <GlassCard style={{ marginBottom: 28 }}>
          <h3 style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 16, fontSize: '0.95rem' }}>Success vs Failure</h3>
          <div style={{ display: 'flex', height: 20, borderRadius: 10, overflow: 'hidden', gap: 2 }}>
            <div style={{ width: `${Math.round(successRate * 100)}%`, background: 'var(--green)', transition: 'width 0.4s' }} />
            <div style={{ flex: 1, background: 'var(--red)' }} />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
            <span style={{ color: 'var(--green)', fontSize: '0.78rem' }}>✓ {Math.round(successRate * 100)}% success</span>
            <span style={{ color: 'var(--red)', fontSize: '0.78rem' }}>✗ {Math.round((1 - successRate) * 100)}% failure</span>
          </div>
        </GlassCard>
      )}

      {/* Worker runs table */}
      <GlassCard>
        <h3 style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 16 }}>Worker Run History</h3>
        {workerList.length === 0 ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>No runs yet</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {[
                    { key: 'agentType', label: 'Agent' },
                    { key: 'model', label: 'Model' },
                    { key: 'succeeded', label: 'Status' },
                    { key: 'cost', label: 'Cost' },
                    { key: 'startedAt', label: 'Started' },
                    { key: 'duration', label: 'Duration' },
                  ].map(col => (
                    <th
                      key={col.key}
                      onClick={() => toggleSort(col.key)}
                      style={{ color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px', padding: '0 12px 10px', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}
                    >
                      {col.label} {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, 50).map((r, i) => (
                  <tr key={r.id || i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '10px 12px', color: AGENT_COLORS[r.agentType] || 'var(--text)', fontSize: '0.82rem', textTransform: 'capitalize' }}>{r.agentType || '--'}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--blue)', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>{r.model || '--'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <Badge label={r.succeeded ? 'success' : 'failed'} color={r.succeeded ? 'var(--green)' : 'var(--red)'} dot />
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--teal)', fontSize: '0.82rem', fontFamily: 'var(--mono)' }}>{formatCost(r.cost)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '0.78rem' }}>{timeAgo(r.startedAt)}</td>
                    <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>{formatDuration(r.startedAt, r.endedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
