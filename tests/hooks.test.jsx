/**
 * Tests for hooks (useApi, usePolling, useAffordances, useAIInvoke, useUIConfig)
 */
import { renderHook, waitFor, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// ── useApi ────────────────────────────────────────────────────────────────────

describe('useApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('calls fetcher on mount', async () => {
    const { useApi } = await import('../src/hooks/useApi');
    const fetcher = vi.fn(() => Promise.resolve({ result: 'data' }));

    const { result } = renderHook(() => useApi(fetcher));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalled();
    expect(result.current.data).toEqual({ result: 'data' });
  });

  test('returns data, loading, error, reload', async () => {
    const { useApi } = await import('../src/hooks/useApi');
    const fetcher = vi.fn(() => Promise.resolve({ test: 'value' }));

    const { result } = renderHook(() => useApi(fetcher));

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('reload');
    expect(typeof result.current.reload).toBe('function');
  });

  test('handles errors gracefully', async () => {
    const { useApi } = await import('../src/hooks/useApi');
    const fetcher = vi.fn(() => Promise.reject(new Error('Network error')));

    const { result } = renderHook(() => useApi(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Network error');
    expect(result.current.data).toBeNull();
  });

  test('reload calls fetcher again', async () => {
    const { useApi } = await import('../src/hooks/useApi');
    const fetcher = vi.fn(() => Promise.resolve({ count: 1 }));

    const { result } = renderHook(() => useApi(fetcher));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => { result.current.reload(); });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

// ── usePolling ────────────────────────────────────────────────────────────────

describe('usePolling', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('calls fetcher on mount', async () => {
    const { usePolling } = await import('../src/hooks/usePolling');
    const fetcher = vi.fn(() => Promise.resolve({ result: 'polling' }));

    const { result } = renderHook(() => usePolling(fetcher, 60000));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(fetcher).toHaveBeenCalled();
    expect(result.current.data).toEqual({ result: 'polling' });
  });

  test('returns data, loading, error, reload', async () => {
    const { usePolling } = await import('../src/hooks/usePolling');
    const fetcher = vi.fn(() => Promise.resolve({ test: 'poll' }));

    const { result } = renderHook(() => usePolling(fetcher, 60000));

    expect(result.current).toHaveProperty('data');
    expect(result.current).toHaveProperty('loading');
    expect(result.current).toHaveProperty('error');
    expect(result.current).toHaveProperty('reload');
    expect(typeof result.current.reload).toBe('function');
  });

  test('handles errors without crashing', async () => {
    const { usePolling } = await import('../src/hooks/usePolling');
    const fetcher = vi.fn(() => Promise.reject(new Error('Poll failed')));

    const { result } = renderHook(() => usePolling(fetcher, 60000));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Poll failed');
  });

  test('reload triggers re-fetch', async () => {
    const { usePolling } = await import('../src/hooks/usePolling');
    const fetcher = vi.fn(() => Promise.resolve({ count: 1 }));

    const { result } = renderHook(() => usePolling(fetcher, 60000));

    await waitFor(() => expect(result.current.loading).toBe(false));
    const initialCallCount = fetcher.mock.calls.length;

    act(() => { result.current.reload(); });
    expect(fetcher.mock.calls.length).toBeGreaterThan(initialCallCount);
  });
});

// ── useAffordances ────────────────────────────────────────────────────────────

describe('useAffordances', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock the api module that useAffordances uses internally
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ affordances: [] }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns empty array initially', async () => {
    const { useAffordances } = await import('../src/hooks/useAffordances');

    const { result } = renderHook(() => useAffordances('test-page'));

    expect(Array.isArray(result.current)).toBe(true);
    expect(result.current.length).toBe(0);
  });

  test('returns array type', async () => {
    const { useAffordances } = await import('../src/hooks/useAffordances');

    const { result } = renderHook(() => useAffordances('dashboard'));

    expect(Array.isArray(result.current)).toBe(true);
  });
});

// ── useAIInvoke ───────────────────────────────────────────────────────────────

describe('useAIInvoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns invoke function and state', async () => {
    const { useAIInvoke } = await import('../src/hooks/useAIInvoke');

    const { result } = renderHook(() => useAIInvoke());

    expect(result.current).toHaveProperty('invoke');
    expect(typeof result.current.invoke).toBe('function');
    expect(result.current).toHaveProperty('loading');
    expect(result.current.loading).toBe(false);
    expect(result.current).toHaveProperty('error');
    expect(result.current.error).toBeNull();
  });
});

// ── useUIConfig ───────────────────────────────────────────────────────────────

describe('useUIConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        layout: 'command-center',
        widgetOrder: [],
        hiddenWidgets: [],
      }),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('returns config and updateConfig', async () => {
    const { useUIConfig } = await import('../src/hooks/useUIConfig');

    const { result } = renderHook(() => useUIConfig());

    expect(result.current).toHaveProperty('config');
    expect(result.current).toHaveProperty('updateConfig');
    expect(typeof result.current.updateConfig).toBe('function');
    expect(result.current.config.layout).toBe('command-center');
  });

  test('config has default values', async () => {
    const { useUIConfig } = await import('../src/hooks/useUIConfig');

    const { result } = renderHook(() => useUIConfig());

    expect(result.current.config).toHaveProperty('layout');
    expect(result.current.config).toHaveProperty('widgetOrder');
    expect(result.current.config).toHaveProperty('hiddenWidgets');
    expect(Array.isArray(result.current.config.widgetOrder)).toBe(true);
  });
});
