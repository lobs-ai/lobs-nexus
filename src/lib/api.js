const BASE = '';

async function req(path, options = {}) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

export const api = {
  // Status
  status: () => req('/api/status/overview'),
  activity: () => req('/api/status/activity'),
  costs: () => req('/api/status/costs'),

  // Tasks
  tasks: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/tasks${q ? '?' + q : ''}`);
  },
  task: (id) => req(`/api/tasks/${id}`),
  createTask: (body) => req('/api/tasks', { method: 'POST', body }),
  updateTask: (id, body) => req(`/api/tasks/${id}/status`, { method: 'PATCH', body }),
  deleteTask: (id) => req(`/api/tasks/${id}`, { method: 'DELETE' }),

  // Projects
  projects: () => req('/api/projects'),
  archivedProjects: () => req('/api/projects?archived=true'),
  project: (id) => req(`/api/projects/${id}`),
  createProject: (body) => req('/api/projects', { method: 'POST', body }),
  updateProject: (id, body) => req(`/api/projects/${id}`, { method: 'PATCH', body }),
  archiveProject: (id) => req(`/api/projects/${id}/archive`, { method: 'POST' }),
  unarchiveProject: (id) => req(`/api/projects/${id}/unarchive`, { method: 'POST' }),

  // Agents
  agents: () => req('/api/agents'),

  // Workers
  workerStatus: () => req('/api/worker/status'),
  workerHistory: (limit = 50) => req(`/api/worker/history?limit=${limit}`),

  // Workflows
  workflows: () => req('/api/workflows'),
  workflow: (id) => req(`/api/workflows/${id}`),
  workflowRuns: (limit = 50) => req(`/api/workflows/runs?limit=${limit}`),

  // Usage
  usageDashboard: (window = 'month') => req(`/api/usage/dashboard?window=${window}`),
  usageSummary: (window = 'day') => req(`/api/usage/summary?window=${window}`),

  // Inbox
  inbox: () => req('/api/inbox'),
  inboxItem: (id) => req(`/api/inbox/${id}`),
  inboxRead: (id) => req(`/api/inbox/${id}/read`, { method: 'POST' }),
  inboxDelete: (id) => req(`/api/inbox/${id}`, { method: 'DELETE' }),

  // Chat
  chatSessions: () => req('/api/chat/sessions'),
  chatMessages: (key) => req(`/api/chat/sessions/${key}/messages`),

  // Knowledge
  knowledge: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/knowledge${q ? '?' + q : ''}`);
  },
  knowledgeFeed: () => req('/api/knowledge/feed'),

  // Research
  research: () => req('/api/research').catch(() => ({ memos: [] })),

  // Memories
  memories: () => req('/api/memories'),

  // Knowledge (filesystem)
  knowledgeFs: () => req('/api/knowledge-fs/list'),
  knowledgeFsRead: (path) => req('/api/knowledge-fs/read/' + path),

  // Memories (filesystem)
  memoriesFs: (agent) => agent ? req('/api/memories-fs/' + agent) : req('/api/memories-fs'),

  // Orchestrator
  orchestratorStatus: () => req('/api/orchestrator/status'),
};
