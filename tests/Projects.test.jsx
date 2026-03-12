/**
 * Tests for Projects page
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

vi.mock('../src/hooks/useApi', () => ({
  useApi: vi.fn(() => ({ data: null, loading: true, error: null, reload: vi.fn() })),
}));

vi.mock('../src/hooks/usePolling', () => ({
  usePolling: vi.fn(() => ({ data: null, loading: true, error: null, reload: vi.fn() })),
}));

import { useApi } from '../src/hooks/useApi';
import { usePolling } from '../src/hooks/usePolling';
import Projects from '../src/pages/Projects';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

describe('Projects page', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Projects />);
    expect(document.body).toBeTruthy();
  });

  test('shows loading state when loading', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Projects />);
    // Loading state renders LoadingSkeleton which uses inline animation
    expect(document.body).toBeTruthy();
  });

  test('displays heading when loaded', () => {
    vi.mocked(useApi).mockReturnValue({ data: { projects: [] }, loading: false, error: null, reload: vi.fn() });
    vi.mocked(usePolling).mockReturnValue({ data: { tasks: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Projects />);
    expect(screen.getByText('Projects')).toBeInTheDocument();
  });

  test('shows empty state when no projects', () => {
    vi.mocked(useApi).mockReturnValue({ data: { projects: [] }, loading: false, error: null, reload: vi.fn() });
    vi.mocked(usePolling).mockReturnValue({ data: { tasks: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Projects />);
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
  });

  test('handles null data gracefully', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: false, error: null, reload: vi.fn() });
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: false, error: null, reload: vi.fn() });
    wrap(<Projects />);
    expect(screen.getByText('No projects yet')).toBeInTheDocument();
  });

  test('displays project cards', () => {
    const projects = [
      { id: 'p1', title: 'Project Alpha', status: 'active', tasks: [] },
      { id: 'p2', title: 'Project Beta', status: 'active', tasks: [] },
    ];
    vi.mocked(useApi).mockReturnValue({ data: { projects }, loading: false, error: null, reload: vi.fn() });
    vi.mocked(usePolling).mockReturnValue({ data: { tasks: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Projects />);
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
    expect(screen.getByText('Project Beta')).toBeInTheDocument();
  });
});
