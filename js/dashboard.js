/* ============================================================
   dashboard.js — Dashboard page
   ============================================================ */

let dashboardInterval = null;

async function renderDashboard(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="section-label">Overview</div>
      <h1 class="page-title gradient-text">Dashboard</h1>
      <p class="page-subtitle">Real-time view of the PAW multi-agent system</p>
    </div>
    <div class="dashboard-grid" id="dashStats">
      ${Array(4).fill('<div class="stat-card"><div class="skeleton" style="height:40px;margin-bottom:8px"></div><div class="skeleton" style="height:14px;width:60%"></div></div>').join('')}
    </div>
    <div class="grid-2" style="gap:20px;margin-bottom:24px">
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <h3>Active Workers</h3>
          <span class="badge badge-teal" id="workerCount">0 running</span>
        </div>
        <div class="workers-grid" id="workersGrid">
          <div class="loading-screen" style="height:120px"><div class="spinner"></div></div>
        </div>
      </div>
      <div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
          <h3>Recent Activity</h3>
        </div>
        <div class="card" style="padding:0">
          <div class="activity-list" id="activityList">
            ${skeleton(5)}
          </div>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="card-header">
        <span class="card-title">System Health</span>
        <span class="badge badge-green" id="healthBadge">Healthy</span>
      </div>
      <div id="healthGrid" class="grid-4" style="gap:16px">
        ${skeleton(4)}
      </div>
    </div>`;

  await loadDashboardData();

  // Auto-poll every 8s
  if (dashboardInterval) clearInterval(dashboardInterval);
  dashboardInterval = setInterval(loadDashboardData, 8000);
}

async function loadDashboardData() {
  try {
    const [status, activity, workerStatus] = await Promise.all([
      API.status().catch(() => null),
      API.activity().catch(() => []),
      API.workerStatus().catch(() => ({ workers: [] })),
    ]);

    if (status) renderDashStats(status);
    renderWorkers(workerStatus?.workers || []);
    renderActivity(Array.isArray(activity) ? activity.slice(0, 15) : []);
    renderHealth(status);
  } catch (e) {
    console.error('Dashboard load error:', e);
  }
}

function renderDashStats(status) {
  const el = document.getElementById('dashStats');
  if (!el) return;
  const stats = [
    { num: status.tasks?.active ?? 0, label: 'Active Tasks', detail: `${status.tasks?.completed_today ?? 0} done today` },
    { num: status.workers?.active ?? 0, label: 'Running Workers', detail: `${status.workers?.total_completed ?? 0} total runs` },
    { num: status.inbox?.unread ?? 0, label: 'Unread Inbox', detail: 'items awaiting review' },
    { num: status.server?.uptime_seconds ? Math.floor(status.server.uptime_seconds / 3600) : 0, label: 'Uptime Hours', detail: status.server?.status || 'healthy' },
  ];
  el.innerHTML = stats.map(s => `
    <div class="stat-card">
      <span class="stat-num">${s.num}</span>
      <div class="stat-label">${s.label}</div>
      <div class="stat-detail">${s.detail}</div>
    </div>`).join('');
}

function renderWorkers(workers) {
  const el = document.getElementById('workersGrid');
  const countEl = document.getElementById('workerCount');
  if (!el) return;
  if (countEl) countEl.textContent = `${workers.length} running`;
  if (!workers.length) {
    el.innerHTML = emptyState('😴', 'No active workers', 'The orchestrator is idle');
    return;
  }
  el.innerHTML = workers.map(w => `
    <div class="worker-card">
      <div class="worker-header">
        <span class="worker-agent ${`agent-${w.agentType}`}">${agentEmoji(w.agentType)} ${w.agentType || 'worker'}</span>
        <span class="worker-model font-mono text-xs">${w.model || '—'}</span>
      </div>
      <div class="worker-task">${w.summary || w.currentTaskId || 'Working...'}</div>
      <div class="worker-duration">⏱ ${duration(w.startedAt)}</div>
    </div>`).join('');
}

function renderActivity(items) {
  const el = document.getElementById('activityList');
  if (!el) return;
  if (!items.length) {
    el.innerHTML = emptyState('📋', 'No recent activity', 'Activity will appear here');
    return;
  }
  const typeIcon = { worker_completed: '✅', worker_failed: '❌', worker_spawned: '🚀' };
  el.innerHTML = items.map(a => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-title">${typeIcon[a.type] || '●'} ${a.title}</div>
        <div class="timeline-meta">${timeAgo(a.timestamp)}${a.details ? ' · ' + a.details : ''}</div>
      </div>
    </div>`).join('');
}

function renderHealth(status) {
  const el = document.getElementById('healthGrid');
  if (!el || !status) return;
  const items = [
    { label: 'Server', value: status.server?.status || 'unknown', ok: status.server?.status === 'healthy' },
    { label: 'Orchestrator', value: status.orchestrator?.paused ? 'Paused' : 'Running', ok: !status.orchestrator?.paused },
    { label: 'Workers', value: `${status.workers?.active || 0} active`, ok: true },
    { label: 'Version', value: status.server?.version || '—', ok: true },
  ];
  el.innerHTML = items.map(i => `
    <div style="text-align:center">
      <div style="font-size:1.5rem;margin-bottom:4px">${i.ok ? '🟢' : '🔴'}</div>
      <div style="font-size:0.75rem;font-weight:600;text-transform:uppercase;letter-spacing:1px;color:var(--muted)">${i.label}</div>
      <div style="font-size:0.88rem;color:var(--text);margin-top:2px">${i.value}</div>
    </div>`).join('');

  const badge = document.getElementById('healthBadge');
  if (badge) {
    const allOk = items.every(i => i.ok);
    badge.className = `badge ${allOk ? 'badge-green' : 'badge-amber'}`;
    badge.textContent = allOk ? 'Healthy' : 'Warning';
  }
}

function cleanupDashboard() {
  if (dashboardInterval) { clearInterval(dashboardInterval); dashboardInterval = null; }
}
