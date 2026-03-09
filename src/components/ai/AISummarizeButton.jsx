import { useState, useRef } from 'react';
import { useAIInvoke } from '../../hooks/useAIInvoke';
import Shimmer from './Shimmer';

/**
 * <AISummarizeButton affordance={affordance} context={contextData} />
 * Button that invokes AI summarize and shows result in a collapsible panel.
 */
export default function AISummarizeButton({ affordance, context }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const { invoke, loading } = useAIInvoke();
  const invoked = useRef(false);

  const handleClick = async (e) => {
    e.stopPropagation();
    if (loading) return;
    if (!open && !invoked.current) {
      invoked.current = true;
      const res = await invoke(affordance.pluginId, affordance.id, context);
      if (res !== null) setResult(res);
    }
    setOpen(o => !o);
  };

  if (!affordance) return null;

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: 6, maxWidth: '100%' }}>
      <button
        onClick={handleClick}
        title={affordance.label || 'AI Summary'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          borderRadius: 6,
          border: '1px solid rgba(167,139,250,0.3)',
          background: open ? 'rgba(167,139,250,0.12)' : 'rgba(167,139,250,0.06)',
          color: 'var(--purple)',
          fontSize: '0.75rem',
          fontWeight: 600,
          cursor: loading ? 'wait' : 'pointer',
          transition: 'all 0.2s',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => !loading && (e.currentTarget.style.background = 'rgba(167,139,250,0.15)')}
        onMouseLeave={e => !loading && (e.currentTarget.style.background = open ? 'rgba(167,139,250,0.12)' : 'rgba(167,139,250,0.06)')}
      >
        <span style={{ fontSize: '0.8rem' }}>✨</span>
        {loading ? 'Summarizing…' : (affordance.label || 'Summarize')}
      </button>

      {open && (
        <div style={{
          background: 'rgba(167,139,250,0.06)',
          border: '1px solid rgba(167,139,250,0.2)',
          borderRadius: 8,
          padding: '10px 12px',
          maxWidth: 480,
        }}>
          {loading || result === null ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Shimmer width="90%" height={12} />
              <Shimmer width="70%" height={12} />
              <Shimmer width="80%" height={12} />
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', lineHeight: 1.6, margin: 0 }}>
              <span style={{ color: 'var(--purple)', marginRight: 6 }}>✨</span>{result}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
