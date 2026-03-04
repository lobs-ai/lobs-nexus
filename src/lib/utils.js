export function timeAgo(dateStr) {
  if (!dateStr) return 'never';

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 'invalid date';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const isFuture = diffMs < 0;
  const absSeconds = Math.floor(Math.abs(diffMs) / 1000);

  const withDirection = (value, unit) => {
    if (isFuture) return `in ${value}${unit}`;
    return `${value}${unit} ago`;
  };

  if (absSeconds < 60) return withDirection(absSeconds, 's');

  const minutes = Math.floor(absSeconds / 60);
  if (minutes < 60) return withDirection(minutes, 'm');

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return withDirection(hours, 'h');

  const days = Math.floor(hours / 24);
  if (days < 7) return withDirection(days, 'd');

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return withDirection(weeks, 'w');

  // For older/farther dates, use an explicit date instead of large relative values.
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function formatDuration(startedAt, endedAt) {
  if (!startedAt) return '--';

  const end = endedAt ? new Date(endedAt) : new Date();
  const start = new Date(startedAt);
  const seconds = Math.max(0, Math.floor((end - start) / 1000));

  if (seconds < 60) return `${seconds}s`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
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

  const totalSeconds = Math.floor(seconds);
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const minutes = Math.floor(totalSeconds / 60);
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;

  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
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
