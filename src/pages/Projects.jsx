import { useState, useRef, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { showToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import { timeAgo, AGENT_COLORS, TIER_COLORS } from '../lib/utils';

const AGENTS = ['programmer', 'writer', 'researcher', 'reviewer', 'architect'];
const TIERS = ['micro', 'small', 'medium', 'standard', 'strong'];
const COLUMNS = [
  { id: 'active', label: 'Active', color: 'var(--teal)' },
  { id: 'completed', label: 'Completed', color: 'var(--green)' },
  { id: 'cancelled', label: 'Cancelled', color: 'var(--muted)' },
];
const PROJECT_COLORS = ['var(--teal)', 'var(--blue)', 'var(--purple)', 'var(--amber)', 'var(--green)', 'var(--red)'];

function CountUp({ value, duration = 1000 }) {
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

function TaskCard({ task, onClick }) {
  const color = AGENT_COLORS[task.agent] || 'var(--blue)';
  return (
    <div className="task-card" onClick={() => onClick(task)} style={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: color, borderRadius: '3px 0 0 3px', opacity: 0.7 }} />
      <div style={{ paddingLeft: 8 }}>
        <div style={{ color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>{task.title}</div>
        {task.notes && (
          <div style={{ color: 'var(--muted)', fontSize: '0.78rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', marginBottom: 8 }}>{task.notes}</div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {task.agent && <Badge label={task.agent} color={color} />}
          {(task.model_tier || task.modelTier) && <Badge label={task.model_tier || task.modelTier} color={TIER_COLORS[task.model_tier || task.modelTier] || 'var(--muted)'} />}
          <span style={{ marginLeft: 'auto', color: 'var(--faint)', fontSize: '0.72rem' }}>{timeAgo(task.updated_at || task.updatedAt)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Projects() {
  const { data: projects, loading: projLoading, reload: reloadProjects } = useApi(() => showArchived ? api.archivedProjects() : api.projects(), [showArchived]);
  const { data: allTasks, loading: tasksLoading, reload: reloadTasks } = usePolling(() => api.tasks(), 15000);
  const [view, setView] = useState('projects');
  const [selectedProject, setSelectedProject] = useState(null);
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [projForm, setProjForm] = useState({ title: '', type: 'project', notes: '' });
  const [taskForm, setTaskForm] = useState({ title: '', agent: 'programmer', model_tier: 'standard', project_id: '', notes: '' });

  const projectList = projects || [];
  const getProjectTasks = (pid) => (allTasks || []).filter(t => t.project_id === pid || t.projectId === pid);
  const getProjectColor = (p, idx) => {
    const active = getProjectTasks(p.id).filter(t => t.status === 'active').length;
    return active > 0 ? 'var(--teal)' : PROJECT_COLORS[idx % PROJECT_COLORS.length];
  };

  const createProject = async () => {
    if (!projForm.title.trim()) return;
    try { await api.createProject(projForm); showToast('Project created', 'success'); setShowCreate(false); setProjForm({ title: '', type: 'project', notes: '' }); reloadProjects(); }
    catch { showToast('Failed', 'error'); }
  };

  const createTask = async () => {
    if (!taskForm.title.trim()) return;
    try {
      const body = { ...taskForm };
      if (selectedProject && !showAllTasks) body.project_id = selectedProject.id;
      await api.createTask(body); showToast('Task created', 'success'); setShowCreateTask(false);
      setTaskForm({ title: '', agent: 'programmer', model_tier: 'standard', project_id: '', notes: '' }); reloadTasks();
    } catch { showToast('Failed', 'error'); }
  };

  const kanbanTasks = showAllTasks ? (allTasks || []) : selectedProject ? getProjectTasks(selectedProject.id) : (allTasks || []);
  const byStatus = (status) => kanbanTasks.filter(t => t.status === status || (status === 'active' && ['active', 'inbox', 'pending', 'waiting'].includes(t.status)) || (status === 'cancelled' && ['cancelled', 'rejected', 'archived'].includes(t.status)));

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div className="fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
          <div>
            {view === 'kanban' && (
              <button onClick={() => { setView('projects'); setSelectedProject(null); setShowAllTasks(false); }} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--mono)', letterSpacing: '1px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
                ← BACK TO PROJECTS
              </button>
            )}
            <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>
              {view === 'projects' ? 'ORGANIZATION' : selectedProject ? `PROJECT — ${selectedProject.title.toUpperCase()}` : 'ALL TASKS'}
            </div>
            <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}>
              {view === 'projects' ? <span className="gradient-text">Projects</span> : showAllTasks ? <span className="gradient-text">All Tasks</span> : <span className="gradient-text">{selectedProject?.title || 'Tasks'}</span>}
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            {view === 'kanban' && (
              <button onClick={() => setShowAllTasks(v => !v)} style={{ background: showAllTasks ? 'rgba(45,212,191,0.12)' : 'rgba(255,255,255,0.03)', border: `1px solid ${showAllTasks ? 'rgba(45,212,191,0.4)' : 'var(--border)'}`, borderRadius: 8, padding: '8px 16px', color: showAllTasks ? 'var(--teal)' : 'var(--muted)', cursor: 'pointer', fontWeight: 600, fontSize: '0.82rem' }}>
                {showAllTasks ? '✓ All Tasks' : 'All Tasks'}
              </button>
            )}
            {view === 'kanban' && <button className="btn-primary" onClick={() => setShowCreateTask(true)}>+ New Task</button>}
            {view === 'projects' && <>
              <button className={showArchived ? 'btn-ghost' : 'btn-ghost'} onClick={() => setShowArchived(v => !v)} style={showArchived ? { borderColor: 'rgba(45,212,191,0.4)', color: 'var(--teal)' } : {}}>{showArchived ? '✓ Archived' : 'Archived'}</button>
              <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
            </>}
          </div>
        </div>

        {/* PROJECTS VIEW */}
        {view === 'projects' && (
          <>
            {projectList.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
                {[
                  { label: 'Projects', value: projectList.length, color: 'var(--teal)' },
                  { label: 'Active Tasks', value: (allTasks || []).filter(t => t.status === 'active').length, color: 'var(--blue)' },
                  { label: 'Completed', value: (allTasks || []).filter(t => t.status === 'completed').length, color: 'var(--green)' },
                  { label: 'Total Tasks', value: (allTasks || []).length, color: 'var(--purple)' },
                ].map((s, i) => (
                  <div key={i} className={`hud-stat-card fade-in-up-${i+1}`}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)`, opacity: 0.6, borderRadius: '14px 14px 0 0' }} />
                    <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 10 }}>{s.label}</div>
                    <div style={{ fontSize: '2.4rem', fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: 'var(--mono)', letterSpacing: '-2px' }}><CountUp value={s.value} /></div>
                  </div>
                ))}
              </div>
            )}
            {projLoading ? <LoadingSkeleton lines={4} height={140} /> : !projectList.length ? (
              <EmptyState icon="📁" title="No projects yet" description="Create a project to organize your tasks" action={<button className="btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>} />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
                {projectList.map((p, idx) => {
                  const color = getProjectColor(p, idx);
                  const tasks = getProjectTasks(p.id);
                  const active = tasks.filter(t => t.status === 'active');
                  const done = tasks.filter(t => t.status === 'completed');
                  const progress = tasks.length > 0 ? Math.round((done.length / tasks.length) * 100) : 0;
                  return (
                    <div key={p.id} onClick={() => { setSelectedProject(p); setShowAllTasks(false); setView('kanban'); }} className="fade-in-up glass-card" style={{ padding: "24px", cursor: 'pointer', transition: 'all 0.25s', borderColor: active.length > 0 ? color + '44' : undefined, boxShadow: active.length > 0 ? `0 0 30px ${color}15` : undefined }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = color + '66'; e.currentTarget.style.boxShadow = `0 0 40px ${color}20`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = active.length > 0 ? color + '44' : 'var(--border)'; e.currentTarget.style.boxShadow = active.length > 0 ? `0 0 30px ${color}15` : 'none'; e.currentTarget.style.transform = ''; }}
                    >
                      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, borderRadius: '12px 12px 0 0', opacity: 0.8 }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <h3 style={{ color: 'var(--text)', fontWeight: 800, fontSize: '1.05rem' }}>{p.title}</h3>
                            {active.length > 0 && <span className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', background: color, color, display: 'block' }} />}
                          </div>
                          <Badge label={p.type || 'project'} color={color} />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.8rem', fontWeight: 900, color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{tasks.length}</div>
                          <div style={{ color: 'var(--muted)', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>tasks</div>
                        </div>
                      </div>
                      {p.notes && <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.notes}</div>}
                      {tasks.length > 0 && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                            <span style={{ color: 'var(--muted)', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>Progress</span>
                            <span style={{ color, fontSize: '0.7rem', fontFamily: 'var(--mono)', fontWeight: 700 }}>{progress}%</span>
                          </div>
                          <div className="bar-track"><div className="bar-fill" style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${color}, ${color}aa)` }} /></div>
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', gap: 12 }}>
                          {active.length > 0 && <span style={{ color, fontSize: '0.72rem', fontFamily: 'var(--mono)', fontWeight: 700 }}>{active.length} active</span>}
                          {done.length > 0 && <span style={{ color: 'var(--green)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{done.length} done</span>}
                        </div>
                        <span style={{ color: 'var(--faint)', fontSize: '0.7rem' }}>{timeAgo(p.updated_at || p.updatedAt)}</span>
                        <button onClick={async (e) => { e.stopPropagation(); p.archived ? await api.unarchiveProject(p.id) : await api.archiveProject(p.id); reloadProjects(); }} className="btn-ghost" style={{ padding: '2px 8px', fontSize: '0.68rem', marginLeft: 8 }}>{p.archived ? 'Unarchive' : 'Archive'}</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* KANBAN VIEW */}
        {view === 'kanban' && (
          tasksLoading ? <LoadingSkeleton lines={6} height={80} /> : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
              {COLUMNS.map(col => (
                <div key={col.id} className="kanban-col">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <span className={col.id === 'active' ? 'pulse-dot' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, color: col.color, display: 'block' }} />
                    <span style={{ color: col.color, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '2px', fontFamily: 'var(--mono)', textTransform: 'uppercase' }}>{col.label}</span>
                    <span style={{ color: 'var(--muted)', fontSize: '0.78rem', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>{byStatus(col.id).length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {byStatus(col.id).length === 0 ? (
                      <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textAlign: 'center', padding: '30px 0', opacity: 0.5 }}>Empty</div>
                    ) : byStatus(col.id).map(t => <TaskCard key={t.id} task={t} onClick={setSelectedTask} />)}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Title *</label><input className="nx-input" placeholder="Project name..." value={projForm.title} onChange={e => setProjForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Type</label><select className="nx-input" value={projForm.type} onChange={e => setProjForm(f => ({ ...f, type: e.target.value }))}>{['project', 'personal', 'work', 'research', 'other'].map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Notes</label><textarea className="nx-input" rows={3} placeholder="Description..." value={projForm.notes} onChange={e => setProjForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn-primary" onClick={createProject}>Create</button></div>
        </div>
      </Modal>

      <Modal open={showCreateTask} onClose={() => setShowCreateTask(false)} title="New Task">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Title *</label><input className="nx-input" placeholder="Task title..." value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Agent</label><select className="nx-input" value={taskForm.agent} onChange={e => setTaskForm(f => ({ ...f, agent: e.target.value }))}>{AGENTS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
            <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Model Tier</label><select className="nx-input" value={taskForm.model_tier} onChange={e => setTaskForm(f => ({ ...f, model_tier: e.target.value }))}>{TIERS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Notes</label><textarea className="nx-input" rows={4} placeholder="Task description..." value={taskForm.notes} onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn-ghost" onClick={() => setShowCreateTask(false)}>Cancel</button><button className="btn-primary" onClick={createTask}>Create Task</button></div>
        </div>
      </Modal>

      <Modal open={!!selectedTask} onClose={() => setSelectedTask(null)} title={selectedTask?.title || 'Task'}>
        {selectedTask && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge label={selectedTask.status} color={selectedTask.status === 'active' ? 'var(--teal)' : selectedTask.status === 'completed' ? 'var(--green)' : 'var(--muted)'} />
              {selectedTask.agent && <Badge label={selectedTask.agent} color={AGENT_COLORS[selectedTask.agent] || 'var(--blue)'} />}
              {(selectedTask.model_tier || selectedTask.modelTier) && <Badge label={selectedTask.model_tier || selectedTask.modelTier} color={TIER_COLORS[selectedTask.model_tier || selectedTask.modelTier] || 'var(--muted)'} />}
            </div>
            {selectedTask.notes && (
              <div style={{ background: 'rgba(11,15,30,0.6)', borderRadius: 8, padding: 16, border: '1px solid var(--border)' }}>
                <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 8 }}>Notes</div>
                <div style={{ color: 'var(--text)', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selectedTask.notes}</div>
              </div>
            )}
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 16 }}>
              <div>Created: {timeAgo(selectedTask.created_at || selectedTask.createdAt)}</div>
              <div>Updated: {timeAgo(selectedTask.updated_at || selectedTask.updatedAt)}</div>
              <div style={{ color: 'var(--faint)', marginTop: 4 }}>ID: {selectedTask.id}</div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {selectedTask.status !== 'active' && (
                <button className="btn-success" onClick={async () => { await api.updateTask(selectedTask.id, { status: 'active' }); reloadTasks(); setSelectedTask(null); }} style={{ flex: 1 }}>↻ Reactivate</button>
              )}
              {selectedTask.status === 'active' && (
                <button className="btn-primary" onClick={async () => { await api.updateTask(selectedTask.id, { status: 'completed' }); reloadTasks(); setSelectedTask(null); }} style={{ flex: 1 }}>✓ Complete</button>
              )}
              {selectedTask.status !== 'cancelled' && (
                <button className="btn-danger" onClick={async () => { await api.updateTask(selectedTask.id, { status: 'cancelled' }); reloadTasks(); setSelectedTask(null); }} style={{ flex: 1 }}>✗ Cancel</button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
