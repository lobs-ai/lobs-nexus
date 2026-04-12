import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import GlassCard from '../components/GlassCard';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import { timeAgo, formatUptime, AGENT_COLORS } from '../lib/utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

function ElapsedTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      if (!startedAt) return;
      const s = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      if (h > 0) setElapsed(`${h}h ${m % 60}m`);
      else if (m > 0) setElapsed(`${m}m ${s % 60}s`);
      else setElapsed(`${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span style={{ fontFamily: 'var(--mono)', color: 'var(--teal)', fontSize: '0.72rem' }}>{elapsed}</span>;
}

const AGENT_ICONS = { programmer: '⟨/⟩', writer: '✍', researcher: '🔍', reviewer: '✓', architect: '⬡' };

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Morning';
  if (h < 17) return 'Afternoon';
  return 'Evening';
}

function getWorkerTaskTitle(worker) {
  const candidates = [
    worker?._taskTitle, worker?.taskTitle, worker?.task_title,
    worker?.currentTaskTitle, worker?.current_task_title,
    worker?.task?.title, worker?.task?.taskTitle,
  ];
  return candidates.find(c => typeof c === 'string' && c.trim() && !/^(task[_-])?[a-f0-9]{8,}$/i.test(c)) || 'Processing...';
}

function hoursAgo(dateStr) {
  if (!dateStr) return 0;
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / 3600000);
}

const ACT_META = {
  worker_completed: { icon: '✓', color: 'var(--green)', link: '/team' },
  worker_failed: { icon: '✗', color: 'var(--red)', link: '/team' },
  worker_spawned: { icon: '⚡', color: 'var(--teal)', link: '/team' },
  task_created: { icon: '+', color: 'var(--blue)', link: '/projects' },
};

// ── Status Engine ───────────────────────────────────────────────────────────
// Determines the hero message + color theme based on real system state

function getSystemState(status, workers, blockedTasks, staleTasks, activeTasks, inboxCount, completedToday, activeChats = []) {
  const activeWorkers = workers.length + activeChats.length;
  const healthy = status?.server?.status === 'healthy';

  // Priority: system down > failures > blocked > workers busy > idle states
  if (!healthy) {
    return { message: 'System Degraded', sub: 'Orchestrator reporting issues', color: 'var(--red)', accent: 'rgba(248,113,113,0.06)', borderAccent: 'rgba(248,113,113,0.15)' };
  }
  if (staleTasks.length >= 3) {
    return { message: `${staleTasks.length} Tasks Stale`, sub: 'Blocked items need attention', color: 'var(--amber)', accent: 'rgba(251,191,36,0.05)', borderAccent: 'rgba(251,191,36,0.12)' };
  }
  if (blockedTasks.length >= 3) {
    return { message: `${blockedTasks.length} Tasks Blocked`, sub: 'Work is piling up', color: 'var(--amber)', accent: 'rgba(251,191,36,0.05)', borderAccent: 'rgba(251,191,36,0.12)' };
  }
  if (activeWorkers >= 3) {
    return { message: `${activeWorkers} Processes Active`, sub: 'Heavy processing underway', color: 'var(--blue)', accent: 'rgba(56,189,248,0.05)', borderAccent: 'rgba(56,189,248,0.12)' };
  }
  if (activeWorkers > 0) {
    const chatCount = activeChats.length;
    const workerCount = workers.length;
    const sub = chatCount > 0 && workerCount > 0 ? `${workerCount} worker${workerCount > 1 ? 's' : ''} + ${chatCount} chat${chatCount > 1 ? 's' : ''}` :
      chatCount > 0 ? 'Chat in progress' : 'Tasks in progress';
    return { message: `${activeWorkers} Active`, sub, color: 'var(--teal)', accent: 'rgba(45,212,191,0.04)', borderAccent: 'rgba(45,212,191,0.12)' };
  }
  if (completedToday >= 10) {
    return { message: `${completedToday} Completed Today`, sub: 'Productive day', color: 'var(--green)', accent: 'rgba(52,211,153,0.04)', borderAccent: 'rgba(52,211,153,0.12)' };
  }
  if (inboxCount > 0) {
    return { message: `${inboxCount} Need${inboxCount === 1 ? 's' : ''} Action`, sub: 'Inbox items awaiting review', color: 'var(--purple)', accent: 'rgba(167,139,250,0.04)', borderAccent: 'rgba(167,139,250,0.12)' };
  }
  if (activeTasks.length > 0) {
    return { message: `${activeTasks.length} Active Tasks`, sub: 'Queued and ready', color: 'var(--teal)', accent: 'rgba(45,212,191,0.03)', borderAccent: 'rgba(45,212,191,0.10)' };
  }
  return { message: 'All Clear', sub: formatUptime(status?.server?.uptime_seconds) + ' uptime', color: 'var(--green)', accent: 'rgba(52,211,153,0.03)', borderAccent: 'rgba(52,211,153,0.10)' };
}

// ── Dashboard ───────────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: status } = usePolling(signal => api.status(signal), 10000);
  const { data: activity } = usePolling(signal => api.activity(signal), 10000);
  const { data: workerStatus } = usePolling(signal => api.workerStatus(signal), 5000);
  const { data: tasksData } = usePolling(signal => api.tasks({ limit: 200 }, signal), 15000);

  const [brief, setBrief] = useState(null);
  useEffect(() => { api.dailyBrief?.().then(setBrief).catch(() => {}); }, []);

  const [inboxCount, setInboxCount] = useState(0);
  useEffect(() => {
    api.inbox?.().then(data => {
      const list = data?.items || data || [];
      setInboxCount(list.filter(i => (i.requiresAction || i.requires_action) && (i.actionStatus || i.action_status) === 'pending').length);
    }).catch(() => {});
  }, []);

  const [githubFeed, setGithubFeed] = useState(null);
  useEffect(() => { api.githubFeed?.(8).then(setGithubFeed).catch(() => {}); }, []);

  const [goalsData, setGoalsData] = useState(null);
  useEffect(() => { api.goals().then(setGoalsData).catch(() => {}); }, []);

  const [serviceHealth, setServiceHealth] = useState(null);
  useEffect(() => { api.serviceHealth?.().then(setServiceHealth).catch(() => {}); }, []);

  // Derived data
  const taskArr = Array.isArray(tasksData?.tasks) ? tasksData.tasks : Array.isArray(tasksData) ? tasksData : [];
  const taskMap = {};
  taskArr.forEach(t => { if (t.id) taskMap[t.id] = t; });

  const workers = (Array.isArray(workerStatus?.workers) ? workerStatus.workers : []).map(w => {
    const tid = w.taskId || w.currentTaskId || w.current_task_id;
    return { ...w, _taskTitle: tid ? taskMap[tid]?.title || taskMap[String(tid)]?.title : null };
  });

  // Active chat sessions (currently processing)
  const activeChats = Array.isArray(workerStatus?.chatSessions) ? workerStatus.chatSessions : [];

  const activities = (activity || []).slice(0, 6);
  const blockedTasks = taskArr.filter(t => t.status === 'blocked');
  const activeTasks = taskArr.filter(t => t.status === 'active');
  const staleTasks = taskArr.filter(t => t.status === 'blocked' && hoursAgo(t.updated_at || t.created_at) >= 24);
  const completedToday = status?.tasks?.completed_today ?? 0;
  const scheduleItems = (brief?.schedule || brief?.calendar || []).slice(0, 5);

  // System state drives everything
  const state = getSystemState(status, workers, blockedTasks, staleTasks, activeTasks, inboxCount, completedToday, activeChats);

  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  // Create task modal
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', agent: 'programmer', model_tier: 'standard', notes: '' });
  const createTask = async () => {
    if (!taskForm.title.trim()) return;
    try { await api.createTask(taskForm); showToast('Task created', 'success'); setShowCreateTask(false); setTaskForm({ title: '', agent: 'programmer', model_tier: 'standard', notes: '' }); } catch { showToast('Failed', 'error'); }
  };

  const hasAttention = blockedTasks.length > 0 || inboxCount > 0 || staleTasks.length > 0;

  return (
    <div style={{ position: 'relative', padding: '32px 32px 32px', minHeight: '100%' }}>
      {/* Background accent that reflects system state */}
      <div style={{
        position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: `radial-gradient(ellipse at 50% 0%, ${state.accent} 0%, transparent 60%)`,
        transition: 'background 1.5s ease',
      }} />
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 900, margin: '0 auto' }}>

        {/* ── Hero ───────────────────────────────────────────────────── */}
        <div className="fade-in-up" style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 6 }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{getGreeting()}, Rafe</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>{dateStr}</span>
            {brief?.weather && (
              <span style={{ fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
                {brief.weather.temp}°F {brief.weather.condition}
              </span>
            )}
          </div>
          <div style={{
            fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.05,
            color: state.color,
            filter: `drop-shadow(0 0 30px ${state.accent})`,
            transition: 'color 1s ease, filter 1s ease',
          }}>
            {state.message}
          </div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)', marginTop: 6 }}>
            {state.sub}
          </div>
        </div>

        {/* ── Stat Strip ────────────────────────────────────────────── */}
        <div className="fade-in-up-1" style={{
          display: 'flex', gap: 1, marginBottom: 28, borderRadius: 12, overflow: 'hidden',
          border: `1px solid ${state.borderAccent}`, transition: 'border-color 1s ease',
        }}>
          {[
            { label: 'Running', value: (status?.workers?.active ?? 0) + (status?.chat?.active ?? 0), color: ((status?.workers?.active ?? 0) + (status?.chat?.active ?? 0)) > 0 ? 'var(--teal)' : 'var(--faint)' },
            { label: 'Active', value: activeTasks.length, color: activeTasks.length > 0 ? 'var(--blue)' : 'var(--faint)' },
            { label: 'Done', value: completedToday, color: completedToday > 0 ? 'var(--green)' : 'var(--faint)' },
            { label: 'Queue', value: status?.tasks?.waiting ?? 0, color: (status?.tasks?.waiting ?? 0) > 0 ? 'var(--purple)' : 'var(--faint)' },
            { label: 'Blocked', value: blockedTasks.length, color: blockedTasks.length > 0 ? 'var(--amber)' : 'var(--faint)' },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, padding: '14px 12px', textAlign: 'center',
              background: 'rgba(14,20,38,0.6)',
              borderRight: i < 4 ? '1px solid rgba(45,212,191,0.06)' : 'none',
            }}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: s.color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: '0.58rem', color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Service Warnings ─────────────────────────────────────── */}
        {serviceHealth?.services?.length > 0 && (() => {
          const SEVERITY_META = {
            error: { icon: '✗', color: 'var(--red)', bg: 'rgba(248,113,113,0.06)', border: 'rgba(248,113,113,0.2)' },
            warning: { icon: '⚠', color: 'var(--amber)', bg: 'rgba(251,191,36,0.06)', border: 'rgba(251,191,36,0.2)' },
            info: { icon: 'ℹ', color: 'var(--blue)', bg: 'rgba(56,189,248,0.06)', border: 'rgba(56,189,248,0.15)' },
          };
          const errors = serviceHealth.services.filter(s => s.severity === 'error');
          const warnings = serviceHealth.services.filter(s => s.severity === 'warning');
          const headerColor = errors.length > 0 ? 'var(--red)' : warnings.length > 0 ? 'var(--amber)' : 'var(--blue)';
          const headerLabel = errors.length > 0 ? `${errors.length} Service${errors.length > 1 ? 's' : ''} Down` : `${serviceHealth.services.length} Warning${serviceHealth.services.length > 1 ? 's' : ''}`;

          return (
            <div className="fade-in-up-2" style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: '0.75rem', color: headerColor }}>●</span>
                <span className="section-label" style={{ marginBottom: 0, color: headerColor }}>{headerLabel}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {serviceHealth.services.map(svc => {
                  const meta = SEVERITY_META[svc.severity] || SEVERITY_META.info;
                  return (
                    <div key={svc.id} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: 10,
                      background: meta.bg, border: `1px solid ${meta.border}`,
                    }}>
                      <span style={{
                        width: 24, height: 24, borderRadius: 6,
                        background: `${meta.color}18`, color: meta.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                      }}>{meta.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span style={{ color: meta.color, fontWeight: 700, fontSize: '0.8rem' }}>{svc.name}</span>
                          <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{svc.message}</span>
                        </div>
                        {svc.fix && <div style={{ color: 'var(--faint)', fontSize: '0.68rem', fontFamily: 'var(--mono)', marginTop: 2 }}>{svc.fix}</div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* ── Active Work (workers + chat sessions) ────────────────── */}
        {(workers.length > 0 || activeChats.length > 0) && (
          <div className="fade-in-up-2" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', color: 'var(--teal)' }} />
              <span className="section-label" style={{ marginBottom: 0 }}>Active</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
              {activeChats.map(chat => {
                const color = 'var(--purple)';
                return (
                  <div key={chat.sessionKey} onClick={() => { localStorage.setItem('nexus-chat-session-key', chat.sessionKey); navigate('/chat'); }} style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    padding: '14px 16px', borderRadius: 12,
                    background: `rgba(167,139,250,0.04)`, border: `1px solid rgba(167,139,250,0.15)`,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color, fontSize: '0.9rem', flexShrink: 0,
                    }}>
                      💬
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color, fontWeight: 700, fontSize: '0.82rem' }}>Chat</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {chat.label}
                      </div>
                    </div>
                    <ElapsedTimer startedAt={chat.startedAt} />
                  </div>
                );
              })}
              {workers.map(w => {
                const color = AGENT_COLORS[w.agentType] || 'var(--teal)';
                return (
                  <div key={w.id || w.workerId} onClick={() => navigate('/team')} style={{
                    display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
                    padding: '14px 16px', borderRadius: 12,
                    background: `${color}06`, border: `1px solid ${color}18`,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 8,
                      background: color + '18', border: `1px solid ${color}33`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color, fontSize: '0.85rem', fontFamily: 'var(--mono)', fontWeight: 700, flexShrink: 0,
                    }}>
                      {AGENT_ICONS[w.agentType] || w.agentType?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color, fontWeight: 700, textTransform: 'capitalize', fontSize: '0.82rem' }}>{w.agentType || 'worker'}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.72rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getWorkerTaskTitle(w)}
                      </div>
                    </div>
                    <ElapsedTimer startedAt={w.startedAt} />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Needs Attention (only when items exist) ────────────────── */}
        {hasAttention && (
          <div className="fade-in-up-2" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: '0.8rem' }}>⚠</span>
              <span className="section-label" style={{ marginBottom: 0 }}>Needs Attention</span>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {blockedTasks.length > 0 && (
                <button onClick={() => navigate('/tasks')} className="attention-chip" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 10,
                  background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)',
                  color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
                }}>
                  <span style={{ color: 'var(--amber)' }}>🚧</span>
                  {blockedTasks.length} blocked
                </button>
              )}
              {inboxCount > 0 && (
                <button onClick={() => navigate('/inbox')} className="attention-chip" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 10,
                  background: 'rgba(167,139,250,0.06)', border: '1px solid rgba(167,139,250,0.2)',
                  color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
                }}>
                  <span style={{ color: 'var(--purple)' }}>📬</span>
                  {inboxCount} need{inboxCount === 1 ? 's' : ''} action
                </button>
              )}
              {staleTasks.length > 0 && (
                <button onClick={() => navigate('/tasks')} className="attention-chip" style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 10,
                  background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)',
                  color: 'var(--text)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'all 0.2s',
                }}>
                  <span style={{ color: 'var(--red)' }}>⏰</span>
                  {staleTasks.length} stale
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Two-Column: Schedule + Activity ────────────────────────── */}
        <div className="fade-in-up-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>

          {/* Today's Schedule (only if events exist) */}
          {scheduleItems.length > 0 && <GlassCard style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span className="section-label" style={{ marginBottom: 0 }}>Today</span>
              <Link to="/scheduler" style={{ fontSize: '0.72rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>Schedule →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {scheduleItems.map((item, i) => {
                const isPast = item.isPast || false;
                return (
                  <div key={i} style={{
                    display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0',
                    borderBottom: i < scheduleItems.length - 1 ? '1px solid var(--border)' : 'none',
                    opacity: isPast ? 0.5 : 1,
                  }}>
                    <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontSize: '0.75rem', width: 56, flexShrink: 0, fontWeight: 600 }}>{item.time}</span>
                    <span style={{ color: 'var(--text)', fontSize: '0.85rem' }}>{item.event}</span>
                  </div>
                );
              })}
            </div>
          </GlassCard>}

          {/* Activity Feed */}
          <GlassCard style={{ padding: '20px 22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span className="section-label" style={{ marginBottom: 0 }}>Activity</span>
              <Link to="/team" style={{ fontSize: '0.72rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>All →</Link>
            </div>
            {activities.length === 0 ? (
              <div style={{ color: 'var(--faint)', fontSize: '0.82rem', padding: '12px 0' }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activities.map((a, i) => {
                  const meta = ACT_META[a.type] || { icon: '·', color: 'var(--muted)' };
                  return (
                    <div key={i} onClick={() => meta.link && navigate(meta.link)} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '7px 0', cursor: meta.link ? 'pointer' : 'default',
                      borderBottom: i < activities.length - 1 ? '1px solid var(--border)' : 'none',
                    }}>
                      <span style={{
                        width: 20, height: 20, borderRadius: 5,
                        background: `${meta.color}15`, color: meta.color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.55rem', fontWeight: 700, flexShrink: 0, marginTop: 2,
                      }}>{meta.icon}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ color: 'var(--text)', fontSize: '0.78rem', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</div>
                        <div style={{ color: 'var(--faint)', fontSize: '0.65rem', fontFamily: 'var(--mono)', marginTop: 1 }}>{timeAgo(a.timestamp)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* ── Goals ────────────────────────────────────────────────── */}
        {goalsData?.goals?.length > 0 && (() => {
          const activeGoals = goalsData.goals.filter(g => g.status === 'active');
          const topGoals = [...activeGoals].sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0)).slice(0, 4);
          const totalOpen = activeGoals.reduce((s, g) => s + (g.openTaskCount ?? 0), 0);
          const lastWorkedTs = activeGoals.map(g => g.lastWorked).filter(Boolean).sort().at(-1);
          return (
            <GlassCard className="fade-in-up-4" style={{ padding: '20px 22px', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span className="section-label" style={{ marginBottom: 0 }}>Goals</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {lastWorkedTs && (
                    <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                      worked {timeAgo(lastWorkedTs)}
                    </span>
                  )}
                  <Link to="/goals" style={{ fontSize: '0.72rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>All →</Link>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem' }}>{activeGoals.length}</span> active
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                  <span style={{ color: 'var(--blue)', fontWeight: 600, fontSize: '0.85rem' }}>{totalOpen}</span> open tasks
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                {topGoals.map(g => {
                  const pct = Math.min(100, Math.max(0, g.priority ?? 0));
                  const col = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : 'var(--teal)';
                  return (
                    <Link key={g.id} to="/goals" style={{ textDecoration: 'none' }}>
                      <div style={{
                        padding: '10px 12px', borderRadius: 8,
                        background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)',
                        transition: 'border-color 0.15s',
                      }}>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text)', marginBottom: 6, fontWeight: 500, lineHeight: 1.3,
                          overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                          {g.title}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ flex: 1, height: '3px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: col, borderRadius: '2px' }} />
                          </div>
                          <span style={{ fontSize: '0.62rem', color: 'var(--muted)', fontFamily: 'var(--mono)', minWidth: 20 }}>{pct}</span>
                        </div>
                        {g.openTaskCount > 0 && (
                          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                            {g.openTaskCount} task{g.openTaskCount !== 1 ? 's' : ''} open
                          </div>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </GlassCard>
          );
        })()}

        {/* ── GitHub (only if there's activity) ──────────────────────── */}
        {githubFeed?.events?.length > 0 && (
          <GlassCard className="fade-in-up-4" style={{ padding: '20px 22px', marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span className="section-label" style={{ marginBottom: 0 }}>GitHub</span>
              <Link to="/github" style={{ fontSize: '0.72rem', color: 'var(--teal)', textDecoration: 'none', fontWeight: 600 }}>All →</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8 }}>
              {githubFeed.events.slice(0, 6).map((event, i) => {
                const typeColors = { push: 'var(--green)', pr: 'var(--blue)', issue: 'var(--amber)', ci: 'var(--red)' };
                const typeIcons = { push: '→', pr: '⇄', issue: '●', ci: '⚠' };
                const color = typeColors[event.type] || 'var(--muted)';
                return (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '6px 0' }}>
                    <span style={{ color, fontSize: '0.75rem', flexShrink: 0, marginTop: 2 }}>{typeIcons[event.type] || '•'}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{event.title}</div>
                      <div style={{ fontSize: '0.62rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>{event.repo}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        )}

        {/* ── Quick Actions Bar ──────────────────────────────────────── */}
        <div className="fade-in-up-4" style={{
          display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center',
          padding: '20px 0', borderTop: '1px solid var(--border)',
        }}>
          <button onClick={() => setShowCreateTask(true)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)',
            color: 'var(--teal)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            + New Task
          </button>
          <button onClick={() => navigate('/chat')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)',
            color: 'var(--purple)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            💬 Chat
          </button>
          <button onClick={() => navigate('/inbox')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)',
            color: 'var(--blue)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            📬 Inbox
          </button>
          <button onClick={() => navigate('/team')} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8,
            background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)',
            color: 'var(--green)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s',
          }}>
            👥 Team
          </button>
        </div>
      </div>

      {/* Create Task Modal */}
      <Modal open={showCreateTask} onClose={() => setShowCreateTask(false)} title="New Task">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Title *</label>
            <input autoFocus data-autofocus="true" className="nx-input" placeholder="Task title..." value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Agent</label>
              <select className="nx-input" value={taskForm.agent} onChange={e => setTaskForm(f => ({ ...f, agent: e.target.value }))}>
                {['programmer', 'writer', 'researcher', 'reviewer', 'architect'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Model Tier</label>
              <select className="nx-input" value={taskForm.model_tier} onChange={e => setTaskForm(f => ({ ...f, model_tier: e.target.value }))}>
                {['micro', 'small', 'medium', 'standard', 'strong'].map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Notes</label>
            <textarea className="nx-input" rows={4} placeholder="Task description..." value={taskForm.notes} onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setShowCreateTask(false)}>Cancel</button>
            <button className="btn-primary" onClick={createTask}>Create Task</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
