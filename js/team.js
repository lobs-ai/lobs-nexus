/* ============================================================
   team.js — Team / Agents page
   ============================================================ */

let teamInterval = null;

async function renderTeam(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="section-label">Agents</div>
      <h1 class="page-title gradient-text">Team</h1>
      <p class="page-subtitle">Agent status, performance, and history</p>
    </div>
    <div class="agents-grid" id="agentsGrid">
      ${Array(5).fill('<div class="agent-card">' + skeleton(3) + '</div>').join('')}
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
      <h3>Recent Worker Runs</h3>
    </div>
    <div class="card" style="padding:0">
      <div id="workerHistoryTable"><div class="loading-screen" style="height:120px"><div class="spinner"></div></div></div>
    </div>`;

  await loadTeamData();
  if (teamInterval) clearInterval(teamInterval);
  teamInterval = setInterval(loadTeamData, 10000);
}

async function loadTeamData() {
  try {
    const [agents, history, activeWorkers] = await Promise.all([
      API.agents().catch(() => []),
      API.workerHistory(30).catch(() => []),
      API.workerStatus().catch(() => ({ workers: [] })),
    ]);
    renderAgentCards(Array.isArray(agents) ? agents : [], activeWorkers?.workers || []);
    renderWorkerHistory(Array.isArray(history) ? history : []);
  } catch(e) { console.error('Team load error:', e); }
}

function renderAgentCards(agents, activeWorkers) {
  const el = document.getElementById('agentsGrid');
  if (!el) return;
  const agentTypes = ['programmer', 'writer', 'researcher', 'reviewer', 'architect'];
  const cards = agentTypes.map(type => {
    const profile = agents.find(a => a.agentType === type) || {};
    const status = profile.status || {};
    const active = activeWorkers.find(w => w.agentType === type);
    const isRunning = !!active;
    const successRate = status.totalRuns > 0 ? Math.round((status.totalSucceeded / status.totalRuns) * 100) : 0;
    return `
      <div class="agent-card" onclick="showAgentDetail('${type}')">
        <div class="agent-card-header">
          <div class="agent-avatar">${agentEmoji(type)}</div>
          <div>
            <div class="agent-name">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
            <div class="agent-type">${isRunning ? '🟢 Running' : '⚪ Idle'}</div>
          </div>
          <div style="margin-left:auto">${statusBadge(isRunning ? 'busy' : 'idle')}</div>
        </div>
        ${isRunning ? `<div style="font-size:0.78rem;color:var(--teal);margin-bottom:12px">🚀 ${active.summary || active.currentTaskId || 'Working...'}</div>` : ''}
        <div class="agent-stats">
          <div class="agent-stat"><div class="agent-stat-val">${status.totalRuns ?? 0}</div><div class="agent-stat-label">Runs</div></div>
          <div class="agent-stat"><div class="agent-stat-val">${successRate}%</div><div class="agent-stat-label">Success</div></div>
          <div class="agent-stat"><div class="agent-stat-val">${status.avgDurationSeconds ? Math.round(status.avgDurationSeconds) + 's' : '—'}</div><div class="agent-stat-label">Avg Time</div></div>
        </div>
      </div>`;
  });
  el.innerHTML = cards.join('');
}

function renderWorkerHistory(runs) {
  const el = document.getElementById('workerHistoryTable');
  if (!el) return;
  el.innerHTML = tableHTML(
    ['Agent', 'Model', 'Status', 'Duration', 'Started'],
    runs.map(r => [
      agentBadge(r.agentType),
      `<span class="font-mono text-xs">${r.model || '—'}</span>`,
      statusBadge(r.succeeded === true ? 'success' : r.succeeded === false ? 'failed' : 'running'),
      duration(r.startedAt, r.endedAt),
      timeAgo(r.startedAt),
    ])
  );
}

function showAgentDetail(type) {
  // Show modal with agent-specific history
  API.workerHistory(100).then(runs => {
    const filtered = (Array.isArray(runs) ? runs : []).filter(r => r.agentType === type);
    const body = `
      <div style="margin-bottom:16px">
        <div style="font-size:2rem;margin-bottom:8px">${agentEmoji(type)}</div>
        <div style="font-size:0.78rem;color:var(--faint)">${filtered.length} total runs</div>
      </div>
      ${tableHTML(
        ['Model', 'Status', 'Duration', 'Started'],
        filtered.slice(0, 20).map(r => [
          `<span class="font-mono text-xs">${r.model || '—'}</span>`,
          statusBadge(r.succeeded === true ? 'success' : r.succeeded === false ? 'failed' : 'running'),
          duration(r.startedAt, r.endedAt),
          timeAgo(r.startedAt),
        ])
      )}`;
    openModal(`${type.charAt(0).toUpperCase() + type.slice(1)} History`, body);
  }).catch(e => toast(e.message, 'error'));
}
window.showAgentDetail = showAgentDetail;

function cleanupTeam() {
  if (teamInterval) { clearInterval(teamInterval); teamInterval = null; }
}
