export function timeAgo(dateStr) {
  if (!dateStr) return 'never';
  const date = new Date(dateStr);
  const now = Date.now();
  const diff = now - date.getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function formatDuration(startedAt, endedAt) {
  if (!startedAt) return '--';
  const end = endedAt ? new Date(endedAt) : new Date();
  const ms = end - new Date(startedAt);
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m ${s % 60}s`;
}

export function formatCost(usd) {
  if (!usd && usd !== 0) return '--';
  if (usd < 0.01) return `$${(usd * 100).toFixed(2)}¢`;
  return `$${usd.toFixed(3)}`;
}

export function formatTokens(n) {
  if (!n && n !== 0) return '--';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toString();
}

export function formatUptime(seconds) {
  if (!seconds) return '--';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export const AGENT_COLORS = {
  programmer: '#38bdf8',
  writer: '#a78bfa',
  researcher: '#2dd4bf',
  reviewer: '#fbbf24',
  architect: '#f87171',
  lobs: '#34d399',
};

export const TIER_COLORS = {
  micro: '#475569',
  small: '#38bdf8',
  medium: '#2dd4bf',
  standard: '#a78bfa',
  strong: '#f87171',
};

export const STATUS_COLORS = {
  active: '#2dd4bf',
  completed: '#34d399',
  cancelled: '#475569',
  failed: '#f87171',
  inbox: '#38bdf8',
  waiting_on: '#fbbf24',
  archived: '#334155',
  healthy: '#34d399',
  degraded: '#fbbf24',
  error: '#f87171',
};
