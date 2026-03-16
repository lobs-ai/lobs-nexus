import { useState, useEffect, useCallback, useRef } from 'react';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';
import { api } from '../lib/api';

// ─── helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return 'Working late, Rafe';
  if (h < 12) return 'Good morning, Rafe';
  if (h < 17) return 'Good afternoon, Rafe';
  return 'Good evening, Rafe';
}

function fmtDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
}

function fmtTime(d) {
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function fmtRelative(isoString) {
  if (!isoString) return null;
  const d = new Date(isoString);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60)  return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return fmtDate(d);
}

// Urgency colour based on how soon an event starts
function eventUrgencyColor(startIso) {
  if (!startIso) return 'var(--muted)';
  const minsUntil = (new Date(startIso).getTime() - Date.now()) / 60000;
  if (minsUntil < 0)   return 'var(--faint)';      // past
  if (minsUntil < 15)  return 'var(--red, #f87171)'; // imminent
  if (minsUntil < 60)  return 'var(--amber)';        // soon
  return 'var(--teal)';                               // later
}

function fmtEventTime(isoString) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

// ─── Calendar section ─────────────────────────────────────────────────────────
function CalendarSection({ events }) {
  if (!events || events.length === 0) return null;

  return (
    <GlassCard style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <svg width="16" height="16" fill="none" stroke="var(--blue)" strokeWidth="2" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Today's Calendar</span>
        <Badge label={`${events.length} event${events.length !== 1 ? 's' : ''}`} color="var(--blue)" />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.map((ev, i) => {
          const color = eventUrgencyColor(ev.start);
          const isPast = ev.start && new Date(ev.start) < new Date();
          return (
            <div
              key={ev.id || i}
              style={{
                display: 'flex', gap: 14, alignItems: 'flex-start', padding: '12px 14px',
                background: isPast ? 'rgba(255,255,255,0.01)' : `${color}0d`,
                border: `1px solid ${isPast ? 'var(--border)' : color + '33'}`,
                borderRadius: 8, opacity: isPast ? 0.55 : 1,
                transition: 'all 0.2s',
              }}
            >
              {/* Time column */}
              <div style={{ width: 72, flexShrink: 0, textAlign: 'right' }}>
                <div style={{ fontSize: '0.82rem', color, fontFamily: 'var(--mono)', fontWeight: 600, lineHeight: 1.4 }}>
                  {fmtEventTime(ev.start)}
                </div>
                {ev.end && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
                    – {fmtEventTime(ev.end)}
                  </div>
                )}
              </div>
              {/* Divider dot */}
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
              {/* Content */}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.92rem', color: isPast ? 'var(--muted)' : 'var(--text)', fontWeight: 600, marginBottom: 2 }}>
                  {ev.title || ev.summary || 'Untitled event'}
                </div>
                {ev.location && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--faint)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                    {ev.location}
                  </div>
                )}
                {ev.description && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 4, lineHeight: 1.5 }}>
                    {ev.description.slice(0, 120)}{ev.description.length > 120 ? '…' : ''}
                  </div>
                )}
              </div>
              {/* Status badge */}
              {!isPast && (
                <div style={{ flexShrink: 0 }}>
                  {(() => {
                    const minsUntil = ev.start ? Math.floor((new Date(ev.start) - Date.now()) / 60000) : null;
                    if (minsUntil === null) return null;
                    if (minsUntil < 15) return <Badge label="NOW" color="var(--red, #f87171)" />;
                    if (minsUntil < 60) return <Badge label={`in ${minsUntil}m`} color="var(--amber)" />;
                    return null;
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ─── AI Summary section ───────────────────────────────────────────────────────
function AISummarySection({ aiSummary, generatedAt }) {
  if (!aiSummary) return null;

  return (
    <GlassCard glow style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <svg width="16" height="16" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2z"/>
          <path d="M12 8v4l3 3"/>
        </svg>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>AI Summary</span>
        {generatedAt && (
          <span style={{ fontSize: '0.7rem', color: 'var(--faint)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>
            generated {fmtRelative(generatedAt)}
          </span>
        )}
      </div>
      <div style={{
        fontSize: '0.92rem', color: 'var(--text)', lineHeight: 1.75,
        borderLeft: '2px solid var(--teal)',
        paddingLeft: 16, margin: '0 0 0 4px',
      }}>
        {aiSummary}
      </div>
    </GlassCard>
  );
}

// ─── Sentinel Alerts section ──────────────────────────────────────────────────
function SentinelAlertsSection({ alerts }) {
  if (!alerts || alerts.length === 0) return null;

  const urgencyOrder = { high: 0, medium: 1, low: 2 };
  const sorted = [...alerts].sort((a, b) =>
    (urgencyOrder[a.urgency] ?? 99) - (urgencyOrder[b.urgency] ?? 99)
  );

  function alertColor(urgency) {
    if (urgency === 'high')   return 'var(--red, #f87171)';
    if (urgency === 'medium') return 'var(--amber)';
    return 'var(--blue)';
  }

  function alertIcon(urgency) {
    if (urgency === 'high')   return '🚨';
    if (urgency === 'medium') return '⚠️';
    return 'ℹ️';
  }

  return (
    <GlassCard style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <svg width="16" height="16" fill="none" stroke="var(--amber)" strokeWidth="2" viewBox="0 0 24 24">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Sentinel Alerts</span>
        <Badge
          label={`${sorted.filter(a => a.urgency === 'high').length} high`}
          color="var(--red, #f87171)"
        />
        <Badge
          label={`${sorted.filter(a => a.urgency !== 'high').length} other`}
          color="var(--amber)"
        />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sorted.map((alert, i) => {
          const color = alertColor(alert.urgency);
          return (
            <div
              key={alert.id || i}
              style={{
                display: 'flex', gap: 12, alignItems: 'flex-start',
                padding: '12px 14px',
                background: `${color}0d`,
                border: `1px solid ${color}33`,
                borderRadius: 8,
              }}
            >
              <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1.4 }}>
                {alertIcon(alert.urgency)}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.9rem', color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>
                  {alert.title || alert.message || 'Alert'}
                </div>
                {alert.description && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
                    {alert.description}
                  </div>
                )}
                {alert.actionItem && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: '0.7rem', color, fontFamily: 'var(--mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Action
                    </span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--text)' }}>{alert.actionItem}</span>
                  </div>
                )}
              </div>
              <div style={{ flexShrink: 0 }}>
                <Badge label={alert.urgency || 'info'} color={color} />
              </div>
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}

// ─── Highlights section ───────────────────────────────────────────────────────
function HighlightsSection({ highlights }) {
  if (!highlights || highlights.length === 0) return null;

  return (
    <GlassCard style={{ marginBottom: 24 }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
        Highlights
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {highlights.map((item, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <span style={{ color: 'var(--teal)', fontSize: '1rem', lineHeight: 1.6, flexShrink: 0 }}>→</span>
            <div style={{ fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6 }}>
              {typeof item === 'string' ? item : (item.text || JSON.stringify(item))}
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ─── Refresh indicator ────────────────────────────────────────────────────────
function RefreshIndicator({ lastFetched, onRefresh, refreshing }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {lastFetched && (
        <span style={{ fontSize: '0.72rem', color: 'var(--faint)', fontFamily: 'var(--mono)' }}>
          refreshed {fmtRelative(lastFetched)}
        </span>
      )}
      <button
        onClick={onRefresh}
        disabled={refreshing}
        style={{
          background: 'none', border: '1px solid var(--border)', borderRadius: 6,
          color: refreshing ? 'var(--faint)' : 'var(--muted)', cursor: refreshing ? 'default' : 'pointer',
          padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 5,
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.color = 'var(--teal)'; e.currentTarget.style.borderColor = 'var(--teal)'; }}}
        onMouseLeave={e => { e.currentTarget.style.color = refreshing ? 'var(--faint)' : 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        <svg
          width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"
          style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }}
        >
          <polyline points="23 4 23 10 17 10"/>
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        {refreshing ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
const REFRESH_INTERVAL = 60 * 1000; // 60 s

export default function DailyBrief() {
  const [brief, setBrief]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await api.dailyBrief();
      setBrief(data);
      setLastFetched(new Date().toISOString());
    } catch (err) {
      console.error('Failed to load daily brief:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Initial load + auto-refresh every 60s
  useEffect(() => {
    load(false);
    timerRef.current = setInterval(() => load(true), REFRESH_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [load]);

  if (loading) {
    return (
      <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
        <div className="shimmer" style={{ height: 44, width: 280, borderRadius: 8, marginBottom: 10 }} />
        <div className="shimmer" style={{ height: 20, width: 200, borderRadius: 6, marginBottom: 32 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 24 }}>
          <div className="shimmer" style={{ height: 100, borderRadius: 12 }} />
          <div className="shimmer" style={{ height: 100, borderRadius: 12 }} />
        </div>
        <div className="shimmer" style={{ height: 200, borderRadius: 12, marginBottom: 16 }} />
        <div className="shimmer" style={{ height: 160, borderRadius: 12 }} />
      </div>
    );
  }

  if (!brief) {
    return (
      <div style={{ padding: 32, color: 'var(--muted)', textAlign: 'center', paddingTop: 80 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📋</div>
        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Daily brief unavailable</div>
        <div style={{ fontSize: '0.9rem' }}>The brief service may still be warming up — try refreshing.</div>
        <button className="btn-primary" style={{ marginTop: 20 }} onClick={() => load(true)}>
          Try again
        </button>
      </div>
    );
  }

  // Normalize stats field (API may return `tasks` or `stats`)
  const stats = brief.stats || {
    completedToday: brief.tasks?.completed_today ?? 0,
    activeWorkers:  brief.tasks?.active ?? 0,
    inboxPending:   brief.tasks?.blocked ?? 0,
  };

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
              {greeting()}
            </h1>
            <div style={{ fontSize: '1rem', color: 'var(--muted)' }}>
              {fmtDate(new Date())}
              {brief.date && brief.date !== new Date().toISOString().slice(0, 10) && (
                <span style={{ marginLeft: 10, fontSize: '0.75rem', color: 'var(--amber)', fontFamily: 'var(--mono)' }}>
                  (brief from {brief.date})
                </span>
              )}
            </div>
          </div>
          <RefreshIndicator
            lastFetched={lastFetched}
            onRefresh={() => load(true)}
            refreshing={refreshing}
          />
        </div>
      </div>

      {/* ── Quick Stats ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        <GlassCard>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'var(--mono)' }}>
            Quick Stats
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--green)' }}>{brief?.stats?.completedToday ?? stats.completedToday ?? 0}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Completed</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--blue)' }}>{stats.activeWorkers ?? 0}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Working</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--amber)' }}>{stats.inboxPending ?? 0}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Inbox</div>
            </div>
          </div>
        </GlassCard>

        {brief.weather && (
          <GlassCard>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '2px', fontFamily: 'var(--mono)' }}>
              Weather · Ann Arbor
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: '2.8rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{brief.weather.temp}°</div>
              <div>
                <div style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>{brief.weather.condition}</div>
                {brief.weather.high != null && brief.weather.low != null && (
                  <div style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
                    H {brief.weather.high}° · L {brief.weather.low}°
                  </div>
                )}
              </div>
            </div>
          </GlassCard>
        )}
      </div>

      {/* ── AI Summary (NEW) ── */}
      <AISummarySection aiSummary={brief.aiSummary} generatedAt={brief.generatedAt || brief.date} />

      {/* ── Calendar events (NEW) ── */}
      <CalendarSection events={brief.calendar} />

      {/* ── Sentinel Alerts (NEW) ── */}
      <SentinelAlertsSection alerts={brief.sentinelAlerts} />

      {/* ── Highlights (NEW) ── */}
      <HighlightsSection highlights={brief.highlights} />

      {/* ── Schedule (existing, enhanced) ── */}
      {brief.schedule?.length > 0 && (
        <GlassCard style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <svg width="15" height="15" fill="none" stroke="var(--teal)" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
            </svg>
            <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>Today's Schedule</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {brief.schedule.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                <div style={{ fontSize: '0.85rem', color: 'var(--teal)', fontFamily: 'var(--mono)', fontWeight: 600, width: 80, flexShrink: 0 }}>{item.time}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.92rem', color: 'var(--text)', fontWeight: 600 }}>{item.event}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'capitalize', marginTop: 2 }}>{item.type}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Overnight Completions ── */}
      {brief.overnightCompletions?.length > 0 && (
        <GlassCard style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>
            Overnight Completions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {brief.overnightCompletions.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', background: 'rgba(45,212,191,0.05)', border: '1px solid rgba(45,212,191,0.2)', borderRadius: 8 }}>
                <span style={{ color: 'var(--green)', fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>✓</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>{item.agent || 'unknown'}</div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Active Tasks ── */}
      {brief.activeTasks?.length > 0 && (
        <GlassCard style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Active Tasks</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {brief.activeTasks.map((task) => (
              <div key={task.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: 8 }}>
                <span style={{ color: 'var(--blue)', fontSize: '0.65rem', flexShrink: 0 }}>●</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{task.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                    {task.agent || 'unassigned'} · {task.workState || 'not started'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* ── Upcoming Deadlines ── */}
      {brief.upcomingDeadlines?.length > 0 && (
        <GlassCard style={{ marginBottom: 24 }}>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Upcoming Deadlines</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {brief.upcomingDeadlines.map((item) => (
              <div key={item.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 12px', background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.2)', borderRadius: 8 }}>
                <span style={{ color: 'var(--amber)', fontSize: '0.9rem', fontWeight: 700, flexShrink: 0 }}>!</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.9rem', color: 'var(--text)' }}>{item.title}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 2 }}>
                    {item.daysLeft === 0 ? 'Due today' : item.daysLeft === 1 ? 'Due tomorrow' : `Due in ${item.daysLeft} days`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Empty state — show when brief has none of the rich sections */}
      {!brief.aiSummary && !brief.calendar?.length && !brief.sentinelAlerts?.length &&
       !brief.highlights?.length && !brief.schedule?.length && !brief.overnightCompletions?.length &&
       !brief.activeTasks?.length && !brief.upcomingDeadlines?.length && (
        <GlassCard style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🌅</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
            No activity to report yet
          </div>
          <div style={{ fontSize: '0.88rem', color: 'var(--muted)' }}>
            The brief will populate as the system works through the day.
          </div>
        </GlassCard>
      )}
    </div>
  );
}
