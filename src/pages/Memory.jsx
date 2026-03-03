import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo, AGENT_COLORS } from '../lib/utils';

const ALL_AGENTS = ['programmer', 'writer', 'researcher', 'reviewer', 'architect', 'lobs'];

export default function Memory() {
  const { data, loading } = useApi(() => api.memories());
  const [agentFilter, setAgentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const memories = data?.memories || data || [];

  const filtered = memories.filter(m => {
    if (agentFilter !== 'all' && m.agent !== agentFilter && m.agentType !== agentFilter) return false;
    if (search && !(m.content || '').toLowerCase().includes(search.toLowerCase()) &&
        !(m.key || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const agentsPresent = [...new Set(memories.map(m => m.agent || m.agentType).filter(Boolean))];

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <span className="section-label">Agent Memory</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>
          <span className="gradient-text">Memory</span>
        </h1>
        <p style={{ color: 'var(--muted)' }}>Timeline of agent memory entries</p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterBtn label="All" active={agentFilter === 'all'} onClick={() => setAgentFilter('all')} color="var(--text)" />
          {agentsPresent.map(a => (
            <FilterBtn key={a} label={a} active={agentFilter === a} onClick={() => setAgentFilter(a)} color={AGENT_COLORS[a] || 'var(--blue)'} />
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search memories..."
          style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 14px', color: 'var(--text)', fontSize: '0.85rem', outline: 'none', minWidth: 220, marginLeft: 'auto',
          }}
        />
      </div>

      {/* Timeline */}
      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <GlassCard><div style={{ color: 'var(--muted)', textAlign: 'center', padding: '30px 0' }}>No memories found</div></GlassCard>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 32 }}>
          {/* Timeline line */}
          <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map((m, i) => {
              const agent = m.agent || m.agentType || 'unknown';
              const color = AGENT_COLORS[agent] || 'var(--blue)';
              return (
                <div key={m.id || i} style={{ position: 'relative' }}>
                  {/* Dot */}
                  <div style={{ position: 'absolute', left: -28, top: 18, width: 10, height: 10, borderRadius: '50%', background: color, border: '2px solid var(--navy)' }} />
                  <GlassCard onClick={() => setSelected(m)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <span style={{ color, fontWeight: 600, fontSize: '0.82rem', textTransform: 'capitalize' }}>{agent}</span>
                        {m.key && <span style={{ color: 'var(--muted)', fontSize: '0.72rem', fontFamily: 'var(--mono)', background: 'rgba(255,255,255,0.04)', padding: '1px 6px', borderRadius: 4 }}>{m.key}</span>}
                      </div>
                      <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{timeAgo(m.timestamp || m.createdAt || m.created_at)}</span>
                    </div>
                    <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                      {m.content || m.value || 'No content'}
                    </div>
                  </GlassCard>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.key || 'Memory Entry'}>
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {selected.agent && <Badge label={selected.agent || selected.agentType} color={AGENT_COLORS[selected.agent || selected.agentType] || 'var(--blue)'} dot />}
              {selected.key && <Badge label={selected.key} color="var(--muted)" />}
            </div>
            <div style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}>
              {selected.content || selected.value || 'No content'}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: 16 }}>
              {timeAgo(selected.timestamp || selected.createdAt || selected.created_at)}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function FilterBtn({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color + '1a' : 'transparent',
        border: `1px solid ${active ? color + '66' : 'var(--border)'}`,
        borderRadius: 6, padding: '4px 12px', color: active ? color : 'var(--muted)',
        cursor: 'pointer', fontSize: '0.78rem', fontWeight: active ? 600 : 400,
        textTransform: 'capitalize', transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
