import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import { timeAgo, formatDuration, formatUptime, AGENT_COLORS } from '../lib/utils';

function CountUp({ value, duration = 1200 }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef(null);
  useEffect(() => {
    if (!value) return;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.floor(eased * value));
      if (progress < 1) ref.current = requestAnimationFrame(tick);
    };
    ref.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(ref.current);
  }, [value]);
  return <>{display}</>;
}

function ElapsedTimer({ startedAt }) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    const update = () => {
      if (!startedAt) return;
      const s = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000);
      const m = Math.floor(s / 60);
      const h = Math.floor(m / 60);
      const d = Math.floor(h / 24);
      if (d > 0) setElapsed(`${d}d ${h % 24}h`);
      else if (h > 0) setElapsed(`${h}h ${m % 60}m`);
      else if (m > 0) setElapsed(`${m}m ${s % 60}s`);
      else setElapsed(`${s}s`);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return <span style={{ fontFamily: 'var(--mono)', color: 'var(--teal)', fontSize: '0.78rem' }}>{elapsed}</span>;
}

const AGENT_ICON_MAP = {
  programmer: '⟨/⟩',
  writer: '✍',
  researcher: '🔍',
  reviewer: '✓',
  architect: '⬡',
};

const ACT_META = {
  worker_completed: { icon: '✓', color: 'var(--green)', label: 'Completed', link: '/team' },
  worker_failed:    { icon: '✗', color: 'var(--red)',   label: 'Failed', link: '/team' },
  worker_spawned:   { icon: '⚡', color: 'var(--teal)', label: 'Spawned', link: '/team' },
  task_created:     { icon: '+', color: 'var(--blue)',  label: 'Created', link: '/projects' },

};

const isLikelyTaskHash = (value) => {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  return /^(task[_-])?[a-f0-9]{8,}$/i.test(v) || /^tsk_[a-z0-9]{8,}$/i.test(v);
};

const getWorkerTaskTitle = (worker) => {
  const candidates = [
    worker?._taskTitle,
    worker?.taskTitle,
    worker?.task_title,
    worker?.currentTaskTitle,
    worker?.current_task_title,
    worker?.task?.title,
    worker?.task?.taskTitle,
    worker?.task?.task_title,
  ];

  const title = candidates.find((candidate) => typeof candidate === 'string' && candidate.trim() && !isLikelyTaskHash(candidate));
  if (title) return title;

  return 'Processing...';
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: status } = usePolling(() => api.status(), 10000);
  const { data: activity } = usePolling(() => api.activity(), 10000);
  const { data: workerStatus } = usePolling(() => api.workerStatus(), 5000);
  const { data: tasksData } = usePolling(() => api.tasks({ limit: 100 }), 15000);

  const taskMap = {};
  (tasksData?.tasks || tasksData || []).forEach(t => { if (t.id) taskMap[t.id] = t; });

  const workers = (workerStatus?.workers || []).map(w => ({
    ...w,
    _taskTitle: (w.taskId && taskMap[w.taskId]?.title) || null,
  }));
  const activities = (activity || []).slice(0, 12);

  const stats = [
    {
      label: 'Active Workers',
      value: status?.workers?.active ?? 0,
      sub: `${status?.workers?.total_completed || 0} total runs`,
      color: 'var(--teal)',
      dot: true,
    },
    {
      label: 'Tasks Today',
      value: status?.tasks?.completed_today ?? 0,
      sub: `${status?.tasks?.active || 0} active now`,
      color: 'var(--blue)',
    },
    {
      label: 'System Uptime',
      value: null,
      display: formatUptime(status?.server?.uptime_seconds),
      sub: status?.server?.status || 'checking',
      color: 'var(--green)',
    },
    {
      label: 'Queue Depth',
      value: status?.tasks?.waiting ?? 0,
      sub: 'tasks waiting',
      color: 'var(--purple)',
    },
  ];

  const quickActions = [
    { label: 'New Task', icon: '+', color: 'var(--teal)', action: () => setShowCreateTask(true) },
    { label: 'Inbox', icon: '📬', color: 'var(--blue)', to: '/inbox' },
    { label: 'Chat', icon: '💬', color: 'var(--purple)', to: '/chat' },
    { label: 'Workflows', icon: '⟳', color: 'var(--amber)', to: '/workflows' },
    { label: 'Team', icon: '👥', color: 'var(--green)', to: '/team' },
    { label: 'Usage', icon: '📊', color: 'var(--red)', to: '/usage' },
  ];

  const [showCreateTask, setShowCreateTask] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', agent: 'programmer', model_tier: 'standard', notes: '' });
  const createTask = async () => {
    if (!taskForm.title.trim()) return;
    try { await api.createTask(taskForm); showToast('Task created', 'success'); setShowCreateTask(false); setTaskForm({ title: '', agent: 'programmer', model_tier: 'standard', notes: '' }); } catch { showToast('Failed', 'error'); }
  };

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      {/* Orbs */}
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>

        {/* HERO */}
        <div className="fade-in-up" style={{ marginBottom: 48, textAlign: 'center', padding: '40px 0 20px' }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 16, opacity: 0.8 }}>
            LOBS NEXUS — PAW COMMAND SYSTEM
          </div>
          <h1 className="hero-greeting" style={{ marginBottom: 12 }}>
            {(status?.workers?.active || 0) > 0 ? 'Systems Active' : 'All Systems Nominal'}
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '1rem', maxWidth: 480, margin: '0 auto' }}>
            {(status?.workers?.active || 0)} agents running · {status?.tasks?.active || 0} tasks in progress · Uptime {formatUptime(status?.server?.uptime_seconds)}
          </p>
        </div>

        {/* STAT CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 36 }}>
          {stats.map((s, i) => (
            <div key={i} className={`hud-stat-card fade-in-up-${i+1} float-anim`} style={{ animationDelay: `${i * 0.5}s` }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)`, opacity: 0.6, borderRadius: '14px 14px 0 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 12 }}>
                  {s.label}
                </div>
                {s.dot && (
                  <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, color: s.color, display: 'block', marginTop: 2 }} />
                )}
              </div>
              <div style={{ fontSize: '2.8rem', fontWeight: 900, color: s.color, lineHeight: 1, marginBottom: 6, fontFamily: 'var(--mono)', letterSpacing: '-2px' }}>
                {s.display || (s.value != null ? <CountUp value={s.value} /> : '--')}
              </div>
              <div style={{ color: 'var(--faint)', fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* MAIN GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, marginBottom: 24 }}>

          {/* Left: Active Workers */}
          <GlassCard className="fade-in-up-3">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div>
                <div className="section-label" style={{ marginBottom: 4 }}>Live Processes</div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Active Workers</h3>
              </div>
              <Badge label={workers.length > 0 ? `${workers.length} running` : 'idle'} color={workers.length > 0 ? 'var(--teal)' : 'var(--faint)'} dot={workers.length > 0} />
            </div>

            {workers.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.3 }}>⬡</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No active workers</div>
                <div style={{ color: 'var(--faint)', fontSize: '0.78rem', marginTop: 4 }}>System standing by</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {workers.map(w => {
                  const color = AGENT_COLORS[w.agentType] || 'var(--teal)';
                  return (
                    <div key={w.id || w.workerId} className="worker-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 8, background: color + '22', border: `1px solid ${color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', color, fontSize: '0.85rem', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                            {AGENT_ICON_MAP[w.agentType] || w.agentType?.[0]?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div style={{ color, fontWeight: 700, textTransform: 'capitalize', fontSize: '0.9rem' }}>{w.agentType || 'worker'}</div>
                            <div style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>
                              {getWorkerTaskTitle(w)}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--teal)', color: 'var(--teal)', display: 'block' }} />
                          <ElapsedTimer startedAt={w.startedAt} />
                        </div>
                      </div>
                      {w.model && (
                        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--blue)', fontFamily: 'var(--mono)', background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.2)', borderRadius: 4, padding: '2px 8px' }}>{w.model}</span>
                        </div>
                      )}
                      <div className="bar-track" style={{ marginTop: 12 }}>
                        <div className="bar-fill" style={{ width: '60%', animation: 'bar-progress 2s ease-in-out infinite alternate' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>

          {/* Right: Activity Feed */}
          <GlassCard className="fade-in-up-4">
            <div className="section-label" style={{ marginBottom: 4 }}>Real-time</div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 24 }}>Activity Feed</h3>
            {activities.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>No recent activity</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, maxHeight: 400, overflowY: 'auto' }}>
                {activities.map((a, i) => {
                  const meta = ACT_META[a.type] || { icon: '·', color: 'var(--muted)' };
                  return (
                    <div key={i} className="timeline-item" onClick={() => meta.link && navigate(meta.link)} style={{ marginBottom: 14, cursor: meta.link ? 'pointer' : 'default' }}>
                      <div className="timeline-dot" style={{ background: meta.color + '22', borderColor: meta.color, color: meta.color, fontSize: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {meta.icon}
                      </div>
                      <div style={{ marginLeft: 4 }}>
                        <div style={{ color: 'var(--text)', fontSize: '0.8rem', fontWeight: 500, lineHeight: 1.3 }}>{a.title}</div>
                        <div style={{ color: 'var(--faint)', fontSize: '0.7rem', marginTop: 2, fontFamily: 'var(--mono)' }}>{timeAgo(a.timestamp)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </GlassCard>
        </div>

        {/* QUICK ACTIONS + SYSTEM STATUS */}
        <div className="mobile-2col" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <GlassCard className="fade-in-up-5">
            <div className="section-label" style={{ marginBottom: 4 }}>Shortcuts</div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>Quick Actions</h3>
            <div className="quick-actions-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {quickActions.map(a => (
                <button
                  key={a.to}
                  onClick={() => a.action ? a.action() : navigate(a.to)}
                  className="quick-action-btn"
                  style={{ '--btn-color': a.color }}
                >
                  <div style={{ fontSize: '1.4rem' }}>{a.icon}</div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: a.color, letterSpacing: '0.5px' }}>{a.label}</div>
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="fade-in-up-6">
            <div className="section-label" style={{ marginBottom: 4 }}>Diagnostics</div>
            <h3 style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 20 }}>System Health</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { label: 'Orchestrator', value: status?.server?.status === 'healthy' ? 100 : 0, color: 'var(--green)' },
                { label: 'Worker Pool', value: status?.workers?.total || 0, max: 5, color: 'var(--teal)' },
                { label: 'Task Queue', value: Math.min((status?.tasks?.active || 0) * 20, 100), color: 'var(--blue)' },
              ].map((m, i) => (
                <div key={i}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>{m.label}</span>
                    <span style={{ color: m.color, fontSize: '0.75rem', fontFamily: 'var(--mono)', fontWeight: 700 }}>{m.value}%</span>
                  </div>
                  <div className="bar-track">
                    <div className="bar-fill" style={{ width: `${m.value}%`, background: `linear-gradient(90deg, ${m.color}, ${m.color}aa)` }} />
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

      </div>
      {/* Create Task Modal */}
      <Modal open={showCreateTask} onClose={() => setShowCreateTask(false)} title="New Task">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Title *</label><input autoFocus data-autofocus="true" className="nx-input" placeholder="Task title..." value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Agent</label><select className="nx-input" value={taskForm.agent} onChange={e => setTaskForm(f => ({ ...f, agent: e.target.value }))}>{['programmer', 'writer', 'researcher', 'reviewer', 'architect'].map(a => <option key={a} value={a}>{a}</option>)}</select></div>
            <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Model Tier</label><select className="nx-input" value={taskForm.model_tier} onChange={e => setTaskForm(f => ({ ...f, model_tier: e.target.value }))}>{['micro', 'small', 'medium', 'standard', 'strong'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Notes</label><textarea className="nx-input" rows={4} placeholder="Task description..." value={taskForm.notes} onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn-ghost" onClick={() => setShowCreateTask(false)}>Cancel</button><button className="btn-primary" onClick={createTask}>Create Task</button></div>
        </div>
      </Modal>
    </div>
  );
}
