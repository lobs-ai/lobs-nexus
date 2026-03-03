/* ============================================================
   workflows.js — Workflows page with DAG visualizer
   ============================================================ */

let selectedWorkflow = null;
let dagTransform = { x: 0, y: 0, scale: 1 };
let dagDrag = null;
let dagNodePopup = null;

async function renderWorkflows(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="section-label">Automation</div>
      <h1 class="page-title gradient-text">Workflows</h1>
      <p class="page-subtitle">Workflow definitions and execution runs</p>
    </div>
    <div class="grid-2" style="gap:24px">
      <div>
        <h3 style="margin-bottom:14px">Definitions</h3>
        <div class="workflow-list" id="workflowList">
          <div class="loading-screen" style="height:120px"><div class="spinner"></div></div>
        </div>
      </div>
      <div>
        <h3 style="margin-bottom:14px">Recent Runs</h3>
        <div id="workflowRunsList">
          <div class="loading-screen" style="height:120px"><div class="spinner"></div></div>
        </div>
      </div>
    </div>
    <div id="dagSection" style="display:none;margin-top:24px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
        <h3 id="dagTitle">Workflow DAG</h3>
      </div>
      <div class="dag-container" id="dagContainer">
        <canvas class="dag-canvas" id="dagCanvas"></canvas>
        <div class="dag-controls">
          <button class="dag-control-btn" onclick="dagZoom(0.15)" title="Zoom in">+</button>
          <button class="dag-control-btn" onclick="dagZoom(-0.15)" title="Zoom out">−</button>
          <button class="dag-control-btn" onclick="dagReset()" title="Reset">⊡</button>
        </div>
        <div class="dag-node-popup hidden" id="dagNodePopup"></div>
      </div>
    </div>`;

  await loadWorkflows();
}

async function loadWorkflows() {
  try {
    const [definitions, runs] = await Promise.all([
      API.workflows().catch(() => []),
      API.workflowRuns(15).catch(() => []),
    ]);
    renderWorkflowList(Array.isArray(definitions) ? definitions : []);
    renderWorkflowRuns(Array.isArray(runs) ? runs : []);
  } catch(e) { console.error('Workflows load error:', e); }
}

function renderWorkflowList(defs) {
  const el = document.getElementById('workflowList');
  if (!el) return;
  if (!defs.length) { el.innerHTML = emptyState('🔀', 'No workflows', 'No workflow definitions found'); return; }
  el.innerHTML = defs.map(w => `
    <div class="workflow-item ${selectedWorkflow?.id === w.id ? 'active' : ''}" onclick="selectWorkflow(${JSON.stringify(JSON.stringify(w))})">
      <div style="flex:1;min-width:0">
        <div style="font-size:0.88rem;font-weight:600">${w.name || w.id}</div>
        <div style="font-size:0.72rem;color:var(--faint);margin-top:2px;font-family:var(--mono)">${w.id}</div>
      </div>
      ${statusBadge(w.status || 'active')}
    </div>`).join('');
}

function renderWorkflowRuns(runs) {
  const el = document.getElementById('workflowRunsList');
  if (!el) return;
  if (!runs.length) { el.innerHTML = emptyState('🏃', 'No runs', 'No workflow runs yet'); return; }
  el.innerHTML = `<div class="card" style="padding:0">${tableHTML(
    ['Workflow', 'Status', 'Started', 'Duration'],
    runs.map(r => [
      `<span class="font-mono text-xs">${(r.workflowId || '—').slice(0,12)}…</span>`,
      statusBadge(r.status),
      timeAgo(r.startedAt || r.createdAt),
      duration(r.startedAt, r.finishedAt),
    ])
  )}</div>`;
}

async function selectWorkflow(jsonStr) {
  const w = JSON.parse(jsonStr);
  selectedWorkflow = w;
  // Re-render list to update active state
  const items = document.querySelectorAll('.workflow-item');
  items.forEach(el => el.classList.toggle('active', el.querySelector('.font-mono')?.textContent === w.id));

  const dagSection = document.getElementById('dagSection');
  if (!dagSection) return;
  dagSection.style.display = '';
  document.getElementById('dagTitle').textContent = w.name || w.id;

  // Load full workflow definition
  try {
    const full = await API.workflow(w.id);
    renderDAG(full);
  } catch(e) { toast(e.message, 'error'); }
}
window.selectWorkflow = selectWorkflow;

function renderDAG(workflow) {
  const canvas = document.getElementById('dagCanvas');
  if (!canvas) return;
  const container = document.getElementById('dagContainer');
  canvas.width = container.offsetWidth || 800;
  canvas.height = container.offsetHeight || 500;

  dagTransform = { x: 0, y: 0, scale: 1 };

  // Parse nodes/edges from workflow definition
  let nodes = [];
  let edges = [];
  try {
    const def = typeof workflow.definition === 'string' ? JSON.parse(workflow.definition) : (workflow.definition || {});
    const steps = def.steps || def.nodes || [];
    nodes = steps.map((s, i) => ({
      id: s.id || s.name || `step_${i}`,
      label: s.name || s.id || `Step ${i+1}`,
      type: s.type || 'task',
      x: 100 + (i % 4) * 180,
      y: 80 + Math.floor(i / 4) * 120,
    }));
    edges = steps.flatMap(s =>
      (s.next || s.depends_on || []).map(n => ({ from: s.id || s.name, to: n }))
    );
  } catch(e) {
    // If no parseable definition, show a placeholder node
    nodes = [{ id: 'root', label: workflow.name || 'Workflow', type: 'start', x: canvas.width/2 - 60, y: 60 }];
  }

  // Auto-layout: simple horizontal layers
  layoutDAG(nodes, edges);
  drawDAG(canvas, nodes, edges);
  setupDAGInteraction(canvas, nodes, edges);
}

function layoutDAG(nodes, edges) {
  // BFS layering
  if (!nodes.length) return;
  const adj = {};
  const inDeg = {};
  nodes.forEach(n => { adj[n.id] = []; inDeg[n.id] = 0; });
  edges.forEach(e => {
    if (adj[e.from]) adj[e.from].push(e.to);
    if (inDeg[e.to] !== undefined) inDeg[e.to]++;
  });
  const queue = nodes.filter(n => inDeg[n.id] === 0);
  const layers = {};
  let visited = new Set();
  let layer = 0;
  while (queue.length) {
    const next = [];
    queue.forEach(n => {
      if (visited.has(n.id)) return;
      visited.add(n.id);
      layers[n.id] = layer;
      (adj[n.id] || []).forEach(cid => {
        const child = nodes.find(x => x.id === cid);
        if (child && !visited.has(cid)) next.push(child);
      });
    });
    queue.splice(0, queue.length, ...next);
    layer++;
  }
  const layerCounts = {};
  nodes.forEach(n => {
    const l = layers[n.id] ?? 0;
    layerCounts[l] = (layerCounts[l] || 0) + 1;
  });
  const layerIdx = {};
  nodes.forEach(n => {
    const l = layers[n.id] ?? 0;
    layerIdx[l] = (layerIdx[l] || 0) + 1;
    const count = layerCounts[l];
    n.x = 80 + l * 200;
    n.y = 60 + (layerIdx[l] - 1) * 100 - ((count - 1) * 50);
  });
}

function drawDAG(canvas, nodes, edges) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(dagTransform.x + canvas.width/2 - (nodes.length ? nodes[0].x : 0), dagTransform.y + 60);
  ctx.scale(dagTransform.scale, dagTransform.scale);

  const nodeColor = { task: '#2dd4bf', start: '#34d399', end: '#f87171', condition: '#a78bfa', default: '#38bdf8' };

  // Edges
  edges.forEach(e => {
    const from = nodes.find(n => n.id === e.from);
    const to = nodes.find(n => n.id === e.to);
    if (!from || !to) return;
    ctx.beginPath();
    ctx.moveTo(from.x + 60, from.y + 20);
    ctx.bezierCurveTo(from.x + 100, from.y + 20, to.x - 40, to.y + 20, to.x, to.y + 20);
    ctx.strokeStyle = 'rgba(99,179,237,0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Arrow
    const angle = Math.atan2(to.y + 20 - (from.y + 20), to.x - (from.x + 60));
    ctx.beginPath();
    ctx.moveTo(to.x, to.y + 20);
    ctx.lineTo(to.x - 8 * Math.cos(angle - 0.4), to.y + 20 - 8 * Math.sin(angle - 0.4));
    ctx.lineTo(to.x - 8 * Math.cos(angle + 0.4), to.y + 20 - 8 * Math.sin(angle + 0.4));
    ctx.closePath();
    ctx.fillStyle = 'rgba(99,179,237,0.5)';
    ctx.fill();
  });

  // Nodes
  nodes.forEach(n => {
    const color = nodeColor[n.type] || nodeColor.default;
    ctx.beginPath();
    roundRect(ctx, n.x, n.y, 120, 40, 8);
    ctx.fillStyle = 'rgba(20,28,44,0.95)';
    ctx.fill();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.font = '500 12px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const label = n.label.length > 14 ? n.label.slice(0,13) + '…' : n.label;
    ctx.fillText(label, n.x + 60, n.y + 20);
  });

  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function setupDAGInteraction(canvas, nodes, edges) {
  let isPanning = false, panStart = null;

  canvas.onmousedown = e => {
    isPanning = true;
    panStart = { x: e.clientX - dagTransform.x, y: e.clientY - dagTransform.y };
  };
  canvas.onmousemove = e => {
    if (!isPanning) return;
    dagTransform.x = e.clientX - panStart.x;
    dagTransform.y = e.clientY - panStart.y;
    drawDAG(canvas, nodes, edges);
  };
  canvas.onmouseup = canvas.onmouseleave = e => {
    if (isPanning && Math.abs(e.clientX - (panStart?.x + dagTransform.x)) < 5) {
      // click — check node
      const rect = canvas.getBoundingClientRect();
      const cx = (e.clientX - rect.left - dagTransform.x - canvas.width/2 + (nodes[0]?.x || 0)) / dagTransform.scale;
      const cy = (e.clientY - rect.top - dagTransform.y - 60) / dagTransform.scale;
      const hit = nodes.find(n => cx >= n.x && cx <= n.x + 120 && cy >= n.y && cy <= n.y + 40);
      if (hit) showNodePopup(hit, e.clientX - rect.left, e.clientY - rect.top);
      else hideNodePopup();
    }
    isPanning = false;
  };
  canvas.onwheel = e => {
    e.preventDefault();
    dagTransform.scale = Math.min(3, Math.max(0.2, dagTransform.scale - e.deltaY * 0.001));
    drawDAG(canvas, nodes, edges);
  };
}

function showNodePopup(node, x, y) {
  const popup = document.getElementById('dagNodePopup');
  if (!popup) return;
  popup.classList.remove('hidden');
  popup.style.left = (x + 10) + 'px';
  popup.style.top = (y + 10) + 'px';
  popup.innerHTML = `
    <div style="font-weight:700;margin-bottom:6px">${node.label}</div>
    <div style="font-size:0.75rem;color:var(--faint);font-family:var(--mono)">${node.id}</div>
    <div style="font-size:0.75rem;color:var(--muted);margin-top:4px">Type: ${node.type}</div>
    <button class="dag-control-btn" style="margin-top:8px;width:100%;height:auto;padding:4px 8px;font-size:0.75rem" onclick="hideNodePopup()">✕ Close</button>`;
}

function hideNodePopup() {
  const popup = document.getElementById('dagNodePopup');
  if (popup) popup.classList.add('hidden');
}
window.hideNodePopup = hideNodePopup;

function dagZoom(delta) {
  const canvas = document.getElementById('dagCanvas');
  if (!canvas) return;
  dagTransform.scale = Math.min(3, Math.max(0.2, dagTransform.scale + delta));
  if (selectedWorkflow) API.workflow(selectedWorkflow.id).then(w => renderDAG(w));
}
function dagReset() {
  dagTransform = { x: 0, y: 0, scale: 1 };
  if (selectedWorkflow) API.workflow(selectedWorkflow.id).then(w => renderDAG(w));
}
window.dagZoom = dagZoom;
window.dagReset = dagReset;

function cleanupWorkflows() { selectedWorkflow = null; }
