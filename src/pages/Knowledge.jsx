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

  const filteredEntries = entries.filter(e =>
    !search || (e.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.content || e.summary || '').toLowerCase().includes(search.toLowerCase())
  );
  const filteredMemos = memos.filter(m =>
    !search || (m.title || '').toLowerCase().includes(search.toLowerCase()) ||
    (m.content || m.summary || '').toLowerCase().includes(search.toLowerCase())
  );

  const tabStyle = (active) => ({
    background: active ? 'rgba(45,212,191,0.1)' : 'transparent',
    border: `1px solid ${active ? 'rgba(45,212,191,0.4)' : 'var(--border)'}`,
    borderRadius: 8, padding: '6px 16px', color: active ? 'var(--teal)' : 'var(--muted)',
    cursor: 'pointer', fontWeight: active ? 600 : 400, fontSize: '0.85rem', transition: 'all 0.2s',
  });

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <span className="section-label">Knowledge Base</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>
          <span className="gradient-text">Knowledge</span>
        </h1>
        <p style={{ color: 'var(--muted)' }}>Stored knowledge entries and research memos</p>
      </div>

      {/* Tabs + search */}
      <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={tabStyle(tab === 'browse')} onClick={() => setTab('browse')}>Browse</button>
          <button style={tabStyle(tab === 'research')} onClick={() => setTab('research')}>Research</button>
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search..."
          style={{
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8,
            padding: '6px 14px', color: 'var(--text)', fontSize: '0.85rem', outline: 'none', minWidth: 220,
          }}
        />
        <span style={{ color: 'var(--muted)', fontSize: '0.78rem', marginLeft: 'auto' }}>
          {tab === 'browse' ? filteredEntries.length : filteredMemos.length} results
        </span>
      </div>

      {tab === 'browse' && (
        <div>
          {knLoading ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>Loading...</div>
          ) : filteredEntries.length === 0 ? (
            <GlassCard><div style={{ color: 'var(--muted)', textAlign: 'center', padding: '30px 0' }}>No knowledge entries found</div></GlassCard>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {filteredEntries.map((e, i) => (
                <GlassCard key={e.id || i} onClick={() => setSelected({ ...e, _type: 'entry' })} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.95rem', flex: 1, marginRight: 8 }}>{e.title || 'Untitled'}</div>
                    {e.category && <Badge label={e.category} color="var(--blue)" />}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 10, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                    {e.summary || e.content || 'No preview'}
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {e.source && <span style={{ color: 'var(--muted)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{e.source}</span>}
                    <span style={{ color: 'var(--muted)', fontSize: '0.72rem', marginLeft: 'auto' }}>{timeAgo(e.createdAt || e.created_at)}</span>
                  </div>
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'research' && (
        <div>
          {resLoading ? (
            <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>Loading...</div>
          ) : filteredMemos.length === 0 ? (
            <GlassCard><div style={{ color: 'var(--muted)', textAlign: 'center', padding: '30px 0' }}>No research memos found</div></GlassCard>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filteredMemos.map((m, i) => (
                <GlassCard key={m.id || i} onClick={() => setSelected({ ...m, _type: 'memo' })} style={{ cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ color: 'var(--text)', fontWeight: 600 }}>{m.title || m.topic || 'Research Memo'}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {m.status && <Badge label={m.status} color={m.status === 'completed' ? 'var(--green)' : 'var(--blue)'} />}
                      <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{timeAgo(m.createdAt || m.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {m.summary || m.content || 'No preview'}
                  </div>
                  {m.sources && m.sources.length > 0 && (
                    <div style={{ marginTop: 8, color: 'var(--muted)', fontSize: '0.72rem' }}>{m.sources.length} source(s)</div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || selected?.topic || (selected?._type === 'memo' ? 'Research Memo' : 'Knowledge Entry')}
      >
        {selected && (
          <div>
            {selected._type === 'entry' && (
              <>
                {selected.category && <div style={{ marginBottom: 12 }}><Badge label={selected.category} color="var(--blue)" /></div>}
                {selected.source && <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 12 }}>Source: {selected.source}</div>}
                <div style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}>
                  {selected.content || selected.summary || 'No content'}
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: 16 }}>Created: {timeAgo(selected.createdAt || selected.created_at)}</div>
              </>
            )}
            {selected._type === 'memo' && (
              <>
                {selected.status && <div style={{ marginBottom: 12 }}><Badge label={selected.status} color={selected.status === 'completed' ? 'var(--green)' : 'var(--blue)'} /></div>}
                <div style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 400, overflowY: 'auto' }}>
                  {selected.content || selected.summary || 'No content'}
                </div>
                {selected.sources?.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 6 }}>Sources:</div>
                    {selected.sources.map((s, i) => (
                      <div key={i} style={{ color: 'var(--teal)', fontSize: '0.78rem' }}>{s}</div>
                    ))}
                  </div>
                )}
                <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: 12 }}>Created: {timeAgo(selected.createdAt || selected.created_at)}</div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
