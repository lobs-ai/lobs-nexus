import { useState, useEffect } from 'react';
import GlassCard from '../components/GlassCard';
import { api } from '../lib/api';

const TYPE_ICONS = {
  push: { icon: '→', color: 'var(--green)', label: 'Push' },
  pr: { icon: '⇄', color: 'var(--blue)', label: 'Pull Request' },
  issue: { icon: '●', color: 'var(--amber)', label: 'Issue' },
  ci: { icon: '⚠', color: 'var(--red)', label: 'CI' },
};

export default function GitHubFeed() {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.githubFeed(50);
        setFeed(data);
      } catch (err) {
        console.error('Failed to load GitHub feed:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 32 }}>
        <div className="shimmer" style={{ height: 40, width: 200, borderRadius: 8, marginBottom: 24 }} />
        <div className="shimmer" style={{ height: 400, borderRadius: 12 }} />
      </div>
    );
  }

  if (!feed) return <div style={{ padding: 32, color: 'var(--muted)' }}>Failed to load GitHub feed</div>;

  const events = feed.events || [];
  const summary = feed.summary || { recentCommits: 0, totalPRs: 0, failedCI: 0 };
  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.type === filter);

  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>GitHub Activity</h1>
        <div style={{ fontSize: '1rem', color: 'var(--muted)' }}>Recent events across lobs-ai and paw-engineering</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <GlassCard>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--green)' }}>{summary.recentCommits}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Recent Commits</div>
        </GlassCard>
        <GlassCard>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--blue)' }}>{summary.totalPRs}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Open PRs</div>
        </GlassCard>
        <GlassCard>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--red)' }}>{summary.failedCI}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Failed CI</div>
        </GlassCard>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        {['all', 'push', 'pr', 'issue', 'ci'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: '6px 14px',
              background: filter === f ? 'var(--teal)' : 'rgba(255,255,255,0.04)',
              border: '1px solid',
              borderColor: filter === f ? 'var(--teal)' : 'var(--border)',
              borderRadius: 6,
              color: filter === f ? 'white' : 'var(--muted)',
              fontSize: '0.85rem',
              cursor: 'pointer',
              textTransform: 'capitalize',
            }}
          >
            {f === 'all' ? 'All' : TYPE_ICONS[f]?.label || f}
          </button>
        ))}
      </div>

      {filteredEvents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--muted)' }}>No events found</div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {filteredEvents.map((event, i) => {
            const typeInfo = TYPE_ICONS[event.type] || { icon: '•', color: 'var(--muted)' };
            return (
              <GlassCard key={i} style={{ padding: 16 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: typeInfo.color, fontSize: '1.5rem', flexShrink: 0 }}>{typeInfo.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '1rem', color: 'var(--text)', marginBottom: 6, fontWeight: 500 }}>
                      {event.title}
                    </div>
                    <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--muted)', flexWrap: 'wrap' }}>
                      <span style={{ fontFamily: 'var(--mono)', color: 'var(--teal)' }}>{event.repo}</span>
                      {event.author && <span>by {event.author}</span>}
                      {event.timestamp && (
                        <span>{new Date(event.timestamp).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                      )}
                    </div>
                    {event.url && (
                      <a
                        href={event.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ display: 'inline-block', marginTop: 8, fontSize: '0.75rem', color: 'var(--teal)', textDecoration: 'none' }}
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
    </div>
  );
}
