import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

const TYPE_ICONS = {
  push: { icon: '→', color: 'var(--green)', label: 'Push' },
  pr: { icon: '⇄', color: 'var(--blue)', label: 'Pull Request' },
  issue: { icon: '●', color: 'var(--amber)', label: 'Issue' },
  ci: { icon: '⚠', color: 'var(--red)', label: 'CI' },
};

const TABS = [
  { id: 'feed', label: 'Feed' },
  { id: 'prs', label: 'Pull Requests' },
  { id: 'ci', label: 'CI / Actions' },
];

const PR_STATE_COLORS = {
  OPEN: 'var(--green)',
  CLOSED: 'var(--red)',
  MERGED: 'var(--purple, #a78bfa)',
};

const CI_COLORS = {
  success: 'var(--green)',
  failure: 'var(--red)',
  cancelled: 'var(--muted)',
  in_progress: 'var(--amber)',
  queued: 'var(--blue)',
};

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function shortRepo(repo) {
  return repo?.split('/')[1] || repo;
}

// ─── PR Tab ──────────────────────────────────────────────────────────────────

function PRList({ prs }) {
  if (!prs || prs.length === 0) {
    return <EmptyState icon="⇄" message="No pull requests found" />;
  }

  // Group by repo
  const grouped = {};
  for (const pr of prs) {
    const repo = pr.repo || 'unknown';
    if (!grouped[repo]) grouped[repo] = [];
    grouped[repo].push(pr);
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {Object.entries(grouped).map(([repo, repoPRs]) => (
        <div key={repo}>
          <div style={{
            fontSize: '0.8rem', fontFamily: 'var(--mono)', color: 'var(--teal)',
            marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {shortRepo(repo)}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {repoPRs.map((pr) => (
              <GlassCard key={`${pr.repo}-${pr.number}`} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
                    background: PR_STATE_COLORS[pr.state] || 'var(--muted)', flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}
                      >
                        {pr.title}
                      </a>
                      <span style={{ fontSize: '0.75rem', color: 'var(--faint)' }}>#{pr.number}</span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                        background: `${PR_STATE_COLORS[pr.state] || 'var(--muted)'}22`,
                        color: PR_STATE_COLORS[pr.state] || 'var(--muted)',
                        textTransform: 'lowercase',
                      }}>
                        {pr.state?.toLowerCase() || 'unknown'}
                      </span>
                      {pr.author?.login && <span>by {pr.author.login}</span>}
                      <span>{timeAgo(pr.createdAt)}</span>
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── CI Tab ──────────────────────────────────────────────────────────────────

function CIList({ runs }) {
  if (!runs || runs.length === 0) {
    return <EmptyState icon="✓" message="No CI runs found" />;
  }

  const grouped = {};
  for (const run of runs) {
    const repo = run.repo || 'unknown';
    if (!grouped[repo]) grouped[repo] = [];
    grouped[repo].push(run);
  }

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {Object.entries(grouped).map(([repo, repoRuns]) => (
        <div key={repo}>
          <div style={{
            fontSize: '0.8rem', fontFamily: 'var(--mono)', color: 'var(--teal)',
            marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {shortRepo(repo)}
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {repoRuns.map((run, i) => {
              const status = run.conclusion || run.status || 'unknown';
              const color = CI_COLORS[status] || 'var(--muted)';
              const statusIcon = status === 'success' ? '✓' : status === 'failure' ? '✕' : status === 'in_progress' ? '◌' : '•';
              return (
                <GlassCard key={`${repo}-${i}`} style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color, fontSize: '1.1rem', fontWeight: 700, flexShrink: 0, width: 20, textAlign: 'center' }}>
                      {statusIcon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                        <a
                          href={run.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: 'var(--text)', textDecoration: 'none', fontWeight: 500, fontSize: '0.95rem' }}
                        >
                          {run.name || 'Workflow'}
                        </a>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '1px 6px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                          background: `${color}22`, color,
                        }}>
                          {status}
                        </span>
                        <span>{timeAgo(run.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Feed Tab ────────────────────────────────────────────────────────────────

function FeedList({ events, filter, setFilter }) {
  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.type === filter);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', 'push', 'pr', 'issue', 'ci'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '5px 12px',
              background: filter === f ? 'var(--teal)' : 'rgba(255,255,255,0.04)',
              border: '1px solid',
              borderColor: filter === f ? 'var(--teal)' : 'var(--border)',
              borderRadius: 6,
              color: filter === f ? 'white' : 'var(--muted)',
              fontSize: '0.8rem',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? 'All' : TYPE_ICONS[f]?.label || f}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <EmptyState icon="•" message="No events found" />
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {filteredEvents.map((event, i) => {
            const typeInfo = TYPE_ICONS[event.type] || { icon: '•', color: 'var(--muted)' };
            return (
              <GlassCard key={i} style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ color: typeInfo.color, fontSize: '1.3rem', flexShrink: 0, width: 20, textAlign: 'center' }}>{typeInfo.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.95rem', color: 'var(--text)', fontWeight: 500 }}>
                      {event.title}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem', color: 'var(--muted)', marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--teal)' }}>{shortRepo(event.repo)}</span>
                      {event.author && <span>by {event.author}</span>}
                      <span>{timeAgo(event.timestamp)}</span>
                    </div>
                    {event.url && (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', marginTop: 6, fontSize: '0.72rem', color: 'var(--teal)', textDecoration: 'none' }}
                      >
                        View on GitHub →
                      </a>
                    )}
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </>
  );
}

// ─── Empty state ─────────────────────────────────────────────────────────────

function EmptyState({ icon, message }) {
  return (
    <GlassCard style={{ textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.4 }}>{icon}</div>
      <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{message}</div>
    </GlassCard>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function GitHubFeed() {
  const [tab, setTab] = useState('feed');
  const [feed, setFeed] = useState(null);
  const [prs, setPrs] = useState(null);
  const [ciRuns, setCiRuns] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const ac = new AbortController();
    const load = async () => {
      try {
        const [feedData, prData, ciData] = await Promise.all([
          api.githubFeed(50, ac.signal),
          api.githubPRs(ac.signal),
          api.githubCI(ac.signal),
        ]);
        setFeed(feedData);
        setPrs(prData?.prs || []);
        setCiRuns(ciData?.runs || []);
      } catch (err) {
        if (!ac.signal.aborted) console.error('Failed to load GitHub data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
    return () => ac.abort();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div className="shimmer" style={{ height: 40, width: 240, borderRadius: 8, marginBottom: 24 }} />
        <div className="shimmer" style={{ height: 60, borderRadius: 12, marginBottom: 16 }} />
        <div className="shimmer" style={{ height: 400, borderRadius: 12 }} />
      </div>
    );
  }

  const events = feed?.events || [];
  const summary = feed?.summary || { recentCommits: 0, totalPRs: 0, failedCI: 0 };
  const failedCount = ciRuns ? ciRuns.filter(r => r.conclusion === 'failure').length : summary.failedCI;

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>GitHub</h1>
        <div style={{ fontSize: '0.9rem', color: 'var(--muted)' }}>Activity across lobs-ai and paw-engineering</div>
      </div>

      {/* Summary stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        <GlassCard style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => setTab('feed')}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--green)' }}>{summary.recentCommits}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Commits</div>
        </GlassCard>
        <GlassCard style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => setTab('prs')}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--blue)' }}>{prs?.length || summary.totalPRs}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Pull Requests</div>
        </GlassCard>
        <GlassCard style={{ padding: '16px 20px', cursor: 'pointer' }} onClick={() => setTab('ci')}>
          <div style={{ fontSize: '1.8rem', fontWeight: 700, color: failedCount > 0 ? 'var(--red)' : 'var(--green)' }}>
            {failedCount > 0 ? failedCount : '✓'}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            {failedCount > 0 ? 'Failed CI' : 'CI Passing'}
          </div>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 0, marginBottom: 24,
        borderBottom: '1px solid var(--border)',
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--teal)' : '2px solid transparent',
              color: tab === t.id ? 'var(--text)' : 'var(--muted)',
              fontSize: '0.9rem',
              fontWeight: tab === t.id ? 600 : 400,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {t.label}
            {t.id === 'ci' && failedCount > 0 && (
              <span style={{
                marginLeft: 6, padding: '1px 6px', borderRadius: 10,
                background: 'var(--red)', color: 'white', fontSize: '0.7rem', fontWeight: 700,
              }}>
                {failedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'feed' && <FeedList events={events} filter={filter} setFilter={setFilter} />}
      {tab === 'prs' && <PRList prs={prs} />}
      {tab === 'ci' && <CIList runs={ciRuns} />}
    </div>
  );
}
