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
  status: (signal) => req('/api/status/overview', { signal }),
  activity: (signal) => req('/api/status/activity', { signal }),
  costs: (signal) => req('/api/status/costs', { signal }),

  tasks: (params = {}, signal) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/tasks${q ? '?' + q : ''}`, { signal });
  },
  task: (id, signal) => req(`/api/tasks/${id}`, { signal }),
  createTask: (body) => req('/api/tasks', { method: 'POST', body }),
  updateTask: (id, body) => req(`/api/tasks/${id}/status`, { method: 'PATCH', body }),
  setTaskBlockedBy: (id, blocked_by) => req(`/api/tasks/${id}/blocked-by`, { method: 'PATCH', body: { blocked_by } }),
  deleteTask: (id) => req(`/api/tasks/${id}`, { method: 'DELETE' }),
  brainDump: (body) => req('/api/tasks/braindump', { method: 'POST', body }),
  brainDumpConfirm: (body) => req('/api/tasks/braindump/confirm', { method: 'POST', body }),

  projects: (signal) => req('/api/projects', { signal }),
  archivedProjects: (signal) => req('/api/projects?archived=true', { signal }),
  project: (id, signal) => req(`/api/projects/${id}`, { signal }),
  createProject: (body) => req('/api/projects', { method: 'POST', body }),
  updateProject: (id, body) => req(`/api/projects/${id}`, { method: 'PATCH', body }),
  archiveProject: (id) => req(`/api/projects/${id}/archive`, { method: 'POST' }),
  unarchiveProject: (id) => req(`/api/projects/${id}/unarchive`, { method: 'POST' }),

  agents: (signal) => req('/api/agents', { signal }),
  workerStatus: (signal) => req('/api/worker/status', { signal }),
  workerHistory: (limit = 50, signal) => req(`/api/worker/history?limit=${limit}`, { signal }),

  workflows: (signal) => req('/api/workflows', { signal }),
  workflow: (id, signal) => req(`/api/workflows/${id}`, { signal }),
  workflowRuns: (limit = 50, signal) => req(`/api/workflows/runs?limit=${limit}`, { signal }),

  usageDashboard: (window = 'month', signal) => req(`/api/usage/dashboard?window=${window}`, { signal }),
  usageSummary: (window = 'day', signal) => req(`/api/usage/summary?window=${window}`, { signal }),
  usageProjection: (signal) => req(`/api/usage/projection`, { signal }),

  inbox: (signal) => req('/api/inbox', { signal }),
  inboxItem: (id, signal) => req(`/api/inbox/${id}`, { signal }),
  inboxRead: (id) => req(`/api/inbox/${id}/read`, { method: 'POST' }),
  inboxDelete: (id) => req(`/api/inbox/${id}`, { method: 'DELETE' }),
  inboxApprove: (id) => req(`/api/inbox/${id}/approve`, { method: 'POST' }),
  inboxReject: (id) => req(`/api/inbox/${id}/reject`, { method: 'POST' }),
  inboxFeedback: (id, text) => req(`/api/inbox/${id}/feedback`, { method: 'POST', body: { text } }),

  reflections: (params = {}, signal) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/reflections${q ? '?' + q : ''}`, { signal });
  },
  reflection: (id, signal) => req(`/api/reflections/${id}`, { signal }),
  approveReflection: (id, body = {}) => req(`/api/reflections/${id}/approve`, { method: 'POST', body }),
  rejectReflection: (id, body = {}) => req(`/api/reflections/${id}/reject`, { method: 'POST', body }),
  reflectionFeedback: (id, feedback, author = 'lobs') => req(`/api/reflections/${id}/feedback`, { method: 'POST', body: { feedback, author } }),

  chatSessions: (signal) => req('/api/chat/sessions', { signal }),
  chatMessages: (key, signal) => req(`/api/chat/sessions/${key}/messages`, { signal }),

  knowledge: (params = {}, signal) => {
    const q = new URLSearchParams(params).toString();
    return req(`/api/knowledge${q ? '?' + q : ''}`, { signal });
  },
  knowledgeFeed: (signal) => req('/api/knowledge/feed', { signal }),
  research: (signal) => req('/api/research', { signal }).catch(() => ({ memos: [] })),
  memories: (signal) => req('/api/memories', { signal }),

  knowledgeFs: (signal) => req('/api/knowledge-fs/list', { signal }),
  knowledgeFsRead: (path, signal) => req('/api/knowledge-fs/read/' + path, { signal }),
  memoriesFs: (agent, signal) => agent ? req('/api/memories-fs/' + agent, { signal }) : req('/api/memories-fs', { signal }),

  orchestratorStatus: (signal) => req(`/api/orchestrator/status`, { signal }),
  initiatives: (signal) => req(`/api/orchestrator/intelligence/initiatives`, { signal }),
  initiativeDecide: (decisions) => req(`/api/orchestrator/intelligence/initiatives/batch-decide`, { method: `POST`, body: { decisions } }),
  initiativeThread: (id, signal) => req(`/api/orchestrator/intelligence/initiatives/` + id + `/thread`, { signal }),
  initiativeReply: (id, text) => fetch(`/api/orchestrator/intelligence/initiatives/` + id + `/thread`, { method: `POST`, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, author: `user` }) }).then(r => r.json()),
  inboxReadState: (ids, is_read) => req(`/api/inbox/read-state`, { method: `POST`, body: { ids, is_read } }),
};
