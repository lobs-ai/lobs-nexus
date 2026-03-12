/**
 * Tests for utility functions in lib/utils.js
 */
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  formatDate, 
  timeAgo, 
  formatDuration, 
  formatCost, 
  formatTokens, 
  formatUptime 
} from '../src/lib/utils';

// ── formatDate ────────────────────────────────────────────────────────────────

describe('formatDate', () => {
  test('formats valid date string', () => {
    const result = formatDate('2024-01-15T12:30:00Z');
    expect(result).toBeTruthy();
    expect(result).not.toBe('—');
  });

  test('returns em dash for null', () => {
    expect(formatDate(null)).toBe('—');
  });

  test('returns em dash for undefined', () => {
    expect(formatDate(undefined)).toBe('—');
  });

  test('returns em dash for empty string', () => {
    expect(formatDate('')).toBe('—');
  });

  test('returns em dash for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('—');
  });

  test('accepts custom options', () => {
    const result = formatDate('2024-01-15T12:30:00Z', { year: 'numeric', month: 'long' });
    expect(result).toBeTruthy();
  });
});

// ── timeAgo ───────────────────────────────────────────────────────────────────

describe('timeAgo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-12T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test('returns "never" for null', () => {
    expect(timeAgo(null)).toBe('never');
  });

  test('returns "never" for undefined', () => {
    expect(timeAgo(undefined)).toBe('never');
  });

  test('returns em dash for invalid date', () => {
    expect(timeAgo('invalid')).toBe('—');
  });

  test('formats seconds ago', () => {
    const date = new Date('2024-03-12T11:59:30Z').toISOString();
    expect(timeAgo(date)).toBe('30s ago');
  });

  test('formats minutes ago', () => {
    const date = new Date('2024-03-12T11:55:00Z').toISOString();
    expect(timeAgo(date)).toBe('5m ago');
  });

  test('formats hours ago', () => {
    const date = new Date('2024-03-12T10:00:00Z').toISOString();
    expect(timeAgo(date)).toBe('2h ago');
  });

  test('formats days ago', () => {
    const date = new Date('2024-03-10T12:00:00Z').toISOString();
    expect(timeAgo(date)).toBe('2d ago');
  });

  test('formats weeks ago', () => {
    const date = new Date('2024-03-05T12:00:00Z').toISOString();
    expect(timeAgo(date)).toBe('1w ago');
  });

  test('formats future dates with "in"', () => {
    const date = new Date('2024-03-12T13:00:00Z').toISOString();
    expect(timeAgo(date)).toBe('in 1h');
  });

  test('uses formatDate for dates older than 4 weeks', () => {
    const date = new Date('2024-01-01T12:00:00Z').toISOString();
    const result = timeAgo(date);
    expect(result).toBeTruthy();
    expect(result).not.toContain('ago');
  });
});

// ── formatDuration ────────────────────────────────────────────────────────────

describe('formatDuration', () => {
  test('returns "--" for null start', () => {
    expect(formatDuration(null, null)).toBe('--');
  });

  test('formats seconds', () => {
    const start = new Date('2024-03-12T12:00:00Z').toISOString();
    const end = new Date('2024-03-12T12:00:30Z').toISOString();
    expect(formatDuration(start, end)).toBe('30s');
  });

  test('formats minutes and seconds', () => {
    const start = new Date('2024-03-12T12:00:00Z').toISOString();
    const end = new Date('2024-03-12T12:05:30Z').toISOString();
    expect(formatDuration(start, end)).toBe('5m 30s');
  });

  test('formats hours and minutes', () => {
    const start = new Date('2024-03-12T12:00:00Z').toISOString();
    const end = new Date('2024-03-12T14:30:00Z').toISOString();
    expect(formatDuration(start, end)).toBe('2h 30m');
  });

  test('formats days and hours', () => {
    const start = new Date('2024-03-10T12:00:00Z').toISOString();
    const end = new Date('2024-03-12T14:00:00Z').toISOString();
    expect(formatDuration(start, end)).toBe('2d 2h');
  });

  test('uses current time if no end provided', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-03-12T12:05:00Z'));
    
    const start = new Date('2024-03-12T12:00:00Z').toISOString();
    expect(formatDuration(start)).toBe('5m 0s');
    
    vi.useRealTimers();
  });

  test('handles zero duration', () => {
    const start = new Date('2024-03-12T12:00:00Z').toISOString();
    const end = new Date('2024-03-12T12:00:00Z').toISOString();
    expect(formatDuration(start, end)).toBe('0s');
  });
});

// ── formatCost ────────────────────────────────────────────────────────────────

describe('formatCost', () => {
  test('returns "--" for null', () => {
    expect(formatCost(null)).toBe('--');
  });

  test('returns "--" for undefined', () => {
    expect(formatCost(undefined)).toBe('--');
  });

  test('formats zero cost', () => {
    expect(formatCost(0)).toBe('$0.00¢');
  });

  test('formats small costs in cents', () => {
    expect(formatCost(0.005)).toBe('$0.50¢');
  });

  test('formats costs >= $0.01 in dollars', () => {
    expect(formatCost(1.234)).toBe('$1.234');
  });

  test('formats large costs', () => {
    expect(formatCost(123.456)).toBe('$123.456');
  });

  test('formats exactly $0.01', () => {
    expect(formatCost(0.01)).toBe('$0.010');
  });
});

// ── formatTokens ──────────────────────────────────────────────────────────────

describe('formatTokens', () => {
  test('returns "--" for null', () => {
    expect(formatTokens(null)).toBe('--');
  });

  test('returns "--" for undefined', () => {
    expect(formatTokens(undefined)).toBe('--');
  });

  test('formats zero tokens', () => {
    expect(formatTokens(0)).toBe('0');
  });

  test('formats small numbers as-is', () => {
    expect(formatTokens(999)).toBe('999');
  });

  test('formats thousands with K', () => {
    expect(formatTokens(5000)).toBe('5.0K');
  });

  test('formats millions with M', () => {
    expect(formatTokens(2500000)).toBe('2.5M');
  });

  test('formats exactly 1000', () => {
    expect(formatTokens(1000)).toBe('1.0K');
  });

  test('formats exactly 1000000', () => {
    expect(formatTokens(1000000)).toBe('1.0M');
  });
});

// ── formatUptime ──────────────────────────────────────────────────────────────

describe('formatUptime', () => {
  test('returns "--" for null', () => {
    expect(formatUptime(null)).toBe('--');
  });

  test('returns "--" for undefined', () => {
    expect(formatUptime(undefined)).toBe('--');
  });

  test('returns "--" for zero', () => {
    expect(formatUptime(0)).toBe('--');
  });

  test('formats seconds', () => {
    expect(formatUptime(45)).toBe('45s');
  });

  test('formats minutes', () => {
    expect(formatUptime(180)).toBe('3m');
  });

  test('formats hours and minutes', () => {
    expect(formatUptime(3600 + 1800)).toBe('1h 30m');
  });

  test('formats days and hours', () => {
    expect(formatUptime(86400 + 7200)).toBe('1d 2h');
  });

  test('formats exactly 1 minute', () => {
    expect(formatUptime(60)).toBe('1m');
  });

  test('formats exactly 1 hour', () => {
    expect(formatUptime(3600)).toBe('1h 0m');
  });

  test('formats exactly 1 day', () => {
    expect(formatUptime(86400)).toBe('1d 0h');
  });
});
