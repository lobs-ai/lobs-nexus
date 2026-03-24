import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { showToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { usePolling } from '../hooks/usePolling';
import { useAffordances } from '../hooks/useAffordances';
import AISummarizeButton from '../components/ai/AISummarizeButton';
import AIInlineText from '../components/ai/AIInlineText';
import AIAffordance from '../components/ai/AIAffordance';
import { api } from '../lib/api';
import { timeAgo, formatDate, AGENT_COLORS, TIER_COLORS } from '../lib/utils';

const AGENTS = ['programmer', 'writer', 'researcher', 'reviewer', 'architect'];
const TIERS = ['micro', 'small', 'medium', 'standard', 'strong'];
const COLUMNS = [
  { id: 'active', label: 'Active', color: 'var(--teal)' },
  { id: 'completed', label: 'Completed', color: 'var(--green)' },
  { id: 'cancelled', label: 'Cancelled', color: 'var(--muted)' },
];
const PROJECT_COLORS = ['var(--teal)', 'var(--blue)', 'var(--purple)', 'var(--amber)', 'var(--green)', 'var(--red)'];
const PROJECT_TYPES = ['project', 'engineering', 'personal', 'work', 'research', 'general', 'other'];
const PROJECTS_VIEW_STATE_KEY = 'nexus.projects.viewState';

function getViewStateFromUrl(searchParams) {
  const params =
    searchParams && typeof searchParams.get === 'function'
      ? searchParams
      : new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');

  const queryView = params.get('view');
  const queryProject = params.get('project');
  const queryScope = params.get('scope');

  if (queryView === 'kanban' || queryProject || queryScope === 'all') {
    return {
      view: 'kanban',
      selectedProjectId: queryProject,
      showAllTasks: queryScope === 'all',
    };
  }

  return null;
}

function getInitialViewState(searchParams) {
  const fromUrl = getViewStateFromUrl(searchParams);
  if (fromUrl) {
    return fromUrl;
  }

  try {
    const saved = JSON.parse(sessionStorage.getItem(PROJECTS_VIEW_STATE_KEY) || 'null');
    if (saved && (saved.view === 'projects' || saved.view === 'kanban')) {
      return {
        view: saved.view,
        selectedProjectId: saved.selectedProjectId || null,
        showAllTasks: !!saved.showAllTasks,
      };
    }
  } catch {
    // Ignore invalid saved state.
  }

  return { view: 'projects', selectedProjectId: null, showAllTasks: false };
}

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


function ProjectSwitcher({ projects, selectedProject, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const others = projects.filter(p => !selectedProject || String(p.id) !== String(selectedProject.id));

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          background: 'rgba(45,212,191,0.08)',
          border: '1px solid rgba(45,212,191,0.25)',
          borderRadius: 8,
          color: 'var(--teal)',
          cursor: 'pointer',
          padding: '5px 12px',
          fontSize: '0.78rem',
          fontFamily: 'var(--mono)',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'all 0.2s',
          letterSpacing: '0.5px',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,212,191,0.15)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(45,212,191,0.08)'}
        title="Switch project"
      >
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
        </svg>
        SWITCH PROJECT
        <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          minWidth: 220,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 9000,
          overflow: 'hidden',
        }}>
          {others.length === 0 ? (
            <div style={{ padding: '12px 16px', color: 'var(--muted)', fontSize: '0.8rem', textAlign: 'center' }}>No other projects</div>
          ) : others.map((p, i) => (
            <button
              key={p.id}
              onClick={() => { onSelect(p); setOpen(false); }}
              style={{
                width: '100%',
                background: 'none',
                border: 'none',
                borderTop: i > 0 ? '1px solid var(--border)' : 'none',
                color: 'var(--text)',
                cursor: 'pointer',
                padding: '10px 16px',
                textAlign: 'left',
                fontSize: '0.85rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <svg width="14" height="14" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
              </svg>
              <span style={{ flex: 1 }}>{p.title}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Projects() {
  const { data: allProjects, loading: projLoading, reload: reloadProjects } = useApi(signal => api.archivedProjects(signal));
  const { data: allTasks, loading: tasksLoading, reload: reloadTasks } = usePolling(signal => api.tasks({}, signal), 15000);
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState(() => getInitialViewState(searchParams).view);
  const [selectedProjectId, setSelectedProjectId] = useState(() => getInitialViewState(searchParams).selectedProjectId);
  const [showAllTasks, setShowAllTasks] = useState(() => getInitialViewState(searchParams).showAllTasks);
  const [showArchived, setShowArchived] = useState(false);
  const projectList = Array.isArray(allProjects) ? allProjects : allProjects?.projects || [];
  const projects = projectList.filter(p => showArchived ? p.archived : !p.archived);
  // Note: projectList = all projects; projects = filtered by archive state
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showBraindump, setShowBraindump] = useState(false);
  const [braindumpText, setBraindumpText] = useState('');
  const [braindumpProjectId, setBraindumpProjectId] = useState('');
  const [braindumpLoading, setBraindumpLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [projForm, setProjForm] = useState({ title: '', type: 'project', notes: '' });
  const [taskForm, setTaskForm] = useState({ title: '', agent: 'programmer', model_tier: 'standard', project_id: '', notes: '' });
  const [editProject, setEditProject] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', type: 'project', notes: '', repo_path: '', github_repo: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const projectAffordances = useAffordances('project-card');

  const selectedProject = projects.find(p => String(p.id) === String(selectedProjectId)) || null;
  const taskArr = Array.isArray(allTasks) ? allTasks : allTasks?.tasks || [];
  const getProjectTasks = (pid) => taskArr.filter(t => t.project_id === pid || t.projectId === pid);
  const getProjectColor = (p, idx) => {
    const active = getProjectTasks(p.id).filter(t => t.status === 'active').length;
    return active > 0 ? 'var(--teal)' : PROJECT_COLORS[idx % PROJECT_COLORS.length];
  };

  const createProject = async () => {
    if (!projForm.title.trim()) return;
    try { await api.createProject(projForm); showToast('Project created', 'success'); setShowCreate(false); setProjForm({ title: '', type: 'project', notes: '' }); reloadProjects(); }
    catch { showToast('Failed', 'error'); }
  };

  const submitBraindump = async () => {
    if (!braindumpText.trim()) return;
    const projectId = selectedProject?.id || braindumpProjectId;
    if (!projectId) { showToast('Select a project first', 'error'); return; }
    setBraindumpLoading(true);
    try {
      await api.projectBraindump(projectId, braindumpText);
      showToast('Brain dump submitted — processing into tasks...', 'success');
      setShowBraindump(false);
      setBraindumpText('');
      setBraindumpProjectId('');
      // Poll for new tasks after a delay
      setTimeout(() => reloadTasks(), 5000);
      setTimeout(() => reloadTasks(), 15000);
      setTimeout(() => reloadTasks(), 30000);
    } catch (e) {
      showToast('Failed to submit brain dump', 'error');
    } finally {
      setBraindumpLoading(false);
    }
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

  const openEditProject = (project) => {
    setEditProject(project);
    setEditForm({
      title: project.title || '',
      type: project.type || 'project',
      notes: project.notes || '',
      repo_path: project.repoPath || project.repo_path || '',
      github_repo: project.githubRepo || project.github_repo || '',
    });
    setShowDeleteConfirm(false);
  };

  const saveEditProject = async () => {
    if (!editProject || !editForm.title.trim()) return;
    try {
      await api.updateProject(editProject.id, {
        title: editForm.title.trim(),
        type: editForm.type,
        notes: editForm.notes.trim() || null,
        repo_path: editForm.repo_path.trim() || null,
        github_repo: editForm.github_repo.trim() || null,
      });
      showToast('Project updated', 'success');
      setEditProject(null);
      reloadProjects();
    } catch {
      showToast('Failed to update project', 'error');
    }
  };

  const deleteProject = async () => {
    if (!editProject) return;
    try {
      await api.deleteProject(editProject.id);
      showToast('Project deleted', 'success');
      setEditProject(null);
      setShowDeleteConfirm(false);
      if (selectedProjectId === editProject.id) {
        openProjectsView();
      }
      reloadProjects();
    } catch {
      showToast('Failed to delete project', 'error');
    }
  };

  const kanbanTasks = showAllTasks ? taskArr : selectedProject ? getProjectTasks(selectedProject.id) : taskArr;
  const byStatus = (status) => kanbanTasks.filter(t => t.status === status || (status === 'active' && ['active', 'inbox', 'pending', 'waiting'].includes(t.status)) || (status === 'cancelled' && ['cancelled', 'rejected', 'archived'].includes(t.status)));

  useEffect(() => {
    try {
      sessionStorage.setItem(PROJECTS_VIEW_STATE_KEY, JSON.stringify({
        view,
        selectedProjectId,
        showAllTasks,
      }));
    } catch {
      // Ignore storage write issues.
    }
  }, [view, selectedProjectId, showAllTasks]);

  useEffect(() => {
    const fromUrl = getViewStateFromUrl(searchParams);
    if (!fromUrl) return;

    setView(fromUrl.view);
    setSelectedProjectId(fromUrl.selectedProjectId);
    setShowAllTasks(fromUrl.showAllTasks);
  }, [searchParams]);

  useEffect(() => {
    const currentView = searchParams.get('view');
    const currentProject = searchParams.get('project');
    const currentScope = searchParams.get('scope');

    if (view === 'projects') {
      if (currentView || currentProject || currentScope) {
        setSearchParams({}, { replace: true });
      }
      return;
    }

    if (showAllTasks) {
      if (currentView !== 'kanban' || currentScope !== 'all' || currentProject) {
        setSearchParams({ view: 'kanban', scope: 'all' }, { replace: true });
      }
      return;
    }

    if (selectedProjectId && (currentView !== 'kanban' || String(currentProject) !== String(selectedProjectId) || currentScope)) {
      setSearchParams({ view: 'kanban', project: String(selectedProjectId) }, { replace: true });
    }
  }, [view, selectedProjectId, showAllTasks, searchParams, setSearchParams]);

  const openProjectsView = () => {
    setView('projects');
    setSelectedProjectId(null);
    setShowAllTasks(false);
    setSearchParams({}, { replace: true });
  };

  const openAllTasksView = () => {
    setView('kanban');
    setSelectedProjectId(null);
    setShowAllTasks(true);
    setSearchParams({ view: 'kanban', scope: 'all' }, { replace: true });
  };

  const openProjectView = (project) => {
    setView('kanban');
    setSelectedProjectId(project.id);
    setShowAllTasks(false);
    setSearchParams({ view: 'kanban', project: String(project.id) }, { replace: true });
  };

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative' }}>
        {/* Header */}
        <div className="fade-in-up" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 36 }}>
          <div>
            {view === 'kanban' && (
              <button onClick={openProjectsView} style={{ background: 'none', border: 'none', color: 'var(--teal)', cursor: 'pointer', fontSize: '0.82rem', fontFamily: 'var(--mono)', letterSpacing: '1px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6, padding: 0 }}>
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
              <>
                {!showAllTasks && projectList.length > 1 && (
                  <ProjectSwitcher
                    projects={projectList}
                    selectedProject={selectedProject}
                    onSelect={openProjectView}
                  />
                )}
                {selectedProject && !showAllTasks && (
                  <button className="btn-ghost" onClick={() => openEditProject(selectedProject)} style={{ display: 'flex', alignItems: 'center', gap: 6 }} title="Edit project settings">
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Edit
                  </button>
                )}
                <button className="btn-ghost" onClick={() => setShowBraindump(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"/><path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/><path d="M8.5 13.5c-.83.83-.83 2.17 0 3M15.5 13.5c.83.83.83 2.17 0 3"/></svg>
                  Brain Dump
                </button>
                <button className="btn-primary" onClick={() => setShowCreateTask(true)}>+ New Task</button>
              </>
            )}
            {view === 'projects' && <>
              <button className="btn-ghost" onClick={() => setShowBraindump(true)} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 3C7.03 3 3 7.03 3 12s4.03 9 9 9 9-4.03 9-9-4.03-9-9-9z"/><path d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/><path d="M8.5 13.5c-.83.83-.83 2.17 0 3M15.5 13.5c.83.83.83 2.17 0 3"/></svg>
                Brain Dump
              </button>
              <button className="btn-ghost" onClick={openAllTasksView}>All Tasks</button>
              <button className="btn-ghost" onClick={() => setShowArchived(v => !v)} style={showArchived ? { borderColor: 'rgba(45,212,191,0.4)', color: 'var(--teal)' } : {}}>{showArchived ? '✓ Archived' : 'Archived'}</button>
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
                  { label: 'Active Tasks', value: taskArr.filter(t => t.status === 'active').length, color: 'var(--blue)' },
                  { label: 'Completed', value: taskArr.filter(t => t.status === 'completed').length, color: 'var(--green)' },
                  { label: 'Total Tasks', value: taskArr.length, color: 'var(--purple)' },
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
                    <div key={p.id} onClick={() => openProjectView(p)} className="fade-in-up glass-card" style={{ padding: "24px", cursor: 'pointer', transition: 'all 0.25s', borderColor: active.length > 0 ? color + '44' : undefined, boxShadow: active.length > 0 ? `0 0 30px ${color}15` : undefined }}
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
                        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
                          <button onClick={(e) => { e.stopPropagation(); openEditProject(p); }} className="btn-ghost" style={{ padding: '2px 8px', fontSize: '0.68rem' }} title="Edit project">
                            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                          </button>
                          <button onClick={async (e) => { e.stopPropagation(); p.archived ? await api.unarchiveProject(p.id) : await api.archiveProject(p.id); reloadProjects(); }} className="btn-ghost" style={{ padding: '2px 8px', fontSize: '0.68rem' }}>{p.archived ? 'Unarchive' : 'Archive'}</button>
                        </div>
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
          <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Title *</label><input autoFocus data-autofocus="true" className="nx-input" placeholder="Task title..." value={taskForm.title} onChange={e => setTaskForm(f => ({ ...f, title: e.target.value }))} /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Agent</label><select className="nx-input" value={taskForm.agent} onChange={e => setTaskForm(f => ({ ...f, agent: e.target.value }))}>{AGENTS.map(a => <option key={a} value={a}>{a}</option>)}</select></div>
            <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Model Tier</label><select className="nx-input" value={taskForm.model_tier} onChange={e => setTaskForm(f => ({ ...f, model_tier: e.target.value }))}>{TIERS.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          </div>
          <div><label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Notes</label><textarea className="nx-input" rows={4} placeholder="Task description..." value={taskForm.notes} onChange={e => setTaskForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} /></div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}><button className="btn-ghost" onClick={() => setShowCreateTask(false)}>Cancel</button><button className="btn-primary" onClick={createTask}>Create Task</button></div>
        </div>
      </Modal>

      <Modal open={showBraindump} onClose={() => { setShowBraindump(false); setBraindumpProjectId(''); }} title={`Brain Dump → ${selectedProject?.title || (projectList.find(p => p.id === braindumpProjectId)?.title) || 'Select Project'}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Paste your raw thoughts, ideas, requirements, or notes. An agent will process them into structured tasks.
          </div>
          {!selectedProject && (
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Project *</label>
              <select className="nx-input" value={braindumpProjectId} onChange={e => setBraindumpProjectId(e.target.value)}>
                <option value="">Select a project...</option>
                {projectList.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}
          <textarea
            className="nx-input"
            rows={12}
            placeholder="Paste anything — feature ideas, bug reports, meeting notes, TODO lists, stream of consciousness..."
            value={braindumpText}
            onChange={e => setBraindumpText(e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'var(--mono)', fontSize: '0.85rem', lineHeight: 1.6 }}
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>
              {braindumpText.length > 0 ? `${braindumpText.length} chars` : ''}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" onClick={() => setShowBraindump(false)}>Cancel</button>
              <button
                className="btn-primary"
                onClick={submitBraindump}
                disabled={braindumpLoading || !braindumpText.trim() || (!selectedProject && !braindumpProjectId)}
                style={braindumpLoading ? { opacity: 0.6 } : {}}
              >
                {braindumpLoading ? 'Processing...' : '⚡ Process into Tasks'}
              </button>
            </div>
          </div>
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
              <div>Created: {formatDate(selectedTask.created_at || selectedTask.createdAt)}</div>
              <div>Updated: {formatDate(selectedTask.updated_at || selectedTask.updatedAt)}</div>
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

      {/* Edit Project Modal */}
      <Modal open={!!editProject} onClose={() => { setEditProject(null); setShowDeleteConfirm(false); }} title="Edit Project">
        {editProject && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 6 }}>Name</label>
              <input
                className="input"
                value={editForm.title}
                onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                placeholder="Project name"
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 6 }}>Type</label>
              <select
                className="input"
                value={editForm.type}
                onChange={e => setEditForm(f => ({ ...f, type: e.target.value }))}
              >
                {PROJECT_TYPES.map(t => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 6 }}>Description</label>
              <textarea
                className="input"
                value={editForm.notes}
                onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Project description / notes"
                rows={3}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 6 }}>Repo Path</label>
              <input
                className="input"
                value={editForm.repo_path}
                onChange={e => setEditForm(f => ({ ...f, repo_path: e.target.value }))}
                placeholder="~/path/to/repo"
                style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 6 }}>GitHub Repo</label>
              <input
                className="input"
                value={editForm.github_repo}
                onChange={e => setEditForm(f => ({ ...f, github_repo: e.target.value }))}
                placeholder="org/repo-name"
                style={{ fontFamily: 'var(--mono)', fontSize: '0.85rem' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
              <div>
                {!showDeleteConfirm ? (
                  <button
                    className="btn-ghost"
                    onClick={() => setShowDeleteConfirm(true)}
                    style={{ color: 'var(--red)', fontSize: '0.78rem' }}
                  >
                    Delete Project
                  </button>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: 'var(--red)', fontSize: '0.78rem' }}>Are you sure?</span>
                    <button className="btn-danger" onClick={deleteProject} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>Yes, Delete</button>
                    <button className="btn-ghost" onClick={() => setShowDeleteConfirm(false)} style={{ padding: '4px 12px', fontSize: '0.75rem' }}>No</button>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-ghost" onClick={() => { setEditProject(null); setShowDeleteConfirm(false); }}>Cancel</button>
                <button className="btn-primary" onClick={saveEditProject} disabled={!editForm.title.trim()}>Save Changes</button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
