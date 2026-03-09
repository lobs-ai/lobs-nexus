import { useState, useRef, useEffect } from 'react';
import { useAIInvoke } from '../../hooks/useAIInvoke';

const REWRITE_OPTIONS = [
  { id: 'concise', label: 'More concise' },
  { id: 'formal', label: 'More formal' },
  { id: 'simple', label: 'Simpler' },
];

/**
 * <AIRewriteMenu affordance={affordance} value={text} onRewrite={newText => ...} />
 * Dropdown on text inputs with rewrite options.
 */
export default function AIRewriteMenu({ affordance, value, onRewrite }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);
  const { invoke } = useAIInvoke();
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!affordance) return null;

  const handleOption = async (optId) => {
    setOpen(false);
    setBusy(optId);
    const context = JSON.stringify({ text: value, style: optId });
    const result = await invoke(affordance.pluginId, affordance.id, context);
    setBusy(null);
    if (result && onRewrite) onRewrite(result);
  };

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o); }}
        disabled={!!busy || !value?.trim()}
        title="AI Rewrite"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
          padding: '3px 8px',
          borderRadius: 6,
          border: '1px solid rgba(251,191,36,0.3)',
          background: open ? 'rgba(251,191,36,0.12)' : 'rgba(251,191,36,0.06)',
          color: busy ? 'var(--faint)' : 'var(--amber)',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: busy ? 'wait' : 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <span>✨</span>
        {busy ? 'Rewriting…' : 'Rewrite'}
        <span style={{ opacity: 0.6, fontSize: '0.65rem' }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 4px)',
          right: 0,
          zIndex: 200,
          background: 'rgba(14,20,38,0.97)',
          border: '1px solid rgba(251,191,36,0.25)',
          borderRadius: 8,
          padding: '4px 0',
          minWidth: 140,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(16px)',
        }}>
          {REWRITE_OPTIONS.map(opt => (
            <button
              key={opt.id}
              onClick={() => handleOption(opt.id)}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '7px 14px',
                background: 'none',
                border: 'none',
                color: 'var(--muted)',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(251,191,36,0.1)'; e.currentTarget.style.color = 'var(--amber)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--muted)'; }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
