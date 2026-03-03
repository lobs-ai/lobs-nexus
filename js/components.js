/* ============================================================
   components.js — Shared UI component helpers
   ============================================================ */

// Toast notifications
function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ️'}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}

// Modal
function openModal(title, bodyHTML, footerHTML = '') {
  document.getElementById('modalTitle').textContent = title;
  document.getElementById('modalBody').innerHTML = bodyHTML;
  document.getElementById('modalFooter').innerHTML = footerHTML;
  document.getElementById('modalOverlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modalOverlay').classList.add('hidden');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target === document.getElementById('modalOverlay')) closeModal();
});

// Badge helpers
function agentBadge(type) {
  const colors = {
    programmer: 'badge-blue', writer: 'badge-purple', researcher: 'badge-teal',
    reviewer: 'badge-amber', architect: 'badge-green', default: 'badge-surface',
  };
  const cls = colors[type?.toLowerCase()] || colors.default;
  return `<span class="badge ${cls}">${type || 'unknown'}</span>`;
}

function statusBadge(status) {
  const map = {
    active: 'badge-teal', completed: 'badge-green', cancelled: 'badge-red',
    inbox: 'badge-blue', waiting_on: 'badge-amber', blocked: 'badge-red',
    archived: 'badge-surface', rejected: 'badge-red', healthy: 'badge-green',
    idle: 'badge-surface', busy: 'badge-teal', running: 'badge-teal',
    failed: 'badge-red', success: 'badge-green', pending: 'badge-amber',
    proposed: 'badge-amber',
  };
  const cls = map[status?.toLowerCase()] || 'badge-surface';
  return `<span class="badge ${cls}">${status || 'unknown'}</span>`;
}

function tierBadge(tier) {
  const colors = { micro: 'badge-surface', small: 'badge-blue', medium: 'badge-purple', standard: 'badge-teal', strong: 'badge-amber' };
  const cls = colors[tier] || 'badge-surface';
  return `<span class="badge ${cls}">${tier || '—'}</span>`;
}

function agentEmoji(type) {
  const map = { programmer: '💻', writer: '✍️', researcher: '🔬', reviewer: '🔍', architect: '🏛️' };
  return map[type?.toLowerCase()] || '🤖';
}

// Time helpers
function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Date.now() - new Date(ts).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function duration(startTs, endTs) {
  if (!startTs) return '—';
  const end = endTs ? new Date(endTs) : new Date();
  const s = Math.floor((end - new Date(startTs)) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

function formatDate(ts) {
  if (!ts) return '—';
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatCost(usd) {
  if (usd == null) return '—';
  if (usd < 0.01) return `$${(usd * 1000).toFixed(2)}m`;
  return `$${usd.toFixed(4)}`;
}

function formatTokens(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

// Skeleton loader
function skeleton(lines = 3, cls = '') {
  return Array(lines).fill(0).map((_, i) =>
    `<div class="skeleton ${cls}" style="height:14px;margin-bottom:10px;width:${80 + Math.random()*20}%"></div>`
  ).join('');
}

// Empty state
function emptyState(icon, title, desc = '') {
  return `<div class="empty-state"><div class="empty-icon">${icon}</div><div class="empty-title">${title}</div><div class="empty-desc text-faint">${desc}</div></div>`;
}

// Table helper
function tableHTML(headers, rows) {
  if (!rows.length) return emptyState('📭', 'No data', 'Nothing to show here yet.');
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead>
        <tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>
    </div>`;
}
