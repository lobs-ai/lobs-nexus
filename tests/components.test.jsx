/**
 * Tests for shared components (GlassCard, Badge, Modal, Toast, EmptyState, LoadingSkeleton)
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, test, expect } from 'vitest';

import GlassCard from '../src/components/GlassCard';
import Badge from '../src/components/Badge';
import Modal from '../src/components/Modal';
import { showToast } from '../src/components/Toast';
import EmptyState from '../src/components/EmptyState';
import LoadingSkeleton from '../src/components/LoadingSkeleton';

// ── GlassCard ─────────────────────────────────────────────────────────────────

describe('GlassCard', () => {
  test('renders without crashing', () => {
    render(<GlassCard>Content</GlassCard>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  test('renders children', () => {
    render(<GlassCard><div>Test Content</div></GlassCard>);
    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  test('applies custom style', () => {
    const { container } = render(<GlassCard style={{ padding: 20 }}>Content</GlassCard>);
    const card = container.firstChild;
    expect(card).toHaveStyle({ padding: '20px' });
  });

  test('applies className', () => {
    const { container } = render(<GlassCard className="custom-class">Content</GlassCard>);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});

// ── Badge ─────────────────────────────────────────────────────────────────────

describe('Badge', () => {
  test('renders without crashing', () => {
    render(<Badge label="Test Badge" />);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  test('renders with custom color', () => {
    const { container } = render(<Badge label="Colored" color="#ff0000" />);
    expect(container.firstChild).toHaveStyle({ color: '#ff0000' });
  });

  test('shows dot when dot prop is true', () => {
    const { container } = render(<Badge label="With Dot" dot />);
    expect(container.firstChild?.textContent).toContain('With Dot');
  });

  test('renders without label (just dot)', () => {
    const { container } = render(<Badge dot />);
    expect(container.firstChild).toBeTruthy();
  });
});

// ── Modal ─────────────────────────────────────────────────────────────────────

describe('Modal', () => {
  test('renders when open', () => {
    render(<Modal open={true} onClose={vi.fn()}><div>Modal Content</div></Modal>);
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  test('does not render when closed', () => {
    const { container } = render(<Modal open={false} onClose={vi.fn()}><div>Modal Content</div></Modal>);
    expect(container).toBeEmptyDOMElement();
  });

  test('renders title when provided', () => {
    render(<Modal open={true} title="Test Modal" onClose={vi.fn()}><div>Content</div></Modal>);
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  test('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Modal open={true} title="Test" onClose={onClose}><div>Content</div></Modal>);
    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);
    expect(onClose).toHaveBeenCalled();
  });

  test('renders children', () => {
    render(<Modal open={true} onClose={vi.fn()}><div>Test Children</div></Modal>);
    expect(screen.getByText('Test Children')).toBeInTheDocument();
  });
});

// ── Toast ─────────────────────────────────────────────────────────────────────

describe('Toast', () => {
  test('showToast function exists', () => {
    expect(typeof showToast).toBe('function');
  });

  test('showToast can be called without error', () => {
    expect(() => showToast('Test message')).not.toThrow();
  });

  test('showToast accepts message parameter', () => {
    expect(() => showToast('Success!')).not.toThrow();
    expect(() => showToast('Error occurred', 'error')).not.toThrow();
  });
});

// ── EmptyState ────────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  test('renders without crashing', () => {
    render(<EmptyState title="No items" description="Nothing here" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });

  test('renders title and description', () => {
    render(<EmptyState title="Empty" description="Nothing to see here" />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(screen.getByText('Nothing to see here')).toBeInTheDocument();
  });

  test('renders icon when provided', () => {
    render(<EmptyState title="Empty" description="Test" icon="📭" />);
    expect(screen.getByText('📭')).toBeInTheDocument();
  });

  test('renders without icon', () => {
    const { container } = render(<EmptyState title="Test" description="Description" />);
    expect(container.textContent).toContain('Test');
  });
});

// ── LoadingSkeleton ───────────────────────────────────────────────────────────

describe('LoadingSkeleton', () => {
  test('renders without crashing', () => {
    const { container } = render(<LoadingSkeleton />);
    expect(container.firstChild).toBeTruthy();
  });

  test('renders default 3 lines', () => {
    const { container } = render(<LoadingSkeleton />);
    // Component renders a flex container with child divs + a <style> element
    const wrapper = container.firstChild;
    // Count actual skeleton line divs (exclude the <style> tag)
    const lines = wrapper.querySelectorAll('div');
    expect(lines.length).toBe(3);
  });

  test('renders custom number of lines', () => {
    const { container } = render(<LoadingSkeleton lines={5} />);
    const wrapper = container.firstChild;
    const lines = wrapper.querySelectorAll('div');
    expect(lines.length).toBe(5);
  });

  test('renders single line', () => {
    const { container } = render(<LoadingSkeleton lines={1} />);
    const wrapper = container.firstChild;
    const lines = wrapper.querySelectorAll('div');
    expect(lines.length).toBe(1);
  });
});
