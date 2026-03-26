import { useState, useCallback } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';

// ── Score display ────────────────────────────────────────────────────

function ScoreBar({ label, score, color }) {
  const pct = Math.round((score ?? 0) * 100);
  const barColor = color || (pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--muted)');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {label && <span style={{ fontSize: '0.65rem', color: 'var(--faint)', minWidth: 56 }}>{label}</span>}
      <div style={{ width: 48, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: barColor, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: '0.7rem', color: barColor, fontWeight: 600, fontFamily: 'var(--mono)' }}>{pct}%</span>
    </div>
  );
}

// ── Composite badge ──────────────────────────────────────────────────

function CompositeScore({ score }) {
  const pct = Math.round((score ?? 0) * 100);
  const color = pct >= 75 ? '#34d399' : pct >= 50 ? '#fbbf24' : pct >= 25 ? '#f97316' : '#94a3b8';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
      width: 52, height: 52, borderRadius: 12, border: `2px solid ${color}`,
      background: `${color}11`,
    }}>
      <span style={{ fontSize: '1.1rem', fontWeight: 800, color, lineHeight: 1 }}>{pct}</span>
      <span style={{ fontSize: '0.5rem', color: 'var(--faint)', fontWeight: 600 }}>SCORE</span>
    </div>
  );
}

// ── Track config ─────────────────────────────────────────────────────

const TRACKS = {
  paper:   { icon: '📄', label: 'Paper',       color: '#818cf8', borderColor: '#818cf822' },
  lobs:    { icon: '🔧', label: 'Lobs',        color: '#34d399', borderColor: '#34d39922' },
  product: { icon: '💰', label: 'Product',      color: '#fbbf24', borderColor: '#fbbf2422' },
};

// ── Status colors ────────────────────────────────────────────────────

const STATUS_COLORS = {
  idea: '#94a3b8',
  developing: '#60a5fa',
  ready: '#a78bfa',
  in_progress: '#fbbf24',
  done: '#34d399',
  archived: '#6b7280',
};

const STATUS_LABELS = {
  idea: '🌱 Idea',
  developing: '🔬 Developing',
  ready: '💎 Ready',
  in_progress: '⚡ In Progress',
  done: '✅ Done',
  archived: '📦 Archived',
};

// ── Section labels per track ─────────────────────────────────────────

const SECTION_LABELS = {
  paper: {
    gap: 'Research Gap',
    angle: 'Our Unique Angle',
    methodology: 'Methodology',
    experiments: 'Key Experiments',
  },
  lobs: {
    gap: 'Capability Gap',
    angle: 'Why Build This',
    methodology: 'Implementation Plan',
    experiments: 'Key Milestones',
  },
  product: {
    gap: 'Market Gap',
    angle: 'Our Edge',
    methodology: 'Go-to-Market Plan',
    experiments: 'Validation Steps',
  },
};

// ── Time helpers ─────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Stat card ────────────────────────────────────────────────────────

function Stat({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '14px 18px', minWidth: 110, flex: '1 1 110px',
    }}>
      <div style={{ color: 'var(--muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color || 'var(--text)', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ color: 'var(--faint)', fontSize: '0.7rem', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Idea card ────────────────────────────────────────────────────────

function IdeaCard({ idea, expanded, onToggle }) {
  const track = TRACKS[idea.track] || TRACKS.paper;
  const labels = SECTION_LABELS[idea.track] || SECTION_LABELS.paper;

  return (
    <div
      style={{
        background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 12,
        borderLeft: `3px solid ${track.color}`,
        padding: '16px 20px', cursor: 'pointer', transition: 'border-color 0.15s',
      }}
      onClick={onToggle}
    >
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <CompositeScore score={(idea.noveltyScore + idea.feasibilityScore + idea.impactScore) / 3} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Badge label={`${track.icon} ${track.label}`} color={track.color} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>{idea.title}</span>
            <Badge label={STATUS_LABELS[idea.status] || idea.status} color={STATUS_COLORS[idea.status] || '#94a3b8'} />
            {idea.researchArea && <Badge label={idea.researchArea} color="#6b7280" />}
          </div>
          <div style={{ color: 'var(--muted)', fontSize: '0.78rem', marginTop: 4, lineHeight: 1.4 }}>
            {idea.thesis}
          </div>
        </div>
        <span style={{ color: 'var(--faint)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
          {timeAgo(idea.createdAt)}
        </span>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {/* Score breakdown */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 12 }}>
            <ScoreBar label="Novelty" score={idea.noveltyScore} color="#818cf8" />
            <ScoreBar label="Feasibility" score={idea.feasibilityScore} color="#34d399" />
            <ScoreBar label="Impact" score={idea.impactScore} color="#f59e0b" />
          </div>

          {/* Gap */}
          {idea.gapAnalysis && (
            <DetailSection label={labels.gap} text={idea.gapAnalysis} />
          )}

          {/* Our angle */}
          {idea.ourAngle && (
            <DetailSection label={labels.angle} text={idea.ourAngle} />
          )}

          {/* Methodology / implementation plan / GTM */}
          {idea.methodology && (
            <DetailSection label={labels.methodology} text={idea.methodology} />
          )}

          {/* Experiments / milestones / validation */}
          {idea.keyExperiments && (
            <DetailSection label={labels.experiments} text={idea.keyExperiments} />
          )}

          {/* Related work */}
          {idea.relatedWork?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>Related Work</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.5, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>
                {idea.relatedWork.map((w, i) => (
                  <div key={i} style={{ marginBottom: 4 }}>
                    • {w.url ? <a href={w.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)' }}>{w.title || w.url}</a> : w.title}
                    {w.relevance && <span style={{ color: 'var(--faint)', marginLeft: 6, fontSize: '0.72rem' }}>— {w.relevance}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evolution timeline */}
          {idea.evolutionLog?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>Evolution</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {idea.evolutionLog.map((ev, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--faint)', whiteSpace: 'nowrap', fontFamily: 'var(--mono)', minWidth: 60 }}>{timeAgo(ev.date)}</span>
                    <Badge label={ev.event} color={STATUS_COLORS[ev.event] || '#60a5fa'} />
                    {ev.detail && <span style={{ color: 'var(--muted)' }}>{ev.detail}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {idea.tags?.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {idea.tags.map(t => <Badge key={t} label={t} color="#6b7280" />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailSection({ label, text }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.5, padding: '8px 12px', background: 'var(--bg)', borderRadius: 8 }}>{text}</div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function ResearchRadar() {
  const [expandedId, setExpandedId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [trackFilter, setTrackFilter] = useState('all');
  const [sortBy, setSortBy] = useState('composite');

  const fetchIdeas = useCallback(async (signal) => {
    const params = new URLSearchParams();
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (trackFilter !== 'all') params.set('track', trackFilter);
    params.set('sort', sortBy);
    params.set('limit', '100');
    const q = params.toString();
    return api.researchRadarList(q, signal);
  }, [statusFilter, trackFilter, sortBy]);

  const fetchStats = useCallback(async (signal) => {
    return api.researchRadarStats(signal);
  }, []);

  const { data: ideasData } = usePolling(fetchIdeas, 15000);
  const { data: statsData } = usePolling(fetchStats, 30000);
  const ideas = ideasData ?? [];
  const stats = statsData ?? {};

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🎯</span> Research Radar
        </h1>
        <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: '6px 0 0' }}>
          Papers to write, things to build, products to ship — auto-identified from intel analysis
        </p>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
        <Stat label="Total Ideas" value={stats.total ?? ideas.length} />
        <Stat label="📄 Papers" value={stats.byTrack?.paper ?? 0} color="#818cf8" />
        <Stat label="🔧 Lobs" value={stats.byTrack?.lobs ?? 0} color="#34d399" />
        <Stat label="💰 Products" value={stats.byTrack?.product ?? 0} color="#fbbf24" />
        <Stat
          label="Avg Score"
          value={stats.avgNovelty != null ? Math.round(((stats.avgNovelty + (stats.avgFeasibility ?? 0) + (stats.avgImpact ?? 0)) / 3) * 100) : '—'}
          sub="composite"
          color="#818cf8"
        />
      </div>

      {/* Filters */}
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          {/* Track filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>Track:</span>
            {[
              { key: 'all', label: 'All' },
              { key: 'paper', label: '📄 Papers' },
              { key: 'lobs', label: '🔧 Lobs' },
              { key: 'product', label: '💰 Products' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => setTrackFilter(t.key)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: '0.72rem', fontWeight: 600,
                  background: trackFilter === t.key ? 'var(--text)' : 'var(--surface)',
                  color: trackFilter === t.key ? 'var(--bg)' : 'var(--muted)',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Status filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>Status:</span>
            {['all', 'idea', 'developing', 'ready', 'in_progress', 'done', 'archived'].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: '0.72rem', fontWeight: 600,
                  background: statusFilter === s ? 'var(--text)' : 'var(--surface)',
                  color: statusFilter === s ? 'var(--bg)' : 'var(--muted)',
                }}
              >
                {s === 'all' ? 'All' : STATUS_LABELS[s] || s}
              </button>
            ))}
          </div>

          {/* Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600 }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)',
                background: 'var(--surface)', color: 'var(--text)', fontSize: '0.75rem',
                cursor: 'pointer',
              }}
            >
              <option value="composite">Composite Score</option>
              <option value="novelty">Novelty</option>
              <option value="feasibility">Feasibility</option>
              <option value="impact">Impact</option>
              <option value="created">Newest</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* Ideas list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16 }}>
        {ideas.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: '0.85rem',
          }}>
            No ideas yet. The radar worker analyzes intel insights daily and identifies papers to write, improvements to build, and products to ship.
          </div>
        ) : (
          ideas.map(idea => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              expanded={expandedId === idea.id}
              onToggle={() => setExpandedId(expandedId === idea.id ? null : idea.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
