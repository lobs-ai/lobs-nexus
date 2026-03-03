import { useState } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

const PRIORITY_COLORS = {
  urgent: '#f87171',
  high: '#f87171',
  medium: '#fbbf24',
  normal: '#fbbf24',
  low: '#34d399',
};

const PRIORITY_ORDER = { urgent: 0, high: 0, medium: 1, normal: 1, low: 2 };

export default function Inbox() {
  const { data, loading, reload } = useApi(() => api.inbox());
  const [selected, setSelected] = useState(null);
  const [actioning, setActioning] = useState(null);

  const items = (data?.items || data || [])
    .slice()
    .sort((a, b) => (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1));

  const dismiss = async (item) => {
    setActioning(item.id + ':dismiss');
    try {
      await api.inboxRead(item.id);
      await reload();
      setSelected(null);
    } catch {}
    setActioning(null);
  };

  const archive = async (item) => {
    setActioning(item.id + ':archive');
    try {
      await api.inboxDelete(item.id);
      await reload();
      setSelected(null);
    } catch {}
    setActioning(null);
  };

  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <span className="section-label">Notifications</span>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-1px' }}>
          <span className="gradient-text">Inbox</span>
        </h1>
        <p style={{ color: 'var(--muted)' }}>Agent notifications and items requiring attention</p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>Loading...</div>
      ) : items.length === 0 ? (
        <GlassCard>
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12 }}>📬</div>
            <div style={{ color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>Inbox is empty</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>No items requiring attention</div>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(item => {
            const pColor = PRIORITY_COLORS[item.priority] || PRIORITY_COLORS.normal;
            const isRead = item.read || item.status === 'read';
            return (
              <div
                key={item.id}
                onClick={() => setSelected(item)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  background: isRead ? 'rgba(11,15,30,0.3)' : 'rgba(11,15,30,0.6)',
                  border: `1px solid ${isRead ? 'rgba(255,255,255,0.04)' : 'var(--border)'}`,
                  borderRadius: 10, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
                  opacity: isRead ? 0.6 : 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = pColor + '44'; e.currentTarget.style.boxShadow = `0 0 20px ${pColor}11`; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isRead ? 'rgba(255,255,255,0.04)' : 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
              >
                {/* Priority dot */}
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: pColor, flexShrink: 0, marginTop: 4 }} className={isRead ? '' : 'pulse-dot'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
                    <div style={{ color: isRead ? 'var(--muted)' : 'var(--text)', fontWeight: isRead ? 400 : 600, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, marginRight: 12 }}>
                      {item.title || item.subject || 'Notification'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                      <Badge label={item.priority || 'normal'} color={pColor} />
                      <span style={{ color: 'var(--muted)', fontSize: '0.72rem' }}>{timeAgo(item.createdAt || item.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.82rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {item.body || item.content || item.message || 'No content'}
                  </div>
                  {item.source && <div style={{ color: 'var(--blue)', fontSize: '0.72rem', marginTop: 4 }}>from: {item.source}</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected?.title || selected?.subject || 'Notification'}
      >
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <Badge label={selected.priority || 'normal'} color={PRIORITY_COLORS[selected.priority] || PRIORITY_COLORS.normal} dot />
              {selected.source && <Badge label={selected.source} color="var(--blue)" />}
              {selected.type && <Badge label={selected.type} color="var(--muted)" />}
              <span style={{ color: 'var(--muted)', fontSize: '0.72rem', marginLeft: 'auto' }}>{timeAgo(selected.createdAt || selected.created_at)}</span>
            </div>

            <div style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: 320, overflowY: 'auto', marginBottom: 24 }}>
              {selected.body || selected.content || selected.message || 'No content'}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => dismiss(selected)}
                disabled={!!actioning}
                style={{
                  flex: 1, background: 'rgba(45,212,191,0.1)', border: '1px solid rgba(45,212,191,0.3)',
                  borderRadius: 8, padding: '8px 16px', color: 'var(--teal)', cursor: actioning ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '0.85rem',
                }}
              >
                {actioning === selected.id + ':dismiss' ? 'Dismissing...' : '✓ Dismiss'}
              </button>
              <button
                onClick={() => archive(selected)}
                disabled={!!actioning}
                style={{
                  flex: 1, background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)',
                  borderRadius: 8, padding: '8px 16px', color: 'var(--red)', cursor: actioning ? 'not-allowed' : 'pointer',
                  fontWeight: 600, fontSize: '0.85rem',
                }}
              >
                {actioning === selected.id + ':archive' ? 'Archiving...' : '🗑 Archive'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
