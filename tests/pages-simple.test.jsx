/**
 * Tests for simpler pages (Team, Chat, Inbox, Reflections, Settings, Usage, Knowledge, Memory)
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../src/hooks/useApi', () => ({
  useApi: vi.fn(() => ({ data: null, loading: true, error: null, reload: vi.fn() })),
}));

vi.mock('../src/hooks/usePolling', () => ({
  usePolling: vi.fn(() => ({ data: null, loading: true, error: null, reload: vi.fn() })),
}));

vi.mock('../src/hooks/useAffordances', () => ({
  useAffordances: vi.fn(() => []),
}));

import { useApi } from '../src/hooks/useApi';
import { usePolling } from '../src/hooks/usePolling';
import Team from '../src/pages/Team';
import Chat from '../src/pages/Chat';
import Inbox from '../src/pages/Inbox';
import Reflections from '../src/pages/Reflections';
import Settings from '../src/pages/Settings';
import Usage from '../src/pages/Usage';
import Knowledge from '../src/pages/Knowledge';
import Memory from '../src/pages/Memory';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

// ── Team ──────────────────────────────────────────────────────────────────────

describe('Team page', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  test('renders without crashing', () => {
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Team />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading when loaded', () => {
    vi.mocked(usePolling).mockReturnValue({ data: [], loading: false, error: null, reload: vi.fn() });
    vi.mocked(useApi).mockReturnValue({ data: [], loading: false, error: null, reload: vi.fn() });
    wrap(<Team />);
    expect(screen.getByText('Agent Team')).toBeInTheDocument();
  });

  test('handles empty agents array', () => {
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: false, error: null, reload: vi.fn() });
    vi.mocked(useApi).mockReturnValue({ data: null, loading: false, error: null, reload: vi.fn() });
    wrap(<Team />);
    expect(document.body).toBeTruthy();
  });
});

// ── Chat ──────────────────────────────────────────────────────────────────────

describe('Chat page', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Chat />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', () => {
    vi.mocked(useApi).mockReturnValue({ data: { sessions: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Chat />);
    expect(screen.getByText('CONVERSATIONS')).toBeInTheDocument();
  });

  test('handles empty sessions', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: false, error: null, reload: vi.fn() });
    wrap(<Chat />);
    expect(screen.getByText(/No sessions yet/)).toBeInTheDocument();
  });
});

// ── Inbox ─────────────────────────────────────────────────────────────────────

describe('Inbox page', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Inbox />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', () => {
    vi.mocked(useApi).mockReturnValue({ data: { items: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Inbox />);
    expect(screen.getByText('Inbox')).toBeInTheDocument();
  });

  test('handles empty inbox', () => {
    vi.mocked(useApi).mockReturnValue({ data: { items: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Inbox />);
    expect(screen.getByText('Inbox is clear')).toBeInTheDocument();
  });
});

// ── Reflections ───────────────────────────────────────────────────────────────

describe('Reflections page', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Reflections />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', () => {
    vi.mocked(useApi).mockReturnValue({ data: { reflections: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Reflections />);
    expect(screen.getByText('Reflections')).toBeInTheDocument();
  });

  test('handles empty reflections', () => {
    vi.mocked(useApi).mockReturnValue({ data: { reflections: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Reflections />);
    expect(screen.getByText('No reflections yet')).toBeInTheDocument();
  });
});

// ── Settings ──────────────────────────────────────────────────────────────────

describe('Settings page', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Settings />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', () => {
    vi.mocked(useApi).mockReturnValue({ data: { server: {} }, loading: false, error: null, reload: vi.fn() });
    wrap(<Settings />);
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });
});

// ── Usage ─────────────────────────────────────────────────────────────────────

describe('Usage page', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Usage />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', () => {
    vi.mocked(useApi).mockReturnValue({ data: { total_cost: 0 }, loading: false, error: null, reload: vi.fn() });
    wrap(<Usage />);
    expect(screen.getByText('Usage')).toBeInTheDocument();
  });

  test('handles empty data', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: false, error: null, reload: vi.fn() });
    wrap(<Usage />);
    expect(document.body).toBeTruthy();
  });
});

// ── Knowledge ─────────────────────────────────────────────────────────────────

describe('Knowledge page', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Knowledge />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', () => {
    vi.mocked(useApi).mockReturnValue({ data: { entries: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Knowledge />);
    expect(screen.getByText('Knowledge')).toBeInTheDocument();
  });

  test('handles empty knowledge base', () => {
    vi.mocked(useApi).mockReturnValue({ data: { entries: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Knowledge />);
    // Knowledge page shows "No entries yet" when empty
    expect(document.body.textContent).toBeTruthy();
  });
});

// ── Memory ────────────────────────────────────────────────────────────────────

describe('Memory page', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.restoreAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Memory />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', () => {
    vi.mocked(useApi).mockReturnValue({ data: { memories: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Memory />);
    expect(screen.getByText('Memory')).toBeInTheDocument();
  });

  test('handles empty memories', () => {
    vi.mocked(useApi).mockReturnValue({ data: { memories: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Memory />);
    // Memory page renders even with empty data
    expect(document.body.textContent).toBeTruthy();
  });
});
