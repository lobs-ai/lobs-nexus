import { useState } from 'react';
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

function TaskCard({ task, onClick }) {
  return (
    <div className="task-card" onClick={() => onClick(task)}>
      <div style={{ marginBottom: 8 }}>
        <div style={{ color: 'var(--text)', fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.3, marginBottom: 6 }}>{task.title}</div>
        {task.notes && (
          <div style={{ color: 'var(--muted)', fontSize: '0.78rem', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {task.notes}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {task.agent && <Badge label={task.agent} color={AGENT_COLORS[task.agent] || 'var(--blue)'} />}
        {task.model_tier && <Badge label={task.model_tier} color={TIER_COLORS[task.model_tier] || 'var(--muted)'} />}
        <span style={{ marginLeft: 'auto', color: 'var(--faint)', fontSize: '0.72rem' }}>{timeAgo(task.updated_at || task.updatedAt)}</span>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { data: tasks, loading, reload } = usePolling(() => api.tasks(), 15000);
  const { data: projects } = useApi(() => api.projects());
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState({ agent: '', tier: '', project: '' });
  const [form, setForm] = useState({ title: '', agent: 'programmer', model_tier: 'standard', project_id: '', notes: '' });

  const filtered = (tasks || []).filter(t => {
    if (filter.agent && t.agent !== filter.agent) return false;
    if (filter.tier && t.model_tier !== filter.tier && t.modelTier !== filter.tier) return false;
    if (filter.project && t.project_id !== filter.project && t.projectId !== filter.project) return false;
    return true;
  });

  const byStatus = (status) => filtered.filter(t => t.status === status || (status === 'cancelled' && ['cancelled', 'rejected', 'archived'].includes(t.status)));

  const createTask = async () => {
    if (!form.title.trim()) return;
    try {
      await api.createTask(form);
      showToast('Task created', 'success');
      setShowCreate(false);
      setForm({ title: '', agent: 'programmer', model_tier: 'standard', project_id: '', notes: '' });
      reload();
    } catch (e) {
      showToast('Failed to create task', 'error');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <span className="section-label">Task Management</span>
          <h2 style={{ color: 'var(--text)', fontWeight: 700 }}>Tasks</h2>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Task</button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        <select className="nx-input" style={{ width: 'auto' }} value={filter.agent} onChange={e => setFilter(f => ({ ...f, agent: e.target.value }))}>
          <option value="">All Agents</option>
          {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select className="nx-input" style={{ width: 'auto' }} value={filter.tier} onChange={e => setFilter(f => ({ ...f, tier: e.target.value }))}>
          <option value="">All Tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {projects?.length > 0 && (
          <select className="nx-input" style={{ width: 'auto' }} value={filter.project} onChange={e => setFilter(f => ({ ...f, project: e.target.value }))}>
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        )}
        {(filter.agent || filter.tier || filter.project) && (
          <button className="btn-ghost" onClick={() => setFilter({ agent: '', tier: '', project: '' })}>Clear</button>
        )}
      </div>

      {/* Kanban */}
      {loading ? <LoadingSkeleton lines={6} height={80} /> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
          {COLUMNS.map(col => (
            <div key={col.id} className="kanban-col" style={{ padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: col.color, display: 'inline-block' }} />
                <span style={{ color: col.color, fontWeight: 600, fontSize: '0.875rem' }}>{col.label}</span>
                <span style={{ color: 'var(--muted)', fontSize: '0.78rem', marginLeft: 'auto' }}>{byStatus(col.id).length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {byStatus(col.id).length === 0 ? (
                  <div style={{ color: 'var(--muted)', fontSize: '0.8rem', textAlign: 'center', padding: '20px 0' }}>Empty</div>
                ) : (
                  byStatus(col.id).map(t => <TaskCard key={t.id} task={t} onClick={setSelected} />)
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task detail modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || 'Task'}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Badge label={selected.status} color={selected.status === 'active' ? 'var(--teal)' : selected.status === 'completed' ? 'var(--green)' : 'var(--muted)'} />
              {selected.agent && <Badge label={selected.agent} color={AGENT_COLORS[selected.agent] || 'var(--blue)'} />}
              {(selected.model_tier || selected.modelTier) && <Badge label={selected.model_tier || selected.modelTier} color={TIER_COLORS[selected.model_tier || selected.modelTier] || 'var(--muted)'} />}
            </div>
            {selected.notes && (
              <div style={{ background: 'rgba(11,15,30,0.6)', borderRadius: 8, padding: 16 }}>
                <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 8 }}>Notes</div>
                <div style={{ color: 'var(--text)', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
              </div>
            )}
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
              <div>Created: {timeAgo(selected.created_at || selected.createdAt)}</div>
              <div>Updated: {timeAgo(selected.updated_at || selected.updatedAt)}</div>
              <div style={{ fontFamily: 'var(--mono)', color: 'var(--faint)', marginTop: 4 }}>ID: {selected.id}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Task">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Title *</label>
            <input className="nx-input" placeholder="Task title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Agent</label>
              <select className="nx-input" value={form.agent} onChange={e => setForm(f => ({ ...f, agent: e.target.value }))}>
                {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Model Tier</label>
              <select className="nx-input" value={form.model_tier} onChange={e => setForm(f => ({ ...f, model_tier: e.target.value }))}>
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          {projects?.length > 0 && (
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Project</label>
              <select className="nx-input" value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}>
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
              </select>
            </div>
          )}
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Notes</label>
            <textarea className="nx-input" rows={4} placeholder="Task description / notes..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary" onClick={createTask}>Create Task</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
