/**
 * Tests for Dashboard page
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../src/hooks/usePolling', () => ({
  usePolling: vi.fn(() => ({ data: null, loading: true, error: null, reload: vi.fn() })),
}));

vi.mock('../src/hooks/useAffordances', () => ({
  useAffordances: vi.fn(() => []),
}));

vi.mock('../src/hooks/useAIInvoke', () => ({
  useAIInvoke: vi.fn(() => ({ invoke: vi.fn(), loading: false, error: null })),
}));

vi.mock('../src/hooks/useUIConfig', () => ({
  useUIConfig: vi.fn(() => ({
    config: { layout: 'command-center', widgetOrder: [], hiddenWidgets: [], agentHighlights: [] },
    updateConfig: vi.fn(),
  })),
}));

// Mock fetch for widgets that call fetch directly
beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  }));
});

import { usePolling } from '../src/hooks/usePolling';
import Dashboard from '../src/pages/Dashboard';

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

const mockPollingWith = (data) => {
  vi.mocked(usePolling).mockReturnValue({ data, loading: false, error: null, reload: vi.fn() });
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([]),
    }));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders without crashing', () => {
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Dashboard />);
    expect(document.body).toBeTruthy();
  });

  test('displays NEXUS header text', () => {
    mockPollingWith(null);
    wrap(<Dashboard />);
    expect(screen.getByText(/LOBS NEXUS/)).toBeInTheDocument();
  });

  test('shows All Systems Nominal when no active workers', () => {
    // Dashboard calls usePolling 4 times: status, activity, workerStatus, tasksData
    // We need to return appropriate shapes for each
    let callCount = 0;
    vi.mocked(usePolling).mockImplementation(() => {
      callCount++;
      const base = { loading: false, error: null, reload: vi.fn() };
      if (callCount % 4 === 1) return { ...base, data: { server: { status: 'healthy' }, workers: { active: 0 }, tasks: { active: 0 } } };
      if (callCount % 4 === 2) return { ...base, data: [] }; // activity
      if (callCount % 4 === 3) return { ...base, data: { workers: [] } }; // workerStatus
      return { ...base, data: { tasks: [] } }; // tasksData
    });
    wrap(<Dashboard />);
    expect(screen.getByText('All Systems Nominal')).toBeInTheDocument();
  });

  test('shows Systems Active when workers are running', () => {
    let callCount = 0;
    vi.mocked(usePolling).mockImplementation(() => {
      callCount++;
      const base = { loading: false, error: null, reload: vi.fn() };
      if (callCount % 4 === 1) return { ...base, data: { server: { status: 'healthy' }, workers: { active: 2 }, tasks: { active: 1 } } };
      if (callCount % 4 === 2) return { ...base, data: [] };
      if (callCount % 4 === 3) return { ...base, data: { workers: [] } };
      return { ...base, data: { tasks: [] } };
    });
    wrap(<Dashboard />);
    expect(screen.getByText('Systems Active')).toBeInTheDocument();
  });

  test('handles null data gracefully', () => {
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: false, error: null, reload: vi.fn() });
    wrap(<Dashboard />);
    // Even with null data, the page should render without crashing
    expect(document.body).toBeTruthy();
  });

  test('handles API error state', () => {
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: false, error: 'Network error', reload: vi.fn() });
    wrap(<Dashboard />);
    expect(document.body).toBeTruthy();
  });

  test('renders stat cards section', () => {
    let callCount = 0;
    vi.mocked(usePolling).mockImplementation(() => {
      callCount++;
      const base = { loading: false, error: null, reload: vi.fn() };
      if (callCount % 4 === 1) return { ...base, data: { server: { status: 'healthy' }, workers: { active: 0 }, tasks: { active: 0, completed_today: 3 } } };
      if (callCount % 4 === 2) return { ...base, data: [] };
      if (callCount % 4 === 3) return { ...base, data: { workers: [] } };
      return { ...base, data: { tasks: [] } };
    });
    wrap(<Dashboard />);
    expect(screen.getAllByText('Active Workers').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tasks Today').length).toBeGreaterThan(0);
    expect(screen.getAllByText('System Uptime').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Queue Depth').length).toBeGreaterThan(0);
  });
});
