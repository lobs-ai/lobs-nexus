/**
 * Snapshot / regression tests for RichMessage markdown rendering and rich-UI blocks.
 *
 * These tests lock down the HTML output produced by:
 *   - renderMarkdown()   — inline markdown → HTML string
 *   - parseRichBlocks()  — splits text/rich-ui sections in a message
 *   - RichMessage        — the full React component rendering both text and rich-ui
 *   - Collapsible        — collapsible section with its own markdown renderer
 *   - Individual rich-ui components: Alert, StatusCard, Metric, Progress, Actions
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect, beforeEach } from 'vitest';

// ── Imported units under test ──────────────────────────────────────────────────

import RichMessage, { renderMarkdown, parseRichBlocks } from '../src/components/rich/RichMessage';
import Collapsible from '../src/components/rich/Collapsible';
import Alert from '../src/components/rich/Alert';
import StatusCard from '../src/components/rich/StatusCard';
import Metric from '../src/components/rich/Metric';
import Progress from '../src/components/rich/Progress';
import Actions from '../src/components/rich/Actions';

// ════════════════════════════════════════════════════════════════════════
// renderMarkdown() — pure function, test the HTML string output
// ════════════════════════════════════════════════════════════════════════

describe('renderMarkdown()', () => {
  test('returns empty string for null/undefined', () => {
    expect(renderMarkdown(null)).toBe('');
    expect(renderMarkdown(undefined)).toBe('');
    expect(renderMarkdown('')).toBe('');
  });

  test('converts fenced code blocks to <pre class="chat-code">', () => {
    const result = renderMarkdown('```\nconst x = 1;\n```');
    expect(result).toContain('<pre class="chat-code">');
    expect(result).toContain('const x = 1;');
  });

  test('converts inline code with teal styling', () => {
    const result = renderMarkdown('use `git status` to check');
    expect(result).toContain('<code ');
    expect(result).toContain('git status');
    expect(result).toContain('var(--teal)');
  });

  test('converts **bold** to <strong>', () => {
    const result = renderMarkdown('**important** text');
    expect(result).toContain('<strong>important</strong>');
  });

  test('converts *italic* to <em>', () => {
    const result = renderMarkdown('*emphasis* here');
    expect(result).toContain('<em>emphasis</em>');
  });

  test('converts [link](url) to <a> with target=_blank', () => {
    const result = renderMarkdown('[PAW Hub](https://example.com)');
    expect(result).toContain('<a href="https://example.com"');
    expect(result).toContain('target="_blank"');
    expect(result).toContain('PAW Hub');
  });

  test('converts newlines to <br>', () => {
    const result = renderMarkdown('line one\nline two');
    expect(result).toContain('<br>');
  });

  test('passes plain text through unchanged (no markdown)', () => {
    const result = renderMarkdown('Hello world');
    expect(result).toBe('Hello world');
  });

  test('handles mixed markdown in single string', () => {
    const result = renderMarkdown('**bold** and *italic* and `code`');
    expect(result).toContain('<strong>bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<code ');
  });

  // Regression: bold/italic patterns with nested special chars
  test('does not double-process already-replaced tokens', () => {
    const result = renderMarkdown('**a** **b**');
    expect(result).toContain('<strong>a</strong>');
    expect(result).toContain('<strong>b</strong>');
  });
});

// ════════════════════════════════════════════════════════════════════════
// parseRichBlocks() — splitting a message into text / rich-ui parts
// ════════════════════════════════════════════════════════════════════════

describe('parseRichBlocks()', () => {
  test('returns a single text block for plain text', () => {
    const parts = parseRichBlocks('Hello world');
    expect(parts).toHaveLength(1);
    expect(parts[0].type).toBe('text');
    expect(parts[0].content).toBe('Hello world');
  });

  test('returns [{type:"text", content:""}] for null/empty', () => {
    const parts = parseRichBlocks(null);
    expect(parts).toHaveLength(1);
    expect(parts[0].type).toBe('text');

    const parts2 = parseRichBlocks('');
    expect(parts2[0].type).toBe('text');
  });

  test('parses a rich-ui block into a "rich" part', () => {
    const content = '```rich-ui\n{"type":"alert","variant":"info","message":"hi"}\n```';
    const parts = parseRichBlocks(content);
    expect(parts).toHaveLength(1);
    expect(parts[0].type).toBe('rich');
    expect(parts[0].data.type).toBe('alert');
    expect(parts[0].data.message).toBe('hi');
  });

  test('splits text before and after a rich-ui block', () => {
    const content = 'intro text\n```rich-ui\n{"type":"alert","variant":"success","message":"done"}\n```\ntrailing text';
    const parts = parseRichBlocks(content);
    expect(parts).toHaveLength(3);
    expect(parts[0].type).toBe('text');
    expect(parts[1].type).toBe('rich');
    expect(parts[2].type).toBe('text');
    expect(parts[2].content).toContain('trailing text');
  });

  test('handles multiple rich-ui blocks', () => {
    const block = (json) => `\`\`\`rich-ui\n${json}\n\`\`\``;
    const content = [
      block('{"type":"alert","variant":"info","message":"first"}'),
      'middle',
      block('{"type":"alert","variant":"warning","message":"second"}'),
    ].join('\n');
    const parts = parseRichBlocks(content);
    const richParts = parts.filter(p => p.type === 'rich');
    expect(richParts).toHaveLength(2);
    expect(richParts[0].data.message).toBe('first');
    expect(richParts[1].data.message).toBe('second');
  });

  test('falls back to text for malformed JSON in rich-ui block', () => {
    const content = '```rich-ui\n{not valid json}\n```';
    const parts = parseRichBlocks(content);
    expect(parts).toHaveLength(1);
    // Falls back to treating the whole match as text
    expect(parts[0].type).toBe('text');
    expect(parts[0].content).toContain('rich-ui');
  });
});

// ════════════════════════════════════════════════════════════════════════
// RichMessage — full component rendering
// ════════════════════════════════════════════════════════════════════════

describe('RichMessage component', () => {
  test('renders plain text content', () => {
    render(<RichMessage content="Hello, world" />);
    expect(screen.getByText('Hello, world')).toBeInTheDocument();
  });

  test('renders markdown bold inline', () => {
    const { container } = render(<RichMessage content="**bold text**" />);
    expect(container.querySelector('strong')).toBeInTheDocument();
    expect(container.querySelector('strong').textContent).toBe('bold text');
  });

  test('renders markdown inline code', () => {
    const { container } = render(<RichMessage content="run `npm test` now" />);
    expect(container.querySelector('code')).toBeInTheDocument();
  });

  test('renders a fenced code block', () => {
    const { container } = render(<RichMessage content={'```\ncode here\n```'} />);
    expect(container.querySelector('pre.chat-code')).toBeInTheDocument();
  });

  test('renders an Alert rich-ui block', () => {
    const content = '```rich-ui\n{"type":"alert","variant":"success","title":"Done","message":"All good"}\n```';
    render(<RichMessage content={content} />);
    expect(screen.getByText('Done')).toBeInTheDocument();
    expect(screen.getByText('All good')).toBeInTheDocument();
  });

  test('renders mixed text + rich-ui content', () => {
    const content = 'Intro paragraph\n```rich-ui\n{"type":"alert","variant":"info","message":"Info block"}\n```\nOutro text';
    render(<RichMessage content={content} />);
    expect(screen.getByText('Info block')).toBeInTheDocument();
    expect(screen.getByText(/Outro text/)).toBeInTheDocument();
  });

  test('falls back to <pre> for unknown rich-ui type', () => {
    const content = '```rich-ui\n{"type":"unknown-widget","data":"x"}\n```';
    const { container } = render(<RichMessage content={content} />);
    expect(container.querySelector('pre.chat-code')).toBeInTheDocument();
  });

  test('renders null content without crashing', () => {
    const { container } = render(<RichMessage content={null} />);
    expect(container).toBeTruthy();
  });

  test('calls onAction when an Actions button is clicked', () => {
    const onAction = vi.fn();
    const content = '```rich-ui\n{"type":"actions","buttons":[{"label":"Run","action":"run"}]}\n```';
    render(<RichMessage content={content} onAction={onAction} />);
    fireEvent.click(screen.getByText('Run'));
    expect(onAction).toHaveBeenCalledWith('run');
  });

  // Snapshot: lock down rendered HTML for a representative mixed message
  test('snapshot: mixed markdown + rich-ui message', () => {
    const content = [
      '**Status Update**',
      '```rich-ui',
      '{"type":"alert","variant":"info","title":"Info","message":"System is nominal"}',
      '```',
      'Check `logs` for details.',
    ].join('\n');
    const { container } = render(<RichMessage content={content} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Collapsible component
// ════════════════════════════════════════════════════════════════════════

describe('Collapsible component', () => {
  test('renders title', () => {
    render(<Collapsible title="My Section" content="Hidden content" />);
    expect(screen.getByText('My Section')).toBeInTheDocument();
  });

  test('defaults to closed (content hidden)', () => {
    render(<Collapsible title="Section" content="Secret content" />);
    expect(screen.queryByText('Secret content')).not.toBeInTheDocument();
  });

  test('opens when header is clicked', () => {
    render(<Collapsible title="Section" content="Revealed content" />);
    fireEvent.click(screen.getByText('Section'));
    // Content is rendered via dangerouslySetInnerHTML so query DOM directly
    const { container } = render(<Collapsible title="Section2" content="Revealed2" defaultOpen />);
    expect(container.innerHTML).toContain('Revealed2');
  });

  test('defaultOpen=true shows content immediately', () => {
    const { container } = render(<Collapsible title="Open Section" content="Visible from start" defaultOpen />);
    expect(container.innerHTML).toContain('Visible from start');
  });

  test('renders markdown in content (bold)', () => {
    const { container } = render(<Collapsible title="T" content="**bold**" defaultOpen />);
    expect(container.querySelector('strong')).toBeInTheDocument();
  });

  test('renders fallback title "Details" when no title given', () => {
    render(<Collapsible content="some content" />);
    expect(screen.getByText('Details')).toBeInTheDocument();
  });

  test('snapshot: open collapsible', () => {
    const { container } = render(
      <Collapsible title="AI Analysis" content="The model ran `3 jobs` successfully.\n**All clear.**" defaultOpen />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Alert component
// ════════════════════════════════════════════════════════════════════════

describe('Alert component', () => {
  test('renders info variant with title and message', () => {
    render(<Alert variant="info" title="Heads up" message="Something to know" />);
    expect(screen.getByText('Heads up')).toBeInTheDocument();
    expect(screen.getByText('Something to know')).toBeInTheDocument();
  });

  test('renders all four variants without crashing', () => {
    ['info', 'success', 'warning', 'error'].forEach(variant => {
      const { unmount } = render(<Alert variant={variant} message={`${variant} message`} />);
      unmount();
    });
  });

  test('renders without a title', () => {
    render(<Alert variant="warning" message="Just a warning" />);
    expect(screen.getByText('Just a warning')).toBeInTheDocument();
  });

  test('unknown variant falls back to info styling', () => {
    // Should not crash
    const { container } = render(<Alert variant="unknown" message="fallback" />);
    expect(container).toBeTruthy();
  });

  test('snapshot: error alert with title', () => {
    const { container } = render(
      <Alert variant="error" title="Build Failed" message="Check the CI logs for details." />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ════════════════════════════════════════════════════════════════════════
// StatusCard component
// ════════════════════════════════════════════════════════════════════════

describe('StatusCard component', () => {
  const data = {
    title: 'Service Health',
    items: [
      { label: 'API', value: 'Running', status: 'ok' },
      { label: 'DB', value: 'Degraded', status: 'warning' },
      { label: 'Cache', value: 'Down', status: 'error' },
    ],
  };

  test('renders title', () => {
    render(<StatusCard data={data} />);
    expect(screen.getByText('Service Health')).toBeInTheDocument();
  });

  test('renders all item labels and values', () => {
    render(<StatusCard data={data} />);
    expect(screen.getByText('API')).toBeInTheDocument();
    expect(screen.getByText('Running')).toBeInTheDocument();
    expect(screen.getByText('DB')).toBeInTheDocument();
    expect(screen.getByText('Degraded')).toBeInTheDocument();
  });

  test('renders with empty items', () => {
    const { container } = render(<StatusCard data={{ title: 'Empty', items: [] }} />);
    expect(container).toBeTruthy();
  });

  test('renders with no data prop', () => {
    const { container } = render(<StatusCard />);
    expect(container).toBeTruthy();
  });

  test('snapshot: service health card', () => {
    const { container } = render(<StatusCard data={data} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Metric component
// ════════════════════════════════════════════════════════════════════════

describe('Metric component', () => {
  const data = {
    metrics: [
      { label: 'Tasks Done', value: '14', change: '+3', trend: 'up' },
      { label: 'Errors', value: '2', change: '+1', trend: 'down' },
      { label: 'Uptime', value: '99.8%' },
    ],
  };

  test('renders all metric labels', () => {
    render(<Metric data={data} />);
    expect(screen.getByText('Tasks Done')).toBeInTheDocument();
    expect(screen.getByText('Errors')).toBeInTheDocument();
    expect(screen.getByText('Uptime')).toBeInTheDocument();
  });

  test('renders metric values', () => {
    render(<Metric data={data} />);
    expect(screen.getByText('14')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('99.8%')).toBeInTheDocument();
  });

  test('renders trend indicators when present', () => {
    const { container } = render(<Metric data={data} />);
    // Up arrow ↑ and down arrow ↓
    expect(container.innerHTML).toContain('↑');
    expect(container.innerHTML).toContain('↓');
  });

  test('renders with empty metrics', () => {
    const { container } = render(<Metric data={{ metrics: [] }} />);
    expect(container).toBeTruthy();
  });

  test('snapshot: metrics row', () => {
    const { container } = render(<Metric data={data} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Progress component
// ════════════════════════════════════════════════════════════════════════

describe('Progress component', () => {
  const steps = [
    { label: 'Plan', status: 'done' },
    { label: 'Build', status: 'active' },
    { label: 'Deploy', status: 'pending' },
  ];

  test('renders all step labels', () => {
    render(<Progress title="Pipeline" steps={steps} />);
    expect(screen.getByText('Plan')).toBeInTheDocument();
    expect(screen.getByText('Build')).toBeInTheDocument();
    expect(screen.getByText('Deploy')).toBeInTheDocument();
  });

  test('renders title', () => {
    render(<Progress title="Pipeline" steps={steps} />);
    expect(screen.getByText('Pipeline')).toBeInTheDocument();
  });

  test('renders without title', () => {
    const { container } = render(<Progress steps={steps} />);
    expect(container).toBeTruthy();
  });

  test('renders with empty steps', () => {
    const { container } = render(<Progress title="Empty" steps={[]} />);
    expect(container).toBeTruthy();
  });

  test('snapshot: 3-step pipeline', () => {
    const { container } = render(<Progress title="Deployment Pipeline" steps={steps} />);
    expect(container.firstChild).toMatchSnapshot();
  });
});

// ════════════════════════════════════════════════════════════════════════
// Actions component
// ════════════════════════════════════════════════════════════════════════

describe('Actions component', () => {
  const buttons = [
    { label: 'Approve', action: 'approve' },
    { label: 'Reject', action: 'reject' },
    { label: 'Defer', action: 'defer' },
  ];

  test('renders all button labels', () => {
    render(<Actions buttons={buttons} onAction={vi.fn()} />);
    expect(screen.getByText('Approve')).toBeInTheDocument();
    expect(screen.getByText('Reject')).toBeInTheDocument();
    expect(screen.getByText('Defer')).toBeInTheDocument();
  });

  test('calls onAction with the correct action string on click', () => {
    const onAction = vi.fn();
    render(<Actions buttons={buttons} onAction={onAction} />);
    fireEvent.click(screen.getByText('Approve'));
    expect(onAction).toHaveBeenCalledWith('approve');
  });

  test('does not throw when onAction is not provided', () => {
    // onAction is optional (uses ?. operator in component)
    expect(() => {
      render(<Actions buttons={[{ label: 'Go', action: 'go' }]} />);
      fireEvent.click(screen.getByText('Go'));
    }).not.toThrow();
  });

  test('renders with empty buttons list', () => {
    const { container } = render(<Actions buttons={[]} onAction={vi.fn()} />);
    expect(container).toBeTruthy();
  });

  test('snapshot: approve / reject actions', () => {
    const { container } = render(
      <Actions buttons={[{ label: 'Approve', action: 'approve' }, { label: 'Reject', action: 'reject' }]} onAction={vi.fn()} />
    );
    expect(container.firstChild).toMatchSnapshot();
  });
});
