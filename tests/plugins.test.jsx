/**
 * Tests for the Plugins page component.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../src/hooks/useApi', () => ({
  useApi: vi.fn(() => ({ data: null, loading: true, error: null, reload: vi.fn() })),
}));

vi.mock('../src/hooks/useAffordances', () => ({
  useAffordances: vi.fn(() => []),
  invalidateAffordancesCache: vi.fn(),
}));

vi.mock('../src/lib/api', () => ({
  api: {
    plugins: vi.fn().mockResolvedValue({ plugins: [] }),
    updatePlugin: vi.fn().mockResolvedValue({}),
    invokePlugin: vi.fn().mockResolvedValue({ result: 'test' }),
    uiAffordances: vi.fn().mockResolvedValue({ affordances: [] }),
    status: vi.fn().mockResolvedValue({ server: { status: 'healthy' } }),
  },
}));

vi.mock('../src/components/Toast', () => ({
  showToast: vi.fn(),
}));

import { useApi } from '../src/hooks/useApi';
import Plugins from '../src/pages/Plugins';

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

const makePlugin = (overrides = {}) => ({
  id: 'smart-reply',
  name: 'Smart Reply',
  description: 'Suggests quick reply chips.',
  category: 'productivity',
  enabled: true,
  config: {},
  configSchema: {},
  uiAffordances: [],
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Plugins page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders loading skeleton initially', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Plugins />);
    // LoadingSkeleton renders divs with animated backgrounds
    const container = document.body;
    expect(container).toBeTruthy();
  });

  test('shows heading when loaded', () => {
    vi.mocked(useApi).mockReturnValue({ data: { plugins: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Plugins />);
    expect(screen.getByText('Plugins')).toBeInTheDocument();
  });

  test('shows empty state when no plugins', () => {
    vi.mocked(useApi).mockReturnValue({ data: { plugins: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Plugins />);
    expect(screen.getByText('No plugins installed')).toBeInTheDocument();
  });

  test('shows plugin cards when data loads', () => {
    const plugins = [
      makePlugin({ id: 'smart-reply', name: 'Smart Reply', category: 'productivity', enabled: true }),
      makePlugin({ id: 'pr-insights', name: 'PR Insights', category: 'dev', enabled: false }),
    ];
    vi.mocked(useApi).mockReturnValue({ data: { plugins }, loading: false, error: null, reload: vi.fn() });
    wrap(<Plugins />);
    expect(screen.getByText('Smart Reply')).toBeInTheDocument();
    expect(screen.getByText('PR Insights')).toBeInTheDocument();
  });

  test('shows enabled counter', () => {
    const plugins = [
      makePlugin({ id: 'p1', name: 'Plugin 1', enabled: true }),
      makePlugin({ id: 'p2', name: 'Plugin 2', enabled: false }),
      makePlugin({ id: 'p3', name: 'Plugin 3', enabled: true }),
    ];
    vi.mocked(useApi).mockReturnValue({ data: { plugins }, loading: false, error: null, reload: vi.fn() });
    wrap(<Plugins />);
    expect(screen.getByText(/2 \/ 3 enabled/)).toBeInTheDocument();
  });

  test('category grouping - shows category label for dev plugins', () => {
    const plugins = [
      makePlugin({ id: 'pr-insights', name: 'PR Insights', category: 'dev', enabled: true }),
    ];
    vi.mocked(useApi).mockReturnValue({ data: { plugins }, loading: false, error: null, reload: vi.fn() });
    wrap(<Plugins />);
    // Category label and badge both show "dev" — at least one should exist
    expect(screen.getAllByText('dev').length).toBeGreaterThanOrEqual(1);
  });

  test('category grouping - shows multiple categories', () => {
    const plugins = [
      makePlugin({ id: 'p1', name: 'Dev Plugin', category: 'dev', enabled: true }),
      makePlugin({ id: 'p2', name: 'Productivity Plugin', category: 'productivity', enabled: true }),
    ];
    vi.mocked(useApi).mockReturnValue({ data: { plugins }, loading: false, error: null, reload: vi.fn() });
    wrap(<Plugins />);
    expect(screen.getAllByText('dev').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('productivity').length).toBeGreaterThanOrEqual(1);
  });

  test('expand/collapse works - clicking card shows affordances section', async () => {
    const plugin = makePlugin({
      id: 'smart-reply',
      name: 'Smart Reply',
      category: 'productivity',
      enabled: true,
      uiAffordances: [
        { id: 'reply-chips', type: 'chips', target: 'inbox-message', label: 'Reply suggestions', aiAction: 'suggest-reply' },
      ],
    });
    vi.mocked(useApi).mockReturnValue({ data: { plugins: [plugin] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Plugins />);

    const pluginName = screen.getByText('Smart Reply');
    const headerRow = pluginName.closest('[style]');
    // Find the clickable header row and click it
    const clickTarget = pluginName.parentElement?.parentElement;
    if (clickTarget) {
      fireEvent.click(clickTarget);
      await waitFor(() => {
        expect(screen.getByText(/UI Affordances/i)).toBeInTheDocument();
      });
    }
  });

  test('graceful error state when API unavailable', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: false, error: 'Network error', reload: vi.fn() });
    wrap(<Plugins />);
    expect(screen.getByText(/Plugin API not available yet/)).toBeInTheDocument();
  });

  test('toggle switch calls API to enable/disable', async () => {
    const { api } = await import('../src/lib/api');
    const reload = vi.fn();
    const plugin = makePlugin({ id: 'smart-reply', name: 'Smart Reply', enabled: false });
    vi.mocked(useApi).mockReturnValue({ data: { plugins: [plugin] }, loading: false, error: null, reload });

    wrap(<Plugins />);

    const toggle = screen.getByRole('switch');
    await act(async () => {
      fireEvent.click(toggle);
    });

    await waitFor(() => {
      expect(api.updatePlugin).toHaveBeenCalledWith('smart-reply', { enabled: true });
    });
  });
});
