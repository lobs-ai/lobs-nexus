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

// Like req() but returns fallback on error instead of throwing
async function reqSafe(path, options = {}, fallback = {}) {
  try {
    return await req(path, options);
  } catch {
    return fallback;
  }
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
  projectBraindump: (id, text) => req(`/api/projects/${id}/braindump`, { method: 'POST', body: { text } }),

  agents: (signal) => req('/api/agents', { signal }),
  workerStatus: (signal) => req('/api/worker/status', { signal }),
  workerHistory: (limit = 50, signal) => req(`/api/worker/history?limit=${limit}`, { signal }),

  // Legacy workflow system removed — graceful stubs
  workflows: () => Promise.resolve([]),
  workflow: () => Promise.resolve(null),
  workflowRuns: () => Promise.resolve([]),

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

  // Learning system
  learningOverview: (agent = 'all', lookbackDays = 30, signal) => req(`/api/learning/stats?agent=${agent}&lookback_days=${lookbackDays}`, { signal }),
  learnings: (agent, active = true, signal) => {
    const q = new URLSearchParams({ ...(agent ? { agent } : {}), active: String(active) }).toString();
    return req(`/api/learning/learnings?${q}`, { signal });
  },
  learningKillSwitch: (signal) => req('/api/learning/kill-switch', { signal }),
  setLearningKillSwitch: (body) => req('/api/learning/kill-switch', { method: 'POST', body }),
  triggerLearningExtract: () => req('/api/learning/extract', { method: 'POST' }),
  deactivateLearning: (id) => req(`/api/learning/learnings/${id}/deactivate`, { method: 'PATCH' }),

  // Plugin system
  // Legacy plugin system removed — graceful stubs
  plugins: () => Promise.resolve([]),
  plugin: () => Promise.resolve(null),
  updatePlugin: () => Promise.resolve({}),
  uiAffordances: () => Promise.resolve({ affordances: [] }),
  invokePlugin: () => Promise.resolve({}),
  uiConfig: () => Promise.resolve({ layout: 'command-center', widgetOrder: [], hiddenWidgets: [], agentHighlights: [] }),
  updateUiConfig: () => Promise.resolve({}),

  orchestratorStatus: (signal) => req(`/api/orchestrator/status`, { signal }),
  initiatives: (signal) => req(`/api/orchestrator/intelligence/initiatives`, { signal }),
  initiativeDecide: (decisions) => req(`/api/orchestrator/intelligence/initiatives/batch-decide`, { method: `POST`, body: { decisions } }),
  initiativeThread: (id, signal) => req(`/api/orchestrator/intelligence/initiatives/` + id + `/thread`, { signal }),
  initiativeReply: (id, text) => fetch(`/api/orchestrator/intelligence/initiatives/` + id + `/thread`, { method: `POST`, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text, author: `user` }) }).then(r => r.json()),
  inboxReadState: (ids, is_read) => req(`/api/inbox/read-state`, { method: `POST`, body: { ids, is_read } }),

  // Daily Brief
  dailyBrief: (signal) => reqSafe('/api/daily-brief', { signal }, null),

  // Micro-Learning
  learningTopics: (signal) => req('/api/learning/topics', { signal }),
  createLearningTopic: (body) => req('/api/learning/topics', { method: 'POST', body }),
  updateLearningTopic: (id, body) => req(`/api/learning/topics/${id}`, { method: 'PATCH', body }),
  deleteLearningTopic: (id) => req(`/api/learning/topics/${id}`, { method: 'DELETE' }),
  generateCards: (topicId, body) => req(`/api/learning/topics/${topicId}/generate`, { method: 'POST', body }),
  learningCards: (topicId, signal) => req(`/api/learning/cards?topic_id=${topicId || ''}`, { signal }),
  cardsDue: (signal) => req('/api/learning/cards/due', { signal }),
  reviewCard: (id, grade) => req(`/api/learning/cards/${id}/review`, { method: 'POST', body: { grade } }),
  createCard: (body) => req('/api/learning/cards', { method: 'POST', body }),
  deleteCard: (id) => req(`/api/learning/cards/${id}`, { method: 'DELETE' }),
  learningStats: (signal) => req('/api/learning/stats', { signal }),

  // Quick Capture (endpoint not yet implemented — graceful stubs)
  capture: (body) => reqSafe('/api/capture', { method: 'POST', body }),
  recentCaptures: (limit, signal) => reqSafe(`/api/capture/recent?limit=${limit || 10}`, { signal }, []),

  // GitHub Feed
  githubFeed: (limit, signal) => reqSafe(`/api/github/feed?limit=${limit || 30}`, { signal }, null),
  githubPRs: (signal) => reqSafe('/api/github/prs', { signal }, []),
  githubCI: (signal) => reqSafe('/api/github/ci', { signal }, []),

  // Focus Timer (endpoint not yet implemented — graceful stubs)
  startFocus: (body) => reqSafe('/api/focus/start', { method: 'POST', body }),
  stopFocus: (sessionId) => reqSafe('/api/focus/stop', { method: 'POST', body: { sessionId } }),
  currentFocus: (signal) => reqSafe('/api/focus/current', { signal }, null),
  focusHistory: (limit, signal) => reqSafe(`/api/focus/history?limit=${limit || 20}`, { signal }, []),
  focusStats: (signal) => reqSafe('/api/focus/stats', { signal }, {}),

  // My Tasks (endpoint not yet implemented — graceful stubs)
  myTasks: (params = {}, signal) => {
    const q = new URLSearchParams(params).toString();
    return reqSafe(`/api/my-tasks${q ? '?' + q : ''}`, { signal }, { tasks: [] });
  },
  myTaskStats: (signal) => reqSafe('/api/my-tasks/stats', { signal }, {}),
  createMyTask: (body) => reqSafe('/api/my-tasks', { method: 'POST', body }),
  updateMyTask: (id, body) => reqSafe(`/api/my-tasks/${id}`, { method: 'PATCH', body }),
  completeMyTask: (id) => reqSafe(`/api/my-tasks/${id}/complete`, { method: 'POST' }),
  snoozeMyTask: (id, until) => reqSafe(`/api/my-tasks/${id}/snooze`, { method: 'POST', body: { until } }),
  deleteMyTask: (id) => reqSafe(`/api/my-tasks/${id}`, { method: 'DELETE' }),
  assignToRafe: (body) => reqSafe('/api/my-tasks/from-agent', { method: 'POST', body }),
};
