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
  status: () => req('/api/status/overview'),
  activity: () => req('/api/status/activity'),
  costs: () => req('/api/status/costs'),

  tasks: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/tasks${q ? '?' + q : ''}`);
  },
  task: (id) => req(`/api/tasks/${id}`),
  createTask: (body) => req('/api/tasks', { method: 'POST', body }),
  updateTask: (id, body) => req(`/api/tasks/${id}/status`, { method: 'PATCH', body }),
  deleteTask: (id) => req(`/api/tasks/${id}`, { method: 'DELETE' }),

  projects: () => req('/api/projects'),
  archivedProjects: () => req('/api/projects?archived=true'),
  project: (id) => req(`/api/projects/${id}`),
  createProject: (body) => req('/api/projects', { method: 'POST', body }),
  updateProject: (id, body) => req(`/api/projects/${id}`, { method: 'PATCH', body }),
  archiveProject: (id) => req(`/api/projects/${id}/archive`, { method: 'POST' }),
  unarchiveProject: (id) => req(`/api/projects/${id}/unarchive`, { method: 'POST' }),

  agents: () => req('/api/agents'),
  workerStatus: () => req('/api/worker/status'),
  workerHistory: (limit = 50) => req(`/api/worker/history?limit=${limit}`),

  workflows: () => req('/api/workflows'),
  workflow: (id) => req(`/api/workflows/${id}`),
  workflowRuns: (limit = 50) => req(`/api/workflows/runs?limit=${limit}`),

  usageDashboard: (window = 'month') => req(`/api/usage/dashboard?window=${window}`),
  usageSummary: (window = 'day') => req(`/api/usage/summary?window=${window}`),

  inbox: () => req('/api/inbox'),
  inboxItem: (id) => req(`/api/inbox/${id}`),
  inboxRead: (id) => req(`/api/inbox/${id}/read`, { method: 'POST' }),
  inboxDelete: (id) => req(`/api/inbox/${id}`, { method: 'DELETE' }),
  inboxApprove: (id) => req(`/api/inbox/${id}/approve`, { method: 'POST' }),
  inboxReject: (id) => req(`/api/inbox/${id}/reject`, { method: 'POST' }),
  inboxFeedback: (id, text) => req(`/api/inbox/${id}/feedback`, { method: 'POST', body: { text } }),

  reflections: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/reflections${q ? '?' + q : ''}`);
  },
  reflection: (id) => req(`/api/reflections/${id}`),

  chatSessions: () => req('/api/chat/sessions'),
  chatMessages: (key) => req(`/api/chat/sessions/${key}/messages`),

  knowledge: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/knowledge${q ? '?' + q : ''}`);
  },
  knowledgeFeed: () => req('/api/knowledge/feed'),
  research: () => req('/api/research').catch(() => ({ memos: [] })),
  memories: () => req('/api/memories'),

  knowledgeFs: () => req('/api/knowledge-fs/list'),
  knowledgeFsRead: (path) => req('/api/knowledge-fs/read/' + path),
  memoriesFs: (agent) => agent ? req('/api/memories-fs/' + agent) : req('/api/memories-fs'),

  orchestratorStatus: () => req(`/api/orchestrator/status`),
  initiatives: () => req(`/api/orchestrator/intelligence/initiatives`),
  initiativeDecide: (decisions) => req(`/api/orchestrator/intelligence/initiatives/batch-decide`, { method: `POST`, body: { decisions } }),
  initiativeThread: (id) => req(`/api/orchestrator/intelligence/initiatives/` + id + `/thread`),
  initiativeReply: (id, text) => fetch(`/api/orchestrator/intelligence/initiatives/` + id + `/thread`, { method: `POST`, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, author: `user` }) }).then(r => r.json()),
  inboxReadState: (ids, is_read) => req(`/api/inbox/read-state`, { method: `POST`, body: { ids, is_read } }),
};
