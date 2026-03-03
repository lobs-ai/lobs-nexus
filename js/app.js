/* ============================================================
   app.js — SPA router, init, global state
   ============================================================ */

let currentPage = null;
let currentCleanup = null;

const ROUTES = {
  dashboard: { fn: () => renderDashboard, cleanup: () => { if(typeof cleanupDashboard==='function') cleanupDashboard(); } },
  tasks:     { fn: () => renderTasks,     cleanup: () => { if(typeof cleanupTasks==='function') cleanupTasks(); } },
  team:      { fn: () => renderTeam,      cleanup: () => { if(typeof cleanupTeam==='function') cleanupTeam(); } },
  workflows: { fn: () => renderWorkflows, cleanup: () => { if(typeof cleanupWorkflows==='function') cleanupWorkflows(); } },
  chat:      { fn: () => renderChat,      cleanup: () => { if(typeof cleanupChat==='function') cleanupChat(); } },
  knowledge: { fn: () => renderKnowledge, cleanup: () => {} },
  memory:    { fn: () => renderMemory,    cleanup: () => {} },
  usage:     { fn: () => renderUsage,     cleanup: () => { if(typeof cleanupUsage==='function') cleanupUsage(); } },
  inbox:     { fn: () => renderInbox,     cleanup: () => { if(typeof cleanupInbox==='function') cleanupInbox(); } },
  settings:  { fn: () => renderSettings,  cleanup: () => {} },
};

async function navigate(hash) {
  if (currentCleanup) { try { currentCleanup(); } catch(e){} }
  currentCleanup = null;

  const page = hash.replace(/^[/#]+/, '') || 'dashboard';
  const container = document.getElementById('pageContainer');

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  const route = ROUTES[page];
  if (!route) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">🗺️</div><div class="empty-title">Page not found</div><div class="empty-desc text-faint">${page}</div></div>`;
    return;
  }

  currentPage = page;
  currentCleanup = route.cleanup;

  try {
    await route.fn()(container);
  } catch(e) {
    container.innerHTML = `<div class="empty-state"><div class="empty-icon">💥</div><div class="empty-title">Error loading page</div><div class="empty-desc text-faint">${e.message}</div></div>`;
    console.error('Page error:', e);
  }
}

function onHashChange() {
  const hash = location.hash.replace(/^#/, '') || '/dashboard';
  navigate(hash);
}

document.getElementById('sidebarToggle').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('collapsed');
  document.getElementById('mainContent').classList.toggle('sidebar-collapsed');
});

const savedTheme = localStorage.getItem('nexus-theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);
document.getElementById('themeToggle').addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('nexus-theme', next);
});

document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

async function pollSystemStatus() {
  try {
    const status = await API.status().catch(() => null);
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    if (!dot || !txt) return;
    if (!status) {
      dot.className = 'status-dot offline'; txt.textContent = 'Offline'; return;
    }
    const healthy = status.server?.status === 'healthy';
    dot.className = `status-dot ${healthy ? 'online' : 'warning'}`;
    txt.textContent = healthy ? 'Online' : 'Warning';
    const unread = status.inbox?.unread ?? 0;
    const inboxBadge = document.getElementById('inboxBadge');
    if (inboxBadge) { inboxBadge.style.display = unread > 0 ? '' : 'none'; inboxBadge.textContent = unread > 9 ? '9+' : unread; }
    const activeTasks = status.tasks?.active ?? 0;
    const tasksBadge = document.getElementById('tasksBadge');
    if (tasksBadge) { tasksBadge.style.display = activeTasks > 0 ? '' : 'none'; tasksBadge.textContent = activeTasks > 9 ? '9+' : activeTasks; }
  } catch(e) {}
}

window.addEventListener('hashchange', onHashChange);
window.addEventListener('load', () => {
  if (!location.hash || location.hash === '#') location.hash = '#/dashboard';
  onHashChange();
  pollSystemStatus();
  setInterval(pollSystemStatus, 15000);
});
