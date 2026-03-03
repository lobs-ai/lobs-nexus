/* ============================================================
   settings.js — Settings page
   ============================================================ */

async function renderSettings(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="section-label">System</div>
      <h1 class="page-title gradient-text">Settings</h1>
      <p class="page-subtitle">Orchestrator configuration and system info</p>
    </div>
    <div id="settingsContent">
      <div class="loading-screen" style="height:200px"><div class="spinner"></div></div>
    </div>`;
  await loadSettings();
}

async function loadSettings() {
  try {
    const [status, orchStatus] = await Promise.all([
      API.status().catch(() => null),
      API.orchestratorStatus().catch(() => null),
    ]);
    renderSettingsContent(status, orchStatus);
  } catch(e) {
    const el = document.getElementById('settingsContent');
    if (el) el.innerHTML = emptyState('❌', 'Failed to load settings', e.message);
  }
}

function renderSettingsContent(status, orchStatus) {
  const el = document.getElementById('settingsContent');
  if (!el) return;

  const paused = orchStatus?.paused ?? false;

  el.innerHTML = `
    <!-- Orchestrator -->
    <div class="card settings-section">
      <div class="card-header"><span class="card-title">Orchestrator</span>${statusBadge(paused ? 'idle' : 'running')}</div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Status</div>
          <div class="settings-desc">${paused ? 'The orchestrator is paused — no new workers will be spawned' : 'Running normally'}</div>
        </div>
        <button class="btn ${paused ? 'btn-primary' : 'btn-secondary'}" onclick="${paused ? 'resumeOrchestrator()' : 'pauseOrchestrator()'}">
          ${paused ? '▶ Resume' : '⏸ Pause'}
        </button>
      </div>
      ${orchStatus ? `
      <div class="settings-row">
        <div><div class="settings-label">Scan Interval</div></div>
        <span class="font-mono text-sm">${orchStatus.scanIntervalMs ?? '—'}ms</span>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Max Concurrent Workers</div></div>
        <span class="font-mono text-sm">${orchStatus.maxConcurrentWorkers ?? '—'}</span>
      </div>
      <div class="settings-row">
        <div><div class="settings-label">Worker Timeout</div></div>
        <span class="font-mono text-sm">${orchStatus.workerTimeoutSeconds ?? '—'}s</span>
      </div>` : ''}
    </div>

    <!-- Server Info -->
    ${status?.server ? `
    <div class="card settings-section">
      <div class="card-header"><span class="card-title">Server</span></div>
      <div class="settings-row"><div class="settings-label">Version</div><span class="font-mono text-sm">${status.server.version || '—'}</span></div>
      <div class="settings-row"><div class="settings-label">Status</div>${statusBadge(status.server.status)}</div>
      <div class="settings-row"><div class="settings-label">Uptime</div><span class="font-mono text-sm">${status.server.uptime_seconds ? Math.floor(status.server.uptime_seconds / 3600) + 'h ' + Math.floor((status.server.uptime_seconds % 3600) / 60) + 'm' : '—'}</span></div>
    </div>` : ''}

    <!-- Theme -->
    <div class="card settings-section">
      <div class="card-header"><span class="card-title">Appearance</span></div>
      <div class="settings-row">
        <div>
          <div class="settings-label">Theme</div>
          <div class="settings-desc">Toggle between dark and light mode</div>
        </div>
        <button class="btn btn-secondary" onclick="document.getElementById('themeToggle').click()">
          Toggle Theme
        </button>
      </div>
    </div>

    <!-- Model Tiers -->
    <div class="card settings-section">
      <div class="card-header"><span class="card-title">Model Tiers</span></div>
      ${[
        { tier: 'micro', desc: 'Local model (free)', badge: 'badge-surface' },
        { tier: 'small', desc: 'Small cloud model', badge: 'badge-blue' },
        { tier: 'medium', desc: 'Medium cloud model', badge: 'badge-purple' },
        { tier: 'standard', desc: 'Standard (default)', badge: 'badge-teal' },
        { tier: 'strong', desc: 'Powerful model for complex work', badge: 'badge-amber' },
      ].map(t => `
        <div class="settings-row">
          <div><div class="settings-label">${t.tier.charAt(0).toUpperCase() + t.tier.slice(1)}</div><div class="settings-desc">${t.desc}</div></div>
          <span class="badge ${t.badge}">${t.tier}</span>
        </div>`).join('')}
    </div>

    <!-- Danger Zone -->
    <div class="card settings-section" style="border-color:rgba(248,113,113,0.2)">
      <div class="card-header"><span class="card-title" style="color:var(--red)">Actions</span></div>
      <div class="settings-row">
        <div><div class="settings-label">Auto-Archive Tasks</div><div class="settings-desc">Archive completed/rejected tasks older than 7 days</div></div>
        <button class="btn btn-secondary" onclick="runAutoArchive()">Run Archive</button>
      </div>
    </div>`;
}

async function pauseOrchestrator() {
  try {
    await API.orchestratorPause();
    toast('Orchestrator paused', 'warning');
    await loadSettings();
  } catch(e) { toast(e.message, 'error'); }
}
window.pauseOrchestrator = pauseOrchestrator;

async function resumeOrchestrator() {
  try {
    await API.orchestratorResume();
    toast('Orchestrator resumed', 'success');
    await loadSettings();
  } catch(e) { toast(e.message, 'error'); }
}
window.resumeOrchestrator = resumeOrchestrator;

async function runAutoArchive() {
  try {
    const res = await apiFetch('/tasks/auto-archive', { method: 'POST' });
    toast(`Archived ${res.archived ?? 0} tasks`, 'success');
  } catch(e) { toast(e.message, 'error'); }
}
window.runAutoArchive = runAutoArchive;
