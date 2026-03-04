import { useMemo, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

const TYPE_COLORS = {
  approval: 'var(--amber)',
  suggestion: 'var(--blue)',
  report: 'var(--teal)',
  notice: 'var(--muted)',
};

const STATUS_COLORS = {
  pending: 'var(--amber)',
  approved: 'var(--green)',
  rejected: 'var(--red)',
  feedback_pending: 'var(--purple)',
};

function ItemCard({ item, onRefresh }) {
  const [feedback, setFeedback] = useState('');
  const [busy, setBusy] = useState(null);
  const actionable = !!item.requiresAction && (item.actionStatus || "pending") === "pending";

  const run = async (action) => {
    setBusy(action);
    try {
      if (action === 'approve') await api.inboxApprove(item.id);
      else if (action === 'reject') await api.inboxReject(item.id);
      else if (action === 'feedback') {
        if (!feedback.trim()) return;
        await api.inboxFeedback(item.id, feedback.trim());
        setFeedback('');
      } else if (action === 'read') await api.inboxRead(item.id);
      else if (action === 'archive') await api.inboxDelete(item.id);
      await onRefresh();
    } finally {
      setBusy(null);
    }
  };

  return (
    <GlassCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 6 }}>{item.title}</div>
          <div style={{ color: 'var(--muted)', fontSize: '0.84rem', whiteSpace: 'pre-wrap', marginBottom: 8 }}>{item.summary || item.content || 'No content'}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Badge label={item.type || 'notice'} color={TYPE_COLORS[item.type] || 'var(--muted)'} />
            {item.sourceAgent && <Badge label={item.sourceAgent} color="var(--blue)" dot />}
            {item.actionStatus && <Badge label={item.actionStatus} color={STATUS_COLORS[item.actionStatus] || 'var(--muted)'} />}
            {!item.isRead && <Badge label="unread" color="var(--teal)" />}
          </div>
        </div>
        <div style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{timeAgo(item.modifiedAt)}</div>
      </div>

      <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
        {actionable ? (
          <>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-success" style={{ flex: 1 }} disabled={!!busy} onClick={() => run('approve')}>{busy === 'approve' ? '...' : '✓ Approve'}</button>
              <button className="btn-danger" style={{ flex: 1 }} disabled={!!busy} onClick={() => run('reject')}>{busy === 'reject' ? '...' : '✗ Reject'}</button>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input className="nx-input" value={feedback} onChange={e => setFeedback(e.target.value)} placeholder="Leave feedback for the source agent..." style={{ flex: 1 }} />
              <button className="btn-primary" disabled={!!busy || !feedback.trim()} onClick={() => run('feedback')}>{busy === 'feedback' ? '...' : 'Send Feedback'}</button>
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', gap: 8 }}>
            {!item.isRead && <button className="btn-ghost" onClick={() => run('read')} disabled={!!busy}>{busy === 'read' ? '...' : '✓ Acknowledge'}</button>}
            <button className="btn-ghost" onClick={() => run('archive')} disabled={!!busy}>{busy === 'archive' ? '...' : '🗑 Archive'}</button>
          </div>
        )}
      </div>
    </GlassCard>
  );
}

export default function Inbox() {
  const [view, setView] = useState('needs-action');
  const { data, loading, reload } = useApi(() => api.inbox());

  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const needsAction = items.filter(i => i.requiresAction && i.actionStatus === 'pending');
  const shown = view === 'needs-action' ? needsAction : items;

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8 }}>DECISION CENTER</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900 }}><span className="gradient-text">Inbox</span></h1>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 22 }}>
          <button className={`hud-tab ${view === 'needs-action' ? 'active' : ''}`} onClick={() => setView('needs-action')}>Needs Action ({needsAction.length})</button>
          <button className={`hud-tab ${view === 'all' ? 'active' : ''}`} onClick={() => setView('all')}>All Items ({items.length})</button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 10 }}>{[1,2,3].map(i => <LoadingSkeleton key={i} height={110} />)}</div>
        ) : shown.length === 0 ? (
          <EmptyState icon="📬" title="Inbox is clear" subtitle={view === 'needs-action' ? 'No pending approvals right now.' : 'No inbox items available.'} />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {shown.map(item => <ItemCard key={item.id} item={item} onRefresh={reload} />)}
          </div>
        )}
      </div>
    </div>
  );
}
