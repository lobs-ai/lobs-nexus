import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { showToast } from '../components/Toast';
import { useApi } from '../hooks/useApi';
import { usePolling } from '../hooks/usePolling';
import { useAffordances } from '../hooks/useAffordances';
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

function getRetryInfo(task) {
  const retryCount = task.retry_count ?? task.retryCount ?? 0;
  const spawnCount = task.spawn_count ?? task.spawnCount ?? 0;
  const crashCount = task.crash_count ?? task.crashCount ?? 0;
  const workState = task.work_state ?? task.workState ?? 'not_started';
  const failureReason = task.failure_reason ?? task.failureReason;
  const lastRetryReason = task.last_retry_reason ?? task.lastRetryReason;
  const escalationTier = task.escalation_tier ?? task.escalationTier ?? 0;
  const isRetrying = workState === 'not_started' && spawnCount > 0;
  const isFailed = workState === 'blocked' && failureReason;
  const hasRetryHistory = spawnCount > 1 || crashCount > 0 || retryCount > 0;
  return { retryCount, spawnCount, crashCount, workState, failureReason, lastRetryReason, escalationTier, isRetrying, isFailed, hasRetryHistory };
}

function WorkStateBadge({ task }) {
  const { workState, spawnCount, crashCount, isRetrying, isFailed, hasRetryHistory } = getRetryInfo(task);
  if (isFailed) {
    return (
      <span title={task.failure_reason ?? task.failureReason} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px', borderRadius: 4,
        background: 'rgba(239,68,68,0.18)', border: '1px solid rgba(239,68,68,0.45)',
        color: '#ef4444', fontSize: '0.72rem', fontWeight: 700, cursor: 'help',
      }}>
        ✕ failed {crashCount > 0 ? `(${crashCount} crash${crashCount > 1 ? 'es' : ''})` : ''}
      </span>
    );
  }
  if (isRetrying) {
    return (
      <span title={`Retrying — attempt ${spawnCount}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px', borderRadius: 4,
        background: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.45)',
        color: '#f59e0b', fontSize: '0.72rem', fontWeight: 700, cursor: 'help',
      }}>
        ↻ retry #{spawnCount}
      </span>
    );
  }
  if (workState === 'in_progress') {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px', borderRadius: 4,
        background: 'rgba(20,184,166,0.18)', border: '1px solid rgba(20,184,166,0.45)',
        color: 'var(--teal)', fontSize: '0.72rem', fontWeight: 700,
      }}>
        ⚡ running{spawnCount > 1 ? ` (attempt ${spawnCount})` : ''}
      </span>
    );
  }
  if (hasRetryHistory && workState === 'not_started') {
    return (
      <span title={`${spawnCount} previous attempt${spawnCount !== 1 ? 's' : ''}`} style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px', borderRadius: 4,
        background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)',
        color: '#f59e0b', fontSize: '0.72rem', fontWeight: 600, cursor: 'help',
      }}>
        ↻ queued (attempt {spawnCount + 1})
      </span>
    );
  }
  return null;
}

function TaskCard({ task, onClick }) {
  const blockers = task.blocked_by || task.blockedBy;
  const blockerCount = blockers && Array.isArray(blockers) ? blockers.length : 0;
  const affordances = useAffordances('task-card');
  const taskContext = JSON.stringify({ id: task.id, title: task.title, notes: task.notes, agent: task.agent, status: task.status });

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
      {affordances.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }} onClick={e => e.stopPropagation()}>
          {affordances.map(a => <AIAffordance key={a.id} affordance={a} context={taskContext} />)}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {blockerCount > 0 && (
          <span
            title={`Blocked by ${blockerCount} task${blockerCount > 1 ? 's' : ''} — click for details`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 7px',
              borderRadius: 4,
              background: 'rgba(220,38,38,0.18)',
              border: '1px solid rgba(220,38,38,0.45)',
              color: 'var(--red)',
              fontSize: '0.72rem',
              fontWeight: 700,
              cursor: 'help',
            }}
          >
            ⛔ blocked ({blockerCount})
          </span>
        )}
        <WorkStateBadge task={task} />
        {task.agent && <Badge label={task.agent} color={AGENT_COLORS[task.agent] || 'var(--blue)'} />}
        {task.model_tier && <Badge label={task.model_tier} color={TIER_COLORS[task.model_tier] || 'var(--muted)'} />}
        <span style={{ marginLeft: 'auto', color: 'var(--faint)', fontSize: '0.72rem' }}>{timeAgo(task.updated_at || task.updatedAt)}</span>
      </div>
    </div>
  );
}

function TableView({ tasks, onRowClick, sortField, sortDir, onSort }) {
  const cols = [
    { id: 'title', label: 'Title' },
    { id: 'status', label: 'Status' },
    { id: 'work_state', label: 'State' },
    { id: 'agent', label: 'Agent' },
    { id: 'model_tier', label: 'Tier' },
    { id: 'created_at', label: 'Created' },
    { id: 'updated_at', label: 'Updated' },
  ];

  const sorted = [...tasks].sort((a, b) => {
    const av = a[sortField] || a[sortField.replace('_at', 'At')] || '';
    const bv = b[sortField] || b[sortField.replace('_at', 'At')] || '';
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <span style={{ opacity: 0.3, marginLeft: 4 }}>↕</span>;
    return <span style={{ marginLeft: 4 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            {cols.map(col => (
              <th
                key={col.id}
                onClick={() => onSort(col.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  color: 'var(--muted)',
                  fontWeight: 600,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                {col.label}<SortIcon field={col.id} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(task => {
            const tier = task.model_tier || task.modelTier;
            const created = task.created_at || task.createdAt;
            const updated = task.updated_at || task.updatedAt;
            return (
              <tr
                key={task.id}
                onClick={() => onRowClick(task)}
                style={{
                  borderBottom: '1px solid rgba(255,255,255,0.04)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '10px 14px', color: 'var(--text)', fontWeight: 500, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {task.title}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <Badge
                    label={task.status}
                    color={task.status === 'active' ? 'var(--teal)' : task.status === 'completed' ? 'var(--green)' : 'var(--muted)'}
                  />
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <WorkStateBadge task={task} />
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {(() => {
                    const b = task.blocked_by || task.blockedBy;
                    const n = b && Array.isArray(b) ? b.length : 0;
                    return n > 0 ? (
                      <span
                        title={`Blocked by ${n} task${n > 1 ? 's' : ''}`}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '2px 7px',
                          borderRadius: 4,
                          background: 'rgba(220,38,38,0.18)',
                          border: '1px solid rgba(220,38,38,0.45)',
                          color: 'var(--red)',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          marginRight: 4,
                          cursor: 'help',
                        }}
                      >
                        ⛔ {n}
                      </span>
                    ) : null;
                  })()}
                  {task.agent && <Badge label={task.agent} color={AGENT_COLORS[task.agent] || 'var(--blue)'} />}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {tier && <Badge label={tier} color={TIER_COLORS[tier] || 'var(--muted)'} />}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                  {created ? formatDate(created) : '—'}
                </td>
                <td style={{ padding: '10px 14px', color: 'var(--muted)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                  {updated ? formatDate(updated) : '—'}
                </td>
              </tr>
            );
          })}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={7} style={{ padding: '32px 14px', textAlign: 'center', color: 'var(--muted)', fontSize: '0.82rem' }}>
                No tasks found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function BrainDumpModal({ open, onClose, projects, onConfirmed }) {
  const [step, setStep] = useState('input');
  const [dumpText, setDumpText] = useState('');
  const [projectId, setProjectId] = useState('');
  const [modelTierOverride, setModelTierOverride] = useState('');
  const [proposedTasks, setProposedTasks] = useState([]);
  const [confirming, setConfirming] = useState(false);

  const reset = () => {
    setStep('input');
    setDumpText('');
    setProjectId('');
    setModelTierOverride('');
    setProposedTasks([]);
    setConfirming(false);
  };

  const handleClose = () => { reset(); onClose(); };

  const parseDump = async () => {
    if (!dumpText.trim()) return;
    setStep('parsing');
    try {
      const result = await api.brainDump({
        text: dumpText.trim(),
        project_id: projectId || undefined,
        model_tier_override: modelTierOverride || undefined,
      });
      setProposedTasks(result.proposed_tasks.map((t, i) => ({ ...t, _id: i, _keep: true })));
      setStep('preview');
    } catch (e) {
      showToast('Failed to parse brain dump: ' + e.message, 'error');
      setStep('input');
    }
  };

  const updateTask = (idx, field, value) => {
    setProposedTasks(tasks => tasks.map((t, i) => i === idx ? { ...t, [field]: value } : t));
  };

  const confirm = async () => {
    const toCreate = proposedTasks.filter(t => t._keep);
    if (!toCreate.length) { showToast('No tasks selected', 'error'); return; }
    setConfirming(true);
    try {
      await api.brainDumpConfirm({
        tasks: toCreate.map(({ title, agent, model_tier, notes }) => ({
          title, agent, model_tier, notes, project_id: projectId || undefined,
        })),
      });
      showToast(`Created ${toCreate.length} task${toCreate.length > 1 ? 's' : ''}`, 'success');
      onConfirmed();
      handleClose();
    } catch (e) {
      showToast('Failed to create tasks: ' + e.message, 'error');
    } finally {
      setConfirming(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="🧠 Brain Dump">
      {step === 'input' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
            Paste anything — bullet points, stream of consciousness, a paragraph. The AI will extract discrete tasks and assign agents.
          </div>
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Brain dump *</label>
            <textarea
              autoFocus
              className="nx-input"
              rows={8}
              placeholder="e.g. Need to fix the login bug, also write docs for the API, and someone should research competitors in the space..."
              value={dumpText}
              onChange={e => setDumpText(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {projects?.length > 0 && (
              <div>
                <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Project (optional)</label>
                <select className="nx-input" value={projectId} onChange={e => setProjectId(e.target.value)}>
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Model tier override (optional)</label>
              <select className="nx-input" value={modelTierOverride} onChange={e => setModelTierOverride(e.target.value)}>
                <option value="">Let AI decide</option>
                {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn-ghost" onClick={handleClose}>Cancel</button>
            <button className="btn-primary" onClick={parseDump} disabled={!dumpText.trim()}>Parse →</button>
          </div>
        </div>
      )}
      {step === 'parsing' && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--muted)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 16 }}>🤖</div>
          <div style={{ fontSize: '0.9rem' }}>Analyzing your brain dump...</div>
          <div style={{ fontSize: '0.78rem', marginTop: 8, color: 'var(--faint)' }}>Extracting tasks and assigning agents</div>
        </div>
      )}
      {step === 'preview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
            Review the proposed tasks. Uncheck or edit any before confirming.
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 400, overflowY: 'auto' }}>
            {proposedTasks.map((task, idx) => (
              <div key={task._id} style={{
                background: task._keep ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 10,
                padding: 14,
                opacity: task._keep ? 1 : 0.4,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <input
                    type="checkbox"
                    checked={task._keep}
                    onChange={e => updateTask(idx, '_keep', e.target.checked)}
                    style={{ accentColor: 'var(--teal)', width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                  />
                  <input
                    className="nx-input"
                    value={task.title}
                    onChange={e => updateTask(idx, 'title', e.target.value)}
                    style={{ fontWeight: 600, flex: 1 }}
                    disabled={!task._keep}
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <div>
                    <label style={{ color: 'var(--faint)', fontSize: '0.72rem', display: 'block', marginBottom: 4 }}>Agent</label>
                    <select className="nx-input" value={task.agent} onChange={e => updateTask(idx, 'agent', e.target.value)} disabled={!task._keep} style={{ fontSize: '0.8rem' }}>
                      {AGENTS.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ color: 'var(--faint)', fontSize: '0.72rem', display: 'block', marginBottom: 4 }}>Tier</label>
                    <select className="nx-input" value={task.model_tier} onChange={e => updateTask(idx, 'model_tier', e.target.value)} disabled={!task._keep} style={{ fontSize: '0.8rem' }}>
                      {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
                {task.notes !== undefined && (
                  <textarea
                    className="nx-input"
                    rows={2}
                    value={task.notes || ''}
                    onChange={e => updateTask(idx, 'notes', e.target.value)}
                    disabled={!task._keep}
                    style={{ fontSize: '0.78rem', color: 'var(--muted)', resize: 'vertical' }}
                  />
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn-ghost" onClick={() => setStep('input')}>← Back</button>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>
                {proposedTasks.filter(t => t._keep).length} of {proposedTasks.length} selected
              </span>
              <button className="btn-primary" onClick={confirm} disabled={confirming || !proposedTasks.some(t => t._keep)}>
                {confirming ? 'Creating...' : 'Confirm & Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
}

function TaskDetailModal({ selected, onClose }) {
  const [blockers, setBlockers] = useState([]);
  const [loadingBlockers, setLoadingBlockers] = useState(false);

  useEffect(() => {
    if (!selected) { setBlockers([]); return; }
    const blockerIds = selected.blocked_by || selected.blockedBy;
    if (!blockerIds || !Array.isArray(blockerIds) || blockerIds.length === 0) {
      setBlockers([]);
      return;
    }
    setLoadingBlockers(true);
    // GET /api/tasks/:id/blockers returns full task objects with titles + statuses
    fetch(`/api/tasks/${selected.id}/blockers`)
      .then(r => r.ok ? r.json() : { blockers: [] })
      .then(data => {
        // Response shape: { blockers: [...], resolved: bool, unresolved_count: N }
        setBlockers(Array.isArray(data) ? data : (data.blockers || []));
      })
      .catch(() => setBlockers([]))
      .finally(() => setLoadingBlockers(false));
  }, [selected?.id]);

  if (!selected) return null;
  const blockerIds = selected.blocked_by || selected.blockedBy;
  const isBlocked = blockerIds && Array.isArray(blockerIds) && blockerIds.length > 0;

  return (
    <Modal open={!!selected} onClose={onClose} title={selected?.title || 'Task'}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Badge label={selected.status} color={selected.status === 'active' ? 'var(--teal)' : selected.status === 'completed' ? 'var(--green)' : 'var(--muted)'} />
          {isBlocked && <Badge label={`⛔ blocked by ${blockerIds.length} task${blockerIds.length > 1 ? 's' : ''}`} color="var(--red)" />}
          {selected.agent && <Badge label={selected.agent} color={AGENT_COLORS[selected.agent] || 'var(--blue)'} />}
          {(selected.model_tier || selected.modelTier) && <Badge label={selected.model_tier || selected.modelTier} color={TIER_COLORS[selected.model_tier || selected.modelTier] || 'var(--muted)'} />}
        </div>

        {isBlocked && (
          <div style={{ background: 'rgba(220,38,38,0.08)', border: '1px solid rgba(220,38,38,0.25)', borderRadius: 8, padding: 14 }}>
            <div style={{ color: 'var(--red)', fontSize: '0.78rem', fontWeight: 600, marginBottom: 8 }}>⛔ Blocked by</div>
            {loadingBlockers ? (
              <div style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Loading blockers…</div>
            ) : blockers.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {blockers.map(b => (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: b.status === 'completed' ? 'var(--green)' : b.status === 'active' ? 'var(--teal)' : 'var(--muted)',
                      flexShrink: 0,
                    }} />
                    <span style={{ color: 'var(--text)', fontSize: '0.82rem' }}>{b.title}</span>
                    <Badge label={b.status} color={b.status === 'completed' ? 'var(--green)' : b.status === 'active' ? 'var(--teal)' : 'var(--muted)'} />
                    {b.agent && <Badge label={b.agent} color={AGENT_COLORS[b.agent] || 'var(--blue)'} />}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {blockerIds.map(id => (
                  <div key={id} style={{ color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>{id}</div>
                ))}
              </div>
            )}
          </div>
        )}

        {(() => {
          const ri = getRetryInfo(selected);
          const show = ri.isFailed || ri.isRetrying || ri.hasRetryHistory || ri.workState === 'in_progress';
          if (!show) return null;
          const bg = ri.isFailed ? 'rgba(239,68,68,0.08)' : ri.isRetrying ? 'rgba(245,158,11,0.08)' : 'rgba(20,184,166,0.08)';
          const border = ri.isFailed ? 'rgba(239,68,68,0.25)' : ri.isRetrying ? 'rgba(245,158,11,0.25)' : 'rgba(20,184,166,0.25)';
          const labelColor = ri.isFailed ? '#ef4444' : ri.isRetrying ? '#f59e0b' : 'var(--teal)';
          const label = ri.isFailed ? '✕ Failed' : ri.isRetrying ? '↻ Retrying' : ri.workState === 'in_progress' ? '⚡ Running' : '↻ Retry History';
          return (
            <div style={{ background: bg, border: `1px solid ${border}`, borderRadius: 8, padding: 14 }}>
              <div style={{ color: labelColor, fontSize: '0.78rem', fontWeight: 600, marginBottom: 10 }}>{label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 16px', fontSize: '0.8rem' }}>
                <span style={{ color: 'var(--muted)' }}>Work state</span>
                <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{ri.workState}</span>
                <span style={{ color: 'var(--muted)' }}>Spawn count</span>
                <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{ri.spawnCount}</span>
                {ri.crashCount > 0 && <>
                  <span style={{ color: 'var(--muted)' }}>Crashes</span>
                  <span style={{ color: '#ef4444', fontFamily: 'var(--mono)' }}>{ri.crashCount}</span>
                </>}
                {ri.retryCount > 0 && <>
                  <span style={{ color: 'var(--muted)' }}>Retry count</span>
                  <span style={{ color: 'var(--text)', fontFamily: 'var(--mono)' }}>{ri.retryCount}</span>
                </>}
                {ri.escalationTier > 0 && <>
                  <span style={{ color: 'var(--muted)' }}>Escalation tier</span>
                  <span style={{ color: '#f59e0b', fontFamily: 'var(--mono)' }}>{ri.escalationTier}</span>
                </>}
              </div>
              {ri.failureReason && (
                <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 6, background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', fontSize: '0.78rem', color: '#ef4444', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {ri.failureReason}
                </div>
              )}
              {ri.lastRetryReason && !ri.failureReason && (
                <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 6, background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', fontSize: '0.78rem', color: '#f59e0b', fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {ri.lastRetryReason}
                </div>
              )}
            </div>
          );
        })()}

        {selected.notes && (
          <div style={{ background: 'rgba(11,15,30,0.6)', borderRadius: 8, padding: 16 }}>
            <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 8 }}>Notes</div>
            <div style={{ color: 'var(--text)', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{selected.notes}</div>
          </div>
        )}
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>
          <div>Created: {formatDate(selected.created_at || selected.createdAt)}</div>
          <div>Updated: {formatDate(selected.updated_at || selected.updatedAt)}</div>
          <div style={{ fontFamily: 'var(--mono)', color: 'var(--faint)', marginTop: 4 }}>ID: {selected.id}</div>
        </div>
      </div>
    </Modal>
  );
}

export default function Tasks() {
  const { data: tasksData, loading, reload } = usePolling(signal => api.tasks({}, signal), 15000);
  const { data: projectsData } = useApi(signal => api.projects(signal));
  const [selected, setSelected] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [filter, setFilter] = useState({ agent: '', tier: '', project: '' });
  const [viewMode, setViewMode] = useState('table');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [form, setForm] = useState({ title: '', agent: 'programmer', model_tier: 'standard', project_id: '', notes: '', blocked_by: [] });

  const tasks = Array.isArray(tasksData) ? tasksData : tasksData?.tasks || [];
  const projects = Array.isArray(projectsData) ? projectsData : projectsData?.projects || [];

  const filtered = tasks.filter(t => {
    if (filter.agent && t.agent !== filter.agent) return false;
    if (filter.tier && t.model_tier !== filter.tier && t.modelTier !== filter.tier) return false;
    if (filter.project && t.project_id !== filter.project && t.projectId !== filter.project) return false;
    return true;
  });

  const byStatus = (status) => filtered.filter(t => t.status === status || (status === 'cancelled' && ['cancelled', 'rejected', 'archived'].includes(t.status)));

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const createTask = async () => {
    if (!form.title.trim()) return;
    try {
      const payload = { ...form };
      if (!payload.blocked_by || payload.blocked_by.length === 0) delete payload.blocked_by;
      await api.createTask(payload);
      showToast('Task created', 'success');
      setShowCreate(false);
      setForm({ title: '', agent: 'programmer', model_tier: 'standard', project_id: '', notes: '', blocked_by: [] });
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
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 2, gap: 2 }}>
            <button
              onClick={() => setViewMode('table')}
              style={{
                background: viewMode === 'table' ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: 'none',
                color: viewMode === 'table' ? 'var(--text)' : 'var(--muted)',
                borderRadius: 6,
                padding: '5px 12px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              ☰ Table
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              style={{
                background: viewMode === 'kanban' ? 'rgba(255,255,255,0.12)' : 'transparent',
                border: 'none',
                color: viewMode === 'kanban' ? 'var(--text)' : 'var(--muted)',
                borderRadius: 6,
                padding: '5px 12px',
                cursor: 'pointer',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              ⊞ Kanban
            </button>
          </div>
          <button className="btn-ghost" onClick={() => setShowBrainDump(true)}>🧠 Brain Dump</button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>+ New Task</button>
        </div>
      </div>

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

      {loading ? <LoadingSkeleton lines={6} height={80} /> : viewMode === 'table' ? (
        <GlassCard style={{ padding: 0, overflow: 'hidden' }}>
          <TableView
            tasks={filtered}
            onRowClick={setSelected}
            sortField={sortField}
            sortDir={sortDir}
            onSort={handleSort}
          />
        </GlassCard>
      ) : (
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

      <TaskDetailModal selected={selected} onClose={() => setSelected(null)} />


      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Task">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>Title *</label>
            <input autoFocus data-autofocus="true" className="nx-input" placeholder="Task title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
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
          {tasks?.length > 0 && (
            <div>
              <label style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 6, display: 'block' }}>
                Blocked by (dependencies)
                {form.blocked_by.length > 0 && <span style={{ marginLeft: 8, color: 'var(--red)', fontWeight: 600 }}>{form.blocked_by.length} selected</span>}
              </label>
              <select
                className="nx-input"
                multiple
                size={Math.min(5, tasks.filter(t => !['completed', 'archived', 'cancelled', 'rejected'].includes(t.status)).length) || 3}
                value={form.blocked_by}
                onChange={e => {
                  const selected = Array.from(e.target.selectedOptions, o => o.value);
                  setForm(f => ({ ...f, blocked_by: selected }));
                }}
                style={{ height: 'auto', minHeight: 60 }}
              >
                {tasks
                  .filter(t => !['completed', 'archived', 'cancelled', 'rejected'].includes(t.status))
                  .sort((a, b) => (a.title || '').localeCompare(b.title || ''))
                  .map(t => (
                    <option key={t.id} value={t.id}>
                      [{t.agent || '?'}] {t.title}
                    </option>
                  ))}
              </select>
              <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: 4 }}>
                Hold Ctrl/Cmd to select multiple. Selected tasks must complete before this task spawns.
              </div>
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

      <BrainDumpModal
        open={showBrainDump}
        onClose={() => setShowBrainDump(false)}
        projects={projects}
        onConfirmed={reload}
      />
    </div>
  );
}
