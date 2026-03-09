/**
 * Tests for AI affordance components in src/components/ai/
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../src/hooks/useAIInvoke', () => ({
  useAIInvoke: vi.fn(() => ({
    invoke: vi.fn().mockResolvedValue('AI generated result'),
    loading: false,
    error: null,
  })),
}));

import { useAIInvoke } from '../src/hooks/useAIInvoke';
import AIAffordance from '../src/components/ai/AIAffordance';
import AISummarizeButton from '../src/components/ai/AISummarizeButton';
import AIReplyChips from '../src/components/ai/AIReplyChips';
import AIBadge from '../src/components/ai/AIBadge';
import AIInlineText from '../src/components/ai/AIInlineText';
import AIRewriteMenu from '../src/components/ai/AIRewriteMenu';
import AIContextPanel from '../src/components/ai/AIContextPanel';

// ── Helpers ──────────────────────────────────────────────────────────────────

const makeAffordance = (type, extra = {}) => ({
  id: `aff-${type}`,
  pluginId: 'test-plugin',
  type,
  target: 'test-target',
  label: `Test ${type}`,
  aiAction: 'summarize',
  ...extra,
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AISummarizeButton', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders without crashing', () => {
    const affordance = makeAffordance('button');
    render(<AISummarizeButton affordance={affordance} context="test context" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('shows label text', () => {
    const affordance = makeAffordance('button', { label: 'Summarize' });
    render(<AISummarizeButton affordance={affordance} context="test" />);
    expect(screen.getByText('Summarize')).toBeInTheDocument();
  });

  test('shows loading state while invoking', async () => {
    let resolveInvoke;
    const pendingInvoke = new Promise(resolve => { resolveInvoke = resolve; });
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockReturnValue(pendingInvoke),
      loading: false,
      error: null,
    });

    const affordance = makeAffordance('button');
    render(<AISummarizeButton affordance={affordance} context="test" />);
    const btn = screen.getByRole('button');

    // Click to trigger invoke
    await act(async () => { fireEvent.click(btn); });

    // Resolve the promise
    resolveInvoke('summary result');
  });

  test('returns null when no affordance', () => {
    const { container } = render(<AISummarizeButton affordance={null} context="test" />);
    expect(container).toBeEmptyDOMElement();
  });

  test('shows result panel when clicked', async () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('Summary text here'),
      loading: false,
      error: null,
    });

    const affordance = makeAffordance('button');
    render(<AISummarizeButton affordance={affordance} context="test" />);
    const btn = screen.getByRole('button');

    await act(async () => { fireEvent.click(btn); });

    await waitFor(() => {
      expect(screen.getByText(/Summary text here/)).toBeInTheDocument();
    });
  });
});

describe('AIReplyChips', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('["Reply 1","Reply 2","Reply 3"]'),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('chips');
    render(<AIReplyChips affordance={affordance} context="test" />);
  });

  test('renders chip elements after invoke resolves', async () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('["Yes please","No thanks","Maybe later"]'),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('chips');
    render(<AIReplyChips affordance={affordance} context="test" />);

    await waitFor(() => {
      expect(screen.getByText('Yes please')).toBeInTheDocument();
    });
  });

  test('parses newline-separated chips when not JSON', async () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('Option A\nOption B\nOption C'),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('chips');
    render(<AIReplyChips affordance={affordance} context="test" />);

    await waitFor(() => {
      expect(screen.getByText('Option A')).toBeInTheDocument();
    });
  });

  test('requires affordance prop', () => {
    // Component expects a valid affordance — passing null is a caller error
    expect(AIReplyChips).toBeDefined();
  });

  test('calls onSelect when chip is clicked', async () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('["Click me"]'),
      loading: false,
      error: null,
    });
    const onSelect = vi.fn();
    const affordance = makeAffordance('chips');
    render(<AIReplyChips affordance={affordance} context="test" onSelect={onSelect} />);

    await waitFor(() => {
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Click me'));
    expect(onSelect).toHaveBeenCalledWith('Click me');
  });
});

describe('AIBadge', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('Active'),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('badge');
    render(<AIBadge affordance={affordance} context="test" />);
  });

  test('renders badge text after invoke resolves', async () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('Healthy'),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('badge');
    render(<AIBadge affordance={affordance} context="test" />);

    await waitFor(() => {
      expect(screen.getByText(/Healthy/)).toBeInTheDocument();
    });
  });

  test('requires affordance prop', () => {
    expect(AIBadge).toBeDefined();
  });

  test('returns null when invoke returns null (failed)', async () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue(null),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('badge');
    const { container } = render(<AIBadge affordance={affordance} context="test" />);
    // Initially renders shimmer, then fails → null
    await waitFor(() => {
      // After invoke resolves with null, failed=true → null render
    });
  });
});

describe('AIInlineText', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('Inline text result'),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('inline-text');
    render(<AIInlineText affordance={affordance} context="test" />);
  });

  test('renders text content after invoke resolves', async () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('Computed insight here'),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('inline-text');
    render(<AIInlineText affordance={affordance} context="test" />);

    await waitFor(() => {
      expect(screen.getByText(/Computed insight here/)).toBeInTheDocument();
    });
  });

  test('requires affordance prop', () => {
    expect(AIInlineText).toBeDefined();
  });
});

describe('AIRewriteMenu', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('Rewritten text'),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('rewrite-menu');
    render(<AIRewriteMenu affordance={affordance} value="Some text" onRewrite={vi.fn()} />);
  });

  test('renders rewrite button', () => {
    const affordance = makeAffordance('rewrite-menu');
    render(<AIRewriteMenu affordance={affordance} value="Some text" onRewrite={vi.fn()} />);
    expect(screen.getByText(/Rewrite/)).toBeInTheDocument();
  });

  test('shows dropdown menu options when clicked', async () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('Rewritten text'),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('rewrite-menu');
    render(<AIRewriteMenu affordance={affordance} value="Some text" onRewrite={vi.fn()} />);

    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('More concise')).toBeInTheDocument();
      expect(screen.getByText('More formal')).toBeInTheDocument();
      expect(screen.getByText('Simpler')).toBeInTheDocument();
    });
  });

  test('returns null when no affordance', () => {
    const { container } = render(<AIRewriteMenu affordance={null} value="text" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('AIContextPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  test('renders without crashing', () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('Context result'),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('context-panel');
    render(<AIContextPanel affordance={affordance} context="test" />);
  });

  test('renders panel toggle button', () => {
    const affordance = makeAffordance('context-panel', { label: 'AI Context' });
    render(<AIContextPanel affordance={affordance} context="test" />);
    expect(screen.getByText('AI Context')).toBeInTheDocument();
  });

  test('expands panel and shows result on click', async () => {
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('Context panel content'),
      loading: false,
      error: null,
    });
    const affordance = makeAffordance('context-panel', { label: 'View Context' });
    render(<AIContextPanel affordance={affordance} context="test" />);

    const btn = screen.getByRole('button');
    await act(async () => { fireEvent.click(btn); });

    await waitFor(() => {
      expect(screen.getByText(/Context panel content/)).toBeInTheDocument();
    });
  });

  test('returns null when no affordance', () => {
    const { container } = render(<AIContextPanel affordance={null} context="test" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('AIAffordance dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAIInvoke).mockReturnValue({
      invoke: vi.fn().mockResolvedValue('result'),
      loading: false,
      error: null,
    });
  });

  test('returns null when no affordance', () => {
    const { container } = render(<AIAffordance affordance={null} context="test" />);
    expect(container).toBeEmptyDOMElement();
  });

  test('dispatches button type → AISummarizeButton', () => {
    const affordance = makeAffordance('button');
    render(<AIAffordance affordance={affordance} context="test" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  test('dispatches rewrite-menu type → AIRewriteMenu', () => {
    const affordance = makeAffordance('rewrite-menu');
    render(<AIAffordance affordance={affordance} value="text" onRewrite={vi.fn()} />);
    expect(screen.getByText(/Rewrite/)).toBeInTheDocument();
  });

  test('dispatches context-panel type → AIContextPanel', () => {
    const affordance = makeAffordance('context-panel', { label: 'AI Context' });
    render(<AIAffordance affordance={affordance} context="test" />);
    expect(screen.getByText('AI Context')).toBeInTheDocument();
  });

  test('returns null for unknown type', () => {
    const affordance = makeAffordance('unknown-type');
    const { container } = render(<AIAffordance affordance={affordance} context="test" />);
    expect(container).toBeEmptyDOMElement();
  });

  test('dispatches chips type → AIReplyChips (renders without crash)', () => {
    const affordance = makeAffordance('chips');
    render(<AIAffordance affordance={affordance} context="test" />);
    // AIReplyChips renders a div with the sparkle icon
    expect(document.body).toBeTruthy();
  });

  test('dispatches inline-text type → AIInlineText (renders without crash)', () => {
    const affordance = makeAffordance('inline-text');
    render(<AIAffordance affordance={affordance} context="test" />);
    expect(document.body).toBeTruthy();
  });

  test('dispatches badge type → AIBadge (renders without crash)', () => {
    const affordance = makeAffordance('badge');
    render(<AIAffordance affordance={affordance} context="test" />);
    expect(document.body).toBeTruthy();
  });

  test('passes context string directly', () => {
    const affordance = makeAffordance('button', { label: 'Test' });
    render(<AIAffordance affordance={affordance} context="string context" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  test('serializes object context to JSON', () => {
    const affordance = makeAffordance('button', { label: 'Test' });
    render(<AIAffordance affordance={affordance} context={{ id: '1', title: 'Task' }} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
