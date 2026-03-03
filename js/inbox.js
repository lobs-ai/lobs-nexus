/* ============================================================
   inbox.js — Inbox page
   ============================================================ */

let inboxData = [];
let inboxInterval = null;

async function renderInbox(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="section-label">Main</div>
      <h1 class="page-title gradient-text">Inbox</h1>
      <p class="page-subtitle">Items requiring attention</p>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <div class="filters-bar">
        <button class="btn btn-secondary btn-sm" onclick="markAllRead()">Mark All Read</button>
      </div>
      <span id="inboxCount" class="text-muted text-sm"></span>
    </div>
    <div class="inbox-list" id="inboxList">
      <div class="loading-screen" style="height:200px"><div class="spinner"></div></div>
    </div>`;

  await loadInbox();
  if (inboxInterval) clearInterval(inboxInterval);
  inboxInterval = setInterval(loadInbox, 15000);
}

async function loadInbox() {
  try {
    inboxData = await API.inbox();
    if (!Array.isArray(inboxData)) inboxData = [];
    renderInboxList(inboxData);
  } catch(e) {
    const el = document.getElementById('inboxList');
    if (el) el.innerHTML = emptyState('❌', 'Failed to load inbox', e.message);
  }
}

function renderInboxList(items) {
  const el = document.getElementById('inboxList');
  if (!el) return;
  const countEl = document.getElementById('inboxCount');
  const unread = items.filter(i => !i.isRead).length;
  if (countEl) countEl.textContent = `${unread} unread of ${items.length}`;
  if (!items.length) { el.innerHTML = emptyState('📭', 'Inbox empty', 'Nothing here — you\'re all caught up!'); return; }
  el.innerHTML = items.map(item => `
    <div class="inbox-item ${item.isRead ? '' : 'unread'}" onclick="viewInboxItem(${JSON.stringify(JSON.stringify(item))})">
      <div class="inbox-item-dot ${item.isRead ? 'read' : ''}"></div>
      <div class="inbox-item-body">
        <div class="inbox-item-title">${escHtml(item.title || 'Untitled')}</div>
        ${item.content ? `<div class="inbox-item-preview">${escHtml(String(item.content).slice(0, 120))}${String(item.content).length > 120 ? '…' : ''}</div>` : ''}
        <div class="inbox-item-meta">
          ${item.source ? `<span style="margin-right:8px">📨 ${escHtml(item.source)}</span>` : ''}
          ${timeAgo(item.modifiedAt || item.createdAt)}
        </div>
      </div>
      <div style="display:flex;flex-direction:column;gap:6px;flex-shrink:0">
        ${item.isRead ? '' : `<button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();markRead('${item.id}')">Mark read</button>`}
        <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation();deleteInboxItem('${item.id}')">Delete</button>
      </div>
    </div>`).join('');
}

async function viewInboxItem(jsonStr) {
  const item = JSON.parse(jsonStr);
  if (!item.isRead) await markRead(item.id);
  const body = `
    <div class="settings-section">
      <div class="settings-row"><div class="settings-label">From</div><span class="text-muted">${escHtml(item.source || '—')}</span></div>
      <div class="settings-row"><div class="settings-label">Received</div><span class="text-muted text-sm">${formatDate(item.modifiedAt || item.createdAt)}</span></div>
    </div>
    ${item.content ? `<div class="card" style="margin-top:12px"><pre style="white-space:pre-wrap;font-size:0.85rem;color:var(--muted);line-height:1.6">${escHtml(item.content)}</pre></div>` : ''}
    <div style="margin-top:16px;display:flex;gap:8px">
      <button class="btn btn-secondary" onclick="deleteInboxItem('${item.id}');closeModal()">Delete</button>
    </div>`;
  openModal(item.title || 'Inbox Item', body);
}
window.viewInboxItem = viewInboxItem;

async function markRead(id) {
  try {
    await API.inboxRead(id);
    const item = inboxData.find(i => i.id === id);
    if (item) item.isRead = true;
    renderInboxList(inboxData);
  } catch(e) { toast(e.message, 'error'); }
}
window.markRead = markRead;

async function markAllRead() {
  const unread = inboxData.filter(i => !i.isRead);
  for (const item of unread) {
    await API.inboxRead(item.id).catch(() => {});
    item.isRead = true;
  }
  renderInboxList(inboxData);
  toast('All marked read', 'success');
}
window.markAllRead = markAllRead;

async function deleteInboxItem(id) {
  try {
    await API.inboxDelete(id);
    inboxData = inboxData.filter(i => i.id !== id);
    renderInboxList(inboxData);
    toast('Deleted', 'success');
  } catch(e) { toast(e.message, 'error'); }
}
window.deleteInboxItem = deleteInboxItem;

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cleanupInbox() {
  if (inboxInterval) { clearInterval(inboxInterval); inboxInterval = null; }
  inboxData = [];
}
