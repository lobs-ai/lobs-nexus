import { useState, useRef, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useApi } from '../hooks/useApi';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import { timeAgo, formatDuration, AGENT_COLORS } from '../lib/utils';

const AGENT_ICONS = { programmer: '⟨/⟩', writer: '✍', researcher: '🔍', reviewer: '✓', architect: '⬡' };
const AGENT_LABELS = { programmer: 'Code Engineer', writer: 'Content Writer', researcher: 'Researcher', reviewer: 'QA Reviewer', architect: 'Sys Architect' };
const ALL_AGENTS = ['programmer', 'writer', 'researcher', 'reviewer', 'architect'];

function CountUp({ value, duration = 900 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!value) return;
    const start = Date.now();
    const tick = () => { const p = Math.min((Date.now() - start) / duration, 1); setDisplay(Math.floor((1 - Math.pow(1 - p, 3)) * value)); if (p < 1) ref.current = requestAnimationFrame(tick); };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <>{display}</>;
}

export default function Team() {
  const { data: agents } = usePolling(() => api.agents(), 10000);
  const { data: history } = useApi(() => api.workerHistory(200));
  const [selected, setSelected] = useState(null);

  const historyList = history || [];

  // Build agent list from agent_status OR agent_profiles, falling back to hardcoded list
  let agentList = agents || [];
  if (agentList.length === 0) {
    // API returned empty (no agent_profiles), build from worker history + known agents
    const seenAgents = new Set(historyList.map(r => r.agentType).filter(Boolean));
    ALL_AGENTS.forEach(a => seenAgents.add(a));
    agentList = [...seenAgents].map(agentType => ({
      agentType,
      displayName: AGENT_LABELS[agentType] || agentType,
      status: null,
    }));
  }

  const getHistory = (at) => historyList.filter(r => r.agentType === at);
  const totalRuns = historyList.length;
  const overallSuccess = totalRuns > 0 ? Math.round(historyList.filter(r => r.succeeded).length / totalRuns * 100) : null;

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>WORKFORCE</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Agent Team</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>Specialized agents powering the PAW system</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[
            { label: 'Total Agents', value: agentList.length, color: 'var(--blue)' },
            { label: 'Total Runs', value: totalRuns, color: 'var(--purple)' },
            { label: 'Success Rate', value: overallSuccess, display: overallSuccess != null ? `${overallSuccess}%` : '--', color: 'var(--green)' },
          ].map((s, i) => (
            <div key={i} className={`hud-stat-card fade-in-up-${i+1}`}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)`, opacity: 0.6, borderRadius: '14px 14px 0 0' }} />
              <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 10 }}>{s.label}</div>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: 'var(--mono)', letterSpacing: '-2px' }}>{s.display || (s.value != null ? <CountUp value={s.value} /> : '--')}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20, marginBottom: 36 }}>
          {agentList.map((agent, i) => {
            const at = agent.agentType || agent.agent_type;
            const color = AGENT_COLORS[at] || 'var(--teal)';
            const st = agent.status;
            const isBusy = !!(st?.current_task_id || st?.currentTaskId);
            const agentHistory = getHistory(at);
            const successRate = agentHistory.length > 0 ? Math.round(agentHistory.filter(r => r.succeeded).length / agentHistory.length * 100) : null;
            const lastRun = agentHistory[0];

            return (
              <GlassCard key={at} onClick={() => setSelected({ ...agent, agentType: at })} className={`fade-in-up-${Math.min(i+1, 6)}`}
                style={{ cursor: 'pointer', borderColor: isBusy ? color + '55' : undefined, boxShadow: isBusy ? `0 0 30px ${color}18` : undefined }}>

                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: '12px 12px 0 0', opacity: isBusy ? 1 : 0.5 }} />

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 18 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: color + '18', border: `1.5px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: '1.1rem', fontFamily: 'var(--mono)', fontWeight: 700, flexShrink: 0 }}>
                    {AGENT_ICONS[at] || at?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <h3 style={{ color: 'var(--text)', fontWeight: 800, textTransform: 'capitalize', fontSize: '1rem' }}>{agent.displayName || agent.display_name || at}</h3>
                      <span className={isBusy ? 'pulse-dot' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: isBusy ? color : 'var(--faint)', color: isBusy ? color : 'var(--faint)', display: 'block' }} />
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>{AGENT_LABELS[at] || at}</div>
                    <div style={{ color: isBusy ? color : 'var(--faint)', fontSize: '0.78rem', fontWeight: isBusy ? 600 : 400, marginTop: 4 }}>{isBusy ? '● Working...' : '○ Idle'}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color, fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--mono)' }}>{agentHistory.length}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Runs</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: successRate != null ? 'var(--green)' : 'var(--muted)', fontWeight: 800, fontSize: '1.3rem', fontFamily: 'var(--mono)' }}>{successRate != null ? `${successRate}%` : '--'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Success</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--muted)', fontWeight: 800, fontSize: '0.85rem', fontFamily: 'var(--mono)' }}>{lastRun ? timeAgo(lastRun.startedAt) : '--'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Last Run</div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {historyList.length > 0 && (
          <GlassCard className="fade-in-up-5">
            <div className="section-label" style={{ marginBottom: 4 }}>Run History</div>
            <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 20 }}>Worker Runs</h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="hud-table">
                <thead><tr>{['Agent', 'Model', 'Status', 'Duration', 'Started'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  {historyList.slice(0, 30).map(r => (
                    <tr key={r.id || r.workerId}>
                      <td style={{ color: AGENT_COLORS[r.agentType] || 'var(--text)', fontWeight: 600, textTransform: 'capitalize' }}>{r.agentType || '--'}</td>
                      <td style={{ color: 'var(--blue)', fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{r.model || '--'}</td>
                      <td><span style={{ color: r.succeeded ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)', fontWeight: 700 }}>{r.succeeded ? '✓ OK' : '✗ FAIL'}</span></td>
                      <td style={{ color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{formatDuration(r.startedAt, r.endedAt)}</td>
                      <td style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{timeAgo(r.startedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.displayName || selected.display_name || selected.agentType}` : ''}>
        {selected && (() => {
          const hist = getHistory(selected.agentType);
          const color = AGENT_COLORS[selected.agentType] || 'var(--teal)';
          return (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                <Badge label={selected.agentType} color={color} dot />
                <Badge label={hist.length + ' runs'} color="var(--muted)" />
              </div>
              <h4 style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 12 }}>RUN HISTORY</h4>
              {hist.length === 0 ? <div style={{ color: 'var(--muted)', padding: '20px 0', textAlign: 'center' }}>No runs yet</div> : (
                <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                  <table className="hud-table"><thead><tr>{['Model', 'Duration', 'Status', 'Time'].map(h => <th key={h}>{h}</th>)}</tr></thead>
                    <tbody>{hist.slice(0, 25).map(r => (
                      <tr key={r.id || r.workerId}>
                        <td style={{ color: 'var(--blue)', fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{r.model || '--'}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{formatDuration(r.startedAt, r.endedAt)}</td>
                        <td><span style={{ color: r.succeeded ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{r.succeeded ? '✓' : '✗'}</span></td>
                        <td style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>{timeAgo(r.startedAt)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
