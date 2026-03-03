import { useState, useRef, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { formatCost, formatTokens, formatDuration, timeAgo, AGENT_COLORS, TIER_COLORS } from '../lib/utils';

function CountUp({ value, prefix = '', suffix = '', duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!value) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.floor(eased * value));
      if (p < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <>{prefix}{display}{suffix}</>;
}

function HBar({ value, max, color, label, sublabel }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ color: 'var(--text)', fontSize: '0.82rem', fontWeight: 500 }}>{label}</span>
        <span style={{ color, fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--mono)' }}>{sublabel}</span>
      </div>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} /></div>
    </div>
  );
}

export default function Usage() {
  const [timeWindow, setTimeWindow] = useState('month');
  const [sortBy, setSortBy] = useState('startedAt');
  const [sortDir, setSortDir] = useState('desc');
  const { data: dashboard } = useApi(() => api.usageDashboard(timeWindow), [timeWindow]);
  const { data: workers } = useApi(() => api.workerHistory(100));

  const totals = dashboard?.totals || {};
  const summary = {
    totalCost: totals.estimated_cost_usd || 0,
    totalTokens: totals.total_tokens || 0,
    totalRuns: totals.task_count || totals.requests || 0,
  };
  const byModel = dashboard?.by_model || [];
  const costByModelArr = byModel.reduce((acc, m) => { acc[m.model || m.name] = m.estimated_cost_usd || m.cost || 0; return acc; }, {});
  const runsByAgentArr = {};
  (workerList || []).forEach(r => { if (r.agentType) runsByAgentArr[r.agentType] = (runsByAgentArr[r.agentType] || 0) + 1; });
  const costByModel = costByModelArr;
  const runsByAgent = runsByAgentArr;
  const successRate = workerList.length > 0 ? workerList.filter(r => r.succeeded).length / workerList.length : null;
  const workerList = workers?.runs || workers || [];
  const maxCost = Math.max(...Object.values(costByModel), 0.001);
  const maxRuns = Math.max(...Object.values(runsByAgent), 1);

  const sorted = [...workerList].sort((a, b) => {
    let av = a[sortBy], bv = b[sortBy];
    if (typeof av === 'string') av = av.toLowerCase(), bv = bv?.toLowerCase();
    return sortDir === 'asc' ? (av < bv ? -1 : 1) : (av > bv ? -1 : 1);
  });
  const toggleSort = (col) => { sortBy === col ? setSortDir(d => d === 'asc' ? 'desc' : 'asc') : (setSortBy(col), setSortDir('desc')); };

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>ANALYTICS</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Usage</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>Cost, token, and run analytics</p>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 28 }}>
          {['day', 'week', 'month'].map(w => (
            <button key={w} className={`hud-tab ${timeWindow === w ? 'active' : ''}`} onClick={() => setTimeWindow(w)}>{w.charAt(0).toUpperCase() + w.slice(1)}</button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Cost', value: summary.totalCost, display: formatCost(summary.totalCost), color: 'var(--teal)' },
            { label: 'Tokens Used', value: summary.totalTokens, display: formatTokens(summary.totalTokens), color: 'var(--blue)' },
            { label: 'Total Runs', value: summary.totalRuns, display: summary.totalRuns ?? '--', color: 'var(--purple)' },
            { label: 'Success Rate', value: successRate != null ? Math.round(successRate * 100) : null, display: successRate != null ? `${Math.round(successRate * 100)}%` : '--', color: 'var(--green)' },
          ].map((s, i) => (
            <div key={i} className={`hud-stat-card fade-in-up-${i+1}`}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)`, opacity: 0.6, borderRadius: '14px 14px 0 0' }} />
              <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 10 }}>{s.label}</div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: 'var(--mono)', letterSpacing: '-2px' }}>{s.display}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <GlassCard className="fade-in-up-3">
            <div className="section-label" style={{ marginBottom: 4 }}>Breakdown</div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Cost by Model</h3>
            {Object.keys(costByModel).length === 0 ? <div style={{ color: 'var(--muted)' }}>No data</div> :
              Object.entries(costByModel).sort(([,a],[,b]) => b-a).map(([model, cost]) =>
                <HBar key={model} value={cost} max={maxCost} color="var(--teal)" label={model} sublabel={formatCost(cost)} />
              )}
          </GlassCard>
          <GlassCard className="fade-in-up-4">
            <div className="section-label" style={{ marginBottom: 4 }}>Utilization</div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Runs by Agent</h3>
            {Object.keys(runsByAgent).length === 0 ? <div style={{ color: 'var(--muted)' }}>No data</div> :
              Object.entries(runsByAgent).sort(([,a],[,b]) => b-a).map(([agent, runs]) =>
                <HBar key={agent} value={runs} max={maxRuns} color={AGENT_COLORS[agent] || 'var(--blue)'} label={agent} sublabel={`${runs} runs`} />
              )}
          </GlassCard>
        </div>

        {successRate != null && (
          <GlassCard className="fade-in-up-5" style={{ marginBottom: 28 }}>
            <div className="section-label" style={{ marginBottom: 4 }}>Reliability</div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>Success vs Failure</h3>
            <div style={{ display: 'flex', height: 12, borderRadius: 10, overflow: 'hidden', gap: 2 }}>
              <div style={{ width: `${Math.round(successRate * 100)}%`, background: 'linear-gradient(90deg, var(--green), var(--teal))', transition: 'width 1s ease' }} />
              <div style={{ flex: 1, background: 'var(--red)' }} />
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 10 }}>
              <span style={{ color: 'var(--green)', fontSize: '0.78rem', fontFamily: 'var(--mono)', fontWeight: 600 }}>✓ {Math.round(successRate * 100)}% success</span>
              <span style={{ color: 'var(--red)', fontSize: '0.78rem', fontFamily: 'var(--mono)', fontWeight: 600 }}>✗ {Math.round((1 - successRate) * 100)}% failure</span>
            </div>
          </GlassCard>
        )}

        {workerList.length > 0 && (
          <GlassCard className="fade-in-up-6">
            <div className="section-label" style={{ marginBottom: 4 }}>History</div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Worker Runs</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="hud-table">
                <thead><tr>
                  {[{ key: 'agentType', label: 'Agent' }, { key: 'model', label: 'Model' }, { key: 'succeeded', label: 'Status' }, { key: 'cost', label: 'Cost' }, { key: 'startedAt', label: 'Started' }, { key: 'duration', label: 'Duration' }].map(col => (
                    <th key={col.key} onClick={() => toggleSort(col.key)} style={{ cursor: 'pointer', userSelect: 'none' }}>{col.label} {sortBy === col.key ? (sortDir === 'asc' ? '↑' : '↓') : ''}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {sorted.slice(0, 50).map((r, i) => (
                    <tr key={r.id || i}>
                      <td style={{ color: AGENT_COLORS[r.agentType] || 'var(--text)', fontWeight: 600, textTransform: 'capitalize' }}>{r.agentType || '--'}</td>
                      <td style={{ color: 'var(--blue)', fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{r.model || '--'}</td>
                      <td><span style={{ color: r.succeeded ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{r.succeeded ? '✓ OK' : '✗ FAIL'}</span></td>
                      <td style={{ color: 'var(--teal)', fontFamily: 'var(--mono)' }}>{formatCost(r.cost)}</td>
                      <td style={{ color: 'var(--muted)' }}>{timeAgo(r.startedAt)}</td>
                      <td style={{ color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{formatDuration(r.startedAt, r.endedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
