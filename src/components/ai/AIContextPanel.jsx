import { useState, useRef } from 'react';
import { useAIInvoke } from '../../hooks/useAIInvoke';
import Shimmer from './Shimmer';

/**
 * <AIContextPanel affordance={affordance} context={contextData} />
 * Expandable side panel with AI-pulled context.
 */
export default function AIContextPanel({ affordance, context }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const { invoke, loading } = useAIInvoke();
  const invoked = useRef(false);

  const toggle = async (e) => {
    e.stopPropagation();
    if (!open && !invoked.current) {
      invoked.current = true;
      const res = await invoke(affordance.pluginId, affordance.id, context);
      if (res !== null) setResult(res);
    }
    setOpen(o => !o);
  };

  if (!affordance) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <button
        onClick={toggle}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: open ? '6px 6px 0 0' : 6,
          border: '1px solid rgba(56,189,248,0.3)',
          borderBottom: open ? '1px solid transparent' : '1px solid rgba(56,189,248,0.3)',
          background: open ? 'rgba(56,189,248,0.12)' : 'rgba(56,189,248,0.06)',
          color: 'var(--blue)',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
      >
        <span>✨</span>
        {affordance.label || 'AI Context'}
        <span style={{ opacity: 0.7, marginLeft: 2, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
      </button>

      {open && (
        <div style={{
          background: 'rgba(56,189,248,0.05)',
          border: '1px solid rgba(56,189,248,0.2)',
          borderTop: 'none',
          borderRadius: '0 0 8px 8px',
          padding: '12px 14px',
          maxWidth: 400,
        }}>
          {(loading && result === null) ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Shimmer width="85%" height={12} />
              <Shimmer width="65%" height={12} />
              <Shimmer width="75%" height={12} />
            </div>
          ) : result ? (
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.65, margin: 0, whiteSpace: 'pre-wrap' }}>
              {result}
            </p>
          ) : (
            <p style={{ color: 'var(--faint)', fontSize: '0.78rem', margin: 0 }}>No context available.</p>
          )}
        </div>
      )}
    </div>
  );
}
