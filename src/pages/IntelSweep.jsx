import { useState, useCallback } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';

// ── Stat card ────────────────────────────────────────────────────────

function Stat({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '14px 18px', minWidth: 120, flex: '1 1 120px',
    }}>
      <div style={{ color: 'var(--muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color || 'var(--text)', lineHeight: 1 }}>{value ?? '—'}</div>
      {sub && <div style={{ color: 'var(--faint)', fontSize: '0.7rem', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

// ── Relevance bar ────────────────────────────────────────────────────

function RelevanceBar({ score }) {
  const pct = Math.round((score ?? 0) * 100);
  const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--amber)' : 'var(--muted)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ width: 48, height: 4, borderRadius: 2, background: 'var(--border)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
      </div>
      <span style={{ fontSize: '0.7rem', color, fontWeight: 600, fontFamily: 'var(--mono)' }}>{pct}%</span>
    </div>
  );
}

// ── Time ago helper ──────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return 'never';
  const diff = Date.now() - new Date(dateStr + 'Z').getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ── Status colors ────────────────────────────────────────────────────

const STATUS_COLORS = {
  discovered: '#94a3b8',
  queued: '#60a5fa',
  processed: '#34d399',
  failed: '#f87171',
  skipped: '#a78bfa',
};

const ACTION_COLORS = {
  informational: '#94a3b8',
  investigate: '#60a5fa',
  actionable: '#fbbf24',
  implement: '#34d399',
  urgent: '#f87171',
};

// ── Feed card ────────────────────────────────────────────────────────

function FeedCard({ feed, stats }) {
  const feedStat = stats?.feedStats?.find(s => s.id === feed.id);
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: feed.enabled ? 'var(--green)' : 'var(--muted)',
          boxShadow: feed.enabled ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
        }} />
        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem', flex: 1 }}>{feed.name}</span>
        {feed.tags?.map(t => <Badge key={t} label={t} color="#60a5fa" />)}
      </div>
      {feed.description && (
        <div style={{ color: 'var(--muted)', fontSize: '0.78rem', lineHeight: 1.4 }}>{feed.description}</div>
      )}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.72rem', color: 'var(--faint)' }}>
        <span>🔍 {feed.searchQueries?.length || 0} queries</span>
        <span>🌐 {feed.sourceUrls?.length || 0} URLs</span>
        <span>📺 {feed.youtubeChannels?.length || 0} channels</span>
        <span>📊 {feedStat?.source_count ?? 0} sources</span>
        <span>💡 {feedStat?.insight_count ?? 0} insights</span>
        <span style={{ marginLeft: 'auto' }}>Last sweep: {timeAgo(feed.lastSweepAt)}</span>
      </div>
    </div>
  );
}

// ── Source row ────────────────────────────────────────────────────────

function SourceRow({ source }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0',
      borderBottom: '1px solid var(--border)',
    }}>
      <Badge label={source.status} color={STATUS_COLORS[source.status] || '#94a3b8'} dot />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
          >
            {source.title || new URL(source.url).hostname}
          </a>
          {source.feed_name && <span style={{ color: 'var(--faint)', fontSize: '0.7rem' }}>{source.feed_name}</span>}
        </div>
        {source.snippet && (
          <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {source.snippet}
          </div>
        )}
      </div>
      <span style={{ color: 'var(--faint)', fontSize: '0.7rem', whiteSpace: 'nowrap' }}>
        {timeAgo(source.discovered_at)}
      </span>
    </div>
  );
}

// ── Insight row ──────────────────────────────────────────────────────

function InsightRow({ insight }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      style={{
        padding: '12px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer',
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Badge label={insight.actionability} color={ACTION_COLORS[insight.actionability] || '#94a3b8'} />
        <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: '0.85rem', flex: 1 }}>{insight.title}</span>
        <RelevanceBar score={insight.relevance_score} />
        {insight.category && <Badge label={insight.category} color="#a78bfa" />}
      </div>
      {expanded && (
        <div style={{ marginTop: 8, padding: '8px 12px', background: 'var(--surface)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--muted)', lineHeight: 1.5 }}>
          {insight.insight}
          {insight.source_url && (
            <div style={{ marginTop: 6 }}>
              <a href={insight.source_url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)', fontSize: '0.72rem' }}>
                Source: {insight.source_title || insight.source_url}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab component ────────────────────────────────────────────────────

function Tabs({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 16 }}>
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          style={{
            padding: '8px 16px', background: 'none', border: 'none', cursor: 'pointer',
            color: active === tab.id ? 'var(--text)' : 'var(--muted)',
            fontWeight: active === tab.id ? 700 : 400,
            borderBottom: active === tab.id ? '2px solid var(--teal)' : '2px solid transparent',
            fontSize: '0.82rem', transition: 'all 0.15s',
          }}
        >
          {tab.label}{tab.count != null ? ` (${tab.count})` : ''}
        </button>
      ))}
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function IntelSweep() {
  const [tab, setTab] = useState('overview');
  const [feedFilter, setFeedFilter] = useState('');

  const fetchAll = useCallback(async (signal) => {
    const [stats, feedsData, sourcesData, insightsData] = await Promise.all([
      api.intelStats(signal),
      api.intelFeeds(signal),
      api.intelSources({ limit: '50' }, signal),
      api.intelInsights({ limit: '50' }, signal),
    ]);
    return { stats, feeds: feedsData.feeds || [], sources: sourcesData.sources || [], insights: insightsData.insights || [] };
  }, []);

  const { data, loading, error } = usePolling(fetchAll, 30000);

  const stats = data?.stats || {};
  const feeds = data?.feeds || [];
  const sources = data?.sources || [];
  const insights = data?.insights || [];

  const filteredSources = feedFilter ? sources.filter(s => s.feed_id === feedFilter) : sources;
  const filteredInsights = feedFilter ? insights.filter(i => i.feed_id === feedFilter) : insights;

  if (loading && !data) {
    return (
      <div style={{ padding: 32 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>🔭 Intel Sweep</h1>
        <div style={{ color: 'var(--muted)' }}>Loading intelligence data…</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px 32px', maxWidth: 1100 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>🔭 Intel Sweep</h1>
        <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>Autonomous web intelligence gathering</span>
        {error && <span style={{ marginLeft: 'auto', color: 'var(--red)', fontSize: '0.75rem' }}>⚠ {error}</span>}
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 24 }}>
        <Stat label="Active Feeds" value={stats.feeds ?? 0} color="var(--teal)" />
        <Stat label="Sources" value={stats.sources?.total ?? 0} sub={`${stats.sources?.byStatus?.queued ?? 0} queued`} />
        <Stat label="Insights" value={stats.insights?.total ?? 0} sub={`${stats.insights?.actionable ?? 0} actionable`} color="var(--amber)" />
        <Stat label="Avg Relevance" value={stats.insights?.avgRelevance ?? '—'} color="var(--green)" />
      </div>

      {/* Feed filter */}
      {feeds.length > 1 && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFeedFilter('')}
            style={{
              padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: !feedFilter ? 'var(--teal)' : 'var(--surface)',
              color: !feedFilter ? '#000' : 'var(--muted)',
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
            }}
          >All feeds</button>
          {feeds.map(f => (
            <button
              key={f.id}
              onClick={() => setFeedFilter(f.id)}
              style={{
                padding: '4px 12px', borderRadius: 6, border: '1px solid var(--border)',
                background: feedFilter === f.id ? 'var(--teal)' : 'var(--surface)',
                color: feedFilter === f.id ? '#000' : 'var(--muted)',
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
              }}
            >{f.name}</button>
          ))}
        </div>
      )}

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'sources', label: 'Sources', count: filteredSources.length },
          { id: 'insights', label: 'Insights', count: filteredInsights.length },
          { id: 'feeds', label: 'Feeds', count: feeds.length },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* ── Overview Tab ─────────────────────────────────────── */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Feed summary cards */}
          <GlassCard>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>Active Feeds</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {feeds.length === 0 && <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No feeds configured yet</div>}
              {feeds.map(f => <FeedCard key={f.id} feed={f} stats={stats} />)}
            </div>
          </GlassCard>

          {/* Recent high-value insights */}
          <GlassCard>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>Top Insights</h3>
            {insights.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No insights yet — run a sweep to discover content</div>
            ) : (
              insights.slice(0, 8).map(i => <InsightRow key={i.id} insight={i} />)
            )}
          </GlassCard>

          {/* Recent sources */}
          <GlassCard>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>Recent Sources</h3>
            {sources.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>No sources discovered yet</div>
            ) : (
              sources.slice(0, 10).map(s => <SourceRow key={s.id} source={s} />)
            )}
          </GlassCard>
        </div>
      )}

      {/* ── Sources Tab ──────────────────────────────────────── */}
      {tab === 'sources' && (
        <GlassCard>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            {Object.entries(stats.sources?.byStatus || {}).map(([status, count]) => (
              <Badge key={status} label={`${status}: ${count}`} color={STATUS_COLORS[status] || '#94a3b8'} />
            ))}
          </div>
          {filteredSources.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem', padding: 20, textAlign: 'center' }}>
              No sources found{feedFilter ? ' for this feed' : ''}
            </div>
          ) : (
            filteredSources.map(s => <SourceRow key={s.id} source={s} />)
          )}
        </GlassCard>
      )}

      {/* ── Insights Tab ─────────────────────────────────────── */}
      {tab === 'insights' && (
        <GlassCard>
          {filteredInsights.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: '0.82rem', padding: 20, textAlign: 'center' }}>
              No insights extracted yet{feedFilter ? ' for this feed' : ''}
            </div>
          ) : (
            filteredInsights.map(i => <InsightRow key={i.id} insight={i} />)
          )}
        </GlassCard>
      )}

      {/* ── Feeds Tab ────────────────────────────────────────── */}
      {tab === 'feeds' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {feeds.map(feed => (
            <GlassCard key={feed.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: feed.enabled ? 'var(--green)' : 'var(--red)',
                  boxShadow: feed.enabled ? '0 0 6px rgba(34,197,94,0.5)' : 'none',
                }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', margin: 0, flex: 1 }}>{feed.name}</h3>
                <span style={{ color: 'var(--faint)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>{feed.id}</span>
              </div>
              {feed.description && <p style={{ color: 'var(--muted)', fontSize: '0.82rem', margin: '0 0 12px', lineHeight: 1.5 }}>{feed.description}</p>}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
                {/* Search queries */}
                <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Search Queries</div>
                  {(feed.searchQueries || []).map((q, i) => (
                    <div key={i} style={{ color: 'var(--text)', fontSize: '0.8rem', padding: '3px 0', fontFamily: 'var(--mono)' }}>• {q}</div>
                  ))}
                  {(!feed.searchQueries || feed.searchQueries.length === 0) && <div style={{ color: 'var(--faint)', fontSize: '0.78rem' }}>None configured</div>}
                </div>

                {/* Source URLs */}
                <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>Source URLs</div>
                  {(feed.sourceUrls || []).map((u, i) => (
                    <div key={i} style={{ color: 'var(--text)', fontSize: '0.78rem', padding: '3px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <a href={u} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--teal)' }}>{u}</a>
                    </div>
                  ))}
                  {(!feed.sourceUrls || feed.sourceUrls.length === 0) && <div style={{ color: 'var(--faint)', fontSize: '0.78rem' }}>None configured</div>}
                </div>

                {/* YouTube channels */}
                <div style={{ background: 'var(--surface)', borderRadius: 8, padding: 12, border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--muted)', fontSize: '0.7rem', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>YouTube Channels</div>
                  {(feed.youtubeChannels || []).map((c, i) => (
                    <div key={i} style={{ color: 'var(--text)', fontSize: '0.8rem', padding: '3px 0' }}>{c}</div>
                  ))}
                  {(!feed.youtubeChannels || feed.youtubeChannels.length === 0) && <div style={{ color: 'var(--faint)', fontSize: '0.78rem' }}>None configured</div>}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 16, marginTop: 12, fontSize: '0.72rem', color: 'var(--faint)' }}>
                <span>Schedule: <span style={{ fontFamily: 'var(--mono)', color: 'var(--muted)' }}>{feed.schedule}</span></span>
                <span>Max per sweep: <span style={{ color: 'var(--muted)' }}>{feed.maxItemsPerSweep}</span></span>
                <span>Last sweep: <span style={{ color: 'var(--muted)' }}>{timeAgo(feed.lastSweepAt)}</span></span>
                <span>Created: <span style={{ color: 'var(--muted)' }}>{timeAgo(feed.createdAt)}</span></span>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
