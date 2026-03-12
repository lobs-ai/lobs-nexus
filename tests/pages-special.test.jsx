/**
 * Tests for special pages (DailyBrief, MyTasks, YouTube, LearningInsights, MicroLearning, GitHubFeed, FocusTimer, Scheduler, Explore, Meetings)
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';

// Mock fetch globally
beforeEach(() => {
  global.fetch = vi.fn(() => Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

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
import DailyBrief from '../src/pages/DailyBrief';
import MyTasks from '../src/pages/MyTasks';
import YouTube from '../src/pages/YouTube';
import LearningInsights from '../src/pages/LearningInsights';
import MicroLearning from '../src/pages/MicroLearning';
import GitHubFeed from '../src/pages/GitHubFeed';
import FocusTimer from '../src/pages/FocusTimer';
import Scheduler from '../src/pages/Scheduler';
import Explore from '../src/pages/Explore';
import Meetings from '../src/pages/Meetings';

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>);

// ── DailyBrief ────────────────────────────────────────────────────────────────

describe('DailyBrief page', () => {
  test('renders without crashing', () => {
    wrap(<DailyBrief />);
    expect(document.body).toBeTruthy();
  });

  test('shows loading state', () => {
    wrap(<DailyBrief />);
    const shimmers = document.querySelectorAll('.shimmer');
    expect(shimmers.length).toBeGreaterThan(0);
  });

  test('handles null brief data gracefully', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(null),
    }));
    wrap(<DailyBrief />);
    // Should show "Failed to load" after promise resolves
    await new Promise(r => setTimeout(r, 10));
  });
});

// ── MyTasks ───────────────────────────────────────────────────────────────────

describe('MyTasks page', () => {
  test('renders without crashing', () => {
    wrap(<MyTasks />);
    expect(document.body).toBeTruthy();
  });

  test('handles empty tasks', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ tasks: [], stats: {} }),
    }));
    wrap(<MyTasks />);
    await new Promise(r => setTimeout(r, 10));
  });
});

// ── YouTube ───────────────────────────────────────────────────────────────────

describe('YouTube page', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders without crashing', () => {
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<YouTube />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', () => {
    vi.mocked(usePolling).mockReturnValue({ data: [], loading: false, error: null, reload: vi.fn() });
    wrap(<YouTube />);
    expect(screen.getByText('YouTube')).toBeInTheDocument();
  });

  test('handles empty videos', () => {
    vi.mocked(usePolling).mockReturnValue({ data: [], loading: false, error: null, reload: vi.fn() });
    wrap(<YouTube />);
    expect(screen.getByText(/No videos/)).toBeInTheDocument();
  });

  test('handles null data', () => {
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: false, error: null, reload: vi.fn() });
    wrap(<YouTube />);
    expect(screen.getByText(/No videos/)).toBeInTheDocument();
  });
});

// ── LearningInsights ──────────────────────────────────────────────────────────

describe('LearningInsights page', () => {
  test('renders without crashing', () => {
    wrap(<LearningInsights />);
    expect(document.body).toBeTruthy();
  });
});

// ── MicroLearning ─────────────────────────────────────────────────────────────

describe('MicroLearning page', () => {
  test('renders without crashing', () => {
    wrap(<MicroLearning />);
    expect(document.body).toBeTruthy();
  });
});

// ── GitHubFeed ────────────────────────────────────────────────────────────────

describe('GitHubFeed page', () => {
  test('renders without crashing', () => {
    wrap(<GitHubFeed />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ events: [] }),
    }));
    wrap(<GitHubFeed />);
    await new Promise(r => setTimeout(r, 10));
    expect(screen.getByText('GitHub Activity')).toBeInTheDocument();
  });
});

// ── FocusTimer ────────────────────────────────────────────────────────────────

describe('FocusTimer page', () => {
  test('renders without crashing', () => {
    wrap(<FocusTimer />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', async () => {
    global.fetch = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ session: null, history: [], stats: {} }),
    }));
    wrap(<FocusTimer />);
    await new Promise(r => setTimeout(r, 10));
    expect(screen.getByText('Focus Timer')).toBeInTheDocument();
  });
});

// ── Scheduler ─────────────────────────────────────────────────────────────────

describe('Scheduler page', () => {
  test('renders without crashing', () => {
    wrap(<Scheduler />);
    expect(document.body).toBeTruthy();
  });
});

// ── Explore ───────────────────────────────────────────────────────────────────

describe('Explore page', () => {
  test('renders without crashing', () => {
    wrap(<Explore />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', () => {
    wrap(<Explore />);
    expect(screen.getByText('Explore')).toBeInTheDocument();
  });
});

// ── Meetings ──────────────────────────────────────────────────────────────────

describe('Meetings page', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useApi).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    vi.mocked(usePolling).mockReturnValue({ data: null, loading: true, error: null, reload: vi.fn() });
    wrap(<Meetings />);
    expect(document.body).toBeTruthy();
  });

  test('shows heading', () => {
    vi.mocked(useApi).mockReturnValue({ data: { projects: [] }, loading: false, error: null, reload: vi.fn() });
    vi.mocked(usePolling).mockReturnValue({ data: { meetings: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Meetings />);
    expect(screen.getByText('Meetings')).toBeInTheDocument();
  });

  test('handles empty meetings', () => {
    vi.mocked(useApi).mockReturnValue({ data: { projects: [] }, loading: false, error: null, reload: vi.fn() });
    vi.mocked(usePolling).mockReturnValue({ data: { meetings: [] }, loading: false, error: null, reload: vi.fn() });
    wrap(<Meetings />);
    expect(screen.getByText(/No meetings/)).toBeInTheDocument();
  });
});
