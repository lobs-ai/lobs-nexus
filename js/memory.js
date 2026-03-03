/* ============================================================
   memory.js — Memory page
   ============================================================ */

async function renderMemory(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="section-label">Knowledge</div>
      <h1 class="page-title gradient-text">Memory</h1>
      <p class="page-subtitle">Agent memory entries and reflections</p>
    </div>
    <div style="margin-bottom:20px">
      <div class="filters-bar">
        <input type="text" id="memSearch" class="form-input" placeholder="Search memories…" style="max-width:320px" />
        <button class="btn btn-secondary" onclick="doMemSearch()">Search</button>
      </div>
    </div>
    <div id="memoryContent">
      <div class="loading-screen" style="height:200px"><div class="spinner"></div></div>
    </div>`;

  document.getElementById('memSearch')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') doMemSearch();
  });

  await loadMemories();
}

async function loadMemories(query = '') {
  try {
    let entries;
    if (query) {
      const res = await API.memorySearch(query);
      entries = res.results || [];
    } else {
      entries = await API.memories();
      if (!Array.isArray(entries)) entries = [];
    }
    renderMemoryList(entries, query);
  } catch(e) {
    const el = document.getElementById('memoryContent');
    if (el) el.innerHTML = emptyState('❌', 'Failed to load memories', e.message);
  }
}

function renderMemoryList(entries, query = '') {
  const el = document.getElementById('memoryContent');
  if (!el) return;
  if (!entries.length) {
    el.innerHTML = emptyState('🧠', query ? 'No results' : 'No memories', query ? `Nothing found for "${query}"` : 'No memory entries yet');
    return;
  }
  el.innerHTML = `<div class="card" style="padding:0">${entries.map(m => `
    <div style="padding:16px 20px;border-bottom:1px solid rgba(99,179,237,0.06);cursor:pointer" onclick="showMemoryDetail(${JSON.stringify(JSON.stringify(m))})">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:12px">
        <div style="flex:1;min-width:0">
          <div style="font-size:0.88rem;font-weight:600;color:var(--text);margin-bottom:4px">${escHtml(m.title || m.content?.slice(0, 60) || 'Memory entry')}</div>
          ${m.content ? `<div style="font-size:0.78rem;color:var(--faint);line-height:1.5">${escHtml(String(m.content).slice(0, 120))}${String(m.content).length > 120 ? '…' : ''}</div>` : ''}
        </div>
        <div style="flex-shrink:0">
          ${m.agentType ? agentBadge(m.agentType) : ''}
          <div style="font-size:0.7rem;color:var(--faint);text-align:right;margin-top:4px">${timeAgo(m.createdAt || m.timestamp)}</div>
        </div>
      </div>
    </div>`).join('')}</div>`;
}

function showMemoryDetail(jsonStr) {
  const m = JSON.parse(jsonStr);
  const body = `
    <div class="settings-section">
      ${m.agentType ? `<div class="settings-row"><div class="settings-label">Agent</div>${agentBadge(m.agentType)}</div>` : ''}
      <div class="settings-row"><div class="settings-label">Created</div><span class="text-muted text-sm">${formatDate(m.createdAt || m.timestamp)}</span></div>
    </div>
    <div class="card" style="margin-top:12px">
      <pre style="white-space:pre-wrap;font-size:0.85rem;color:var(--muted);line-height:1.6">${escHtml(m.content || '(empty)')}</pre>
    </div>`;
  openModal(m.title || 'Memory Entry', body);
}
window.showMemoryDetail = showMemoryDetail;

async function doMemSearch() {
  const q = document.getElementById('memSearch')?.value?.trim();
  await loadMemories(q);
}
window.doMemSearch = doMemSearch;

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
