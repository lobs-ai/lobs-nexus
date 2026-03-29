import { useMemo, useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

const STATUS_COLORS = {
  pending: 'var(--amber)',
  planned: 'var(--blue)',
  building: 'var(--purple)',
  done: 'var(--green)',
  wontdo: 'var(--faint)',
};

const STATUS_LABELS = {
  pending: 'Pending',
  planned: 'Planned',
  building: 'Building',
  done: 'Done',
  wontdo: "Won't Do",
};

const TYPE_CONFIG = {
  feature: { label: '💡 Feature', bg: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' },
  bug:     { label: '🐛 Bug',     bg: 'rgba(239, 68, 68, 0.15)',  color: '#f87171' },
};

function SuggestionCard({ item, onRefresh }) {
  const [busy, setBusy] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const setStatus = async (status) => {
    setBusy(status);
    try {
      await api.updateSuggestion(item.id, { status });
      await onRefresh();
    } catch (err) {
      console.error('Failed to update:', err);
    } finally {
      setBusy(null);
    }
  };

  const sendToAgent = async () => {
    setBusy('send');
    try {
      const typeLabel = item.type === 'bug' ? 'Bug' : 'Suggestion';
      const titlePrefix = item.project ? `[${typeLabel}: ${item.project}]` : `[${typeLabel}]`;
      await api.createTask({
        title: `${titlePrefix} ${item.title}`,
        notes: item.description || item.title,
        project_id: 'lobs',
        external_source: 'suggestion',
        external_id: item.id,
        suggestion_project: item.project || null,
        suggestion_type: item.type || 'feature',
        model_tier: 'standard',
      });
      await api.updateSuggestion(item.id, { status: 'planned' });
      await onRefresh();
    } catch (err) {
      console.error('Failed to send to agent:', err);
    } finally {
      setBusy(null);
    }
  };

  const deleteSuggestion = async () => {
    setBusy('delete');
    try {
      await api.deleteSuggestion(item.id);
      await onRefresh();
    } catch (err) {
      console.error('Failed to delete:', err);
    } finally {
      setBusy(null);
      setConfirmDelete(false);
    }
  };

  const isPending = item.status === 'pending';
  const typeInfo = TYPE_CONFIG[item.type] || TYPE_CONFIG.feature;

  return (
    <GlassCard>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ color: 'var(--text)', fontWeight: 700, marginBottom: 6, fontSize: '1rem' }}>
            {item.title}
          </div>
          {item.description && (
            <div style={{ color: 'var(--muted)', fontSize: '0.84rem', whiteSpace: 'pre-wrap', marginBottom: 8, lineHeight: 1.5 }}>
              {item.description}
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{
              fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, fontWeight: 600,
              background: typeInfo.bg, color: typeInfo.color,
            }}>
              {typeInfo.label}
            </span>
            {item.project && (
              <span style={{
                fontSize: '0.7rem', padding: '2px 8px', borderRadius: 10, fontWeight: 600,
                background: 'rgba(52, 211, 153, 0.15)', color: '#34d399',
              }}>
                {item.project}
              </span>
            )}
            <Badge label={STATUS_LABELS[item.status] || item.status} color={STATUS_COLORS[item.status] || 'var(--muted)'} dot />
            <span style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>
              {timeAgo(item.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {isPending && (
          <>
            <button
              className="btn-success"
              disabled={!!busy}
              onClick={sendToAgent}
              style={{ fontSize: '0.8rem' }}
            >
              {busy === 'send' ? '...' : '🚀 Send to Agent'}
            </button>
            <button
              className="btn-primary"
              disabled={!!busy}
              onClick={() => setStatus('planned')}
              style={{ fontSize: '0.8rem' }}
            >
              {busy === 'planned' ? '...' : '📋 Mark Planned'}
            </button>
            <button
              className="btn-ghost"
              disabled={!!busy}
              onClick={() => setStatus('wontdo')}
              style={{ fontSize: '0.8rem' }}
            >
              {busy === 'wontdo' ? '...' : "✗ Won't Do"}
            </button>
          </>
        )}

        {!isPending && item.status !== 'done' && item.status !== 'wontdo' && (
          <>
            <button
              className="btn-primary"
              disabled={!!busy}
              onClick={() => setStatus(item.status === 'planned' ? 'building' : 'done')}
              style={{ fontSize: '0.8rem' }}
            >
              {busy ? '...' : item.status === 'planned' ? '🔨 Start Building' : '✓ Mark Done'}
            </button>
          </>
        )}

        {item.status === 'wontdo' && (
          <button
            className="btn-ghost"
            disabled={!!busy}
            onClick={() => setStatus('pending')}
            style={{ fontSize: '0.8rem' }}
          >
            ↩ Reopen
          </button>
        )}

        {confirmDelete ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ color: 'var(--amber)', fontSize: '0.78rem' }}>Delete?</span>
            <button className="btn-danger" disabled={!!busy} onClick={deleteSuggestion} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
              {busy === 'delete' ? '...' : 'Yes'}
            </button>
            <button className="btn-ghost" onClick={() => setConfirmDelete(false)} style={{ fontSize: '0.78rem', padding: '4px 10px' }}>
              No
            </button>
          </div>
        ) : (
          <button
            className="btn-ghost"
            onClick={() => setConfirmDelete(true)}
            style={{ fontSize: '0.8rem', marginLeft: 'auto' }}
          >
            🗑
          </button>
        )}
      </div>
    </GlassCard>
  );
}

export default function Suggestions() {
  const [view, setView] = useState('pending');
  const { data, loading, reload } = useApi(signal => api.suggestions(signal));

  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const pending = items.filter(i => i.status === 'pending');
  const active = items.filter(i => ['planned', 'building'].includes(i.status));
  const closed = items.filter(i => ['done', 'wontdo'].includes(i.status));

  const shown = view === 'pending' ? pending : view === 'active' ? active : view === 'closed' ? closed : items;

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8 }}>
            COMMUNITY
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900 }}>
            <span className="gradient-text">Suggestions</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: 4 }}>
            Feature requests from home.lobslab.com visitors
          </p>
        </div>

        <div className="hud-tabs-row" style={{ marginBottom: 22 }}>
          <button className={`hud-tab ${view === 'pending' ? 'active' : ''}`} onClick={() => setView('pending')}>
            Pending ({pending.length})
          </button>
          <button className={`hud-tab ${view === 'active' ? 'active' : ''}`} onClick={() => setView('active')}>
            Active ({active.length})
          </button>
          <button className={`hud-tab ${view === 'closed' ? 'active' : ''}`} onClick={() => setView('closed')}>
            Closed ({closed.length})
          </button>
          <button className={`hud-tab ${view === 'all' ? 'active' : ''}`} onClick={() => setView('all')}>
            All ({items.length})
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 10 }}>
            {[1, 2, 3].map(i => <LoadingSkeleton key={i} height={100} />)}
          </div>
        ) : shown.length === 0 ? (
          <EmptyState
            icon="💡"
            title={view === 'pending' ? 'No pending suggestions' : 'No suggestions here'}
            description={view === 'pending'
              ? 'When visitors submit feature ideas on home.lobslab.com, they\'ll appear here for review.'
              : 'Nothing to show in this category yet.'}
          />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {shown.map(item => (
              <SuggestionCard key={item.id} item={item} onRefresh={reload} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
