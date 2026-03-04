import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

const RISK_COLORS = {
  low: 'var(--green)',
  medium: 'var(--amber)',
  high: 'var(--red)',
  critical: 'var(--red)',
};

const AGENT_COLORS = {
  programmer: 'var(--blue)',
  writer: 'var(--purple)',
  researcher: 'var(--amber)',
  reviewer: 'var(--green)',
  architect: 'var(--teal)',
};

function InitiativeCard({ item, onDecide, onOpen }) {
  const [deciding, setDeciding] = useState(null);
  const agentColor = AGENT_COLORS[item.agentType] || 'var(--muted)';
  const riskColor = RISK_COLORS[item.riskTier] || 'var(--muted)';

  const decide = async (decision) => {
    setDeciding(decision);
    try { await onDecide([{ id: item.id, decision }]); }
    finally { setDeciding(null); }
  };

  return (
    <div className="inbox-item fade-in-up">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: agentColor + '15', border: `1px solid ${agentColor}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>⚡</div>
        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onOpen(item)}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '0.9rem', flex: 1, marginRight: 12, lineHeight: 1.3 }}>{item.title || 'Initiative'}</div>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
              {item.riskTier && <Badge label={item.riskTier} color={riskColor} />}
              {item.category && <Badge label={item.category} color={agentColor} />}
              <span style={{ color: 'var(--faint)', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>{timeAgo(item.createdAt)}</span>
            </div>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', marginBottom: 8 }}>{item.description || item.summary || 'No description'}</div>
          {item.agentType && <div style={{ fontSize: '0.7rem', color: agentColor, fontFamily: 'var(--mono)', fontWeight: 700 }}>PROPOSED BY {item.agentType.toUpperCase()}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn-success" style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }} disabled={!!deciding} onClick={(e) => { e.stopPropagation(); decide('approve'); }}>{deciding === 'approve' ? '...' : '✓ Approve'}</button>
        <button className="btn-danger" style={{ flex: 1, padding: '8px 12px', fontSize: '0.8rem' }} disabled={!!deciding} onClick={(e) => { e.stopPropagation(); decide('reject'); }}>{deciding === 'reject' ? '...' : '✗ Reject'}</button>
        <button className="btn-ghost" style={{ padding: '8px 14px', fontSize: '0.8rem' }} onClick={(e) => { e.stopPropagation(); onOpen(item); }}>Discuss</button>
      </div>
    </div>
  );
}

function NotificationCard({ item, onMarkRead, onArchive, onOpen, actioning }) {
  return (
    <div className={`inbox-item fade-in-up ${!item.isRead ? 'unread' : ''}`} onClick={() => onOpen(item)} style={{ cursor: 'pointer' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>📬</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
            <div style={{ color: item.isRead ? 'var(--muted)' : 'var(--text)', fontWeight: item.isRead ? 500 : 700, fontSize: '0.9rem', flex: 1, marginRight: 12, lineHeight: 1.3 }}>{item.title || 'Notification'}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              {!item.isRead && <Badge label="unread" color="var(--teal)" />}
              <span style={{ color: 'var(--faint)', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>{timeAgo(item.modifiedAt || item.modified_at)}</span>
            </div>
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.summary || item.content || 'No content'}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }} onClick={e => e.stopPropagation()}>
        {!item.isRead && (
          <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '6px 10px' }} disabled={!!actioning} onClick={() => onMarkRead(item)}>{actioning === item.id + ':read' ? '...' : '✓ Mark read'}</button>
        )}
        <button className="btn-ghost" style={{ fontSize: '0.78rem', padding: '6px 10px', marginLeft: 'auto' }} disabled={!!actioning} onClick={() => onArchive(item)}>{actioning === item.id + ':archive' ? '...' : '🗑 Archive'}</button>
      </div>
    </div>
  );
}

export default function Inbox() {
  const { data: inboxData, loading: inboxLoading, reload: reloadInbox } = useApi(() => api.inbox());
  const { data: initiativesData, loading: initLoading, reload: reloadInitiatives } = useApi(() => api.initiatives());
  const [tab, setTab] = useState('action');
  const [selected, setSelected] = useState(null);
  const [actioning, setActioning] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [threadMessages, setThreadMessages] = useState([]);

  const notifications = inboxData || [];
  const rawInitiatives = initiativesData?.initiatives || initiativesData || [];
  const initiatives = Array.isArray(rawInitiatives)
    ? rawInitiatives.filter(i => i.status === 'proposed' || i.status === 'pending')
    : [];
  const unreadCount = notifications.filter(i => !i.isRead).length;
  const actionCount = initiatives.length;

  useEffect(() => {
    if (!selected) { setThreadMessages([]); setReplyText(''); return; }
    (async () => {
      try {
        if (selected._type === 'initiative') {
          const d = await api.initiativeThread(selected.id);
          setThreadMessages(Array.isArray(d) ? d : (d?.messages || []));
        } else {
          const d = await fetch(`/api/inbox/${selected.id}/thread/messages`).then(r => r.json());
          setThreadMessages(d?.messages || []);
        }
      } catch { setThreadMessages([]); }
    })();
  }, [selected?.id, selected?._type]);

  const handleDecide = async (decisions) => {
    try { await api.initiativeDecide(decisions); await reloadInitiatives(); setSelected(null); } catch {}
  };

  const markRead = async (item) => {
    setActioning(item.id + ':read');
    try { await api.inboxRead(item.id); await reloadInbox(); } catch {}
    setActioning(null);
  };

  const archiveItem = async (item) => {
    setActioning(item.id + ':archive');
    try { await api.inboxDelete(item.id); await reloadInbox(); if (selected?.id === item.id) setSelected(null); } catch {}
    setActioning(null);
  };

  const sendReply = async () => {
    if (!replyText.trim() || !selected) return;
    try {
      if (selected._type === 'initiative') {
        await api.initiativeReply(selected.id, replyText);
        const d = await api.initiativeThread(selected.id);
        setThreadMessages(Array.isArray(d) ? d : (d?.messages || []));
      } else {
        await fetch(`/api/inbox/${selected.id}/response`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: replyText, author: 'user' }) });
        const d = await fetch(`/api/inbox/${selected.id}/thread/messages`).then(r => r.json());
        setThreadMessages(d?.messages || []);
      }
      setReplyText('');
    } catch {}
  };

  const openItem = (item, type) => setSelected({ ...item, _type: type });

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>DECISION CENTER</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Inbox</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>
            {actionCount > 0 ? `${actionCount} action${actionCount !== 1 ? 's' : ''} pending` : unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          <button className={`hud-tab ${tab === 'action' ? 'active' : ''}`} onClick={() => setTab('action')}>
            Action Required
            {actionCount > 0 && <span style={{ marginLeft: 6, background: 'var(--amber)', color: '#0b0f1e', borderRadius: 10, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 800 }}>{actionCount}</span>}
          </button>
          <button className={`hud-tab ${tab === 'notifications' ? 'active' : ''}`} onClick={() => setTab('notifications')}>
            Notifications
            {unreadCount > 0 && <span style={{ marginLeft: 6, background: 'var(--teal)', color: '#0b0f1e', borderRadius: 10, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 800 }}>{unreadCount}</span>}
          </button>
        </div>

        {tab === 'action' && (
          initLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <LoadingSkeleton key={i} height={120} />)}
            </div>
          ) : initiatives.length === 0 ? (
            <EmptyState icon="⚡" title="No pending actions" subtitle="All initiatives have been decided" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {initiatives.map(item => (
                <InitiativeCard key={item.id} item={item} onDecide={handleDecide} onOpen={(i) => openItem(i, 'initiative')} />
              ))}
            </div>
          )
        )}

        {tab === 'notifications' && (
          inboxLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(i => <LoadingSkeleton key={i} height={100} />)}
            </div>
          ) : notifications.length === 0 ? (
            <EmptyState icon="📬" title="Inbox is empty" subtitle="No notifications at this time" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {notifications.map(item => (
                <NotificationCard key={item.id} item={item} onMarkRead={markRead} onArchive={archiveItem} onOpen={(i) => openItem(i, 'notification')} actioning={actioning} />
              ))}
            </div>
          )
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || 'Item'}>
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
              {selected._type === 'initiative' ? <>
                {selected.agentType && <Badge label={selected.agentType} color={AGENT_COLORS[selected.agentType] || 'var(--muted)'} dot />}
                {selected.riskTier && <Badge label={`risk: ${selected.riskTier}`} color={RISK_COLORS[selected.riskTier] || 'var(--muted)'} />}
                {selected.category && <Badge label={selected.category} color="var(--blue)" />}
              </> : (
                <Badge label={selected.isRead ? 'read' : 'unread'} color={selected.isRead ? 'var(--muted)' : 'var(--teal)'} dot />
              )}
              <span style={{ color: 'var(--faint)', fontSize: '0.72rem', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>{timeAgo(selected.createdAt || selected.modifiedAt)}</span>
            </div>

            <div style={{ background: 'rgba(11,15,30,0.6)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20, maxHeight: 300, overflowY: 'auto' }}>
              <div style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selected.description || selected.content || selected.summary || 'No content'}</div>
            </div>

            {threadMessages.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 12 }}>DISCUSSION</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                  {threadMessages.map((msg, i) => (
                    <div key={msg.id || i} style={{ background: msg.author === 'user' ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ color: msg.author === 'user' ? 'var(--teal)' : 'var(--blue)', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>{msg.author}</span>
                        <span style={{ color: 'var(--faint)', fontSize: '0.68rem' }}>{timeAgo(msg.createdAt)}</span>
                      </div>
                      <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.5 }}>{msg.text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
              <input className="nx-input" value={replyText} onChange={e => setReplyText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') sendReply(); }} placeholder="Reply or discuss..." style={{ flex: 1 }} />
              <button className="btn-primary" onClick={sendReply} disabled={!replyText.trim()} style={{ padding: '10px 16px' }}>Reply</button>
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {selected._type === 'initiative' && <>
                <button className="btn-success" onClick={() => handleDecide([{ id: selected.id, decision: 'approve' }])} style={{ flex: 1 }}>✓ Approve</button>
                <button className="btn-danger" onClick={() => handleDecide([{ id: selected.id, decision: 'reject' }])} style={{ flex: 1 }}>✗ Reject</button>
              </>}
              {selected._type === 'notification' && <>
                {!selected.isRead && <button className="btn-ghost" onClick={() => markRead(selected)} style={{ flex: 1 }}>✓ Mark Read</button>}
                <button className="btn-ghost" onClick={() => archiveItem(selected)} style={{ flex: 1 }}>🗑 Archive</button>
              </>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
