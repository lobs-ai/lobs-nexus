import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

function getCategory(path) {
  const parts = path.split('/');
  return parts.length > 1 ? parts[0] : 'root';
}

const CAT_COLORS = {
  docs: 'var(--blue)', research: 'var(--purple)', decisions: 'var(--amber)',
  architecture: 'var(--teal)', runbooks: 'var(--green)', guides: 'var(--blue)',
  reviews: 'var(--red)', handoffs: 'var(--muted)', system: 'var(--teal)',
  root: 'var(--muted)',
};

export default function Knowledge() {
  const { data: fsData, loading } = useApi(() => api.knowledgeFs());
  const { data: resData, loading: resLoading } = useApi(() => api.research());
  const [tab, setTab] = useState('browse');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);

  const entries = fsData?.entries || [];
  const memos = resData?.memos || resData || [];
  
  const filteredEntries = entries.filter(e =>
    !search || e.name.toLowerCase().includes(search.toLowerCase()) || e.path.toLowerCase().includes(search.toLowerCase())
  );
  const filteredMemos = memos.filter(m =>
    !search || (m.title || '').toLowerCase().includes(search.toLowerCase()) || (m.content || '').toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(entries.map(e => getCategory(e.path)))].sort();

  const openFile = async (entry) => {
    setSelected(entry);
    setLoadingFile(true);
    try {
      const data = await api.knowledgeFsRead(entry.path);
      setFileContent(data?.content || 'Unable to read file');
    } catch { setFileContent('Error loading file'); }
    setLoadingFile(false);
  };

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>INTELLIGENCE</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Knowledge</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>Shared memory — docs, ADRs, research, guides</p>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`hud-tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => setTab('browse')}>Docs ({entries.length})</button>
            <button className={`hud-tab ${tab === 'research' ? 'active' : ''}`} onClick={() => setTab('research')}>Research ({memos.length})</button>
          </div>
          <input className="nx-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ maxWidth: 280, marginLeft: 'auto' }} />
        </div>

        {tab === 'browse' && (
          loading ? <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '60px 0' }}>Loading...</div> :
          filteredEntries.length === 0 ? <GlassCard><div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>No files found</div></GlassCard> :
          <div>
            {/* Category summary */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {categories.map(cat => {
                const count = filteredEntries.filter(e => getCategory(e.path) === cat).length;
                if (count === 0) return null;
                return <Badge key={cat} label={`${cat} (${count})`} color={CAT_COLORS[cat] || 'var(--muted)'} />;
              })}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredEntries.map((e, i) => {
                const cat = getCategory(e.path);
                const color = CAT_COLORS[cat] || 'var(--muted)';
                return (
                  <div key={e.path} className={`inbox-item fade-in-up-${Math.min(i+1, 6)}`} onClick={() => openFile(e)}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '15', border: `1px solid ${color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', flexShrink: 0, color }}>
                        📄
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{e.name}</div>
                        <div style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{e.path}</div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <Badge label={cat} color={color} />
                        <div style={{ color: 'var(--faint)', fontSize: '0.68rem', marginTop: 4, fontFamily: 'var(--mono)' }}>{timeAgo(e.modified)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'research' && (
          resLoading ? <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '60px 0' }}>Loading...</div> :
          filteredMemos.length === 0 ? <GlassCard><div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>No research memos</div></GlassCard> :
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filteredMemos.map((m, i) => (
              <GlassCard key={m.id || i} onClick={() => { setSelected(m); setFileContent(m.content || m.summary || 'No content'); }} className={`fade-in-up-${Math.min(i+1, 6)}`} style={{ cursor: 'pointer' }}>
                <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 10, lineHeight: 1.3 }}>{m.title || m.topic || 'Memo'}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{m.summary || m.content || 'No preview'}</div>
                <div style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{timeAgo(m.createdAt || m.created_at)}</div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => { setSelected(null); setFileContent(null); }} title={selected?.name || selected?.title || 'Document'}>
        {selected && (
          <div>
            {selected.path && <div style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)', marginBottom: 16 }}>{selected.path}</div>}
            <div style={{ background: 'rgba(8,12,24,0.9)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, maxHeight: 500, overflowY: 'auto' }}>
              {loadingFile ? <div style={{ color: 'var(--muted)' }}>Loading...</div> :
                <pre style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--mono)', margin: 0 }}>{fileContent || 'No content'}</pre>
              }
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
