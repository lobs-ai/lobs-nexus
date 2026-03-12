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

function AreaChart({ data, height = 180 }) {
  if (!data || data.length === 0) {
    return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '32px 0', fontSize: '0.85rem' }}>No trend data yet — data will appear once usage is captured.</div>;
  }

  const COLORS = ['#2dd4bf', '#60a5fa', '#a78bfa', '#34d399', '#f59e0b', '#ec4899'];
  const padLeft = 52, padRight = 16, padTop = 12, padBottom = 32;
  const vbW = 600;
  const W = vbW - padLeft - padRight;
  const H = height - padTop - padBottom;

  const providers = [...new Set(data.flatMap(d => Object.keys(d.providers || {})))];
  const maxVal = Math.max(...data.map(d => Object.values(d.providers || {}).reduce((s, v) => s + v, 0)), 0.0001);

  const xScale = (i) => padLeft + (i / Math.max(data.length - 1, 1)) * W;
  const yScale = (v) => padTop + H - (v / maxVal) * H;

  const stackedPaths = providers.map((prov, pi) => {
    const points = data.map((d, i) => {
      const below = providers.slice(0, pi).reduce((s, p) => s + (d.providers?.[p] || 0), 0);
      const val = below + (d.providers?.[prov] || 0);
      return { x: xScale(i), y: yScale(val), yBelow: yScale(below) };
    });
    const top = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const bottom = [...points].reverse().map((p, i) => `L${p.x.toFixed(1)},${p.yBelow.toFixed(1)}`).join(' ');
    return { path: `${top} ${bottom} Z`, line: top, prov, color: COLORS[pi % COLORS.length] };
  });

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(t => ({ val: maxVal * t, y: yScale(maxVal * t) }));
  const xStep = Math.max(1, Math.floor(data.length / 6));
  const xTickData = data.filter((_, i) => i % xStep === 0 || i === data.length - 1);

  return (
    <div style={{ width: '100%' }}>
      <svg viewBox={`0 0 ${vbW} ${height}`} style={{ width: '100%' }}>
        {yTicks.map((t, i) => (
          <g key={i}>
            <line x1={padLeft} y1={t.y} x2={padLeft + W} y2={t.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
            <text x={padLeft - 6} y={t.y + 4} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="end" fontFamily="monospace">
              ${t.val < 0.01 ? t.val.toFixed(4) : t.val < 0.1 ? t.val.toFixed(3) : t.val.toFixed(2)}
            </text>
          </g>
        ))}
        {stackedPaths.map(({ path, color, prov }) => (
          <path key={prov} d={path} fill={color} fillOpacity="0.15" />
        ))}
        {stackedPaths.map(({ line, color, prov }) => (
          <path key={prov} d={line} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" />
        ))}
        {xTickData.map((d, i) => {
          const idx = data.indexOf(d);
          return (
            <text key={i} x={xScale(idx)} y={padTop + H + 20} fill="rgba(255,255,255,0.35)" fontSize="9" textAnchor="middle" fontFamily="monospace">
              {d.date?.slice(5)}
            </text>
          );
        })}
      </svg>
      {providers.length > 0 && (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 6 }}>
          {providers.map((p, i) => (
            <span key={p} style={{ fontSize: '0.72rem', color: COLORS[i % COLORS.length], fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 12, height: 2, background: COLORS[i % COLORS.length], display: 'inline-block', borderRadius: 2 }} />
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Usage() {
  const [timeWindow, setTimeWindow] = useState('month');
  const [sortBy, setSortBy] = useState('startedAt');
  const [sortDir, setSortDir] = useState('desc');
  const { data: dashboard } = useApi(signal => api.usageDashboard(timeWindow, signal), [timeWindow]);
  const { data: projection } = useApi(signal => api.usageProjection(signal), []);
  const { data: workers } = useApi(signal => api.workerHistory(100, signal));

  const workerList = Array.isArray(workers?.runs) ? workers.runs : Array.isArray(workers) ? workers : [];
  const totals = dashboard?.totals || {};
  const summary = {
    totalCost: totals.estimated_cost_usd || 0,
    totalTokens: totals.total_tokens || 0,
    totalRuns: totals.task_count || totals.requests || 0,
  };
  const byModel = dashboard?.by_model || [];
  const byProvider = dashboard?.by_provider || [];
  const dailySeries = dashboard?.daily_series || [];

  const chartData = dailySeries.map(d => {
    const providers = {};
    if (d.by_provider && Array.isArray(d.by_provider)) {
      d.by_provider.forEach(p => { providers[p.provider || p.name] = p.estimated_cost_usd || p.cost || 0; });
    } else if (d.provider) {
      providers[d.provider] = d.estimated_cost_usd || d.cost || 0;
    } else {
      providers['total'] = d.estimated_cost_usd || d.cost || 0;
    }
    return { date: d.date, providers };
  });

  const costByModelArr = byModel.reduce((acc, m) => { acc[m.model || m.name] = m.estimated_cost_usd || m.cost || 0; return acc; }, {});
  const runsByAgentArr = {};
  (workerList || []).forEach(r => { if (r.agentType) runsByAgentArr[r.agentType] = (runsByAgentArr[r.agentType] || 0) + 1; });
  const costByModel = costByModelArr;
  const runsByAgent = runsByAgentArr;
  const successRate = workerList.length > 0 ? workerList.filter(r => r.succeeded).length / workerList.length : null;
  const maxCost = Math.max(...Object.values(costByModel), 0.001);
  const maxRuns = Math.max(...Object.values(runsByAgent), 1);
  const maxProviderCost = Math.max(...byProvider.map(p => p.estimated_cost_usd || p.cost || 0), 0.001);

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

        {/* Daily Cost Trend */}
        <GlassCard className="fade-in-up-2" style={{ marginBottom: 28 }}>
          <div className="section-label" style={{ marginBottom: 4 }}>Trend</div>
          <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Daily Cost Over Time</h3>
          <AreaChart data={chartData} height={180} />
        </GlassCard>

        {/* Projection + Provider breakdown */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
          <GlassCard className="fade-in-up-3" style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--teal), transparent)', opacity: 0.6, borderRadius: '14px 14px 0 0' }} />
            <div className="section-label" style={{ marginBottom: 4 }}>Forecast</div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Month Projection</h3>
            {projection ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Month-to-Date', value: formatCost(projection.month_to_date ?? projection.mtd_cost ?? 0), color: 'var(--teal)' },
                  { label: 'Daily Burn Rate', value: `${formatCost(projection.daily_burn_rate ?? projection.daily_rate ?? 0)}/day`, color: 'var(--blue)' },
                  { label: 'Projected Month-End', value: formatCost(projection.projected_month_end ?? projection.projected_cost ?? 0), color: 'var(--purple)' },
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'rgba(255,255,255,0.03)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>{row.label}</span>
                    <span style={{ color: row.color, fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '1rem' }}>{row.value}</span>
                  </div>
                ))}
                {projection.days_remaining != null && (
                  <div style={{ color: 'var(--muted)', fontSize: '0.72rem', fontFamily: 'var(--mono)', textAlign: 'right', marginTop: 4 }}>
                    {projection.days_elapsed ?? '--'}d elapsed · {projection.days_remaining}d remaining
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Loading…</div>
            )}
          </GlassCard>

          <GlassCard className="fade-in-up-4">
            <div className="section-label" style={{ marginBottom: 4 }}>Breakdown</div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Cost by Provider</h3>
            {byProvider.length === 0 ? <div style={{ color: 'var(--muted)' }}>No data</div> :
              [...byProvider].sort((a, b) => (b.estimated_cost_usd || b.cost || 0) - (a.estimated_cost_usd || a.cost || 0)).map(p => (
                <HBar key={p.provider || p.name}
                  value={p.estimated_cost_usd || p.cost || 0}
                  max={maxProviderCost}
                  color="var(--blue)"
                  label={p.provider || p.name}
                  sublabel={formatCost(p.estimated_cost_usd || p.cost || 0)}
                />
              ))
            }
          </GlassCard>
        </div>

        {/* Cost by model + Runs by agent */}
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
