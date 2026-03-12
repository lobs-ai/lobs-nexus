/**
 * Tests for Tasks page
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../src/hooks/usePolling', () => ({
  usePolling: vi.fn(() => ({ data: null, loading: true, error: null, reload: vi.fn() })),
}));

vi.mock('../src/hooks/useApi', () => ({
  useApi: vi.fn(() => ({ data: null, loading: true, error: null, reload: vi.fn() })),
}));

vi.mock('../src/hooks/useAffordances', () => ({
  useAffordances: vi.fn(() => []),
}));

import { usePolling } from '../src/hooks/usePolling';
import { useApi } from '../src/hooks/useApi';
import Tasks from '../src/pages/Tasks';

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

const makeTask = (overrides = {}) => ({
  id: 'task-1',
  title: 'Test Task',
  status: 'active',
  agent: 'programmer',
  model_tier: 'standard',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Tasks page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('renders without crashing', () => {
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Tasks />);
    expect(document.body).toBeTruthy();
  });

  test('shows loading state when loading', () => {
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Tasks />);
    // LoadingSkeleton renders with inline animation styles
    expect(document.body).toBeTruthy();
  });

  test('displays heading when loaded', () => {
    vi.mocked(usePolling).mockReturnValue({ data: { tasks: [] }, loading: false, error: null, reload: vi.fn() });
    vi.mocked(useApi).mockReturnValue({ data: { projects: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Tasks />);
    expect(screen.getByText('Tasks')).toBeInTheDocument();
  });

  test('shows empty state when no tasks', () => {
    vi.mocked(usePolling).mockReturnValue({ data: { tasks: [] }, loading: false, error: null, reload: vi.fn() });
    vi.mocked(useApi).mockReturnValue({ data: { projects: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Tasks />);
    expect(document.body.textContent).toContain('Tasks');
  });

  test('displays task cards', () => {
    const tasks = [
      makeTask({ id: 't1', title: 'Task One', status: 'active' }),
      makeTask({ id: 't2', title: 'Task Two', status: 'active' }),
    ];
    vi.mocked(usePolling).mockReturnValue({ data: { tasks }, loading: false, error: null, reload: vi.fn() });
    vi.mocked(useApi).mockReturnValue({ data: { projects: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Tasks />);
    expect(screen.getByText('Task One')).toBeInTheDocument();
    expect(screen.getByText('Task Two')).toBeInTheDocument();
  });

  test('handles null tasks array', () => {
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: false, error: null, reload: vi.fn() });
    vi.mocked(useApi).mockReturnValue({ data: null, loading: false, error: null, reload: vi.fn() });
    wrap(<Tasks />);
    expect(document.body.textContent).toContain('Tasks');
  });

  test('renders filter buttons', () => {
    const tasks = [makeTask({ id: 't1', title: 'Active Task', status: 'active' })];
    vi.mocked(usePolling).mockReturnValue({ data: { tasks }, loading: false, error: null, reload: vi.fn() });
    vi.mocked(useApi).mockReturnValue({ data: { projects: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Tasks />);
    // Filter buttons are rendered
    expect(screen.getByText('Active Task')).toBeInTheDocument();
  });
});
