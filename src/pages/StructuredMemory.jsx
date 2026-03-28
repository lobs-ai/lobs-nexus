import { useState, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo } from '../lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const MEMORY_TYPE_COLORS = {
  fact:       '#4FC3F7',
  decision:   '#AB47BC',
  learning:   '#66BB6A',
  pattern:    '#FFA726',
  preference: '#EF5350',
};

const TABS = ['Memories', 'Conflicts', 'Events'];
const TYPE_FILTERS = ['all', 'fact', 'decision', 'learning', 'pattern', 'preference'];

// ─── Small helpers ─────────────────────────────────────────────────────────────

function FilterBtn({ label, active, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? color + '22' : 'transparent',
        border: `1px solid ${active ? color + '88' : 'var(--border)'}`,
        borderRadius: 6,
        padding: '4px 12px',
        color: active ? color : 'var(--muted)',
        cursor: 'pointer',
        fontSize: '0.78rem',
        fontWeight: active ? 700 : 400,
        textTransform: 'capitalize',
        transition: 'all 0.15s',
        fontFamily: 'var(--font)',
      }}
    >
      {label}
    </button>
  );
}

function TabBtn({ label, active, count, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none',
        border: 'none',
        borderBottom: `2px solid ${active ? 'var(--teal)' : 'transparent'}`,
        padding: '10px 20px',
        color: active ? 'var(--text)' : 'var(--muted)',
        cursor: 'pointer',
        fontSize: '0.88rem',
        fontWeight: active ? 700 : 400,
        transition: 'all 0.15s',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
      {count != null && (
        <span style={{
          background: active ? 'rgba(45,212,191,0.2)' : 'var(--surface)',
          border: `1px solid ${active ? 'rgba(45,212,191,0.4)' : 'var(--border)'}`,
          borderRadius: 10,
          padding: '1px 7px',
          fontSize: '0.7rem',
          fontWeight: 700,
          color: active ? 'var(--teal)' : 'var(--faint)',
          fontFamily: 'var(--mono)',
        }}>
          {count}
        </span>
      )}
    </button>
  );
}

function ConfidenceBar({ value, color }) {
  const pct = Math.round((value ?? 0) * 100);
  const barColor = color || (pct >= 80 ? 'var(--teal)' : pct >= 60 ? 'var(--amber)' : 'var(--red)');
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 120 }}>
      <div style={{
        flex: 1,
        height: 4,
        background: 'var(--border)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${pct}%`,
          height: '100%',
          background: barColor,
          borderRadius: 2,
          transition: 'width 0.3s ease',
        }} />
      </div>
      <span style={{ fontSize: '0.72rem', fontFamily: 'var(--mono)', color: barColor, fontWeight: 700, minWidth: 32 }}>
        {pct}%
      </span>
    </div>
  );
}

function StatCard({ label, value, sub, color, icon, delay }) {
  return (
    <div className={`hud-stat-card fade-in-up-${delay || 1}`} style={{ flex: '1 1 160px' }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, ${color}, transparent)`,
        opacity: 0.7, borderRadius: '14px 14px 0 0',
      }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{
          fontSize: '0.63rem', fontWeight: 800, letterSpacing: '3px',
          textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)',
        }}>
          {label}
        </div>
        {icon && <span style={{ fontSize: '1.1rem', opacity: 0.5 }}>{icon}</span>}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color, lineHeight: 1, fontFamily: 'var(--mono)' }}>
        {value ?? '—'}
      </div>
      {sub && (
        <div style={{ fontSize: '0.72rem', color: 'var(--faint)', marginTop: 6 }}>{sub}</div>
      )}
    </div>
  );
}

// ─── Memories Tab ──────────────────────────────────────────────────────────────

function MemoriesTab({ stats }) {
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  const params = useCallback(() => {
    const p = { limit: 100 };
    if (typeFilter !== 'all') p.type = typeFilter;
    return p;
  }, [typeFilter]);

  const { data, loading } = useApi(
    signal => api.structuredMemories(params(), signal),
    [typeFilter]
  );

  const memories = data?.memories || [];
  const filtered = search
    ? memories.filter(m => m.content.toLowerCase().includes(search.toLowerCase()))
    : memories;

  const byType = stats?.byType || {};

  return (
    <div>
      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {TYPE_FILTERS.map(t => (
            <FilterBtn
              key={t}
              label={t === 'all' ? `All (${data?.total ?? memories.length ?? 0})` : `${t} (${byType[t] ?? 0})`}
              active={typeFilter === t}
              onClick={() => setTypeFilter(t)}
              color={t === 'all' ? 'var(--text)' : (MEMORY_TYPE_COLORS[t] || 'var(--blue)')}
            />
          ))}
        </div>
        <input
          className="nx-input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search memories…"
          style={{ maxWidth: 260, marginLeft: 'auto' }}
        />
      </div>

      {/* Memory list */}
      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '48px 0' }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <GlassCard>
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }}>🧠</div>
            <div style={{ color: 'var(--muted)', fontWeight: 600 }}>No memories found</div>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((m, i) => {
            const typeColor = MEMORY_TYPE_COLORS[m.memory_type] || 'var(--blue)';
            return (
              <div key={m.id} className={`fade-in-up-${Math.min(i + 1, 6)}`}>
                <GlassCard style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10, flexWrap: 'wrap' }}>
                    {/* Type badge */}
                    <span style={{
                      background: typeColor + '22',
                      border: `1px solid ${typeColor}55`,
                      borderRadius: 5,
                      padding: '2px 9px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: typeColor,
                      textTransform: 'capitalize',
                      fontFamily: 'var(--mono)',
                      letterSpacing: '0.5px',
                      flexShrink: 0,
                    }}>
                      {m.memory_type}
                    </span>
                    {/* Scope badge */}
                    <span style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid var(--border)',
                      borderRadius: 5,
                      padding: '2px 9px',
                      fontSize: '0.7rem',
                      color: 'var(--faint)',
                      fontFamily: 'var(--mono)',
                      flexShrink: 0,
                    }}>
                      {m.scope}
                    </span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
                      {m.evidence_count > 0 && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
                          {m.evidence_count} evidence
                        </span>
                      )}
                      <span style={{ fontSize: '0.7rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
                        {timeAgo(m.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div style={{
                    color: 'var(--text)',
                    fontSize: '0.875rem',
                    lineHeight: 1.65,
                    marginBottom: 12,
                  }}>
                    {m.content}
                  </div>

                  {/* Confidence bar */}
                  <ConfidenceBar value={m.confidence} color={typeColor} />
                </GlassCard>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Conflicts Tab ─────────────────────────────────────────────────────────────

function ConflictsTab() {
  const { data, loading } = useApi(signal => api.structuredMemoryConflicts(signal));
  const conflicts = data?.conflicts || [];

  if (loading) {
    return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '48px 0' }}>Loading…</div>;
  }

  if (conflicts.length === 0) {
    return (
      <GlassCard>
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }}>✅</div>
          <div style={{ color: 'var(--muted)', fontWeight: 600 }}>No conflicts detected</div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {conflicts.map((c, i) => {
        const isOpen = c.status === 'open';
        const statusColor = isOpen ? 'var(--amber)' : 'var(--teal)';
        return (
          <div key={c.id} className={`fade-in-up-${Math.min(i + 1, 6)}`}>
            <GlassCard style={{ padding: '20px 24px' }}>
              {/* Header row */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                    {c.conflict_type}
                  </div>
                </div>
                <span style={{
                  background: statusColor + '22',
                  border: `1px solid ${statusColor}55`,
                  borderRadius: 5,
                  padding: '3px 10px',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: statusColor,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--mono)',
                  letterSpacing: '0.5px',
                  flexShrink: 0,
                }}>
                  {c.status}
                </span>
              </div>

              {/* Two memories side by side */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { id: c.memory_a_id, content: c.memory_a_content, confidence: c.memory_a_confidence, label: 'Memory A' },
                  { id: c.memory_b_id, content: c.memory_b_content, confidence: c.memory_b_confidence, label: 'Memory B' },
                ].map((side) => (
                  <div key={side.id} style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    padding: '14px 16px',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 800, letterSpacing: '2px',
                        color: 'var(--faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase',
                      }}>
                        {side.label}
                      </span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
                        #{side.id}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.83rem',
                      color: 'var(--text)',
                      lineHeight: 1.6,
                      marginBottom: 10,
                      display: '-webkit-box',
                      WebkitLineClamp: 4,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}>
                      {side.content}
                    </div>
                    <ConfidenceBar value={side.confidence} />
                  </div>
                ))}
              </div>

              {/* Detected at */}
              <div style={{ marginTop: 12, fontSize: '0.7rem', color: 'var(--faint)', fontFamily: 'var(--mono)', textAlign: 'right' }}>
                detected {timeAgo(c.detected_at)}
              </div>
            </GlassCard>
          </div>
        );
      })}
    </div>
  );
}

// ─── Events Tab ────────────────────────────────────────────────────────────────

const EVENT_TYPE_COLORS = {
  action:      'var(--blue)',
  observation: 'var(--teal)',
  decision:    '#AB47BC',
  error:       'var(--red)',
  tool_call:   '#FFA726',
  response:    '#66BB6A',
};

function signalColor(score) {
  if (score >= 0.8) return 'var(--teal)';
  if (score >= 0.5) return 'var(--blue)';
  return 'var(--faint)';
}

function EventsTab() {
  const { data, loading } = useApi(signal => api.structuredMemoryEvents({ limit: 100 }, signal));
  const events = data?.events || [];

  if (loading) {
    return <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '48px 0' }}>Loading…</div>;
  }

  if (events.length === 0) {
    return (
      <GlassCard>
        <div style={{ padding: '48px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 12, opacity: 0.3 }}>📭</div>
          <div style={{ color: 'var(--muted)', fontWeight: 600 }}>No events recorded</div>
        </div>
      </GlassCard>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {events.map((ev, i) => {
        const typeColor = EVENT_TYPE_COLORS[ev.event_type] || 'var(--muted)';
        const sigColor = signalColor(ev.signal_score ?? 0);
        const sigPct = Math.round((ev.signal_score ?? 0) * 100);
        const truncated = (ev.content || '').length > 120
          ? ev.content.slice(0, 120) + '…'
          : ev.content;

        return (
          <div key={ev.id} className={`fade-in-up-${Math.min(i + 1, 6)}`}>
            <GlassCard style={{ padding: '12px 18px' }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Event type badge */}
                <span style={{
                  background: typeColor + '22',
                  border: `1px solid ${typeColor}55`,
                  borderRadius: 4,
                  padding: '2px 8px',
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: typeColor,
                  textTransform: 'uppercase',
                  fontFamily: 'var(--mono)',
                  letterSpacing: '0.5px',
                  flexShrink: 0,
                }}>
                  {ev.event_type}
                </span>

                {/* Agent type */}
                <span style={{
                  fontSize: '0.72rem',
                  color: 'var(--faint)',
                  fontFamily: 'var(--mono)',
                  flexShrink: 0,
                }}>
                  {ev.agent_type}
                </span>

                {/* Content */}
                <span style={{
                  flex: 1,
                  fontSize: '0.83rem',
                  color: 'var(--text)',
                  lineHeight: 1.5,
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}>
                  {truncated}
                </span>

                {/* Signal score mini bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                  <div style={{ width: 40, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${sigPct}%`, height: '100%', background: sigColor, borderRadius: 2 }} />
                  </div>
                  <span style={{ fontSize: '0.65rem', color: sigColor, fontFamily: 'var(--mono)', minWidth: 24 }}>
                    {(ev.signal_score ?? 0).toFixed(1)}
                  </span>
                </div>

                {/* Timestamp */}
                <span style={{ fontSize: '0.7rem', color: 'var(--faint)', fontFamily: 'var(--mono)', flexShrink: 0 }}>
                  {timeAgo(ev.timestamp)}
                </span>
              </div>
            </GlassCard>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function StructuredMemory() {
  const [activeTab, setActiveTab] = useState('Memories');

  const { data: stats, loading: statsLoading } = useApi(
    signal => api.structuredMemoryStats(signal)
  );

  const totalMemories = stats?.totalMemories ?? 0;
  const avgConfPct = stats?.avgConfidence != null
    ? Math.round(stats.avgConfidence * 100) + '%'
    : '—';
  const unresolvedConflicts = stats?.unresolvedConflicts ?? 0;
  const totalEvents = stats?.totalEvents ?? 0;

  const tabCounts = {
    Memories:  totalMemories,
    Conflicts: unresolvedConflicts,
    Events:    totalEvents,
  };

  return (
    <div style={{ position: 'relative', padding: '36px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1 }}>
        {/* ── Header ── */}
        <div className="fade-in-up" style={{ marginBottom: 36 }}>
          <div style={{
            fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px',
            color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8,
          }}>
            COGNITIVE SUBSTRATE
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px', margin: 0 }}>
            <span className="gradient-text">Structured Memory</span>
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 6 }}>
            AI memory system — extracted facts, decisions, conflicts, and event history
          </p>
        </div>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 32 }}>
          <StatCard
            label="Total Memories"
            value={statsLoading ? '…' : totalMemories}
            sub={stats?.byStatus?.active != null ? `${stats.byStatus.active} active` : undefined}
            color="var(--teal)"
            icon="🧠"
            delay={1}
          />
          <StatCard
            label="Avg Confidence"
            value={statsLoading ? '…' : avgConfPct}
            sub="across all memories"
            color="var(--blue)"
            icon="📊"
            delay={2}
          />
          <StatCard
            label="Unresolved Conflicts"
            value={statsLoading ? '…' : unresolvedConflicts}
            sub={stats?.totalConflicts != null ? `${stats.totalConflicts} total detected` : undefined}
            color={unresolvedConflicts > 0 ? 'var(--amber)' : 'var(--teal)'}
            icon="⚠️"
            delay={3}
          />
          <StatCard
            label="Events Processed"
            value={statsLoading ? '…' : totalEvents.toLocaleString()}
            sub={stats?.recentEvents != null ? `${stats.recentEvents.toLocaleString()} recent` : undefined}
            color="var(--purple)"
            icon="📡"
            delay={4}
          />
        </div>

        {/* Memory type breakdown */}
        {stats?.byType && (
          <div className="fade-in-up-2" style={{ marginBottom: 28 }}>
            <GlassCard style={{ padding: '16px 20px' }}>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px',
                  color: 'var(--faint)', fontFamily: 'var(--mono)', textTransform: 'uppercase', flexShrink: 0,
                }}>
                  BY TYPE
                </span>
                {Object.entries(stats.byType).map(([type, count]) => {
                  const color = MEMORY_TYPE_COLORS[type] || 'var(--blue)';
                  return (
                    <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0,
                      }} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text)', textTransform: 'capitalize' }}>{type}</span>
                      <span style={{ fontSize: '0.78rem', color: color, fontFamily: 'var(--mono)', fontWeight: 700 }}>{count}</span>
                    </div>
                  );
                })}
                {stats.lastReflection && (
                  <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
                    last reflection {timeAgo(stats.lastReflection)}
                  </span>
                )}
              </div>
            </GlassCard>
          </div>
        )}

        {/* ── Tab bar ── */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          marginBottom: 24,
          overflowX: 'auto',
        }}>
          {TABS.map(tab => (
            <TabBtn
              key={tab}
              label={tab}
              active={activeTab === tab}
              count={tabCounts[tab]}
              onClick={() => setActiveTab(tab)}
            />
          ))}
        </div>

        {/* ── Tab content ── */}
        {activeTab === 'Memories'  && <MemoriesTab stats={stats} />}
        {activeTab === 'Conflicts' && <ConflictsTab />}
        {activeTab === 'Events'    && <EventsTab />}
      </div>
    </div>
  );
}
