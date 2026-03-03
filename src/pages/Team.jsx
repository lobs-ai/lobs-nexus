import { useState, useRef, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useApi } from '../hooks/useApi';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import { timeAgo, formatDuration, AGENT_COLORS } from '../lib/utils';

const AGENT_ICONS = {
  programmer: '⟨/⟩',
  writer: '✍',
  researcher: '🔍',
  reviewer: '✓',
  architect: '⬡',
};

const AGENT_LABELS = {
  programmer: 'Code Engineer',
  writer: 'Content Writer',
  researcher: 'Researcher',
  reviewer: 'QA Reviewer',
  architect: 'Sys Architect',
};

function CountUp({ value, duration = 900 }) {
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
  return <>{display}</>;
}

export default function Team() {
  const { data: agents, loading } = usePolling(() => api.agents(), 10000);
  const { data: history } = useApi(() => api.workerHistory(200));
  const [selected, setSelected] = useState(null);

  const agentList = agents || [];
  const historyList = history?.runs || history || [];

  const getHistory = (agentType) => historyList.filter(r => r.agentType === agentType);

  const totalRuns = historyList.length;
  const activeAgents = agentList.filter(a => a.status?.currentTaskId).length;
  const overallSuccess = historyList.length > 0
    ? Math.round(historyList.filter(r => r.succeeded).length / historyList.length * 100)
    : null;

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* Header */}
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>WORKFORCE</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Agent Team</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>Specialized agents powering the PAW system</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Active Agents', value: activeAgents, color: 'var(--teal)', dot: true },
            { label: 'Total Agents', value: agentList.length, color: 'var(--blue)' },
            { label: 'Total Runs', value: totalRuns, color: 'var(--purple)' },
            { label: 'Success Rate', value: overallSuccess, display: overallSuccess != null ? `${overallSuccess}%` : '--', color: 'var(--green)' },
          ].map((s, i) => (
            <div key={i} className={`hud-stat-card fade-in-up-${i+1}`}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)`, opacity: 0.6, borderRadius: '14px 14px 0 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 10 }}>{s.label}</div>
                {s.dot && activeAgents > 0 && <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, color: s.color, display: 'block', marginTop: 2 }} />}
              </div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: 'var(--mono)', letterSpacing: '-2px' }}>
                {s.display || (s.value != null ? <CountUp value={s.value} /> : '--')}
              </div>
            </div>
          ))}
        </div>

        {/* Agent Cards */}
        {loading ? <LoadingSkeleton lines={4} height={160} /> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20, marginBottom: 36 }}>
            {agentList.map((agent, i) => {
              const color = AGENT_COLORS[agent.agentType] || 'var(--teal)';
              const st = agent.status;
              const isBusy = !!(st?.currentTaskId);
              const agentHistory = getHistory(agent.agentType);
              const successRate = agentHistory.length > 0
                ? Math.round(agentHistory.filter(r => r.succeeded).length / agentHistory.length * 100)
                : null;
              const stats = st?.stats || {};

              return (
                <div
                  key={agent.agentType}
                  className={`glass-card p-6 fade-in-up-${Math.min(i+1, 6)}`}
                  onClick={() => setSelected(agent)}
                  style={{
                    cursor: 'pointer', transition: 'all 0.25s',
                    borderColor: isBusy ? color + '55' : undefined,
                    boxShadow: isBusy ? `0 0 30px ${color}18` : undefined,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = color + '66'; e.currentTarget.style.boxShadow = `0 0 40px ${color}20`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = isBusy ? color + '55' : 'var(--border)'; e.currentTarget.style.boxShadow = isBusy ? `0 0 30px ${color}18` : 'none'; e.currentTarget.style.transform = ''; }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: '12px 12px 0 0', opacity: isBusy ? 1 : 0.5 }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: color + '18', border: `1.5px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: '1.1rem', fontFamily: 'var(--mono)', fontWeight: 700, flexShrink: 0, boxShadow: isBusy ? `0 0 16px ${color}30` : 'none' }}>
                      {AGENT_ICONS[agent.agentType] || agent.agentType?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <h3 style={{ color: 'var(--text)', fontWeight: 800, textTransform: 'capitalize', fontSize: '1rem' }}>{agent.displayName || agent.agentType}</h3>
                        <span className={isBusy ? 'pulse-dot' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: isBusy ? color : 'var(--faint)', color: isBusy ? color : 'var(--faint)', display: 'block' }} />
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'var(--mono)', marginBottom: 4 }}>{AGENT_LABELS[agent.agentType] || agent.agentType}</div>
                      <div style={{ color: isBusy ? color : 'var(--faint)', fontSize: '0.78rem', fontWeight: isBusy ? 600 : 400 }}>
                        {isBusy ? '● Working...' : '○ Idle'}
                      </div>
                    </div>
                  </div>

                  {isBusy && st?.activity && (
                    <div style={{ background: color + '0a', border: `1px solid ${color}22`, borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                      {st.activity.slice(0, 80)}{st.activity.length > 80 ? '...' : ''}
                    </div>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color, fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--mono)' }}>{agentHistory.length}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Runs</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: successRate != null ? 'var(--green)' : 'var(--muted)', fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--mono)' }}>{successRate != null ? `${successRate}%` : '--'}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Success</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: 'var(--text)', fontWeight: 800, fontSize: '1.1rem', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>{agent.policyTier || '--'}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Tier</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Worker History Table */}
        {historyList.length > 0 && (
          <GlassCard className="fade-in-up-5">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 4 }}>Run History</div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Worker Runs</h3>
              </div>
              <Badge label={`${historyList.length} total`} color="var(--muted)" />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border)' }}>
                    {['Agent', 'Model', 'Status', 'Duration', 'Tasks', 'Started'].map(h => (
                      <th key={h} style={{ color: 'var(--muted)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', padding: '0 12px 12px', textAlign: 'left', fontFamily: 'var(--mono)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historyList.slice(0, 30).map(r => {
                    const color = AGENT_COLORS[r.agentType] || 'var(--blue)';
                    return (
                      <tr key={r.id || r.workerId} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: 'background 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(45,212,191,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}>
                        <td style={{ padding: '10px 12px', color, fontWeight: 600, textTransform: 'capitalize', fontSize: '0.8rem' }}>{r.agentType || '--'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--blue)', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{r.model || '--'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ color: r.succeeded ? 'var(--green)' : r.endedAt ? 'var(--red)' : 'var(--teal)', fontFamily: 'var(--mono)', fontSize: '0.8rem', fontWeight: 700 }}>
                            {r.succeeded ? '✓ OK' : r.endedAt ? '✗ FAIL' : '⋯ RUN'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{formatDuration(r.startedAt, r.endedAt)}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: '0.8rem' }}>{r.tasksCompleted ?? '--'}</td>
                        <td style={{ padding: '10px 12px', color: 'var(--muted)', fontSize: '0.75rem' }}>{timeAgo(r.startedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>

      {/* Agent Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.displayName || selected.agentType} — Agent Detail` : ''}>
        {selected && (() => {
          const hist = getHistory(selected.agentType);
          const color = AGENT_COLORS[selected.agentType] || 'var(--teal)';
          const st = selected.status;
          return (
            <div>
              {st && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                  {[
                    { label: 'Status', value: st.currentTaskId ? 'Busy' : 'Idle', color: st.currentTaskId ? color : 'var(--muted)' },
                    { label: 'Current Task', value: st.currentTaskId ? st.currentTaskId.slice(0, 12) + '...' : 'None', color: 'var(--muted)' },
                    { label: 'Last Active', value: timeAgo(st.lastActiveAt), color: 'var(--muted)' },
                    { label: 'Policy Tier', value: selected.policyTier || '--', color: 'var(--blue)' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'rgba(11,15,30,0.5)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ color: 'var(--muted)', fontSize: '0.68rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{item.label}</div>
                      <div style={{ color: item.color, fontFamily: 'var(--mono)', fontSize: '0.82rem', fontWeight: 600 }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              )}
              {st?.activity && (
                <div style={{ background: color + '0a', border: `1px solid ${color}22`, borderRadius: 8, padding: 12, marginBottom: 20 }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.68rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', marginBottom: 4 }}>Current Activity</div>
                  <div style={{ color: 'var(--text)', fontSize: '0.82rem' }}>{st.activity}</div>
                </div>
              )}
              <h4 style={{ color: 'var(--muted)', fontSize: '0.72rem', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12 }}>Run History ({hist.length})</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                      {['Model', 'Duration', 'Status', 'Tasks', 'Time'].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 0', fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '1px', paddingRight: 16 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {hist.slice(0, 25).map(r => (
                      <tr key={r.id || r.workerId} style={{ borderBottom: '1px solid rgba(99,179,237,0.05)' }}>
                        <td style={{ padding: '8px 16px 8px 0', color: 'var(--blue)', fontFamily: 'var(--mono)', fontSize: '0.75rem' }}>{r.model || '--'}</td>
                        <td style={{ padding: '8px 16px 8px 0', color: 'var(--text)' }}>{formatDuration(r.startedAt, r.endedAt)}</td>
                        <td style={{ padding: '8px 16px 8px 0' }}>
                          <span style={{ color: r.succeeded ? 'var(--green)' : r.endedAt ? 'var(--red)' : 'var(--teal)', fontWeight: 700 }}>
                            {r.succeeded ? '✓' : r.endedAt ? '✗' : '⋯'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 16px 8px 0', color: 'var(--text)', fontFamily: 'var(--mono)' }}>{r.tasksCompleted ?? '--'}</td>
                        <td style={{ padding: '8px 0', color: 'var(--muted)', fontSize: '0.75rem' }}>{timeAgo(r.startedAt)}</td>
                      </tr>
                    ))}
                    {hist.length === 0 && <tr><td colSpan={5} style={{ padding: '20px 0', color: 'var(--muted)', textAlign: 'center' }}>No run history</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
