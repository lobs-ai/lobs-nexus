import { useState, useEffect, useRef } from 'react';
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

// ─────────────────────────────────────────────
// Brain Dump Section
// ─────────────────────────────────────────────
function BrainDumpSection({ onTasksCreated }) {
  const [open, setOpen] = useState(null); // null = uninitialized (auto-detect)
  const [text, setText] = useState('');
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null); // { summary, accomplishments, proposed_tasks }
  const [checkedTasks, setCheckedTasks] = useState({});
  const [confirming, setConfirming] = useState(false);
  const [successSummary, setSuccessSummary] = useState(null);
  const textareaRef = useRef(null);

  // Auto-open logic: prop from parent tells us whether there are active tasks
  // We track this with a ref to only run once on mount
  const initializedRef = useRef(false);
  useEffect(() => {
    if (!initializedRef.current && open === null) {
      // Default open — parent will tell us via onTasksCreated counts
      // We'll default open for now and let the parent control via hasActiveTasks prop
      setOpen(true);
      initializedRef.current = true;
    }
  }, [open]);

  const handleProcess = async () => {
    if (!text.trim()) return;
    setProcessing(true);
    setResult(null);
    setSuccessSummary(null);
    try {
      const data = await api.brainDump({ text, mode: 'personal' });
      setResult(data);
      // Check all proposed tasks by default
      const checks = {};
      (data.proposed_tasks || []).forEach((t, i) => { checks[i] = true; });
      setCheckedTasks(checks);
    } catch (err) {
      showToast('Brain dump failed — try again', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (!result) return;
    const selectedTasks = (result.proposed_tasks || []).filter((_, i) => checkedTasks[i]);
    if (selectedTasks.length === 0) {
      showToast('No tasks selected', 'error');
      return;
    }
    setConfirming(true);
    try {
      const data = await api.brainDumpConfirm({ tasks: selectedTasks, mode: 'personal' });
      const created = data?.created ?? selectedTasks.length;
      setSuccessSummary({ created, skipped: data?.skipped ?? 0 });
      setText('');
      setResult(null);
      setCheckedTasks({});
      onTasksCreated();
    } catch (err) {
      showToast('Failed to create tasks', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl+Enter or Cmd+Enter to process
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (!result) handleProcess();
      else handleConfirm();
    }
  };

  const selectedCount = Object.values(checkedTasks).filter(Boolean).length;

  return (
    <div style={{ marginBottom: 28 }}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none',
          border: 'none',
          padding: '0 0 12px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
        }}
      >
        <span style={{ fontSize: '1.3rem' }}>🧠</span>
        <span style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1rem' }}>Brain Dump</span>
        <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'var(--mono)', marginLeft: 4 }}>
          — dump everything, let Lobs sort it out
        </span>
        <span style={{ marginLeft: 'auto', color: 'var(--muted)', fontSize: '0.75rem' }}>
          {open ? '▼' : '▶'}
        </span>
      </button>

      {open && (
        <GlassCard style={{ padding: 20 }}>
          {/* Success summary */}
          {successSummary && (
            <div style={{
              marginBottom: 16,
              padding: '14px 16px',
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.3)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{ fontSize: '1.4rem' }}>🎉</span>
              <div>
                <div style={{ color: 'var(--green)', fontWeight: 700, fontSize: '0.95rem' }}>
                  {successSummary.created} task{successSummary.created !== 1 ? 's' : ''} created!
                </div>
                {successSummary.skipped > 0 && (
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                    {successSummary.skipped} skipped
                  </div>
                )}
              </div>
              <button
                onClick={() => setSuccessSummary(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '1rem' }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Textarea input */}
          {!result && (
            <>
              <textarea
                ref={textareaRef}
                className="nx-input"
                rows={5}
                placeholder="What's on your mind? Dump everything — what you did today, what needs doing, deadlines, whatever..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{
                  resize: 'vertical',
                  width: '100%',
                  fontSize: '0.95rem',
                  lineHeight: 1.6,
                  marginBottom: 12,
                  boxSizing: 'border-box',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={handleProcess}
                  disabled={!text.trim() || processing}
                  className="btn-primary"
                  style={{
                    opacity: (!text.trim() || processing) ? 0.5 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {processing ? (
                    <>
                      <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                      Processing…
                    </>
                  ) : (
                    <>✨ Process</>
                  )}
                </button>
                {text.trim() && !processing && (
                  <span style={{ color: 'var(--faint)', fontSize: '0.75rem', fontFamily: 'var(--mono)' }}>
                    ⌘↵ to process
                  </span>
                )}
                {text.trim() && (
                  <button
                    onClick={() => { setText(''); setSuccessSummary(null); }}
                    className="btn-ghost"
                    style={{ marginLeft: 'auto' }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </>
          )}

          {/* Processing shimmer */}
          {processing && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
              {[1, 2, 3].map(i => (
                <div key={i} className="shimmer" style={{ height: 48, borderRadius: 8, background: 'rgba(255,255,255,0.04)' }} />
              ))}
            </div>
          )}

          {/* Results / Review step */}
          {result && !processing && (
            <div>
              {/* Summary */}
              {result.summary && (
                <div style={{
                  padding: '10px 14px',
                  background: 'rgba(45,212,191,0.07)',
                  border: '1px solid rgba(45,212,191,0.2)',
                  borderRadius: 8,
                  color: 'var(--muted)',
                  fontSize: '0.875rem',
                  lineHeight: 1.6,
                  marginBottom: 16,
                }}>
                  {result.summary}
                </div>
              )}

              {/* Accomplishments */}
              {result.accomplishments && result.accomplishments.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--mono)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    ✓ Done Today
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {result.accomplishments.map((acc, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, color: 'var(--muted)', fontSize: '0.85rem' }}>
                        <span style={{ color: 'var(--green)', flexShrink: 0 }}>✓</span>
                        <span>{acc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Proposed tasks */}
              {result.proposed_tasks && result.proposed_tasks.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--mono)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Tasks to Create ({selectedCount} of {result.proposed_tasks.length} selected)
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.proposed_tasks.map((task, i) => {
                      const isChecked = !!checkedTasks[i];
                      const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
                      const category = CATEGORIES.find(c => c.value === task.category);
                      return (
                        <label
                          key={i}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            padding: '12px 14px',
                            background: isChecked ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.015)',
                            borderRadius: 8,
                            border: `1px solid ${isChecked ? 'rgba(45,212,191,0.2)' : 'var(--border)'}`,
                            cursor: 'pointer',
                            transition: 'all 0.15s',
                            opacity: isChecked ? 1 : 0.55,
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={e => setCheckedTasks(c => ({ ...c, [i]: e.target.checked }))}
                            style={{ marginTop: 2, accentColor: 'var(--teal)', width: 16, height: 16, flexShrink: 0 }}
                          />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ color: 'var(--text)', fontSize: '0.9rem', fontWeight: 600, marginBottom: 4 }}>
                              {task.title}
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                              <span style={{
                                fontSize: '0.7rem',
                                fontFamily: 'var(--mono)',
                                color: priorityColor,
                                background: priorityColor + '22',
                                padding: '2px 8px',
                                borderRadius: 4,
                                fontWeight: 700,
                                textTransform: 'uppercase',
                              }}>
                                {task.priority || 'medium'}
                              </span>
                              {category && (
                                <span style={{ fontSize: '0.7rem', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: 4, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                                  {category.icon} {category.label}
                                </span>
                              )}
                              {task.estimatedTime && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
                                  ⏱ {task.estimatedTime}
                                </span>
                              )}
                              {task.dueDate && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--blue)', fontFamily: 'var(--mono)' }}>
                                  📅 {task.dueDate}
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Confirm row */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <button
                  onClick={handleConfirm}
                  disabled={confirming || selectedCount === 0}
                  className="btn-primary"
                  style={{ opacity: (confirming || selectedCount === 0) ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  {confirming ? (
                    <>
                      <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⟳</span>
                      Creating…
                    </>
                  ) : (
                    <>✓ Confirm &amp; Create {selectedCount} Task{selectedCount !== 1 ? 's' : ''}</>
                  )}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setResult(null);
                    setCheckedTasks({});
                  }}
                >
                  ← Edit Dump
                </button>
                <button
                  className="btn-ghost"
                  style={{ marginLeft: 'auto', color: 'var(--muted)' }}
                  onClick={() => {
                    setText('');
                    setResult(null);
                    setCheckedTasks({});
                    setSuccessSummary(null);
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Quick Add Bar
// ─────────────────────────────────────────────
function QuickAddBar({ onCreated }) {
  const [value, setValue] = useState('');
  const [creating, setCreating] = useState(false);

  const handleKeyDown = async (e) => {
    if (e.key !== 'Enter' || !value.trim() || creating) return;
    e.preventDefault();
    setCreating(true);
    try {
      await api.createMyTask({ title: value.trim(), priority: 'medium' });
      setValue('');
      showToast('Task added!', 'success');
      onCreated();
    } catch (err) {
      showToast('Failed to add task', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div style={{ marginBottom: 24, position: 'relative' }}>
      <input
        className="nx-input"
        placeholder="Quick add task… (Enter to create)"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={creating}
        style={{
          width: '100%',
          boxSizing: 'border-box',
          paddingLeft: '2.5rem',
          fontSize: '0.9rem',
          opacity: creating ? 0.6 : 1,
        }}
      />
      <span style={{
        position: 'absolute',
        left: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        color: 'var(--faint)',
        fontSize: '0.85rem',
        pointerEvents: 'none',
      }}>
        {creating ? '⟳' : '+'}
      </span>
      {value.trim() && !creating && (
        <span style={{
          position: 'absolute',
          right: 12,
          top: '50%',
          transform: 'translateY(-50%)',
          color: 'var(--faint)',
          fontSize: '0.7rem',
          fontFamily: 'var(--mono)',
          pointerEvents: 'none',
        }}>
          ↵
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
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
        <div style={{ marginBottom: 28 }}>
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

        {/* Brain Dump */}
        <BrainDumpSection onTasksCreated={fetchData} />

        {/* Quick Add Bar */}
        <QuickAddBar onCreated={fetchData} />

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
                {filter === 'all' ? "You're all clear! Use the brain dump above to add tasks." : 'Try a different filter'}
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
