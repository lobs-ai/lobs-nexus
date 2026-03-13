import { useState } from 'react';
import { usePolling } from '../hooks/usePolling';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

export default function Tasks() {
  const [statusFilter, setStatusFilter] = useState('active');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    notes: '',
    agent: 'programmer',
    modelTier: 'standard'
  });

  const { data: tasksData, reload } = usePolling(
    (signal) => api.tasks({ status: statusFilter }, signal),
    15000,
    [statusFilter]
  );

  const tasks = tasksData?.tasks || [];

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await api.createTask({
        title: formData.title,
        notes: formData.notes,
        agent: formData.agent,
        model_tier: formData.modelTier,
        status: 'active'
      });
      setFormData({ title: '', notes: '', agent: 'programmer', modelTier: 'standard' });
      setShowCreateForm(false);
      reload();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const statuses = ['active', 'completed', 'failed', 'blocked'];
  const agents = ['programmer', 'writer', 'researcher', 'reviewer', 'architect'];
  const tiers = ['micro', 'small', 'medium', 'standard', 'strong'];

  return (
    <div style={{ padding: '32px', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
            Tasks
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '15px' }}>
            Worker task queue and history
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            background: 'var(--teal)',
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.opacity = '0.8'}
          onMouseLeave={(e) => e.target.style.opacity = '1'}
        >
          {showCreateForm ? 'Cancel' : '+ New Task'}
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <GlassCard style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '18px', fontWeight: '600', color: 'var(--text)', marginBottom: '16px' }}>
            Create Task
          </div>
          <form onSubmit={handleCreate}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
                  TITLE
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--faint)',
                    color: 'var(--text)',
                    fontSize: '15px',
                    outline: 'none'
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
                  NOTES
                </label>
                <textarea
                  required
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--faint)',
                    color: 'var(--text)',
                    fontSize: '14px',
                    fontFamily: 'var(--mono)',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                  placeholder="Problem, acceptance criteria, constraints, context..."
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
                    AGENT TYPE
                  </label>
                  <select
                    value={formData.agent}
                    onChange={(e) => setFormData({ ...formData, agent: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--faint)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {agents.map(a => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '14px', color: 'var(--muted)', marginBottom: '8px', fontFamily: 'var(--mono)' }}>
                    MODEL TIER
                  </label>
                  <select
                    value={formData.modelTier}
                    onChange={(e) => setFormData({ ...formData, modelTier: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--faint)',
                      color: 'var(--text)',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    {tiers.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--teal)',
                  color: '#fff',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                onMouseLeave={(e) => e.target.style.opacity = '1'}
              >
                Create Task
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Status Filter */}
      <div style={{ marginBottom: '24px', display: 'flex', gap: '12px' }}>
        {statuses.map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: statusFilter === status ? '1px solid var(--teal)' : '1px solid var(--border)',
              background: statusFilter === status ? 'var(--teal)' : 'var(--faint)',
              color: statusFilter === status ? '#fff' : 'var(--text)',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              transition: 'all 0.2s'
            }}
          >
            {status}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <GlassCard>
        {tasks.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--muted)' }}>
            No {statusFilter} tasks
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {tasks.map(task => (
              <div key={task.id} style={{ padding: '20px', borderRadius: '8px', background: 'var(--faint)', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>
                      {task.title}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--muted)', fontFamily: 'var(--mono)', display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <span>ID: {task.id.substring(0, 8)}</span>
                      <span>•</span>
                      <span>{task.project || 'no project'}</span>
                      {task.createdAt && (
                        <>
                          <span>•</span>
                          <span>{new Date(task.createdAt).toLocaleDateString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ 
                      fontSize: '11px', 
                      padding: '4px 10px', 
                      borderRadius: '4px', 
                      background: task.agent === 'programmer' ? 'var(--blue)' : task.agent === 'writer' ? '#a855f7' : task.agent === 'researcher' ? '#f59e0b' : task.agent === 'reviewer' ? '#10b981' : 'var(--teal)',
                      color: '#fff',
                      fontFamily: 'var(--mono)',
                      fontWeight: '600'
                    }}>
                      {task.agent || 'unassigned'}
                    </div>
                    <div style={{ 
                      fontSize: '11px', 
                      padding: '4px 10px', 
                      borderRadius: '4px', 
                      background: 'var(--border)',
                      color: 'var(--text)',
                      fontFamily: 'var(--mono)',
                      fontWeight: '600'
                    }}>
                      {task.modelTier || 'standard'}
                    </div>
                  </div>
                </div>
                {task.notes && (
                  <div style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: '1.6', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap' }}>
                    {task.notes.substring(0, 200)}{task.notes.length > 200 ? '...' : ''}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
