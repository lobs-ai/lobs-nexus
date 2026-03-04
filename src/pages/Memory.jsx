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
  const { data, loading } = useApi(() => api.memoriesFs());
  const [agentFilter, setAgentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const memories = data?.memories || [];
  const filtered = memories.filter(m => {
    if (agentFilter !== 'all' && m.agent !== agentFilter) return false;
    if (search && !m.content.toLowerCase().includes(search.toLowerCase()) && !m.file.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const agentsPresent = [...new Set(memories.map(m => m.agent).filter(Boolean))];
  const totalSize = memories.reduce((s, m) => s + (m.size || 0), 0);

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>NEURAL ARCHIVE</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Memory</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>Agent workspace memory files</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Files', value: memories.length, color: 'var(--teal)' },
            { label: 'Agents', value: agentsPresent.length, color: 'var(--blue)' },
            { label: 'Total Size', value: totalSize > 1024 ? `${Math.round(totalSize / 1024)} KB` : `${totalSize} B`, color: 'var(--purple)' },
          ].map((s, i) => (
            <div key={i} className={`hud-stat-card fade-in-up-${i+1}`}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)`, opacity: 0.6, borderRadius: '14px 14px 0 0' }} />
              <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 10 }}>{s.label}</div>
              <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: 'var(--mono)' }}>{s.value}</div>
            </div>
          ))}
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
                const color = AGENT_COLORS[m.agent] || 'var(--blue)';
                const preview = m.content.slice(0, 200).replace(/\n/g, ' ');
                return (
                  <div key={m.agent + m.file + i} className={`fade-in-up-${Math.min(i+1, 6)}`} style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: -28, top: 18, width: 12, height: 12, borderRadius: '50%', background: color, border: '3px solid var(--navy)', boxShadow: `0 0 8px ${color}44` }} />
                    <GlassCard onClick={() => setSelected(m)} style={{ cursor: 'pointer' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <Badge label={m.agent} color={color} dot />
                          <span style={{ color: 'var(--muted)', fontSize: '0.72rem', fontFamily: 'var(--mono)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>{m.file}</span>
                        </div>
                        <span style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{timeAgo(m.modified)}</span>
                      </div>
                      <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{preview}</div>
                    </GlassCard>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Modal large open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.agent} / ${selected.file}` : ''}>
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <Badge label={selected.agent} color={AGENT_COLORS[selected.agent] || 'var(--blue)'} dot />
              <Badge label={selected.file} color="var(--muted)" />
              <span style={{ color: 'var(--faint)', fontSize: '0.72rem', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>{Math.round(selected.size / 1024)} KB · {timeAgo(selected.modified)}</span>
            </div>
            <div style={{ background: 'rgba(8,12,24,0.9)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, maxHeight: '78vh', overflowY: 'auto' }}>
              <pre style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--mono)', margin: 0 }}>{selected.content}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
