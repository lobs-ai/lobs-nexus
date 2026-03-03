import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { showToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

export default function Projects() {
  const { data: projects, loading, reload } = useApi(() => api.projects());
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'project', notes: '' });

  const create = async () => {
    if (!form.title.trim()) return;
    try {
      await api.createProject(form);
      showToast('Project created', 'success');
      setShowCreate(false);
      setForm({ title: '', type: 'project', notes: '' });
      reload();
    } catch { showToast('Failed', 'error'); }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28 }}>
        <div>
          <span className="section-label">Organization</span>
          <h2 style={{ color: 'var(--text)', fontWeight: 700 }}>Projects</h2>
        </div>
        <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
      </div>

      {loading ? <LoadingSkeleton lines={4} height={100} /> : (
        !projects?.length ? (
          <EmptyState icon="📁" title="No projects yet" description="Create a project to organize your tasks" action={<button className="btn-primary" onClick={() => setShowCreate(true)}>Create Project</button>} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
            {projects.map(p => (
              <GlassCard key={p.id}>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <h3 style={{ color: 'var(--text)', fontWeight: 700 }}>{p.title}</h3>
                    <Badge label={p.type || 'project'} color="var(--blue)" />
                  </div>
                  {p.notes && <p style={{ color: 'var(--muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>{p.notes}</p>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 12 }}>
                  Updated {timeAgo(p.updated_at || p.updatedAt)}
                  {p.github_repo && <span style={{ marginLeft: 12, color: 'var(--blue)' }}>⬡ {p.github_repo}</span>}
                </div>
              </GlassCard>
            ))}
          </div>
        )
      )}

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Title *</label>
            <input className="nx-input" placeholder="Project name..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Type</label>
            <select className="nx-input" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
              {['project', 'personal', 'work', 'research', 'other'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Notes</label>
            <textarea className="nx-input" rows={3} placeholder="Description..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={() => setShowCreate(false)}>Cancel</button>
            <button className="btn-primary" onClick={create}>Create</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
