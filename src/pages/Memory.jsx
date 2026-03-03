import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo, AGENT_COLORS } from '../lib/utils';

function FilterBtn({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      background: active ? color + '1a' : 'transparent',
      border: `1px solid ${active ? color + '66' : 'var(--border)'}`,
      borderRadius: 6, padding: '4px 12px', color: active ? color : 'var(--muted)',
      cursor: 'pointer', fontSize: '0.78rem', fontWeight: active ? 600 : 400,
      textTransform: 'capitalize', transition: 'all 0.15s', fontFamily: 'var(--font)',
    }}>{label}</button>
  );
}

export default function Memory() {
  const { data, loading } = useApi(() => api.memories());
  const [agentFilter, setAgentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const memories = data?.memories || data || [];
  const filtered = memories.filter(m => {
    if (agentFilter !== 'all' && m.agent !== agentFilter && m.agentType !== agentFilter) return false;
    if (search && !(m.content || '').toLowerCase().includes(search.toLowerCase()) && !(m.key || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const agentsPresent = [...new Set(memories.map(m => m.agent || m.agentType).filter(Boolean))];

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>NEURAL ARCHIVE</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Memory</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>Agent memory timeline</p>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <FilterBtn label="All" active={agentFilter === 'all'} onClick={() => setAgentFilter('all')} color="var(--text)" />
            {agentsPresent.map(a => <FilterBtn key={a} label={a} active={agentFilter === a} onClick={() => setAgentFilter(a)} color={AGENT_COLORS[a] || 'var(--blue)'} />)}
          </div>
          <input className="nx-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search memories..." style={{ maxWidth: 280, marginLeft: 'auto' }} />
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '60px 0' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <GlassCard><div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16, opacity: 0.3 }}>🧠</div>
            <div style={{ color: 'var(--text)', fontWeight: 600 }}>No memories found</div>
          </div></GlassCard>
        ) : (
          <div style={{ position: 'relative', paddingLeft: 32 }}>
            <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {filtered.map((m, i) => {
                const agent = m.agent || m.agentType || 'unknown';
                const color = AGENT_COLORS[agent] || 'var(--blue)';
                return (
                  <div key={m.id || i} className={`fade-in-up-${Math.min(i+1, 6)}`} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -28, top: 18, width: 12, height: 12, borderRadius: '50%', background: color, border: '3px solid var(--navy)', boxShadow: `0 0 8px ${color}44` }} />
                    <GlassCard onClick={() => setSelected(m)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <span style={{ color, fontWeight: 700, fontSize: '0.82rem', textTransform: 'capitalize' }}>{agent}</span>
                          {m.key && <span style={{ color: 'var(--muted)', fontSize: '0.72rem', fontFamily: 'var(--mono)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>{m.key}</span>}
                        </div>
                        <span style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{timeAgo(m.timestamp || m.createdAt || m.created_at)}</span>
                      </div>
                      <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{m.content || m.value || 'No content'}</div>
                    </GlassCard>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.key || 'Memory Entry'}>
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <Badge label={selected.agent || selected.agentType || 'unknown'} color={AGENT_COLORS[selected.agent || selected.agentType] || 'var(--blue)'} dot />
              {selected.key && <Badge label={selected.key} color="var(--muted)" />}
            </div>
            <div style={{ background: 'rgba(11,15,30,0.6)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, maxHeight: 400, overflowY: 'auto' }}>
              <div style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selected.content || selected.value || 'No content'}</div>
            </div>
            <div style={{ color: 'var(--faint)', fontSize: '0.72rem', marginTop: 16, fontFamily: 'var(--mono)' }}>{timeAgo(selected.timestamp || selected.createdAt)}</div>
          </div>
        )}
      </Modal>
    </div>
  );
}
