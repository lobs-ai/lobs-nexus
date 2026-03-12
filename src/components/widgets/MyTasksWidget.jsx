import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import GlassCard from '../GlassCard';
import Badge from '../Badge';
import { api } from '../../lib/api';

const PRIORITY_COLORS = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#3b82f6',
  low: '#94a3b8',
};

export default function MyTasksWidget() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [tasksData, statsData] = await Promise.all([
        api.myTasks({ status: 'active', sort: 'priority' }),
        api.myTaskStats(),
      ]);
      const taskList = Array.isArray(tasksData) ? tasksData : tasksData?.tasks || [];
      setTasks(taskList.slice(0, 5));
      setStats(statsData || {});
    } catch (err) {
      console.error('Failed to fetch my tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleComplete = async (id, e) => {
    e.stopPropagation();
    try {
      await api.completeMyTask(id);
      fetchData();
    } catch (err) {
      console.error('Failed to complete task:', err);
    }
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddTitle.trim()) return;
    try {
      await api.createMyTask({ title: quickAddTitle, priority: 'medium' });
      setQuickAddTitle('');
      fetchData();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const dueToday = stats?.dueToday || 0;
  const overdue = stats?.overdue || 0;

  return (
    <GlassCard style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg, var(--blue), var(--purple), transparent)', opacity: 0.6 }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.1rem' }}>✓</span>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>My Tasks</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
              {overdue > 0 ? `${overdue} overdue` : dueToday > 0 ? `${dueToday} due today` : 'All clear ✓'}
            </div>
          </div>
        </div>
        <span 
          onClick={() => navigate('/my-tasks')} 
          style={{ color: 'var(--teal)', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
        >
          View all →
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1, 2, 3].map(i => (
            <div key={i} className="shimmer" style={{ height: 40, borderRadius: 6, background: 'rgba(255,255,255,0.04)' }} />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 8, opacity: 0.3 }}>✓</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>No tasks</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {tasks.map(task => {
            const priorityColor = PRIORITY_COLORS[task.priority] || PRIORITY_COLORS.medium;
            return (
              <div
                key={task.id}
                onClick={() => navigate('/my-tasks')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: 6,
                  borderLeft: `3px solid ${priorityColor}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
              >
                <button
                  onClick={(e) => handleComplete(task.id, e)}
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${priorityColor}`,
                    background: 'transparent',
                    cursor: 'pointer',
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = priorityColor + '33'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: 'var(--text)', fontSize: '0.85rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.title}
                  </div>
                  {task.dueDate && (
                    <div style={{ color: task.overdue ? 'var(--red)' : 'var(--faint)', fontSize: '0.7rem', marginTop: 2, fontFamily: 'var(--mono)' }}>
                      {task.overdue && '⚠ '}Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div 
                  style={{ 
                    width: 6, 
                    height: 6, 
                    borderRadius: '50%', 
                    background: priorityColor, 
                    flexShrink: 0 
                  }} 
                />
              </div>
            );
          })}
        </div>
      )}

      <form onSubmit={handleQuickAdd} style={{ marginTop: 12, display: 'flex', gap: 8 }}>
        <input
          type="text"
          placeholder="Quick add task..."
          value={quickAddTitle}
          onChange={e => setQuickAddTitle(e.target.value)}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid var(--border)',
            borderRadius: 6,
            padding: '6px 10px',
            color: 'var(--text)',
            fontSize: '0.8rem',
            outline: 'none',
          }}
        />
        <button
          type="submit"
          disabled={!quickAddTitle.trim()}
          style={{
            background: quickAddTitle.trim() ? 'var(--teal)' : 'rgba(255,255,255,0.1)',
            border: 'none',
            borderRadius: 6,
            padding: '6px 12px',
            color: 'white',
            fontSize: '0.8rem',
            cursor: quickAddTitle.trim() ? 'pointer' : 'not-allowed',
            fontWeight: 600,
            transition: 'all 0.2s',
          }}
        >
          Add
        </button>
      </form>
    </GlassCard>
  );
}
