import { useState, useCallback, useRef } from 'react';
import { usePolling } from '../hooks/usePolling';
import { api } from '../lib/api';
import GlassCard from '../components/GlassCard';
import Badge from '../components/Badge';

// ── Helpers ──────────────────────────────────────────────────────────

function timeAgo(dateStr) {
  if (!dateStr) return 'unknown';
  const diff = Date.now() - new Date(dateStr + (dateStr.endsWith('Z') ? '' : 'Z')).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ── Markdown renderer (minimal) ──────────────────────────────────────

function MarkdownView({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} style={{ color: 'var(--teal)', fontSize: '0.95rem', fontWeight: 700, margin: '20px 0 8px', borderBottom: '1px solid var(--border)', paddingBottom: 4 }}>
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} style={{ color: 'var(--text)', fontSize: '1.1rem', fontWeight: 800, margin: '28px 0 10px', borderBottom: '2px solid var(--border)', paddingBottom: 6 }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('# ')) {
      elements.push(
        <h1 key={i} style={{ color: 'var(--text)', fontSize: '1.3rem', fontWeight: 800, margin: '0 0 16px' }}>
          {line.slice(2)}
        </h1>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const items = [];
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        items.push(<li key={i} style={{ color: 'var(--muted)', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 3 }}>{renderInline(lines[i].slice(2))}</li>);
        i++;
      }
      elements.push(<ul key={`ul-${i}`} style={{ margin: '6px 0 10px 16px', padding: 0 }}>{items}</ul>);
      continue;
    } else if (/^\d+\.\s/.test(line)) {
      const items = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(<li key={i} style={{ color: 'var(--muted)', fontSize: '0.83rem', lineHeight: 1.6, marginBottom: 3 }}>{renderInline(lines[i].replace(/^\d+\.\s/, ''))}</li>);
        i++;
      }
      elements.push(<ol key={`ol-${i}`} style={{ margin: '6px 0 10px 16px', padding: 0 }}>{items}</ol>);
      continue;
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} style={{
          borderLeft: '3px solid var(--teal)', margin: '8px 0', padding: '6px 14px',
          color: 'var(--muted)', fontSize: '0.82rem', fontStyle: 'italic',
          background: 'rgba(45,212,191,0.05)', borderRadius: '0 6px 6px 0',
        }}>
          {line.slice(2)}
        </blockquote>
      );
    } else if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      elements.push(
        <pre key={i} style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
          padding: '12px 16px', margin: '10px 0', overflowX: 'auto',
          fontSize: '0.78rem', fontFamily: 'var(--mono)', color: 'var(--text)', lineHeight: 1.6,
        }}>
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
    } else if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '16px 0' }} />);
    } else if (line.trim() === '') {
      elements.push(<div key={i} style={{ height: 6 }} />);
    } else {
      elements.push(
        <p key={i} style={{ color: 'var(--muted)', fontSize: '0.83rem', lineHeight: 1.65, margin: '4px 0' }}>
          {renderInline(line)}
        </p>
      );
    }
    i++;
  }

  return <div style={{ fontFamily: 'inherit' }}>{elements}</div>;
}

function renderInline(text) {
  // Handle bold, italic, code, links
  const parts = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold **text**
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Inline code `text`
    const codeMatch = remaining.match(/`(.+?)`/);
    // Link [text](url)
    const linkMatch = remaining.match(/\[(.+?)\]\((.+?)\)/);

    const candidates = [
      boldMatch && { idx: boldMatch.index, len: boldMatch[0].length, type: 'bold', match: boldMatch },
      codeMatch && { idx: codeMatch.index, len: codeMatch[0].length, type: 'code', match: codeMatch },
      linkMatch && { idx: linkMatch.index, len: linkMatch[0].length, type: 'link', match: linkMatch },
    ].filter(Boolean);

    if (candidates.length === 0) {
      parts.push(<span key={key++}>{remaining}</span>);
      break;
    }

    const first = candidates.reduce((a, b) => a.idx <= b.idx ? a : b);

    if (first.idx > 0) {
      parts.push(<span key={key++}>{remaining.slice(0, first.idx)}</span>);
    }

    if (first.type === 'bold') {
      parts.push(<strong key={key++} style={{ color: 'var(--text)', fontWeight: 700 }}>{first.match[1]}</strong>);
    } else if (first.type === 'code') {
      parts.push(
        <code key={key++} style={{
          fontFamily: 'var(--mono)', fontSize: '0.8em',
          background: 'var(--surface)', padding: '1px 5px', borderRadius: 4,
          color: 'var(--teal)', border: '1px solid var(--border)',
        }}>
          {first.match[1]}
        </code>
      );
    } else if (first.type === 'link') {
      parts.push(
        <a key={key++} href={first.match[2]} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--teal)', textDecoration: 'underline' }}>
          {first.match[1]}
        </a>
      );
    }

    remaining = remaining.slice(first.idx + first.len);
  }

  return parts.length === 1 ? parts[0] : parts;
}

// ── Review list card ─────────────────────────────────────────────────

function ReviewCard({ review, onSelect, selected }) {
  return (
    <div
      onClick={() => onSelect(review)}
      style={{
        background: selected ? 'rgba(45,212,191,0.07)' : 'var(--surface)',
        border: `1px solid ${selected ? 'rgba(45,212,191,0.4)' : 'var(--border)'}`,
        borderRadius: 10,
        padding: '14px 18px',
        cursor: 'pointer',
        transition: 'all 0.15s',
        borderLeft: `3px solid ${selected ? 'var(--teal)' : 'var(--border)'}`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>
            {review.question}
          </div>
          {review.preview && (
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem', lineHeight: 1.4, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {review.preview}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {review.date && <Badge label={review.date} color="#6b7280" />}
            {review.papersAnalyzed && <Badge label={`${review.papersAnalyzed} papers`} color="#818cf8" />}
            {review.size && <span style={{ color: 'var(--faint)', fontSize: '0.68rem' }}>{fmtSize(review.size)}</span>}
          </div>
        </div>
        <span style={{ color: 'var(--faint)', fontSize: '0.7rem', whiteSpace: 'nowrap', marginTop: 2 }}>
          {review.date ? timeAgo(review.date) : ''}
        </span>
      </div>
    </div>
  );
}

// ── Run form ─────────────────────────────────────────────────────────

function RunForm({ onRunStart, onRunComplete, onRunError }) {
  const [question, setQuestion] = useState('');
  const [seedCount, setSeedCount] = useState(5);
  const [maxPapers, setMaxPapers] = useState(20);
  const [outputFormat, setOutputFormat] = useState('markdown');
  const [tier, setTier] = useState('micro');
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  const handleRun = async () => {
    if (!question.trim()) return;
    setRunning(true);
    setElapsed(0);
    timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    onRunStart?.();

    try {
      const result = await api.litReviewRun({
        question: question.trim(),
        seedCount,
        maxPapers,
        outputFormat,
        tier,
      });
      onRunComplete?.(result);
    } catch (err) {
      onRunError?.(err?.message || 'Review failed');
    } finally {
      setRunning(false);
      clearInterval(timerRef.current);
    }
  };

  const fmtElapsed = (s) => {
    if (s < 60) return `${s}s`;
    return `${Math.floor(s / 60)}m ${s % 60}s`;
  };

  return (
    <GlassCard>
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 8 }}>
          Research Question
        </div>
        <textarea
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="e.g. What are the most effective methods for aligning large language models with human preferences?"
          rows={3}
          disabled={running}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text)', fontSize: '0.85rem', lineHeight: 1.5,
            resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box',
            outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={e => { e.target.style.borderColor = 'rgba(45,212,191,0.4)'; }}
          onBlur={e => { e.target.style.borderColor = 'var(--border)'; }}
        />
      </div>

      {/* Config row */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 14 }}>
        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.1, display: 'block', marginBottom: 4 }}>
            Seed Papers
          </label>
          <select
            value={seedCount}
            onChange={e => setSeedCount(Number(e.target.value))}
            disabled={running}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.78rem' }}
          >
            {[3, 5, 8, 10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.1, display: 'block', marginBottom: 4 }}>
            Max Papers
          </label>
          <select
            value={maxPapers}
            onChange={e => setMaxPapers(Number(e.target.value))}
            disabled={running}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.78rem' }}
          >
            {[10, 20, 30, 50].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.1, display: 'block', marginBottom: 4 }}>
            Model Tier
          </label>
          <select
            value={tier}
            onChange={e => setTier(e.target.value)}
            disabled={running}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.78rem' }}
          >
            <option value="micro">Micro (fast, cheap)</option>
            <option value="small">Small</option>
            <option value="standard">Standard</option>
            <option value="strong">Strong (best quality)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.1, display: 'block', marginBottom: 4 }}>
            Output Format
          </label>
          <select
            value={outputFormat}
            onChange={e => setOutputFormat(e.target.value)}
            disabled={running}
            style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.78rem' }}
          >
            <option value="markdown">Markdown</option>
            <option value="latex">LaTeX</option>
            <option value="both">Both</option>
          </select>
        </div>

        <button
          onClick={handleRun}
          disabled={running || !question.trim()}
          style={{
            padding: '8px 22px', borderRadius: 8, border: 'none', cursor: running || !question.trim() ? 'not-allowed' : 'pointer',
            background: running || !question.trim() ? 'var(--surface)' : 'var(--teal)',
            color: running || !question.trim() ? 'var(--muted)' : 'var(--bg)',
            fontSize: '0.82rem', fontWeight: 700, transition: 'all 0.15s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}
        >
          {running ? (
            <>
              <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid var(--muted)', borderTopColor: 'var(--text)', animation: 'spin 0.7s linear infinite' }} />
              Running… {fmtElapsed(elapsed)}
            </>
          ) : (
            <>📚 Run Review</>
          )}
        </button>
      </div>

      {running && (
        <div style={{
          padding: '10px 14px', borderRadius: 8, background: 'rgba(45,212,191,0.07)',
          border: '1px solid rgba(45,212,191,0.2)', fontSize: '0.78rem', color: 'var(--teal)',
        }}>
          🔍 Searching arXiv + Semantic Scholar, reading papers, building synthesis… This takes 2–5 minutes depending on depth.
        </div>
      )}
    </GlassCard>
  );
}

// ── Review viewer ────────────────────────────────────────────────────

function ReviewViewer({ review, onClose }) {
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('rendered'); // 'rendered' | 'raw'

  const handleCopy = () => {
    navigator.clipboard.writeText(review.content || review.markdown || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = review.content || review.markdown || '';
    const filename = review.filename || 'literature-review.md';
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const content = review.content || review.markdown || '';
  const question = review.question || (content.match(/^#\s+Literature Review:\s*(.+)$/m)?.[1]) || review.filename;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(5,10,20,0.85)', backdropFilter: 'blur(12px)',
      display: 'flex', alignItems: 'stretch', justifyContent: 'flex-end',
    }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        width: 'min(900px, 100vw)', height: '100vh', background: 'var(--navy)',
        borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column',
        boxShadow: '-20px 0 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'rgba(14,20,38,0.8)', backdropFilter: 'blur(8px)',
        }}>
          <span style={{ fontSize: '1.2rem' }}>📚</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)', lineHeight: 1.3 }}>{question}</div>
            {review.papersAnalyzed && (
              <div style={{ color: 'var(--muted)', fontSize: '0.72rem', marginTop: 2 }}>
                {review.papersAnalyzed} papers analyzed
              </div>
            )}
          </div>
          {/* Tab switcher */}
          <div style={{ display: 'flex', gap: 4 }}>
            {['rendered', 'raw'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
                  fontSize: '0.7rem', fontWeight: 600, transition: 'all 0.15s',
                  background: tab === t ? 'var(--teal)' : 'var(--surface)',
                  color: tab === t ? 'var(--bg)' : 'var(--muted)',
                }}
              >
                {t === 'rendered' ? '🎨 Preview' : '📄 Raw'}
              </button>
            ))}
          </div>
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: copied ? 'rgba(52,211,153,0.15)' : 'var(--surface)',
              color: copied ? 'var(--green)' : 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
            }}
          >
            {copied ? '✓ Copied' : '⎘ Copy'}
          </button>
          <button
            onClick={handleDownload}
            style={{
              padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
            }}
          >
            ↓ Download
          </button>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)',
              background: 'var(--surface)', color: 'var(--muted)', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {tab === 'rendered' ? (
            <MarkdownView content={content} />
          ) : (
            <pre style={{
              fontFamily: 'var(--mono)', fontSize: '0.78rem', color: 'var(--text)',
              lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0,
            }}>
              {content}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Stat card ────────────────────────────────────────────────────────

function Stat({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '14px 18px', minWidth: 110, flex: '1 1 110px',
    }}>
      <div style={{ color: 'var(--muted)', fontSize: '0.65rem', fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 800, color: color || 'var(--text)', lineHeight: 1 }}>{value ?? '—'}</div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────

export default function LiteratureReview() {
  const [selectedReview, setSelectedReview] = useState(null);
  const [viewerContent, setViewerContent] = useState(null);
  const [loadingViewer, setLoadingViewer] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchReviews = useCallback(async (signal) => {
    return api.litReviewList(signal);
  }, []);

  const { data: listData, refresh: refreshList } = usePolling(fetchReviews, 30000);
  const reviews = listData?.reviews ?? [];

  const handleSelect = async (review) => {
    setLoadingViewer(true);
    setSelectedReview(review);
    try {
      const data = await api.litReviewGet(review.filename);
      setViewerContent({ ...review, ...data });
    } catch (err) {
      setError(`Failed to load review: ${err?.message}`);
    } finally {
      setLoadingViewer(false);
    }
  };

  const handleRunComplete = (result) => {
    setSuccessMsg(`✅ Review complete — ${result.papersAnalyzed ?? result.paperCount ?? 'several'} papers analyzed`);
    setTimeout(() => setSuccessMsg(null), 6000);
    refreshList();
    // Auto-open the freshly generated review
    if (result.markdown) {
      const question = result.question || '';
      const datePrefix = new Date().toISOString().split('T')[0];
      setViewerContent({
        question,
        date: datePrefix,
        papersAnalyzed: result.papersAnalyzed ?? result.paperCount,
        content: result.markdown,
        filename: result.savedTo?.split('/').pop() ?? 'review.md',
      });
    }
  };

  const handleRunError = (msg) => {
    setError(`❌ ${msg}`);
    setTimeout(() => setError(null), 8000);
  };

  // Derive stats
  const totalReviews = reviews.length;
  const totalPapers = reviews.reduce((sum, r) => sum + (r.papersAnalyzed || 0), 0);
  const lastDate = reviews[0]?.date || null;

  return (
    <>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span>📚</span> Literature Review
          </h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.8rem', margin: '6px 0 0' }}>
            Multi-hop paper synthesis — searches arXiv + Semantic Scholar, reads papers, finds related work, synthesizes contradictions and gaps
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
          <Stat label="Reviews" value={totalReviews} />
          <Stat label="Papers Read" value={totalPapers || '—'} color="#818cf8" />
          <Stat label="Last Review" value={lastDate || 'none'} color="#34d399" />
        </div>

        {/* Alerts */}
        {error && (
          <div style={{
            padding: '10px 16px', borderRadius: 8, background: 'rgba(239,68,68,0.1)',
            border: '1px solid rgba(239,68,68,0.3)', color: '#f87171',
            fontSize: '0.82rem', marginBottom: 14,
          }}>
            {error}
          </div>
        )}
        {successMsg && (
          <div style={{
            padding: '10px 16px', borderRadius: 8, background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.3)', color: '#34d399',
            fontSize: '0.82rem', marginBottom: 14,
          }}>
            {successMsg}
          </div>
        )}

        {/* Layout: form left, list right */}
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          {/* Left: run form */}
          <div style={{ flex: '1 1 420px', minWidth: 320 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
              New Review
            </div>
            <RunForm
              onRunStart={() => setError(null)}
              onRunComplete={handleRunComplete}
              onRunError={handleRunError}
            />

            {/* How it works */}
            <div style={{ marginTop: 16 }}>
              <GlassCard>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>How It Works</div>
                {[
                  ['🔍', 'Seed Search', 'Queries arXiv + Semantic Scholar for your question'],
                  ['🔗', 'Multi-hop Expansion', 'For each seed paper, fetches 3 related papers'],
                  ['📖', 'Deep Reading', 'Extracts full abstracts, methods, conclusions'],
                  ['⚖️', 'Contradiction Analysis', 'Identifies where papers disagree'],
                  ['🗺️', 'Gap Analysis', 'Pinpoints open research questions'],
                  ['📝', 'Synthesis', 'Generates structured Markdown (or LaTeX) review'],
                ].map(([icon, title, desc]) => (
                  <div key={title} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '1rem', lineHeight: 1.4 }}>{icon}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.78rem', color: 'var(--text)' }}>{title}</div>
                      <div style={{ color: 'var(--muted)', fontSize: '0.73rem', lineHeight: 1.4 }}>{desc}</div>
                    </div>
                  </div>
                ))}
              </GlassCard>
            </div>
          </div>

          {/* Right: past reviews */}
          <div style={{ flex: '1 1 340px', minWidth: 280 }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>
              Past Reviews ({totalReviews})
            </div>
            {reviews.length === 0 ? (
              <div style={{
                textAlign: 'center', padding: '32px 20px', color: 'var(--muted)', fontSize: '0.82rem',
                border: '1px dashed var(--border)', borderRadius: 10,
              }}>
                No reviews yet.<br />
                <span style={{ fontSize: '0.75rem', color: 'var(--faint)' }}>Run your first literature review above.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {reviews.map(r => (
                  <ReviewCard
                    key={r.filename}
                    review={r}
                    selected={selectedReview?.filename === r.filename}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Viewer panel */}
      {(viewerContent || loadingViewer) && (
        <ReviewViewer
          review={loadingViewer ? { question: 'Loading…', content: '' } : viewerContent}
          onClose={() => { setViewerContent(null); setSelectedReview(null); }}
        />
      )}
    </>
  );
}
