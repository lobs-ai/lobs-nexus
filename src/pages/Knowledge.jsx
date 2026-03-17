import { useState, useMemo } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

const CAT_COLORS = {
  docs: 'var(--blue)', research: 'var(--purple)', decisions: 'var(--amber)',
  architecture: 'var(--teal)', runbooks: 'var(--green)', guides: 'var(--blue)',
  reviews: 'var(--red)', handoffs: 'var(--muted)', system: 'var(--teal)',
  apps: 'var(--purple)', server: 'var(--blue)', designs: 'var(--amber)',
  mobile: 'var(--green)', 'mission-control': 'var(--teal)',
};

function buildTree(entries) {
  const tree = {};
  entries.forEach(e => {
    const parts = e.path.split('/');
    let node = tree;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!node[parts[i]]) node[parts[i]] = { _files: [], _dirs: {} };
      node = node[parts[i]]._dirs;
    }
  });
  return tree;
}

export default function Knowledge() {
  const { data: fsData, loading } = useApi(signal => api.knowledgeFs(signal));
  const { data: resData, loading: resLoading } = useApi(signal => api.research(signal));
  const [tab, setTab] = useState('browse');
  const [search, setSearch] = useState('');
  const [currentPath, setCurrentPath] = useState('');
  const [selected, setSelected] = useState(null);
  const [fileContent, setFileContent] = useState(null);
  const [loadingFile, setLoadingFile] = useState(false);

  const entries = fsData?.entries || [];
  const memos = resData?.memos || resData || [];

  // Build folder structure
  const { folders, files } = useMemo(() => {
    const prefix = currentPath ? currentPath + '/' : '';
    const inPath = entries.filter(e => e.path.startsWith(prefix));
    const folderSet = new Set();
    const fileList = [];
    
    inPath.forEach(e => {
      const rest = e.path.slice(prefix.length);
      const slashIdx = rest.indexOf('/');
      if (slashIdx > 0) {
        folderSet.add(rest.slice(0, slashIdx));
      } else {
        fileList.push(e);
      }
    });
    
    // Filter by search
    if (search) {
      const s = search.toLowerCase();
      const matchedFiles = entries.filter(e => 
        e.name.toLowerCase().includes(s) || e.path.toLowerCase().includes(s)
      );
      return { folders: [], files: matchedFiles };
    }
    
    return { folders: [...folderSet].sort(), files: fileList };
  }, [entries, currentPath, search]);

  const breadcrumbs = currentPath ? currentPath.split('/') : [];

  const openFile = async (entry) => {
    setSelected(entry);
    setLoadingFile(true);
    try {
      const data = await api.knowledgeFsRead(entry.path);
      setFileContent(data?.content || 'Unable to read file');
    } catch { setFileContent('Error loading file'); }
    setLoadingFile(false);
  };

  const totalFiles = entries.length;
  const topFolders = [...new Set(entries.map(e => e.path.split('/')[0]))].length;

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>INTELLIGENCE</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Knowledge</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>Shared memory — {totalFiles} docs across {topFolders} categories</p>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 28, flexWrap: 'wrap' }}>
          <div className="hud-tabs-row">
            <button className={`hud-tab ${tab === 'browse' ? 'active' : ''}`} onClick={() => { setTab('browse'); setSearch(''); }}>Docs ({totalFiles})</button>
            <button className={`hud-tab ${tab === 'research' ? 'active' : ''}`} onClick={() => setTab('research')}>Research ({memos.length})</button>
          </div>
          <input className="nx-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search all files..." style={{ maxWidth: 300, marginLeft: 'auto' }} />
        </div>

        {tab === 'browse' && (
          loading ? <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '60px 0' }}>Loading...</div> : <>
            {/* Breadcrumbs */}
            {!search && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                <button onClick={() => setCurrentPath('')} style={{ background: 'none', border: 'none', color: currentPath ? 'var(--teal)' : 'var(--text)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: 0 }}>
                  📁 Root
                </button>
                {breadcrumbs.map((crumb, i) => (
                  <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--faint)' }}>/</span>
                    <button onClick={() => setCurrentPath(breadcrumbs.slice(0, i + 1).join('/'))} style={{ background: 'none', border: 'none', color: i === breadcrumbs.length - 1 ? 'var(--text)' : 'var(--teal)', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, padding: 0 }}>
                      {crumb}
                    </button>
                  </span>
                ))}
              </div>
            )}

            {search && <div style={{ color: 'var(--muted)', fontSize: '0.82rem', marginBottom: 16 }}>Showing {files.length} results for "{search}"</div>}

            {/* Folders */}
            {folders.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
                {folders.map(folder => {
                  const color = CAT_COLORS[folder] || 'var(--blue)';
                  const prefix = currentPath ? currentPath + '/' + folder + '/' : folder + '/';
                  const count = entries.filter(e => e.path.startsWith(prefix)).length;
                  return (
                    <div key={folder} onClick={() => setCurrentPath(currentPath ? currentPath + '/' + folder : folder)}
                      className="glass-card" style={{ padding: '18px 20px', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = color + '55'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = ''; }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: '1.3rem' }}>📂</span>
                        <div>
                          <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.9rem' }}>{folder}</div>
                          <div style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>{count} files</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Files */}
            {files.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {files.map((e, i) => {
                  const cat = e.path.split('/')[0];
                  const color = CAT_COLORS[cat] || 'var(--muted)';
                  return (
                    <div key={e.path} className={`inbox-item fade-in-up-${Math.min(i+1, 6)}`} onClick={() => openFile(e)}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>📄</span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.9rem', marginBottom: 2 }}>{e.name}</div>
                          {search && <div style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>{e.path}</div>}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ color: 'var(--faint)', fontSize: '0.68rem' }}>{timeAgo(e.modified)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {folders.length === 0 && files.length === 0 && (
              <GlassCard><div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--muted)' }}>No files in this folder</div></GlassCard>
            )}
          </>
        )}

        {tab === 'research' && (
          resLoading ? <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '60px 0' }}>Loading...</div> :
          memos.length === 0 ? <GlassCard><div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--muted)' }}>No research memos</div></GlassCard> :
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {memos.filter(m => !search || (m.title || '').toLowerCase().includes(search.toLowerCase())).map((m, i) => (
              <GlassCard key={m.id || i} onClick={() => { setSelected(m); setFileContent(m.content || m.summary || 'No content'); }} className={`fade-in-up-${Math.min(i+1, 6)}`} style={{ cursor: 'pointer' }}>
                <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.95rem', marginBottom: 10 }}>{m.title || m.topic || 'Memo'}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.6, marginBottom: 12, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{m.summary || m.content || ''}</div>
                <div style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>{timeAgo(m.createdAt || m.created_at)}</div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <Modal
        large
        contentStyle={selected?.path ? { width: '99%', maxWidth: '1800px', maxHeight: '96vh' } : undefined}
        open={!!selected}
        onClose={() => { setSelected(null); setFileContent(null); }}
        title={selected?.name || selected?.title || 'Document'}
      >
        {selected && (
          <div>
            {selected.path && <div style={{ color: 'var(--faint)', fontSize: '0.72rem', marginBottom: 16 }}>{selected.path}</div>}
            <div style={{ background: 'rgba(8,12,24,0.9)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, maxHeight: '90vh', overflowY: 'auto' }}>
              {loadingFile ? <div style={{ color: 'var(--muted)' }}>Loading...</div> :
                <pre style={{ color: 'var(--text)', fontSize: '1rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>{fileContent || 'No content'}</pre>
              }
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
