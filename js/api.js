/* ============================================================
   api.js — API client with fetch wrapper
   ============================================================ */

const API_BASE = '/api';

async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return await res.json();
  } catch (e) {
    console.error(`API error ${path}:`, e.message);
    throw e;
  }
}

const API = {
  // Status
  status: () => apiFetch('/status/overview'),
  activity: () => apiFetch('/status/activity'),
  costs: () => apiFetch('/status/costs'),

  // Tasks
  tasks: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/tasks${q ? '?' + q : ''}`);
  },
  taskCreate: (body) => apiFetch('/tasks', { method: 'POST', body: JSON.stringify(body) }),
  taskUpdate: (id, body) => apiFetch(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  taskStatus: (id, status) => apiFetch(`/tasks/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  taskDelete: (id) => apiFetch(`/tasks/${id}`, { method: 'DELETE' }),

  // Agents
  agents: () => apiFetch('/agents'),

  // Workers
  workerStatus: () => apiFetch('/worker/status'),
  workerHistory: (limit = 50) => apiFetch(`/worker/history?limit=${limit}`),

  // Workflows
  workflows: () => apiFetch('/workflows'),
  workflow: (id) => apiFetch(`/workflows/${id}`),
  workflowRuns: (limit = 20) => apiFetch(`/workflow-runs?limit=${limit}`),
  workflowRunTrace: (id) => apiFetch(`/workflow-runs/${id}/trace`),

  // Orchestrator
  orchestratorStatus: () => apiFetch('/orchestrator/status'),
  orchestratorPause: () => apiFetch('/orchestrator/pause', { method: 'POST' }),
  orchestratorResume: () => apiFetch('/orchestrator/resume', { method: 'POST' }),

  // Chat
  chatSessions: () => apiFetch('/chat/sessions'),
  chatMessages: (key) => apiFetch(`/chat/sessions/${key}/messages`),

  // Knowledge
  knowledge: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return apiFetch(`/knowledge${q ? '?' + q : ''}`);
  },
  knowledgeFeed: () => apiFetch('/knowledge/feed'),
  knowledgeContent: (path) => apiFetch(`/knowledge/content?path=${encodeURIComponent(path)}`),

  // Memories
  memories: () => apiFetch('/memories'),
  memorySearch: (q) => apiFetch(`/memories/search?q=${encodeURIComponent(q)}`),

  // Usage
  usageDashboard: (window = 'month') => apiFetch(`/usage/dashboard?window=${window}`),
  usageSummary: (window = 'month') => apiFetch(`/usage/summary?window=${window}`),

  // Inbox
  inbox: () => apiFetch('/inbox'),
  inboxRead: (id) => apiFetch(`/inbox/${id}/read`, { method: 'POST' }),
  inboxDelete: (id) => apiFetch(`/inbox/${id}`, { method: 'DELETE' }),
};
