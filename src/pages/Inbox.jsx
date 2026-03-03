import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

const FILTER_TABS = [
  { id: 'all', label: 'All' },
  { id: 'unread', label: 'Action Required' },
  { id: 'suggestions', label: 'Suggestions' },
  { id: 'reports', label: 'Reports' },
];

function getItemType(item) {
  const t = (item.title || '').toLowerCase();
  if (t.includes('suggestion') || t.includes('propose') || t.includes('recommend')) return 'suggestion';
  if (t.includes('report') || t.includes('reflection')) return 'report';
  if (t.includes('approv') || t.includes('review')) return 'approval';
  return 'notification';
}

const TYPE_META = {
  suggestion: { color: 'var(--blue)', icon: '💡', label: 'Suggestion' },
  approval: { color: 'var(--amber)', icon: '⚡', label: 'Approval' },
  report: { color: 'var(--purple)', icon: '📊', label: 'Report' },
  notification: { color: 'var(--teal)', icon: '📬', label: 'Notice' },
};

export default function Inbox() {
  const { data, loading, reload } = useApi(() => api.inbox());
  const [selected, setSelected] = useState(null);
  const [actioning, setActioning] = useState(null);
  const [filter, setFilter] = useState('all');
  const [replyText, setReplyText] = useState('');
  const [threadMessages, setThreadMessages] = useState([]);

  const allItems = data || [];
  const items = allItems.filter(item => {
    if (filter === 'unread') return !item.isRead;
    if (filter === 'suggestions') return getItemType(item) === 'suggestion';
    if (filter === 'reports') return getItemType(item) === 'report';
    return true;
  });
  const unreadCount = allItems.filter(i => !i.isRead).length;

  useEffect(() => {
    if (!selected) { setThreadMessages([]); setReplyText(''); return; }
    fetch(`/api/inbox/${selected.id}/thread/messages`)
      .then(r => r.json()).then(d => setThreadMessages(d?.messages || []))
      .catch(() => setThreadMessages([]));
  }, [selected?.id]);

  const dismiss = async (item) => {
    setActioning(item.id + ':dismiss');
    try { await api.inboxRead(item.id); await reload(); if (selected?.id === item.id) setSelected(null); } catch {}
    setActioning(null);
  };
  const archive = async (item) => {
    setActioning(item.id + ':archive');
    try { await api.inboxDelete(item.id); await reload(); if (selected?.id === item.id) setSelected(null); } catch {}
    setActioning(null);
  };
  const sendReply = async () => {
    if (!replyText.trim() || !selected) return;
    try {
      await fetch(`/api/inbox/${selected.id}/response`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: replyText, author: 'user' }) });
      setReplyText('');
      const d = await fetch(`/api/inbox/${selected.id}/thread/messages`).then(r => r.json());
      setThreadMessages(d?.messages || []);
    } catch {}
  };

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>DECISION CENTER</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Inbox</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>{unreadCount > 0 ? `${unreadCount} item${unreadCount > 1 ? 's' : ''} requiring attention` : 'All caught up'}</p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {FILTER_TABS.map(tab => (
            <button key={tab.id} className={`hud-tab ${filter === tab.id ? 'active' : ''}`} onClick={() => setFilter(tab.id)}>
              {tab.label}
              {tab.id === 'unread' && unreadCount > 0 && <span style={{ marginLeft: 6, background: 'var(--teal)', color: 'var(--navy)', borderRadius: 10, padding: '1px 6px', fontSize: '0.65rem', fontWeight: 800 }}>{unreadCount}</span>}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '60px 0' }}>Loading...</div>
        ) : items.length === 0 ? (
          <GlassCard><div style={{ padding: '60px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16, opacity: 0.4 }}>📬</div>
            <div style={{ color: 'var(--text)', fontWeight: 700, fontSize: '1.1rem', marginBottom: 6 }}>{filter === 'all' ? 'Inbox is empty' : `No ${filter} items`}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{filter === 'all' ? 'No items requiring attention' : 'Try switching filters'}</div>
          </div></GlassCard>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map((item, i) => {
              const type = getItemType(item); const meta = TYPE_META[type];
              return (
                <div key={item.id} className={`inbox-item fade-in-up-${Math.min(i+1, 6)} ${!item.isRead ? 'unread' : ''}`} onClick={() => setSelected(item)}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: meta.color + '15', border: `1px solid ${meta.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', flexShrink: 0 }}>{meta.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                        <div style={{ color: item.isRead ? 'var(--muted)' : 'var(--text)', fontWeight: item.isRead ? 500 : 700, fontSize: '0.9rem', flex: 1, marginRight: 12, lineHeight: 1.3 }}>{item.title || 'Notification'}</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                          <Badge label={meta.label} color={meta.color} />
                          <span style={{ color: 'var(--faint)', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>{timeAgo(item.modifiedAt || item.modified_at)}</span>
                        </div>
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{item.summary || item.content || 'No content'}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected?.title || 'Item'}>
        {selected && (() => {
          const type = getItemType(selected); const meta = TYPE_META[type];
          return (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                <Badge label={meta.label} color={meta.color} dot />
                <Badge label={selected.isRead ? 'read' : 'unread'} color={selected.isRead ? 'var(--muted)' : 'var(--teal)'} />
                <span style={{ color: 'var(--faint)', fontSize: '0.72rem', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>{timeAgo(selected.modifiedAt)}</span>
              </div>
              <div style={{ background: 'rgba(11,15,30,0.6)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 20, maxHeight: 300, overflowY: 'auto' }}>
                <div style={{ color: 'var(--text)', fontSize: '0.88rem', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{selected.content || selected.summary || 'No content'}</div>
              </div>
              {threadMessages.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 12 }}>DISCUSSION</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
                    {threadMessages.map(msg => (
                      <div key={msg.id} style={{ background: msg.author === 'user' ? 'rgba(45,212,191,0.08)' : 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px' }}>
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
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {(type === 'suggestion' || type === 'approval') && <>
                  <button className="btn-success" onClick={() => dismiss(selected)} disabled={!!actioning} style={{ flex: 1 }}>{actioning === selected.id + ':dismiss' ? '...' : '✓ Approve'}</button>
                  <button className="btn-danger" onClick={() => archive(selected)} disabled={!!actioning} style={{ flex: 1 }}>{actioning === selected.id + ':archive' ? '...' : '✗ Reject'}</button>
                </>}
                {type === 'report' && <>
                  <button className="btn-success" onClick={() => dismiss(selected)} disabled={!!actioning} style={{ flex: 1 }}>{actioning === selected.id + ':dismiss' ? '...' : '✓ Acknowledge'}</button>
                  <button className="btn-ghost" onClick={() => archive(selected)} disabled={!!actioning} style={{ flex: 1 }}>{actioning === selected.id + ':archive' ? '...' : '🗑 Archive'}</button>
                </>}
                {type === 'notification' && <>
                  <button className="btn-ghost" onClick={() => dismiss(selected)} disabled={!!actioning} style={{ flex: 1 }}>{actioning === selected.id + ':dismiss' ? '...' : '✓ Dismiss'}</button>
                  <button className="btn-danger" onClick={() => archive(selected)} disabled={!!actioning} style={{ flex: 1 }}>{actioning === selected.id + ':archive' ? '...' : '🗑 Archive'}</button>
                </>}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
