import { useMemo, useState, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

const AGENTS = ['all', 'programmer', 'researcher', 'writer', 'architect', 'reviewer'];
const STATUSES = ['all', 'pending', 'completed', 'approved', 'rejected'];

const AGENT_COLORS = {
  programmer: 'var(--blue)',
  writer: 'var(--purple)',
  researcher: 'var(--amber)',
  reviewer: 'var(--green)',
  architect: 'var(--teal)',
};

const STATUS_COLORS = {
  approved: 'var(--green)',
  rejected: 'var(--red)',
  completed: 'var(--blue)',
  pending: 'var(--muted)',
};

function Section({ title, items, color }) {
  if (!items?.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '3px', color, fontFamily: 'var(--mono)', marginBottom: 8 }}>{title}</div>
      <div style={{ display: 'grid', gap: 8 }}>
        {items.map((item, i) => (
          <div key={i} style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${color}`, borderRadius: 8, padding: '10px 12px', color: 'var(--text)', fontSize: '0.84rem' }}>{item}</div>
        ))}
      </div>
    </div>
  );
}

function FeedbackModal({ reflection, onClose, onDone }) {
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await api.reflectionFeedback(reflection.id, text.trim());
      onDone();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add feedback">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>
          Add notes for reflection from <strong style={{ color: 'var(--text)' }}>{reflection.agentType}</strong>
        </div>
        <textarea
          data-autofocus="true"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Your feedback..."
          rows={5}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '10px 12px', fontSize: '0.88rem', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
          onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) submit(); }}
        />
        {error && <div style={{ color: 'var(--red)', fontSize: '0.82rem' }}>{error}</div>}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="hud-tab" onClick={onClose}>Cancel</button>
          <button
            className="hud-tab active"
            onClick={submit}
            disabled={saving || !text.trim()}
            style={{ opacity: saving || !text.trim() ? 0.5 : 1 }}
          >
            {saving ? 'Saving...' : 'Save feedback'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ReviewModal({ reflection, onClose, onDone }) {
  const [action, setAction] = useState(null);
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (!action) return;
    setSaving(true);
    setError(null);
    try {
      if (action === 'approve') {
        await api.approveReflection(reflection.id, { approvedBy: 'lobs', feedback: feedback || undefined });
      } else {
        await api.rejectReflection(reflection.id, { rejectedBy: 'lobs', feedback: feedback || undefined });
      }
      onDone();
    } catch (e) {
      setError(e.message);
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Review reflection">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ color: 'var(--muted)', fontSize: '0.84rem' }}>
          Reviewing reflection from <strong style={{ color: 'var(--text)' }}>{reflection.agentType}</strong>
          {reflection.summary && <div style={{ marginTop: 8, color: 'var(--text)', fontStyle: 'italic' }}>"{reflection.summary}"</div>}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setAction('approve')}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid',
              borderColor: action === 'approve' ? 'var(--green)' : 'var(--border)',
              background: action === 'approve' ? 'rgba(52,211,153,0.12)' : 'var(--surface)',
              color: action === 'approve' ? 'var(--green)' : 'var(--muted)',
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >Approve</button>
          <button
            onClick={() => setAction('reject')}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 8, border: '2px solid',
              borderColor: action === 'reject' ? 'var(--red)' : 'var(--border)',
              background: action === 'reject' ? 'rgba(220,38,38,0.12)' : 'var(--surface)',
              color: action === 'reject' ? 'var(--red)' : 'var(--muted)',
              fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
            }}
          >Reject</button>
        </div>

        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="Feedback (optional)..."
          rows={3}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', padding: '10px 12px', fontSize: '0.88rem', resize: 'vertical', fontFamily: 'inherit', outline: 'none' }}
        />

        {error && <div style={{ color: 'var(--red)', fontSize: '0.82rem' }}>{error}</div>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="hud-tab" onClick={onClose}>Cancel</button>
          <button
            className="hud-tab active"
            onClick={submit}
            disabled={saving || !action}
            style={{ opacity: saving || !action ? 0.5 : 1 }}
          >
            {saving ? 'Saving...' : action === 'approve' ? 'Approve' : action === 'reject' ? 'Reject' : 'Select action'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DetailModal({ reflection, onClose, onReview, onFeedback }) {
  const isReviewable = reflection.status === 'completed' || reflection.status === 'pending';

  return (
    <Modal open onClose={onClose} title="Reflection detail" large>
      <div style={{ overflowY: 'auto', maxHeight: 'calc(90vh - 120px)' }}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <Badge label={reflection.agentType} color={AGENT_COLORS[reflection.agentType] || 'var(--muted)'} dot />
          <Badge label={reflection.reflectionType || 'strategic'} color="var(--blue)" />
          <Badge label={reflection.status} color={STATUS_COLORS[reflection.status] || 'var(--muted)'} />
          {reflection.approvedBy && (
            <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>by {reflection.approvedBy}</span>
          )}
        </div>

        {reflection.summary && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'var(--surface)', borderRadius: 8, color: 'var(--text)', fontSize: '0.88rem', fontStyle: 'italic' }}>
            {reflection.summary}
          </div>
        )}

        <Section title="INEFFICIENCIES" items={reflection.inefficiencies} color="var(--amber)" />
        <Section title="SYSTEM RISKS" items={reflection.systemRisks} color="var(--red)" />
        <Section title="MISSED OPPORTUNITIES" items={reflection.missedOpportunities} color="var(--blue)" />
        <Section title="IDENTITY ADJUSTMENTS" items={reflection.identityAdjustments} color="var(--purple)" />

        {Array.isArray(reflection.result?.concreteSuggestions) && reflection.result.concreteSuggestions.length > 0 && (
          <Section title="CONCRETE SUGGESTIONS" items={reflection.result.concreteSuggestions} color="var(--green)" />
        )}

        {reflection.feedback && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '3px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8 }}>FEEDBACK</div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', color: 'var(--muted)', fontSize: '0.84rem', whiteSpace: 'pre-wrap' }}>{reflection.feedback}</div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          {isReviewable && (
            <button className="hud-tab active" onClick={onReview} style={{ fontWeight: 700 }}>
              Review
            </button>
          )}
          <button className="hud-tab" onClick={onFeedback}>Add feedback</button>
          <div style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)', alignSelf: 'center' }}>
            {timeAgo(reflection.createdAt)}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function Reflections() {
  const [agent, setAgent] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const params = useMemo(() => {
    const p = {};
    if (agent !== 'all') p.agent = agent;
    if (statusFilter !== 'all') p.status = statusFilter;
    return p;
  }, [agent, statusFilter]);

  const { data, loading } = useApi((signal) => api.reflections(params, signal), [refreshKey, params]);
  const reflections = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const handleDone = useCallback(() => {
    setShowReview(false);
    setShowFeedback(false);
    setSelected(null);
    setRefreshKey(k => k + 1);
  }, []);

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div className="orb orb-2" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 26 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8 }}>AGENT INTELLIGENCE</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900 }}><span className="gradient-text">Reflections</span></h1>
        </div>

        {/* Agent filter */}
        <div className="hud-tabs-row" style={{ marginBottom: 10 }}>
          {AGENTS.map(a => (
            <button key={a} className={`hud-tab ${agent === a ? 'active' : ''}`} onClick={() => setAgent(a)}>{a}</button>
          ))}
        </div>

        {/* Status filter */}
        <div className="hud-tabs-row" style={{ marginBottom: 22 }}>
          {STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              style={{
                padding: '4px 12px', borderRadius: 6, border: '1px solid',
                borderColor: statusFilter === s ? (STATUS_COLORS[s] || 'var(--teal)') : 'var(--border)',
                background: statusFilter === s ? 'var(--surface)' : 'transparent',
                color: statusFilter === s ? (STATUS_COLORS[s] || 'var(--teal)') : 'var(--muted)',
                fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >{s}</button>
          ))}
        </div>

        {loading ? (
          <div style={{ display: 'grid', gap: 10 }}>{[1, 2, 3].map(i => <LoadingSkeleton key={i} height={90} />)}</div>
        ) : reflections.length === 0 ? (
          <EmptyState icon="🔮" title="No reflections yet" subtitle="Reflections will appear once agents run their cycles." />
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {reflections.map((r) => (
              <GlassCard key={r.id} style={{ cursor: 'pointer' }} onClick={() => { setSelected(r); setShowReview(false); setShowFeedback(false); }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <Badge label={r.agentType} color={AGENT_COLORS[r.agentType] || 'var(--muted)'} dot />
                      <Badge label={r.reflectionType || 'strategic'} color="var(--blue)" />
                      <Badge label={r.status || 'unknown'} color={STATUS_COLORS[r.status] || 'var(--muted)'} />
                    </div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.84rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.summary || 'No summary'}
                    </div>
                    {r.feedback && (
                      <div style={{ marginTop: 6, fontSize: '0.75rem', color: 'var(--faint)', fontStyle: 'italic' }}>
                        Has feedback
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    <div style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{timeAgo(r.createdAt)}</div>
                    {(r.status === 'completed' || r.status === 'pending') && (
                      <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(r); setShowReview(true); setShowFeedback(false); }}
                          style={{
                            padding: '3px 10px', borderRadius: 6, border: '1px solid var(--green)',
                            background: 'rgba(52,211,153,0.08)', color: 'var(--green)',
                            fontSize: '0.74rem', fontWeight: 700, cursor: 'pointer',
                          }}
                        >Approve</button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelected(r); setShowReview(true); setShowFeedback(false); }}
                          style={{
                            padding: '3px 10px', borderRadius: 6, border: '1px solid var(--border)',
                            background: 'var(--surface)', color: 'var(--muted)',
                            fontSize: '0.74rem', fontWeight: 600, cursor: 'pointer',
                          }}
                        >Review</button>
                      </div>
                    )}
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      {selected && !showReview && !showFeedback && (
        <DetailModal
          reflection={selected}
          onClose={() => setSelected(null)}
          onReview={() => setShowReview(true)}
          onFeedback={() => setShowFeedback(true)}
        />
      )}

      {selected && showReview && (
        <ReviewModal
          reflection={selected}
          onClose={() => { setShowReview(false); setSelected(null); }}
          onDone={handleDone}
        />
      )}

      {selected && showFeedback && (
        <FeedbackModal
          reflection={selected}
          onClose={() => { setShowFeedback(false); setSelected(null); }}
          onDone={handleDone}
        />
      )}
    </div>
  );
}
