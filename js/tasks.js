/* ============================================================
   tasks.js — Tasks page (Kanban)
   ============================================================ */

let tasksData = [];
let tasksFilter = { agent: '', tier: '' };
let dragSrc = null;

async function renderTasks(container) {
  container.innerHTML = `
    <div class="page-header">
      <div class="section-label">Work</div>
      <h1 class="page-title gradient-text">Tasks</h1>
      <p class="page-subtitle">Manage agent tasks across all statuses</p>
    </div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">
      <div class="filters-bar">
        <select id="filterAgent" class="select-input" style="width:auto">
          <option value="">All Agents</option>
          <option value="programmer">💻 Programmer</option>
          <option value="writer">✍️ Writer</option>
          <option value="researcher">🔬 Researcher</option>
          <option value="reviewer">🔍 Reviewer</option>
          <option value="architect">🏛️ Architect</option>
        </select>
        <select id="filterTier" class="select-input" style="width:auto">
          <option value="">All Tiers</option>
          <option value="micro">Micro</option>
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="standard">Standard</option>
          <option value="strong">Strong</option>
        </select>
      </div>
      <button class="btn btn-primary" id="createTaskBtn">+ New Task</button>
    </div>
    <div class="kanban-board" id="kanbanBoard">
      <div class="loading-screen" style="grid-column:1/-1;height:200px"><div class="spinner"></div></div>
    </div>`;

  document.getElementById('filterAgent').addEventListener('change', e => { tasksFilter.agent = e.target.value; renderKanban(); });
  document.getElementById('filterTier').addEventListener('change', e => { tasksFilter.tier = e.target.value; renderKanban(); });
  document.getElementById('createTaskBtn').addEventListener('click', showCreateTaskModal);

  await loadTasks();
}

async function loadTasks() {
  try {
    tasksData = await API.tasks();
    if (!Array.isArray(tasksData)) tasksData = [];
    renderKanban();
  } catch(e) {
    document.getElementById('kanbanBoard').innerHTML = `<div style="grid-column:1/-1">${emptyState('❌', 'Failed to load tasks', e.message)}</div>`;
  }
}

function filteredTasks() {
  return tasksData.filter(t => {
    if (tasksFilter.agent && t.agent !== tasksFilter.agent) return false;
    if (tasksFilter.tier && t.modelTier !== tasksFilter.tier) return false;
    return true;
  });
}

function renderKanban() {
  const board = document.getElementById('kanbanBoard');
  if (!board) return;
  const tasks = filteredTasks();
  const cols = [
    { key: 'active', label: 'Active', color: 'var(--teal)', statuses: ['active', 'inbox', 'waiting_on'] },
    { key: 'completed', label: 'Completed', color: 'var(--green)', statuses: ['completed'] },
    { key: 'cancelled', label: 'Cancelled / Archived', color: 'var(--faint)', statuses: ['cancelled', 'archived', 'rejected'] },
  ];
  board.innerHTML = cols.map(col => {
    const colTasks = tasks.filter(t => col.statuses.includes(t.status));
    return `
      <div class="kanban-col" data-col="${col.key}" id="col-${col.key}">
        <div class="kanban-col-header">
          <span class="kanban-col-title" style="color:${col.color}">${col.label}</span>
          <span class="kanban-count">${colTasks.length}</span>
        </div>
        <div class="kanban-cards" id="cards-${col.key}">
          ${colTasks.length ? colTasks.map(taskCard).join('') : emptyState('📭', 'Empty', '')}
        </div>
      </div>`;
  }).join('');

  // Drag-and-drop
  board.querySelectorAll('.task-card').forEach(card => {
    card.draggable = true;
    card.addEventListener('dragstart', e => { dragSrc = card; card.classList.add('dragging'); });
    card.addEventListener('dragend', () => card.classList.remove('dragging'));
    card.addEventListener('click', () => showTaskDetail(card.dataset.id));
  });
  board.querySelectorAll('.kanban-col').forEach(col => {
    col.addEventListener('dragover', e => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', async e => {
      e.preventDefault(); col.classList.remove('drag-over');
      if (!dragSrc) return;
      const id = dragSrc.dataset.id;
      const targetCol = col.dataset.col;
      const statusMap = { active: 'active', completed: 'completed', cancelled: 'cancelled' };
      const newStatus = statusMap[targetCol];
      try {
        await API.taskStatus(id, newStatus);
        await loadTasks();
        toast(`Task moved to ${targetCol}`, 'success');
      } catch(err) { toast(err.message, 'error'); }
    });
  });
}

function taskCard(t) {
  const age = timeAgo(t.createdAt);
  return `
    <div class="task-card" data-id="${t.id}">
      <div class="task-card-title">${escHtml(t.title)}</div>
      <div class="task-card-meta">
        ${t.agent ? agentBadge(t.agent) : ''}
        ${t.modelTier ? tierBadge(t.modelTier) : ''}
        <span class="text-xs text-faint">${age}</span>
      </div>
      ${t.notes ? `<div class="task-card-notes">${escHtml(t.notes.slice(0, 100))}${t.notes.length > 100 ? '…' : ''}</div>` : ''}
    </div>`;
}

async function showTaskDetail(id) {
  const task = tasksData.find(t => t.id === id);
  if (!task) return;
  const body = `
    <div class="settings-section">
      <div class="settings-row"><div><div class="settings-label">Status</div></div>${statusBadge(task.status)}</div>
      <div class="settings-row"><div><div class="settings-label">Agent</div></div>${task.agent ? agentBadge(task.agent) : '—'}</div>
      <div class="settings-row"><div><div class="settings-label">Model Tier</div></div>${task.modelTier ? tierBadge(task.modelTier) : '—'}</div>
      <div class="settings-row"><div><div class="settings-label">Created</div></div><span class="text-muted text-sm">${formatDate(task.createdAt)}</span></div>
      <div class="settings-row"><div><div class="settings-label">Updated</div></div><span class="text-muted text-sm">${formatDate(task.updatedAt)}</span></div>
    </div>
    ${task.notes ? `<div class="card" style="margin-top:12px"><div class="card-title" style="margin-bottom:8px">Notes</div><pre style="white-space:pre-wrap;font-size:0.85rem;color:var(--muted)">${escHtml(task.notes)}</pre></div>` : ''}
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="btn btn-secondary" onclick="confirmDeleteTask('${task.id}')">Delete</button>
    </div>`;
  openModal(task.title, body);
}

async function confirmDeleteTask(id) {
  if (!confirm('Delete this task?')) return;
  try {
    await API.taskDelete(id);
    closeModal();
    await loadTasks();
    toast('Task deleted', 'success');
  } catch(e) { toast(e.message, 'error'); }
}
window.confirmDeleteTask = confirmDeleteTask;

function showCreateTaskModal() {
  const body = `
    <div class="form-group">
      <label class="form-label">Title *</label>
      <input type="text" id="newTaskTitle" class="form-input" placeholder="Task title..." autofocus />
    </div>
    <div class="form-group">
      <label class="form-label">Agent</label>
      <select id="newTaskAgent" class="select-input">
        <option value="">None</option>
        <option value="programmer">💻 Programmer</option>
        <option value="writer">✍️ Writer</option>
        <option value="researcher">🔬 Researcher</option>
        <option value="reviewer">🔍 Reviewer</option>
        <option value="architect">🏛️ Architect</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Model Tier</label>
      <select id="newTaskTier" class="select-input">
        <option value="micro">Micro (free/local)</option>
        <option value="small">Small</option>
        <option value="medium">Medium</option>
        <option value="standard" selected>Standard</option>
        <option value="strong">Strong</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <textarea id="newTaskNotes" class="form-input" rows="4" placeholder="Task description or context..."></textarea>
    </div>`;
  const footer = `<button class="btn btn-primary" onclick="submitCreateTask()">Create Task</button><button class="btn btn-secondary" onclick="closeModal()">Cancel</button>`;
  openModal('New Task', body, footer);
}

async function submitCreateTask() {
  const title = document.getElementById('newTaskTitle')?.value?.trim();
  if (!title) { toast('Title is required', 'warning'); return; }
  const body = {
    title,
    agent: document.getElementById('newTaskAgent')?.value || undefined,
    model_tier: document.getElementById('newTaskTier')?.value || 'standard',
    notes: document.getElementById('newTaskNotes')?.value?.trim() || undefined,
    status: 'active',
  };
  try {
    await API.taskCreate(body);
    closeModal();
    await loadTasks();
    toast('Task created', 'success');
  } catch(e) { toast(e.message, 'error'); }
}
window.submitCreateTask = submitCreateTask;

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function cleanupTasks() { tasksData = []; tasksFilter = { agent: '', tier: '' }; }
