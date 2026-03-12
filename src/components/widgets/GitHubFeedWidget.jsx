import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import GlassCard from '../GlassCard';
import { api } from '../../lib/api';

const TYPE_ICONS = {
  push: { icon: '→', color: 'var(--green)' },
  pr: { icon: '⇄', color: 'var(--blue)' },
  issue: { icon: '●', color: 'var(--amber)' },
  ci: { icon: '⚠', color: 'var(--red)' },
};

export default function GitHubFeedWidget() {
  const [feed, setFeed] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.githubFeed(10);
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
      <GlassCard>
        <div className="shimmer" style={{ height: 20, borderRadius: 6, marginBottom: 12 }} />
        <div className="shimmer" style={{ height: 14, borderRadius: 6, marginBottom: 8 }} />
        <div className="shimmer" style={{ height: 14, borderRadius: 6, width: '80%' }} />
      </GlassCard>
    );
  }

  if (!feed || !feed.events || feed.events.length === 0) {
    return (
      <GlassCard>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ fontSize: '1.3rem' }}>🐙</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>GitHub Activity</div>
        </div>
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)', fontSize: '0.85rem' }}>
          No recent activity
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: '1.3rem' }}>🐙</span>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)' }}>GitHub Activity</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {feed.summary?.totalPRs > 0 && (
            <span style={{ padding: '2px 6px', background: 'rgba(99,102,241,0.1)', borderRadius: 4, fontSize: '0.7rem', color: 'var(--blue)' }}>
              {feed.summary.totalPRs} PRs
            </span>
          )}
          {feed.summary?.failedCI > 0 && (
            <span style={{ padding: '2px 6px', background: 'rgba(239,68,68,0.1)', borderRadius: 4, fontSize: '0.7rem', color: 'var(--red)' }}>
              {feed.summary.failedCI} CI ✗
            </span>
          )}
        </div>
      </div>

      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {feed.events.slice(0, 10).map((event, i) => {
          const typeInfo = TYPE_ICONS[event.type] || { icon: '•', color: 'var(--muted)' };
          return (
            <div key={i} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: i < 9 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: typeInfo.color, fontSize: '1rem', flexShrink: 0 }}>{typeInfo.icon}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.title}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--mono)' }}>{event.repo}</span>
                    {event.author && <span>· {event.author}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <Link to="/github" style={{ fontSize: '0.75rem', color: 'var(--teal)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 12 }}>
        View all activity →
      </Link>
    </GlassCard>
  );
}
