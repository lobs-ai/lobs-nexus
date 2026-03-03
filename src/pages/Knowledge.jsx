import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

export default function Knowledge() {
  const { data: knData, loading: knLoading } = useApi(() => api.knowledge());
  const { data: resData, loading: resLoading } = useApi(() => api.research());
  const [tab, setTab] = useState('browse');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const entries = knData?.entries || knData?.items || knData || [];
  const memos = resData?.memos || resData || [];
  const filtered = (tab === 'browse' ? entries : memos).filter(e =>
    !search || (e.title || e.topic || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.content || e.summary || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>INTELLIGENCE</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Knowledge</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>Stored knowledge and research output</p>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`hud-tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>Browse ({entries.length})</button>
            <button className={`hud-tab ${tab === 'research' ? 'active' : ''}`} onClick={() => setTab('research')}>Research ({memos.length})</button>
          </div>
          <input className="nx-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ maxWidth: 280, marginLeft: 'auto' }} />
        </div>

        {(tab === 'browse' ? knLoading : resLoading) ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '60px 0' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <GlassCard><div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16, opacity: 0.3 }}>📚</div>
            <div style={{ color: 'var(--text)', fontWeight: 600 }}>No entries found</div>
          </div></GlassCard>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map((e, i) => (
              <GlassCard key={e.id || i} onClick={() => setSelected({ ...e, _type: tab })} className={`fade-in-up-${Math.min(i+1, 6)}`} style={{ cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.95rem', flex: 1, marginRight: 12, lineHeight: 1.3 }}>{e.title || e.topic || 'Untitled'}</div>
                  {e.category && <Badge label={e.category} color="var(--blue)" />}
                  {e.status && <Badge label={e.status} color={e.status === 'completed' ? 'var(--green)' : 'var(--blue)'} />}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {e.summary || e.content || 'No preview'}
                </div>
                <div style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{timeAgo(e.createdAt || e.created_at)}</div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || selected?.topic || 'Entry'}>
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              {selected.category && <Badge label={selected.category} color="var(--blue)" />}
              {selected.status && <Badge label={selected.status} color={selected.status === 'completed' ? 'var(--green)' : 'var(--blue)'} />}
              <span style={{ color: 'var(--faint)', fontSize: '0.72rem', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>{timeAgo(selected.createdAt || selected.created_at)}</span>
            </div>
            <div style={{ background: 'rgba(11,15,30,0.6)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, maxHeight: 400, overflowY: 'auto' }}>
              <div style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selected.content || selected.summary || 'No content'}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
