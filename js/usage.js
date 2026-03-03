/* ============================================================
   usage.js — Usage & Cost page
   ============================================================ */

let usageWindow = 'month';
let usageInterval = null;

async function renderUsage(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="section-label">System</div>
      <h1 class="page-title gradient-text">Usage</h1>
      <p class="page-subtitle">Token consumption, costs, and model breakdown</p>
    </div>
    <div class="filters-bar" style="margin-bottom:20px">
      <button class="btn ${usageWindow==='day'?'btn-primary':'btn-secondary'}" onclick="setUsageWindow('day')">Day</button>
      <button class="btn ${usageWindow==='week'?'btn-primary':'btn-secondary'}" onclick="setUsageWindow('week')">Week</button>
      <button class="btn ${usageWindow==='month'?'btn-primary':'btn-secondary'}" onclick="setUsageWindow('month')">Month</button>
    </div>
    <div class="dashboard-grid" id="usageStats" style="margin-bottom:24px">
      ${Array(4).fill('<div class="stat-card">' + skeleton(2) + '</div>').join('')}
    </div>
    <div class="grid-2" style="gap:24px;margin-bottom:24px">
      <div class="card">
        <div class="card-header"><span class="card-title">By Provider</span></div>
        <div id="providerTable"></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">By Model</span></div>
        <div id="modelTable"></div>
      </div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Daily Usage</span></div>
      <div class="usage-chart" id="dailyChart"></div>
    </div>`;

  await loadUsageData();
  if (usageInterval) clearInterval(usageInterval);
  usageInterval = setInterval(loadUsageData, 30000);
}

async function loadUsageData() {
  try {
    const data = await API.usageDashboard(usageWindow);
    renderUsageStats(data);
    renderProviderTable(data.by_provider || []);
    renderModelTable(data.by_model || []);
    renderDailyChart(data.daily_series || []);
  } catch(e) {
    console.error('Usage load error:', e);
  }
}

function renderUsageStats(data) {
  const el = document.getElementById('usageStats');
  if (!el) return;
  const t = data.totals || {};
  const stats = [
    { num: formatCost(t.estimated_cost_usd), label: 'Total Cost', detail: `${usageWindow} period` },
    { num: formatTokens(t.total_tokens), label: 'Total Tokens', detail: `${formatTokens(t.input_tokens)} in / ${formatTokens(t.output_tokens)} out` },
    { num: t.requests || 0, label: 'API Requests', detail: `${t.task_count || 0} tasks` },
    { num: formatTokens(t.cached_tokens), label: 'Cached Tokens', detail: 'cache hits' },
  ];
  el.innerHTML = stats.map(s => `
    <div class="stat-card">
      <span class="stat-num">${s.num}</span>
      <div class="stat-label">${s.label}</div>
      <div class="stat-detail">${s.detail}</div>
    </div>`).join('');
}

function renderProviderTable(providers) {
  const el = document.getElementById('providerTable');
  if (!el) return;
  el.innerHTML = tableHTML(
    ['Provider', 'Requests', 'Tokens', 'Cost'],
    providers.map(p => [
      `<strong>${p.provider}</strong>`,
      p.requests,
      formatTokens(p.total_tokens),
      formatCost(p.estimated_cost_usd),
    ])
  );
}

function renderModelTable(models) {
  const el = document.getElementById('modelTable');
  if (!el) return;
  el.innerHTML = tableHTML(
    ['Model', 'Provider', 'Requests', 'Cost'],
    models.map(m => [
      `<span class="font-mono text-xs">${m.model}</span>`,
      m.provider,
      m.requests,
      formatCost(m.estimated_cost_usd),
    ])
  );
}

function renderDailyChart(series) {
  const el = document.getElementById('dailyChart');
  if (!el) return;
  if (!series.length) { el.innerHTML = emptyState('📊', 'No data', 'No usage data for this period'); return; }

  // Group by date, sum costs
  const byDate = {};
  series.forEach(s => {
    byDate[s.date] = (byDate[s.date] || 0) + (s.estimated_cost_usd || 0);
  });
  const dates = Object.keys(byDate).sort();
  const values = dates.map(d => byDate[d]);
  const maxVal = Math.max(...values, 0.001);

  el.innerHTML = `
    <div class="bar-chart">
      ${dates.map((d, i) => {
        const pct = (values[i] / maxVal) * 100;
        return `
          <div class="bar-item" title="${d}: ${formatCost(values[i])}">
            <div class="bar" style="height:${Math.max(pct, 2)}%"></div>
            <div class="bar-label">${d.slice(5)}</div>
          </div>`;
      }).join('')}
    </div>`;
}

function setUsageWindow(w) {
  usageWindow = w;
  renderUsage(document.getElementById('pageContainer'));
}
window.setUsageWindow = setUsageWindow;

function cleanupUsage() {
  if (usageInterval) { clearInterval(usageInterval); usageInterval = null; }
}
