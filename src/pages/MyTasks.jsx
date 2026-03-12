import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

const PRIORITY_COLORS = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#94a3b8',
};

const CATEGORIES = [
  { value: 'review', label: 'Review', icon: '✓' },
  { value: 'decision', label: 'Decision', icon: '?' },
  { value: 'action-item', label: 'Action Item', icon: '⚡' },
  { value: 'personal', label: 'Personal', icon: '👤' },
  { value: 'academic', label: 'Academic', icon: '📚' },
  { value: 'errand', label: 'Errand', icon: '📝' },
];

export default function MyTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showCompletedSection, setShowCompletedSection] = useState(false);
  const [completedTasks, setCompletedTasks] = useState([]);

  const [newTaskForm, setNewTaskForm] = useState({
    title: '',
    priority: 'medium',
    dueDate: '',
    category: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const statusFilter = filter === 'all' ? 'active' : 'active';
      const [tasksData, statsData] = await Promise.all([
        api.myTasks({ status: statusFilter, sort: 'priority' }),
        api.myTaskStats(),
      ]);

      const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.tasks || [];
      let filteredTasks = tasks;

      // Apply client-side filters for special views
      if (filter === 'today') {
        filteredTasks = tasks.filter(t => t.dueToday);
      } else if (filter === 'week') {
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() + 7);
        filteredTasks = tasks.filter(t => {
          if (!t.dueDate) return false;
          const due = new Date(t.dueDate);
          return due <= weekEnd;
        });
      } else if (filter === 'overdue') {
        filteredTasks = tasks.filter(t => t.overdue);
      }

      setTasks(filteredTasks);
      setStats(statsData);
      
      // Fetch completed tasks for the collapsible section
      const completed = await api.myTasks({ status: 'completed', sort: 'created_at' });
      const completedArr = Array.isArray(completed) ? completed : completed?.tasks || [];
      setCompletedTasks(completedArr.slice(0, 10));
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
      showToast('Failed to load tasks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [filter]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'n' && !e.ctrlKey && !e.metaKey && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
        e.preventDefault();
        setShowCreateModal(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleComplete = async (id) => {
    try {
      await api.completeMyTask(id);
      showToast('Task completed!', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to complete task', 'error');
    }
  };

  const handleSnooze = async (id, until) => {
    try {
      await api.snoozeMyTask(id, until);
      showToast('Task snoozed', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to snooze task', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await api.deleteMyTask(id);
      showToast('Task deleted', 'success');
      fetchData();
    } catch (err) {
      showToast('Failed to delete task', 'error');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTaskForm.title.trim()) return;
    try {
      await api.createMyTask(newTaskForm);
      showToast('Task created!', 'success');
      setShowCreateModal(false);
      setNewTaskForm({ title: '', priority: 'medium', dueDate: '', category: '', notes: '' });
      fetchData();
    } catch (err) {
      showToast('Failed to create task', 'error');
    }
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    if (!editingTask) return;
    try {
      await api.updateMyTask(editingTask.id, {
        title: editingTask.title,
        priority: editingTask.priority,
        dueDate: editingTask.dueDate,
        category: editingTask.shape,
        notes: editingTask.notes,
      });
      showToast('Task updated!', 'success');
      setShowEditModal(false);
      setEditingTask(null);
      fetchData();
    } catch (err) {
      showToast('Failed to update task', 'error');
    }
  };

  const openEditModal = (task) => {
    setEditingTask({ ...task });
    setShowEditModal(true);
  };

  const activeCount = stats?.active || 0;
  const dueToday = stats?.dueToday || 0;
  const overdue = stats?.overdue || 0;

  return (
    <div style={{ padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1 style={{ fontSize: '2.2rem', fontWeight: 900, marginBottom: 8, color: 'var(--text)' }}>
                My Tasks
              </h1>
              <div style={{ display: 'flex', gap: 16, fontSize: '0.85rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                <span>{activeCount} active</span>
                {dueToday > 0 && <span style={{ color: 'var(--blue)' }}>{dueToday} due today</span>}
                {overdue > 0 && <span style={{ color: 'var(--red)' }}>{overdue} overdue</span>}
              </div>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span>+</span> New Task <kbd style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 6px', borderRadius: 4, fontSize: '0.7rem', marginLeft: 4 }}>N</kbd>
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div style={{ marginBottom: 24, display: 'flex', gap: 8, borderBottom: '1px solid var(--border)', paddingBottom: 2 }}>
          {[
            { key: 'all', label: 'All', count: activeCount },
            { key: 'today', label: 'Today', count: dueToday },
            { key: 'week', label: 'This Week', count: stats?.dueSoon || 0 },
            { key: 'overdue', label: 'Overdue', count: overdue },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              style={{
                background: filter === tab.key ? 'rgba(45,212,191,0.15)' : 'transparent',
                border: 'none',
                borderBottom: filter === tab.key ? '2px solid var(--teal)' : '2px solid transparent',
                padding: '8px 16px',
                color: filter === tab.key ? 'var(--teal)' : 'var(--muted)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                fontFamily: 'var(--mono)',
              }}
            >
              {tab.label} {tab.count > 0 && `(${tab.count})`}
            </button>
          ))}
        </div>

        {/* Task List */}
        <GlassCard>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="shimmer" style={{ height: 60, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div style={{ padding: '60px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.3 }}>✓</div>
              <div style={{ color: 'var(--muted)', fontSize: '1.1rem', marginBottom: 8 }}>
                {filter === 'overdue' ? 'No overdue tasks' : filter === 'today' ? 'Nothing due today' : 'No tasks'}
              </div>
              <div style={{ color: 'var(--faint)', fontSize: '0.85rem' }}>
                {filter === 'all' ? "You're all clear! Add a task to get started." : 'Try a different filter'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tasks.map(task => {
                const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
                const category = CATEGORIES.find(c => c.value === task.shape);
                
                return (
                  <div
                    key={task.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '14px',
                      background: 'rgba(255,255,255,0.03)',
                      borderRadius: 8,
                      borderLeft: `4px solid ${priorityColor}`,
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => handleComplete(task.id)}
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        border: `2px solid ${priorityColor}`,
                        background: 'transparent',
                        cursor: 'pointer',
                        flexShrink: 0,
                        marginTop: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = priorityColor + '33';
                        e.currentTarget.innerHTML = '✓';
                        e.currentTarget.style.color = priorityColor;
                        e.currentTarget.style.fontWeight = 'bold';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.innerHTML = '';
                      }}
                    />

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ color: 'var(--text)', fontSize: '0.95rem', fontWeight: 600, marginBottom: 4 }}>
                            {task.title}
                          </div>
                          {task.notes && (
                            <div style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                              {task.notes}
                            </div>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {category && (
                            <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                              {category.icon} {category.label}
                            </span>
                          )}
                          {task.externalSource && (
                            <Badge label={`from ${task.externalSource}`} color="var(--purple)" />
                          )}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.75rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
                        {task.dueDate && (
                          <span style={{ color: task.overdue ? 'var(--red)' : task.dueToday ? 'var(--blue)' : 'var(--faint)' }}>
                            {task.overdue && '⚠ '}Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        <span style={{ color: priorityColor }}>
                          {task.priority}
                        </span>
                        <span>
                          {timeAgo(task.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      <button
                        onClick={() => navigate(`/focus?taskId=${task.id}`)}
                        title="Start focus timer"
                        style={{
                          background: 'rgba(45,212,191,0.1)',
                          border: '1px solid rgba(45,212,191,0.3)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: 'var(--teal)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,212,191,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(45,212,191,0.1)'}
                      >
                        Focus
                      </button>
                      <button
                        onClick={() => openEditModal(task)}
                        title="Edit"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: 'var(--muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleSnooze(task.id, 'tomorrow')}
                        title="Snooze until tomorrow"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: 'var(--muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--amber)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                      >
                        💤
                      </button>
                      <button
                        onClick={() => handleDelete(task.id)}
                        title="Delete"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '1px solid var(--border)',
                          borderRadius: 6,
                          padding: '6px 10px',
                          color: 'var(--muted)',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'}
                        onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Completed Section */}
        {completedTasks.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <button
              onClick={() => setShowCompletedSection(!showCompletedSection)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                padding: '8px 0',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
            >
              <span>{showCompletedSection ? '▼' : '▶'}</span>
              Recently Completed ({completedTasks.length})
            </button>
            {showCompletedSection && (
              <GlassCard>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {completedTasks.map(task => (
                    <div
                      key={task.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 6,
                        opacity: 0.7,
                      }}
                    >
                      <span style={{ color: 'var(--green)', fontSize: '1rem' }}>✓</span>
                      <div style={{ flex: 1, textDecoration: 'line-through', color: 'var(--muted)', fontSize: '0.85rem' }}>
                        {task.title}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
                        {timeAgo(task.finishedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="New Task">
        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Title *</label>
            <input
              autoFocus
              data-autofocus="true"
              className="nx-input"
              placeholder="What needs to be done?"
              value={newTaskForm.title}
              onChange={e => setNewTaskForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Priority</label>
              <select
                className="nx-input"
                value={newTaskForm.priority}
                onChange={e => setNewTaskForm(f => ({ ...f, priority: e.target.value }))}
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Due Date</label>
              <input
                type="date"
                className="nx-input"
                value={newTaskForm.dueDate}
                onChange={e => setNewTaskForm(f => ({ ...f, dueDate: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Category</label>
            <select
              className="nx-input"
              value={newTaskForm.category}
              onChange={e => setNewTaskForm(f => ({ ...f, category: e.target.value }))}
            >
              <option value="">None</option>
              {CATEGORIES.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.icon} {cat.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Notes</label>
            <textarea
              className="nx-input"
              rows={3}
              placeholder="Additional details..."
              value={newTaskForm.notes}
              onChange={e => setNewTaskForm(f => ({ ...f, notes: e.target.value }))}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
            <button type="button" className="btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button type="submit" className="btn-primary">Create Task</button>
          </div>
        </form>
      </Modal>

      {/* Edit Task Modal */}
      {editingTask && (
        <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Task">
          <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Title *</label>
              <input
                autoFocus
                data-autofocus="true"
                className="nx-input"
                value={editingTask.title}
                onChange={e => setEditingTask(t => ({ ...t, title: e.target.value }))}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Priority</label>
                <select
                  className="nx-input"
                  value={editingTask.priority}
                  onChange={e => setEditingTask(t => ({ ...t, priority: e.target.value }))}
                >
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
              <div>
                <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Due Date</label>
                <input
                  type="date"
                  className="nx-input"
                  value={editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().slice(0, 10) : ''}
                  onChange={e => setEditingTask(t => ({ ...t, dueDate: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Category</label>
              <select
                className="nx-input"
                value={editingTask.shape || ''}
                onChange={e => setEditingTask(t => ({ ...t, shape: e.target.value }))}
              >
                <option value="">None</option>
                {CATEGORIES.map(cat => (
                  <option key={cat.value} value={cat.value}>
                    {cat.icon} {cat.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Notes</label>
              <textarea
                className="nx-input"
                rows={3}
                value={editingTask.notes || ''}
                onChange={e => setEditingTask(t => ({ ...t, notes: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <button type="button" className="btn-ghost" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button type="submit" className="btn-primary">Save Changes</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
