/* ============================================================
   knowledge.js — Knowledge base page
   ============================================================ */

let knowledgeEntries = [];
let activeKnowledgePath = null;

async function renderKnowledge(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="section-label">Knowledge</div>
      <h1 class="page-title gradient-text">Knowledge Base</h1>
      <p class="page-subtitle">Browse and search agent knowledge entries</p>
    </div>
    <div style="margin-bottom:20px">
      <div class="filters-bar">
        <input type="text" id="knowledgeSearch" class="form-input" placeholder="Search entries…" style="max-width:320px" />
        <button class="btn btn-secondary" onclick="doKnowledgeSearch()">Search</button>
      </div>
    </div>
    <div class="knowledge-layout">
      <div class="knowledge-tree">
        <div style="font-size:0.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--faint);margin-bottom:12px">Entries</div>
        <div id="knowledgeList"><div class="loading-screen" style="height:100px"><div class="spinner"></div></div></div>
      </div>
      <div class="knowledge-content" id="knowledgeDetail">
        ${emptyState('📚', 'Select an entry', 'Click an entry on the left to view its content')}
      </div>
    </div>`;

  document.getElementById('knowledgeSearch')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doKnowledgeSearch();
  });

  await loadKnowledge();
}

async function loadKnowledge(search = '') {
  try {
    const params = search ? { search } : {};
    const res = await API.knowledge(params);
    knowledgeEntries = res.entries || [];
    renderKnowledgeList(knowledgeEntries);
  } catch(e) {
    const el = document.getElementById('knowledgeList');
    if (el) el.innerHTML = emptyState('❌', 'Failed to load', e.message);
  }
}

function renderKnowledgeList(entries) {
  const el = document.getElementById('knowledgeList');
  if (!el) return;
  if (!entries.length) { el.innerHTML = emptyState('📭', 'No entries', 'Knowledge base is empty'); return; }
  el.innerHTML = entries.map(e => `
    <div class="entry-item ${activeKnowledgePath === e.path ? 'active' : ''}" onclick="selectKnowledgeEntry(${JSON.stringify(JSON.stringify(e))})">
      <div class="entry-name">${e.title || e.name || e.path?.split('/').pop() || 'Untitled'}</div>
      <div class="entry-path">${e.path || ''}</div>
    </div>`).join('');
}

async function selectKnowledgeEntry(jsonStr) {
  const entry = JSON.parse(jsonStr);
  activeKnowledgePath = entry.path;
  renderKnowledgeList(knowledgeEntries);

  const detail = document.getElementById('knowledgeDetail');
  if (!detail) return;
  detail.innerHTML = `<div class="loading-screen" style="height:120px"><div class="spinner"></div></div>`;

  try {
    const res = await API.knowledgeContent(entry.path);
    detail.innerHTML = `
      <div class="card-header" style="margin-bottom:16px">
        <span class="card-title">${entry.title || entry.name || entry.path?.split('/').pop()}</span>
        <span class="text-xs font-mono text-faint">${entry.path || ''}</span>
      </div>
      ${entry.tags?.length ? `<div style="margin-bottom:12px">${entry.tags.map(t => `<span class="badge badge-surface" style="margin-right:4px">${t}</span>`).join('')}</div>` : ''}
      <pre class="knowledge-content">${escHtml(res.content || '(empty)')}</pre>`;
  } catch(e) {
    detail.innerHTML = `
      <div class="card-header" style="margin-bottom:16px">
        <span class="card-title">${entry.title || entry.path}</span>
      </div>
      ${entry.summary ? `<p style="color:var(--muted)">${escHtml(entry.summary)}</p>` : emptyState('📄', 'Content unavailable', e.message)}`;
  }
}
window.selectKnowledgeEntry = selectKnowledgeEntry;

async function doKnowledgeSearch() {
  const q = document.getElementById('knowledgeSearch')?.value?.trim();
  await loadKnowledge(q);
}
window.doKnowledgeSearch = doKnowledgeSearch;

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
