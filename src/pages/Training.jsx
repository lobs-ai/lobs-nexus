import { useState, useEffect, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { api } from '../lib/api';

// ─── colour palette for task types ────────────────────────────────────────────
const TYPE_COLORS = {
  braindump:        'var(--teal)',
  calendar_check:   'var(--blue)',
  daily_brief:      'var(--amber)',
  reflection:       'var(--green)',
  task_planning:    '#a78bfa',
  research:         '#f472b6',
  default:          'var(--muted)',
};

function typeColor(t) { return TYPE_COLORS[t] || TYPE_COLORS.default; }
function typeLabel(t) { return t ? t.replace(/_/g, ' ') : 'unknown'; }

// ─── Star rating widget ───────────────────────────────────────────────────────
function StarRating({ value, onChange, disabled }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          disabled={disabled}
          onClick={() => onChange(n)}
          onMouseEnter={() => !disabled && setHover(n)}
          onMouseLeave={() => setHover(0)}
          style={{
            background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
            padding: '0 1px', fontSize: '1.1rem', lineHeight: 1,
            color: n <= (hover || value || 0) ? 'var(--amber)' : 'var(--faint)',
            transition: 'color 0.15s',
            opacity: disabled ? 0.5 : 1,
          }}
          title={disabled ? undefined : `Rate ${n}/5`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

// ─── Single example card ──────────────────────────────────────────────────────
function ExampleCard({ example, onRated }) {
  const [expanded, setExpanded] = useState(false);
  const [rating, setRating]     = useState(example.qualityRating || 0);
  const [correction, setCorrection] = useState(example.correction || '');
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [editing, setEditing]   = useState(false);

  const handleRate = useCallback(async (n) => {
    setRating(n);
    setSaving(true);
    setSaved(false);
    try {
      await api.rateTrainingExample(example.id, n, correction || undefined);
      setSaved(true);
      onRated && onRated(example.id, n);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to rate example:', err);
    } finally {
      setSaving(false);
    }
  }, [example.id, correction, onRated]);

  const handleSaveCorrection = useCallback(async () => {
    setSaving(true);
    setSaved(false);
    try {
      await api.rateTrainingExample(example.id, rating || undefined, correction);
      setSaved(true);
      setEditing(false);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save correction:', err);
    } finally {
      setSaving(false);
    }
  }, [example.id, rating, correction]);

  const ts = example.createdAt
    ? new Date(example.createdAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : null;

  const isReviewed = rating > 0;

  return (
    <GlassCard
      glow={expanded}
      onClick={!expanded ? () => setExpanded(true) : undefined}
      style={{ cursor: expanded ? 'default' : 'pointer', transition: 'all 0.2s' }}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: expanded ? 16 : 0 }}>
        <Badge label={typeLabel(example.taskType)} color={typeColor(example.taskType)} dot />
        {isReviewed && (
          <Badge label={`${rating}/5`} color="var(--amber)" />
        )}
        {!isReviewed && (
          <Badge label="needs review" color="var(--red)" />
        )}
        <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: expanded ? 'normal' : 'nowrap' }}>
          {example.input ? example.input.slice(0, expanded ? undefined : 120) + (example.input.length > 120 && !expanded ? '…' : '') : <span style={{ color: 'var(--faint)' }}>(no input)</span>}
        </div>
        {ts && <div style={{ fontSize: '0.7rem', color: 'var(--faint)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap', flexShrink: 0 }}>{ts}</div>}
        <button
          onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
          style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '2px 6px', fontSize: '0.8rem', flexShrink: 0 }}
        >
          {expanded ? '▲' : '▼'}
        </button>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="fade-in-up-1" onClick={e => e.stopPropagation()}>

          {/* Input */}
          <div style={{ marginBottom: 16 }}>
            <span className="section-label">Input</span>
            <div style={{
              background: 'rgba(8,12,24,0.6)', border: '1px solid var(--border)',
              borderRadius: 8, padding: '12px 14px',
              fontSize: '0.85rem', color: 'var(--text)',
              fontFamily: 'var(--mono)', lineHeight: 1.6,
              whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 200, overflowY: 'auto',
            }}>
              {example.input || '(empty)'}
            </div>
          </div>

          {/* Context (if present) */}
          {example.context && (
            <div style={{ marginBottom: 16 }}>
              <span className="section-label">Context</span>
              <div style={{
                background: 'rgba(8,12,24,0.6)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '12px 14px',
                fontSize: '0.82rem', color: 'var(--muted)',
                fontFamily: 'var(--mono)', lineHeight: 1.6,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxHeight: 120, overflowY: 'auto',
              }}>
                {example.context}
              </div>
            </div>
          )}

          {/* Output */}
          <div style={{ marginBottom: 20 }}>
            <span className="section-label">Model Output</span>
            <div style={{
              background: 'rgba(45,212,191,0.04)', border: '1px solid rgba(45,212,191,0.15)',
              borderRadius: 8, padding: '12px 14px',
              fontSize: '0.85rem', color: 'var(--text)',
              lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              maxHeight: 240, overflowY: 'auto',
            }}>
              {example.output || '(no output)'}
            </div>
          </div>

          {/* Correction */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span className="section-label" style={{ marginBottom: 0 }}>Correction</span>
              {!editing && (
                <button
                  className="btn-ghost"
                  style={{ padding: '3px 10px', fontSize: '0.72rem' }}
                  onClick={() => setEditing(true)}
                >
                  {correction ? 'Edit' : '+ Add'}
                </button>
              )}
            </div>
            {editing ? (
              <div>
                <textarea
                  className="nx-input"
                  value={correction}
                  onChange={e => setCorrection(e.target.value)}
                  placeholder="Provide a corrected version of the output…"
                  style={{ minHeight: 100, marginBottom: 8 }}
                />
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={handleSaveCorrection} disabled={saving}>
                    {saving ? 'Saving…' : 'Save correction'}
                  </button>
                  <button className="btn-ghost" style={{ padding: '6px 14px', fontSize: '0.8rem' }} onClick={() => { setEditing(false); setCorrection(example.correction || ''); }}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : correction ? (
              <div style={{
                background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)',
                borderRadius: 8, padding: '12px 14px',
                fontSize: '0.85rem', color: 'var(--green)',
                lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {correction}
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: 'var(--faint)' }}>No correction provided</div>
            )}
          </div>

          {/* Rating row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Quality rating:</span>
            <StarRating value={rating} onChange={handleRate} disabled={saving} />
            {saving && <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>Saving…</span>}
            {saved && <span style={{ fontSize: '0.75rem', color: 'var(--green)' }}>✓ Saved</span>}
            <div style={{ flex: 1 }} />
            <button
              className="btn-ghost"
              style={{ padding: '4px 12px', fontSize: '0.75rem' }}
              onClick={() => setExpanded(false)}
            >
              Collapse
            </button>
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────
function StatsBar({ stats }) {
  const pct = stats.total > 0 ? Math.round((stats.reviewed / stats.total) * 100) : 0;
  const types = Object.entries(stats.byType || {}).sort((a, b) => b[1] - a[1]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
      {/* Total */}
      <GlassCard glow>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 10, fontFamily: 'var(--mono)' }}>
          Total Examples
        </div>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--teal)', lineHeight: 1 }}>{stats.total.toLocaleString()}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>training examples collected</div>
      </GlassCard>

      {/* Reviewed */}
      <GlassCard>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 10, fontFamily: 'var(--mono)' }}>
          Review Progress
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--green)' }}>{stats.reviewed}</span>
          <span style={{ fontSize: '1rem', color: 'var(--faint)' }}>/ {stats.total}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--amber)', marginLeft: 4 }}>{pct}%</span>
        </div>
        <div className="bar-track">
          <div className="bar-fill" style={{ width: pct + '%', background: 'linear-gradient(90deg, var(--green), var(--teal))' }} />
        </div>
      </GlassCard>

      {/* Pending */}
      <GlassCard>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 10, fontFamily: 'var(--mono)' }}>
          Pending Review
        </div>
        <div style={{ fontSize: '2.4rem', fontWeight: 800, color: stats.pendingReview > 0 ? 'var(--amber)' : 'var(--green)', lineHeight: 1 }}>{stats.pendingReview}</div>
        <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 6 }}>
          {stats.pendingReview === 0 ? 'All reviewed ✓' : 'awaiting quality rating'}
        </div>
      </GlassCard>

      {/* Type breakdown */}
      <GlassCard>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 12, fontFamily: 'var(--mono)' }}>
          By Type
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {types.length === 0 && <div style={{ fontSize: '0.8rem', color: 'var(--faint)' }}>No data yet</div>}
          {types.map(([type, count]) => (
            <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: typeColor(type), flexShrink: 0, display: 'inline-block' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--muted)', flex: 1, textTransform: 'capitalize' }}>{typeLabel(type)}</span>
              <span style={{ fontSize: '0.78rem', color: 'var(--text)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{count}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Training() {
  const [stats, setStats]       = useState({ total: 0, byType: {}, reviewed: 0, pendingReview: 0 });
  const [examples, setExamples] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState('');   // empty = all
  const [statsLoading, setStatsLoading] = useState(true);

  // Available task types derived from stats
  const taskTypes = Object.keys(stats.byType || {}).sort();

  // Load stats once on mount
  useEffect(() => {
    api.trainingStats().then(s => {
      setStats(s);
      setStatsLoading(false);
    });
  }, []);

  // Load examples whenever filter changes
  useEffect(() => {
    setLoading(true);
    api.trainingExamples(filter || undefined).then(data => {
      setExamples(data.examples || []);
      setLoading(false);
    });
  }, [filter]);

  // When a rating changes, bump stats locally
  const handleRated = useCallback((id, rating) => {
    setExamples(prev =>
      prev.map(e => e.id === id ? { ...e, qualityRating: rating } : e)
    );
    // Refresh stats quietly
    api.trainingStats().then(s => setStats(s));
  }, []);

  const handleExport = useCallback((taskType) => {
    const url = api.exportTrainingUrl(taskType);
    const a = document.createElement('a');
    a.href = url;
    a.download = `training-${taskType || 'all'}.jsonl`;
    a.click();
  }, []);

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              Training Data
            </h1>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', margin: 0 }}>
              Review and rate model outputs to build a quality fine-tuning dataset
            </p>
          </div>
          <button
            className="btn-primary"
            onClick={() => handleExport(filter || 'all')}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export {filter ? typeLabel(filter) : 'All'} JSONL
          </button>
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[1, 2, 3, 4].map(i => <div key={i} className="shimmer" style={{ height: 100, borderRadius: 12 }} />)}
        </div>
      ) : (
        <StatsBar stats={stats} />
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', fontWeight: 600 }}>Filter by type:</span>
        <button
          className={filter === '' ? 'btn-primary' : 'btn-ghost'}
          style={{ padding: '5px 14px', fontSize: '0.78rem' }}
          onClick={() => setFilter('')}
        >
          All
        </button>
        {taskTypes.map(type => (
          <div key={type} style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button
              className={filter === type ? 'btn-primary' : 'btn-ghost'}
              style={{ padding: '5px 14px', fontSize: '0.78rem' }}
              onClick={() => setFilter(type)}
            >
              {typeLabel(type)}
            </button>
            <button
              onClick={() => handleExport(type)}
              title={`Export ${typeLabel(type)} as JSONL`}
              style={{
                background: 'none', border: '1px solid var(--border)', borderRadius: 6,
                color: 'var(--faint)', cursor: 'pointer', padding: '4px 7px', fontSize: '0.7rem',
                transition: 'all 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--teal)'; e.currentTarget.style.borderColor = 'var(--teal)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--faint)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              ↓
            </button>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: '0.75rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
          {loading ? '…' : examples.length} examples
        </span>
      </div>

      {/* Examples list */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="shimmer" style={{ height: 64, borderRadius: 12 }} />
          ))}
        </div>
      ) : examples.length === 0 ? (
        <EmptyState
          icon="🧠"
          title="No training examples yet"
          description={filter
            ? `No examples found for task type "${typeLabel(filter)}". Try changing the filter.`
            : 'Training examples will appear here as the system collects them during normal operation.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {examples.map(ex => (
            <ExampleCard
              key={ex.id}
              example={ex}
              onRated={handleRated}
            />
          ))}
        </div>
      )}
    </div>
  );
}
