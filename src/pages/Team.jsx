import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useApi } from '../hooks/useApi';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import { timeAgo, formatDuration, AGENT_COLORS } from '../lib/utils';

const AGENT_ICONS = {
  programmer: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>,
  writer: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>,
  researcher: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  reviewer: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>,
  architect: <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2"/><line x1="12" y1="22" x2="12" y2="15.5"/><polyline points="22 8.5 12 15.5 2 8.5"/></svg>,
};

export default function Team() {
  const { data: agents, loading } = usePolling(() => api.agents(), 10000);
  const { data: history } = useApi(() => api.workerHistory(100));
  const [selected, setSelected] = useState(null);

  const getAgentHistory = (agentType) => (history || []).filter(r => r.agentType === agentType);

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <span className="section-label">Workforce</span>
        <h2 style={{ color: 'var(--text)', fontWeight: 700 }}>Team</h2>
      </div>

      {loading ? <LoadingSkeleton lines={4} height={120} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 20 }}>
          {(agents || []).map(agent => {
            const color = AGENT_COLORS[agent.agentType] || 'var(--teal)';
            const st = agent.status;
            const isBusy = st?.currentTaskId;
            const agentHistory = getAgentHistory(agent.agentType);
            const successRate = agentHistory.length > 0
              ? Math.round(agentHistory.filter(r => r.succeeded).length / agentHistory.length * 100)
              : null;

            return (
              <GlassCard key={agent.agentType} onClick={() => setSelected(agent)} className="cursor-pointer" style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: color + '22', border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>
                    {AGENT_ICONS[agent.agentType] || agent.agentType[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <h3 style={{ color: 'var(--text)', fontWeight: 700, textTransform: 'capitalize', fontSize: '1rem' }}>{agent.agentType}</h3>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: isBusy ? color : 'var(--faint)', display: 'inline-block' }} className={isBusy ? 'pulse-dot' : ''} />
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{isBusy ? 'Working...' : 'Idle'}</div>
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: color, fontWeight: 700, fontSize: '1.2rem' }}>{agentHistory.length}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>Runs</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: successRate != null ? 'var(--green)' : 'var(--muted)', fontWeight: 700, fontSize: '1.2rem' }}>{successRate != null ? `${successRate}%` : '--'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>Success</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.2rem' }}>{agent.modelTier || '--'}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>Tier</div>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.agentType ? `${selected.agentType} Agent` : ''}>
        {selected && (() => {
          const hist = getAgentHistory(selected.agentType);
          return (
            <div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Model</th>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Duration</th>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Status</th>
                      <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hist.slice(0, 20).map(r => (
                      <tr key={r.id || r.workerId} style={{ borderBottom: '1px solid rgba(99,179,237,0.05)' }}>
                        <td style={{ padding: '8px 0', color: 'var(--blue)', fontFamily: 'var(--mono)', fontSize: '0.78rem' }}>{r.model || '--'}</td>
                        <td style={{ padding: '8px 0', color: 'var(--text)' }}>{formatDuration(r.startedAt, r.endedAt)}</td>
                        <td style={{ padding: '8px 0' }}>
                          <span style={{ color: r.succeeded ? 'var(--green)' : r.endedAt ? 'var(--red)' : 'var(--teal)' }}>
                            {r.succeeded ? '✓' : r.endedAt ? '✗' : '⋯'}
                          </span>
                        </td>
                        <td style={{ padding: '8px 0', color: 'var(--muted)', fontSize: '0.75rem' }}>{timeAgo(r.startedAt)}</td>
                      </tr>
                    ))}
                    {hist.length === 0 && <tr><td colSpan={4} style={{ padding: '20px 0', color: 'var(--muted)', textAlign: 'center' }}>No history</td></tr>}
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
