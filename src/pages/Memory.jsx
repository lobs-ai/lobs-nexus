import { useState, useEffect, useRef, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import Modal from '../components/Modal';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { timeAgo, AGENT_COLORS } from '../lib/utils';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function FilterBtn({ label, active, onClick, color }) {
  return (
    <button onClick={onClick} style={{
      background: active ? color + '1a' : 'transparent',
      border: `1px solid ${active ? color + '66' : 'var(--border)'}`,
      borderRadius: 6, padding: '4px 12px', color: active ? color : 'var(--muted)',
      cursor: 'pointer', fontSize: '0.78rem', fontWeight: active ? 600 : 400,
      textTransform: 'capitalize', transition: 'all 0.15s', fontFamily: 'var(--font)',
    }}>{label}</button>
  );
}

// ---------------------------------------------------------------------------
// Memory type / status config
// ---------------------------------------------------------------------------

const TYPE_COLORS = {
  fact:       'var(--teal)',
  decision:   'var(--blue)',
  learning:   'var(--purple)',
  pattern:    '#f59e0b',
  preference: '#ec4899',
};

const STATUS_COLORS = {
  active:     '#4ade80',
  stale:      '#f59e0b',
  archived:   'var(--muted)',
  contested:  '#ef4444',
  superseded: 'var(--muted)',
};

function typeColor(t) { return TYPE_COLORS[t] ?? 'var(--muted)'; }
function statusColor(s) { return STATUS_COLORS[s] ?? 'var(--muted)'; }

// ---------------------------------------------------------------------------
// StatCard (same pattern as existing hud-stat-card)
// ---------------------------------------------------------------------------

function StatCard({ label, value, color, sub, idx = 0 }) {
  return (
    <div className={`hud-stat-card fade-in-up-${Math.min(idx + 1, 6)}`}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${color}, transparent)`, opacity: 0.6, borderRadius: '14px 14px 0 0' }} />
      <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 10 }}>{label}</div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color, lineHeight: 1, fontFamily: 'var(--mono)' }}>{value ?? '—'}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 6, fontFamily: 'var(--mono)' }}>{sub}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confidence bar
// ---------------------------------------------------------------------------

function ConfBar({ value, color = 'var(--teal)' }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '0.72rem', color, fontFamily: 'var(--mono)', minWidth: 32 }}>{pct}%</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// TypeDistribution
// ---------------------------------------------------------------------------

function TypeDistribution({ byType }) {
  const entries = Object.entries(byType ?? {}).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((s, [, v]) => s + v, 0) || 1;
  if (entries.length === 0) return null;
  return (
    <GlassCard style={{ marginBottom: 24 }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '3px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 16, textTransform: 'uppercase' }}>Memory Type Distribution</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(([type, count]) => {
          const color = typeColor(type);
          return (
            <div key={type} style={{ display: 'grid', gridTemplateColumns: '90px 1fr 40px', alignItems: 'center', gap: 12 }}>
              <span style={{
                background: color + '22', color, border: `1px solid ${color}44`,
                padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                textAlign: 'center', textTransform: 'capitalize',
              }}>{type}</span>
              <div style={{ height: 8, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${(count / total) * 100}%`, background: color, borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
              <span style={{ color: 'var(--muted)', fontSize: '0.75rem', fontFamily: 'var(--mono)', textAlign: 'right' }}>{count}</span>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// MemoryDetail modal content
// ---------------------------------------------------------------------------

function MemoryDetail({ mem }) {
  if (!mem) return null;
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <Badge label={mem.memory_type} color={typeColor(mem.memory_type)} />
        <Badge label={mem.status} color={statusColor(mem.status)} />
        {mem.scope && <Badge label={mem.scope} color="var(--muted)" />}
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>#{mem.id}</span>
      </div>

      <div style={{ background: 'rgba(8,12,24,0.9)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
        <p style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{mem.content}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '3px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 6, textTransform: 'uppercase' }}>Confidence</div>
          <ConfBar value={mem.confidence} color={typeColor(mem.memory_type)} />
        </div>
        <div>
          <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '3px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 6, textTransform: 'uppercase' }}>Evidence / Access</div>
          <span style={{ color: 'var(--text)', fontSize: '0.85rem', fontFamily: 'var(--mono)' }}>{mem.evidence_count ?? 0} evidence · {mem.access_count ?? 0} accesses</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {[
          { label: 'Derived', value: mem.derived_at ? timeAgo(mem.derived_at) : '—' },
          { label: 'Last Accessed', value: mem.last_accessed ? timeAgo(mem.last_accessed) : '—' },
          { label: 'Created', value: mem.created_at ? timeAgo(mem.created_at) : '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 8, padding: '10px 14px', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 4, textTransform: 'uppercase' }}>{label}</div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text)', fontFamily: 'var(--mono)' }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SearchPane — relevance-ranked search (FTS5 + vector)
// ---------------------------------------------------------------------------

const MATCH_TYPE_COLORS = {
  fts:    { bg: 'rgba(45,212,191,0.15)', text: 'var(--teal)',   border: 'rgba(45,212,191,0.35)', label: 'FTS' },
  vector: { bg: 'rgba(139,92,246,0.15)', text: 'var(--purple)', border: 'rgba(139,92,246,0.35)', label: 'Vector' },
  hybrid: { bg: 'rgba(59,130,246,0.15)', text: 'var(--blue)',   border: 'rgba(59,130,246,0.35)', label: 'Hybrid' },
};

function ScoreBar({ score, style: extraStyle }) {
  const pct = Math.round((score ?? 0) * 100);
  const color = pct >= 70 ? '#4ade80' : pct >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, ...extraStyle }}>
      <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.07)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.3s' }} />
      </div>
      <span style={{ fontSize: '0.68rem', color, fontFamily: 'var(--mono)', minWidth: 30, textAlign: 'right' }}>{pct}%</span>
    </div>
  );
}

const MEMORY_TYPE_OPTS = ['fact', 'decision', 'learning', 'pattern', 'preference'];

function SearchPane() {
  const [inputVal, setInputVal]         = useState('');
  const [query, setQuery]               = useState('');
  const [mode, setMode]                 = useState('fast');
  const [showFilters, setShowFilters]   = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [minConf, setMinConf]           = useState(0.3);
  const [inclSuperseded, setInclSuperseded] = useState(false);
  const [results, setResults]           = useState([]);
  const [searching, setSearching]       = useState(false);
  const [elapsedMs, setElapsedMs]       = useState(null);
  const [hasSearched, setHasSearched]   = useState(false);
  const [selected, setSelected]         = useState(null);

  const abortRef = useRef(null);

  const doSearch = useCallback(async (q, opts) => {
    if (!q.trim()) {
      setResults([]);
      setHasSearched(false);
      setElapsedMs(null);
      return;
    }

    // Abort previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setSearching(true);
    setHasSearched(true);

    try {
      const data = await api.structuredMemorySearch(q, opts, controller.signal);
      if (controller.signal.aborted) return;
      setResults(data.results ?? []);
      setElapsedMs(data.elapsedMs ?? null);
    } catch {
      if (!controller.signal.aborted) {
        setResults([]);
      }
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, []);

  // Debounce: fire 300ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(inputVal);
    }, 300);
    return () => clearTimeout(t);
  }, [inputVal]);

  // Re-search when query or any filter changes
  useEffect(() => {
    doSearch(query, {
      mode,
      limit: 20,
      types: selectedTypes.length > 0 ? selectedTypes.join(',') : undefined,
      minConfidence: minConf,
      includeSuperseded: inclSuperseded,
    });
  }, [query, mode, selectedTypes, minConf, inclSuperseded, doSearch]);

  function toggleType(t) {
    setSelectedTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  }

  return (
    <div>
      {/* ── Search bar ─────────────────────────────────────────────────────── */}
      <GlassCard style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
          {/* Search input */}
          <div style={{ position: 'relative', flex: 1 }}>
            <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 18, height: 18, color: 'var(--muted)', pointerEvents: 'none' }}
              viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="9" cy="9" r="6" /><line x1="15" y1="15" x2="19" y2="19" />
            </svg>
            <input
              className="nx-input"
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
              placeholder="Search memories… try 'API design decisions' or 'Rafe preferences'"
              style={{ width: '100%', paddingLeft: 38, paddingTop: 10, paddingBottom: 10, fontSize: '1rem', boxSizing: 'border-box' }}
              autoFocus
            />
          </div>

          {/* Mode toggle */}
          <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, border: '1px solid var(--border)', flexShrink: 0 }}>
            {[{ id: 'fast', label: '⚡ Fast' }, { id: 'full', label: '🔮 Full' }].map(m => (
              <button key={m.id} onClick={() => setMode(m.id)} style={{
                padding: '4px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font)',
                background: mode === m.id ? 'rgba(255,255,255,0.10)' : 'transparent',
                color: mode === m.id ? 'var(--text)' : 'var(--muted)',
                fontWeight: mode === m.id ? 700 : 400,
                transition: 'all 0.15s',
                boxShadow: mode === m.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
                whiteSpace: 'nowrap',
              }}>{m.label}</button>
            ))}
          </div>

          {/* Filters toggle */}
          <button onClick={() => setShowFilters(v => !v)} style={{
            padding: '6px 14px', borderRadius: 8, border: `1px solid ${showFilters ? 'rgba(45,212,191,0.4)' : 'var(--border)'}`,
            background: showFilters ? 'rgba(45,212,191,0.08)' : 'transparent',
            color: showFilters ? 'var(--teal)' : 'var(--muted)',
            cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'var(--font)', fontWeight: 600,
            transition: 'all 0.15s', flexShrink: 0,
          }}>⚙ Filters{selectedTypes.length > 0 ? ` (${selectedTypes.length})` : ''}</button>
        </div>

        {/* ── Collapsible filter row ────────────────────────────────────────── */}
        {showFilters && (
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
            {/* Type chips */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase' }}>Type</span>
              {MEMORY_TYPE_OPTS.map(t => {
                const active = selectedTypes.includes(t);
                const c = typeColor(t);
                return (
                  <button key={t} onClick={() => toggleType(t)} style={{
                    padding: '3px 11px', borderRadius: 99, border: `1px solid ${active ? c + '66' : 'var(--border)'}`,
                    background: active ? c + '1a' : 'transparent',
                    color: active ? c : 'var(--muted)',
                    cursor: 'pointer', fontSize: '0.75rem', fontFamily: 'var(--font)', fontWeight: active ? 700 : 400,
                    textTransform: 'capitalize', transition: 'all 0.15s',
                  }}>{t}</button>
                );
              })}
            </div>

            {/* Confidence slider */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Min Conf</span>
              <input type="range" min={0} max={1} step={0.05} value={minConf}
                onChange={e => setMinConf(parseFloat(e.target.value))}
                style={{ width: 100, accentColor: 'var(--teal)', cursor: 'pointer' }} />
              <span style={{ fontSize: '0.72rem', color: 'var(--teal)', fontFamily: 'var(--mono)', minWidth: 32 }}>{Math.round(minConf * 100)}%</span>
            </div>

            {/* Superseded toggle */}
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={inclSuperseded} onChange={e => setInclSuperseded(e.target.checked)}
                style={{ accentColor: 'var(--teal)', width: 14, height: 14 }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--font)' }}>Include superseded</span>
            </label>
          </div>
        )}
      </GlassCard>

      {/* ── Status bar ─────────────────────────────────────────────────────── */}
      {hasSearched && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14, minHeight: 22 }}>
          {searching ? (
            <span style={{ color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>Searching…</span>
          ) : (
            <>
              <span style={{ color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{results.length}</span> result{results.length !== 1 ? 's' : ''}
                {elapsedMs != null && <> in <span style={{ color: 'var(--teal)' }}>{elapsedMs}ms</span></>}
              </span>
              {mode === 'fast' && results.length === 0 && query && (
                <span style={{ fontSize: '0.72rem', color: 'var(--purple)', fontFamily: 'var(--mono)' }}>💡 Try Full mode for semantic search</span>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Results ────────────────────────────────────────────────────────── */}
      {!hasSearched ? (
        <GlassCard>
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 16, opacity: 0.25 }}>🔍</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.8 }}>
              Search your memory base.<br />
              <span style={{ color: 'var(--faint)', fontSize: '0.82rem' }}>Try <em>"API design decisions"</em>, <em>"Rafe preferences"</em>, or <em>"auth approach"</em></span>
            </div>
          </div>
        </GlassCard>
      ) : !searching && results.length === 0 ? (
        <GlassCard>
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.25 }}>🫙</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
              No memories match <em style={{ color: 'var(--text)' }}>&ldquo;{query}&rdquo;</em>
            </div>
            <div style={{ color: 'var(--faint)', fontSize: '0.78rem', marginTop: 8 }}>
              {mode === 'fast' ? 'Try different keywords, or switch to Full mode for semantic search.' : 'Try different keywords or relax your filters.'}
            </div>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {results.map((r, i) => {
            const mtc = MATCH_TYPE_COLORS[r.matchType] ?? MATCH_TYPE_COLORS.fts;
            const tc  = typeColor(r.memory_type);
            return (
              <GlassCard key={r.id ?? i} onClick={() => setSelected(r)} style={{ cursor: 'pointer' }}>
                {/* Top row: score bar + badges + time */}
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                  {/* Score bar */}
                  <div style={{ flex: '0 0 120px' }}>
                    <ScoreBar score={r.score} />
                  </div>

                  {/* Match type badge */}
                  <span style={{
                    background: mtc.bg, color: mtc.text, border: `1px solid ${mtc.border}`,
                    padding: '1px 8px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700,
                    letterSpacing: '0.04em', whiteSpace: 'nowrap',
                  }}>{mtc.label}</span>

                  {/* Memory type badge */}
                  <span style={{
                    background: tc + '22', color: tc, border: `1px solid ${tc}44`,
                    padding: '1px 8px', borderRadius: 4, fontSize: '0.68rem', fontWeight: 700,
                    textTransform: 'capitalize', whiteSpace: 'nowrap',
                  }}>{r.memory_type}</span>

                  <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--faint)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
                    {r.derived_at ? timeAgo(r.derived_at) : (r.created_at ? timeAgo(r.created_at) : '')}
                  </span>
                </div>

                {/* Title */}
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 4, lineHeight: 1.4 }}>
                  {r.title || (r.content ?? '').slice(0, 70) + ((r.content ?? '').length > 70 ? '…' : '')}
                </div>

                {/* Content snippet */}
                <p style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 10px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>
                  {r.content}
                </p>

                {/* Footer row */}
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: '0 0 180px' }}>
                    <ConfBar value={r.confidence} color={tc} />
                  </div>
                  {r.evidenceCount > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{r.evidenceCount} evidence</span>
                  )}
                  {r.access_count > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{r.access_count} accesses</span>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Detail modal */}
      <Modal large open={!!selected} onClose={() => setSelected(null)}
        title={selected ? (selected.title || `Memory #${selected.id}`) : ''}>
        <MemoryDetail mem={selected ? {
          ...selected,
          evidence_count: selected.evidenceCount,
        } : null} />
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MemoriesPane
// ---------------------------------------------------------------------------

function MemoriesPane() {
  const [statusFilter, setStatusFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState(null);
  const LIMIT = 25;

  // Debounce search input — fire query 300ms after typing stops
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setOffset(0);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const params = { limit: LIMIT, offset };
  if (statusFilter) params.status = statusFilter;
  if (typeFilter) params.type = typeFilter;
  if (search) params.search = search;

  const { data, loading } = useApi(
    signal => api.structuredMemories(params, signal),
    [statusFilter, typeFilter, search, offset],
  );

  const memories = data?.memories ?? [];
  const total = data?.total ?? 0;
  const pages = Math.ceil(total / LIMIT);
  const page = Math.floor(offset / LIMIT) + 1;

  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'stale', label: 'Stale' },
    { value: 'archived', label: 'Archived' },
    { value: 'contested', label: 'Contested' },
    { value: 'superseded', label: 'Superseded' },
  ];
  const typeOptions = [
    { value: '', label: 'All Types' },
    { value: 'fact', label: 'Fact' },
    { value: 'decision', label: 'Decision' },
    { value: 'learning', label: 'Learning' },
    { value: 'pattern', label: 'Pattern' },
    { value: 'preference', label: 'Preference' },
  ];

  return (
    <div>
      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <select className="nx-select" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setOffset(0); }} style={{ minWidth: 140 }}>
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select className="nx-select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setOffset(0); }} style={{ minWidth: 140 }}>
          {typeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: 200, maxWidth: 400 }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: 'var(--muted)', pointerEvents: 'none' }} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="9" r="6" /><line x1="15" y1="15" x2="19" y2="19" />
          </svg>
          <input className="nx-input" value={searchInput} onChange={e => setSearchInput(e.target.value)} placeholder="Search content…" style={{ width: '100%', paddingLeft: 30, boxSizing: 'border-box' }} />
        </div>
        <span style={{ color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'var(--mono)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
          {search ? `${total} result${total !== 1 ? 's' : ''} for '${search}'` : `${total} total`}
        </span>
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '40px 0' }}>Loading…</div>
      ) : memories.length === 0 ? (
        <GlassCard>
          <div style={{ padding: '40px 0', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.3 }}>🧠</div>
            <div style={{ color: 'var(--muted)' }}>No memories found</div>
          </div>
        </GlassCard>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {memories.map(m => (
            <GlassCard key={m.id} onClick={() => setSelected(m)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{
                  background: typeColor(m.memory_type) + '22',
                  color: typeColor(m.memory_type),
                  border: `1px solid ${typeColor(m.memory_type)}44`,
                  padding: '1px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 700,
                  textTransform: 'capitalize', whiteSpace: 'nowrap',
                }}>{m.memory_type}</span>
                <span style={{
                  background: statusColor(m.status) + '22',
                  color: statusColor(m.status),
                  border: `1px solid ${statusColor(m.status)}44`,
                  padding: '1px 8px', borderRadius: 4, fontSize: '0.72rem', fontWeight: 600,
                  textTransform: 'capitalize', whiteSpace: 'nowrap',
                }}>{m.status}</span>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>{m.derived_at ? timeAgo(m.derived_at) : (m.created_at ? timeAgo(m.created_at) : '')}</span>
              </div>
              {/* Title row — bold heading or content preview fallback */}
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 4, lineHeight: 1.4 }}>
                {m.title || m.content.slice(0, 60) + (m.content.length > 60 ? '…' : '')}
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.82rem', lineHeight: 1.6, margin: '0 0 10px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                {m.content.length > 150 ? m.content.slice(0, 150) + '…' : m.content}
              </p>
              <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                <div style={{ flex: 1, maxWidth: 200 }}>
                  <ConfBar value={m.confidence} color={typeColor(m.memory_type)} />
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{m.evidence_count ?? 0} evidence</span>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{m.access_count ?? 0} accesses</span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20, alignItems: 'center' }}>
          <button className="btn" onClick={() => setOffset(Math.max(0, offset - LIMIT))} disabled={offset === 0} style={{ padding: '4px 14px', opacity: offset === 0 ? 0.4 : 1 }}>←</button>
          <span style={{ color: 'var(--muted)', fontSize: '0.78rem', fontFamily: 'var(--mono)' }}>page {page} / {pages}</span>
          <button className="btn" onClick={() => setOffset(offset + LIMIT)} disabled={page >= pages} style={{ padding: '4px 14px', opacity: page >= pages ? 0.4 : 1 }}>→</button>
        </div>
      )}

      <Modal large open={!!selected} onClose={() => setSelected(null)} title={selected ? (selected.title || `Memory #${selected.id}`) : ''}>
        <MemoryDetail mem={selected} />
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RecentActivity (events + gc-log side by side)
// ---------------------------------------------------------------------------

function RecentActivity() {
  const { data: eventsData } = useApi(signal => api.structuredEvents(10, signal), []);
  const { data: gcData } = useApi(signal => api.structuredGcLog(10, signal), []);
  const events = eventsData?.events ?? [];
  const gcEntries = gcData?.entries ?? [];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
      {/* Recent Events */}
      <GlassCard>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '3px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 14, textTransform: 'uppercase' }}>Recent Events</div>
        {events.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>No events</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {events.map(ev => (
              <div key={ev.id} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--teal)', fontFamily: 'var(--mono)', fontWeight: 600 }}>{ev.event_type}</span>
                  {ev.agent_type && <span style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{ev.agent_type}</span>}
                  {ev.signal_score != null && (
                    <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--purple)', fontFamily: 'var(--mono)' }}>⚡ {(ev.signal_score ?? 0).toFixed(2)}</span>
                  )}
                  <span style={{ fontSize: '0.68rem', color: 'var(--faint)', fontFamily: 'var(--mono)', marginLeft: ev.signal_score != null ? 0 : 'auto' }}>{timeAgo(ev.created_at || ev.timestamp)}</span>
                </div>
                {ev.content && (
                  <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {ev.content}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* GC Log */}
      <GlassCard>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '3px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 14, textTransform: 'uppercase' }}>GC Log</div>
        {gcEntries.length === 0 ? (
          <div style={{ color: 'var(--muted)', fontSize: '0.82rem', textAlign: 'center', padding: '20px 0' }}>No GC activity</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {gcEntries.map(entry => (
              <div key={entry.id} style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>#{entry.memory_id}</span>
                  <span style={{ fontSize: '0.72rem', color: statusColor(entry.from_status), fontFamily: 'var(--mono)' }}>{entry.from_status}</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--faint)' }}>→</span>
                  <span style={{ fontSize: '0.72rem', color: statusColor(entry.to_status), fontFamily: 'var(--mono)' }}>{entry.to_status}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>{timeAgo(entry.run_at)}</span>
                </div>
                {entry.reason && (
                  <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {entry.reason}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConflictsPane
// ---------------------------------------------------------------------------

// Resolution pill button
function ResolveBtn({ label, accentBg, accentText, accentBorder, onClick, disabled }) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: '3px 12px',
        borderRadius: 999,
        border: `1px solid ${hover && !disabled ? accentBorder : 'var(--border)'}`,
        background: hover && !disabled ? accentBg : 'transparent',
        color: hover && !disabled ? accentText : 'var(--muted)',
        fontSize: '0.72rem',
        fontWeight: 600,
        cursor: disabled ? 'default' : 'pointer',
        transition: 'all 0.15s',
        opacity: disabled ? 0.4 : 1,
        letterSpacing: '0.02em',
      }}
    >{label}</button>
  );
}

// Single conflict card with resolution controls
function ConflictCard({ c, onResolved }) {
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(false);

  async function resolve(winner) {
    setResolving(true);
    try {
      const labelMap = { a: 'A', b: 'B', both: 'both' };
      await api.resolveConflict(c.id, { winner, resolution: `Kept ${labelMap[winner]} via Nexus` });
      setResolved(true);
      // Brief success state, then notify parent to refetch
      setTimeout(() => onResolved(), 800);
    } catch (e) {
      console.error('resolve conflict failed', e);
      setResolving(false);
    }
  }

  return (
    <div style={{
      padding: '12px 16px',
      background: resolved ? 'rgba(74,222,128,0.06)' : 'rgba(239,68,68,0.04)',
      border: `1px solid ${resolved ? 'rgba(74,222,128,0.3)' : 'rgba(239,68,68,0.2)'}`,
      borderRadius: 10,
      transition: 'background 0.3s, border-color 0.3s',
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
        <Badge label={resolved ? 'resolved' : (c.status ?? 'open')} color={resolved ? '#4ade80' : '#ef4444'} />
        {c.conflict_type && <Badge label={c.conflict_type} color="var(--muted)" />}
        <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
          {c.detected_at ? timeAgo(c.detected_at) : ''}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 6 }}>MEMORY A #{c.memory_a_id}</div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.6 }}>{c.memory_a_content ?? '—'}</p>
          {c.memory_a_confidence != null && (
            <div style={{ marginTop: 8 }}>
              <ConfBar value={c.memory_a_confidence} color="var(--teal)" />
            </div>
          )}
        </div>
        <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '2px', color: '#ec4899', fontFamily: 'var(--mono)', marginBottom: 6 }}>MEMORY B #{c.memory_b_id}</div>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.6 }}>{c.memory_b_content ?? '—'}</p>
          {c.memory_b_confidence != null && (
            <div style={{ marginTop: 8 }}>
              <ConfBar value={c.memory_b_confidence} color="#ec4899" />
            </div>
          )}
        </div>
      </div>

      {/* Resolution actions */}
      {resolved ? (
        <div style={{ fontSize: '0.75rem', color: '#4ade80', fontWeight: 600 }}>✓ Resolved</div>
      ) : (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: 'var(--faint)', fontFamily: 'var(--mono)', marginRight: 4 }}>resolve:</span>
          <ResolveBtn label="Keep A" accentBg="rgba(45,212,191,0.12)" accentText="var(--teal)" accentBorder="rgba(45,212,191,0.4)" onClick={() => resolve('a')} disabled={resolving} />
          <ResolveBtn label="Keep B" accentBg="rgba(236,72,153,0.12)" accentText="#ec4899" accentBorder="rgba(236,72,153,0.4)" onClick={() => resolve('b')} disabled={resolving} />
          <ResolveBtn label="Keep Both" accentBg="rgba(255,255,255,0.06)" accentText="var(--text)" accentBorder="rgba(255,255,255,0.2)" onClick={() => resolve('both')} disabled={resolving} />
        </div>
      )}
    </div>
  );
}

function ConflictsPane() {
  const { data, loading, reload } = useApi(signal => api.structuredConflicts('open', signal), []);
  const conflicts = data?.conflicts ?? [];

  return (
    <GlassCard style={{ marginBottom: 28 }}>
      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '3px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 16, textTransform: 'uppercase' }}>Conflicts</div>
      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '20px 0' }}>Loading…</div>
      ) : conflicts.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0' }}>
          <span style={{ fontSize: '1.4rem' }}>✅</span>
          <span style={{ color: '#4ade80', fontWeight: 600, fontSize: '0.9rem' }}>No unresolved conflicts</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {conflicts.map(c => (
            <ConflictCard key={c.id} c={c} onResolved={reload} />
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ---------------------------------------------------------------------------
// StructuredMemoryTab — full structured view
// ---------------------------------------------------------------------------

function StructuredMemoryTab() {
  const { data: stats, loading: statsLoading } = useApi(signal => api.structuredMemoryStats(signal), []);

  const statCards = [
    { label: 'Total Memories', value: stats?.totalMemories ?? 0, color: 'var(--teal)' },
    { label: 'Active', value: stats?.byStatus?.active ?? 0, color: '#4ade80' },
    { label: 'Stale', value: stats?.byStatus?.stale ?? 0, color: '#f59e0b' },
    { label: 'Avg Confidence', value: stats?.avgConfidence != null ? `${Math.round((stats.avgConfidence) * 100)}%` : '—', color: 'var(--purple)' },
    { label: 'Events 24h', value: stats?.recentEvents ?? 0, color: 'var(--blue)' },
    { label: 'Unresolved Conflicts', value: stats?.unresolvedConflicts ?? 0, color: '#ef4444' },
    { label: 'GC Runs', value: stats?.gcRuns ?? 0, color: 'var(--muted)' },
    { label: 'Last Reflection', value: stats?.lastReflection ? timeAgo(stats.lastReflection) : '—', color: 'var(--teal)', sub: stats?.lastReflection ? new Date(stats.lastReflection).toLocaleString() : undefined },
    { label: 'Last GC', value: stats?.lastGcRun ? timeAgo(stats.lastGcRun) : '—', color: 'var(--muted)', sub: stats?.lastGcRun ? new Date(stats.lastGcRun).toLocaleString() : undefined },
  ];

  return (
    <div>
      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 28 }}>
        {statCards.map((s, i) => (
          <StatCard key={s.label} label={s.label} value={statsLoading ? '…' : s.value} color={s.color} sub={s.sub} idx={i} />
        ))}
      </div>

      {/* Type distribution */}
      {!statsLoading && stats?.byType && <TypeDistribution byType={stats.byType} />}

      {/* Memories list */}
      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '3px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 14, textTransform: 'uppercase' }}>Memories</div>
      <MemoriesPane />

      {/* Recent activity */}
      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '3px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 14, marginTop: 32, textTransform: 'uppercase' }}>Recent Activity</div>
      <RecentActivity />

      {/* Conflicts */}
      <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '3px', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 14, textTransform: 'uppercase' }}>Conflicts</div>
      <ConflictsPane />
    </div>
  );
}

// ---------------------------------------------------------------------------
// FilesTab — original file-based memory view (unchanged)
// ---------------------------------------------------------------------------

function FilesTab() {
  const { data, loading } = useApi(signal => api.memoriesFs(undefined, signal));
  const [agentFilter, setAgentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const memories = data?.memories || [];
  const filtered = memories.filter(m => {
    if (agentFilter !== 'all' && m.agent !== agentFilter) return false;
    if (search && !m.content.toLowerCase().includes(search.toLowerCase()) && !m.file.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });
  const agentsPresent = [...new Set(memories.map(m => m.agent).filter(Boolean))];
  const totalSize = memories.reduce((s, m) => s + (m.size || 0), 0);

  return (
    <div>
      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16, marginBottom: 28 }}>
        {[
          { label: 'Total Files', value: memories.length, color: 'var(--teal)' },
          { label: 'Agents', value: agentsPresent.length, color: 'var(--blue)' },
          { label: 'Total Size', value: totalSize > 1024 ? `${Math.round(totalSize / 1024)} KB` : `${totalSize} B`, color: 'var(--purple)' },
        ].map((s, i) => (
          <div key={i} className={`hud-stat-card fade-in-up-${i+1}`}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${s.color}, transparent)`, opacity: 0.6, borderRadius: '14px 14px 0 0' }} />
            <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px', textTransform: 'uppercase', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 10 }}>{s.label}</div>
            <div style={{ fontSize: '2rem', fontWeight: 900, color: s.color, lineHeight: 1, fontFamily: 'var(--mono)' }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <FilterBtn label="All" active={agentFilter === 'all'} onClick={() => setAgentFilter('all')} color="var(--text)" />
          {agentsPresent.map(a => <FilterBtn key={a} label={a} active={agentFilter === a} onClick={() => setAgentFilter(a)} color={AGENT_COLORS[a] || 'var(--blue)'} />)}
        </div>
        <input className="nx-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search memories..." style={{ maxWidth: 280, marginLeft: 'auto' }} />
      </div>

      {loading ? (
        <div style={{ color: 'var(--muted)', textAlign: 'center', padding: '60px 0' }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <GlassCard><div style={{ padding: '60px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 16, opacity: 0.3 }}>🧠</div>
          <div style={{ color: 'var(--text)', fontWeight: 600 }}>No memories found</div>
        </div></GlassCard>
      ) : (
        <div style={{ position: 'relative', paddingLeft: 32 }}>
          <div style={{ position: 'absolute', left: 9, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {filtered.map((m, i) => {
              const color = AGENT_COLORS[m.agent] || 'var(--blue)';
              const preview = m.content.slice(0, 200).replace(/\n/g, ' ');
              return (
                <div key={m.agent + m.file + i} className={`fade-in-up-${Math.min(i+1, 6)}`} style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', left: -28, top: 18, width: 12, height: 12, borderRadius: '50%', background: color, border: '3px solid var(--navy)', boxShadow: `0 0 8px ${color}44` }} />
                  <GlassCard onClick={() => setSelected(m)} style={{ cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Badge label={m.agent} color={color} dot />
                        <span style={{ color: 'var(--muted)', fontSize: '0.72rem', fontFamily: 'var(--mono)', background: 'rgba(255,255,255,0.04)', padding: '2px 8px', borderRadius: 4 }}>{m.file}</span>
                      </div>
                      <span style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{timeAgo(m.modified)}</span>
                    </div>
                    <div style={{ color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.6, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' }}>{preview}</div>
                  </GlassCard>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal large open={!!selected} onClose={() => setSelected(null)} title={selected ? `${selected.agent} / ${selected.file}` : ''}>
        {selected && (
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <Badge label={selected.agent} color={AGENT_COLORS[selected.agent] || 'var(--blue)'} dot />
              <Badge label={selected.file} color="var(--muted)" />
              <span style={{ color: 'var(--faint)', fontSize: '0.72rem', marginLeft: 'auto', fontFamily: 'var(--mono)' }}>{Math.round(selected.size / 1024)} KB · {timeAgo(selected.modified)}</span>
            </div>
            <div style={{ background: 'rgba(8,12,24,0.9)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, maxHeight: '78vh', overflowY: 'auto' }}>
              <pre style={{ color: 'var(--text)', fontSize: '0.9rem', lineHeight: 1.8, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'var(--mono)', margin: 0 }}>{selected.content}</pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tab switcher
// ---------------------------------------------------------------------------

function TabBar({ tab, setTab }) {
  const tabs = [
    { id: 'search',     label: 'Search',     icon: '🔍' },
    { id: 'structured', label: 'Structured', icon: '🗄️' },
    { id: 'files',      label: 'Files',      icon: '📁' },
  ];
  return (
    <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 4, border: '1px solid var(--border)', width: 'fit-content' }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          padding: '7px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
          background: tab === t.id ? 'rgba(255,255,255,0.07)' : 'transparent',
          color: tab === t.id ? 'var(--text)' : 'var(--muted)',
          fontWeight: tab === t.id ? 700 : 400,
          fontSize: '0.85rem', fontFamily: 'var(--font)',
          transition: 'all 0.15s',
          boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,0.3)' : 'none',
        }}>
          <span style={{ marginRight: 6 }}>{t.icon}</span>{t.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Memory page (root)
// ---------------------------------------------------------------------------

export default function Memory() {
  const [tab, setTab] = useState('search');

  return (
    <div style={{ position: 'relative', padding: '36px 32px' }}>
      <div className="orb orb-1" style={{ position: 'fixed', zIndex: 0 }} />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div className="fade-in-up" style={{ marginBottom: 28 }}>
          <div style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '6px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 8, opacity: 0.8 }}>NEURAL ARCHIVE</div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-1.5px' }}><span className="gradient-text">Memory</span></h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginTop: 4 }}>Agent memory — structured knowledge base &amp; workspace files</p>
        </div>

        <TabBar tab={tab} setTab={setTab} />

        {tab === 'search' && <SearchPane />}
        {tab === 'structured' && <StructuredMemoryTab />}
        {tab === 'files' && <FilesTab />}
      </div>
    </div>
  );
}
