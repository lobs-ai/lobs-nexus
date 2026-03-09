import { useState, useEffect, useRef } from 'react';
import { useAIInvoke } from '../../hooks/useAIInvoke';
import Shimmer from './Shimmer';

/**
 * <AIReplyChips affordance={affordance} context={contextData} onSelect={text => ...} />
 * Shows 2-3 suggested reply chips. Clicking one calls onSelect or copies to clipboard.
 */
export default function AIReplyChips({ affordance, context, onSelect }) {
  const [chips, setChips] = useState(null);
  const [copied, setCopied] = useState(null);
  const { invoke } = useAIInvoke();
  const invoked = useRef(false);

  useEffect(() => {
    if (invoked.current) return;
    invoked.current = true;
    invoke(affordance.pluginId, affordance.id, context).then(res => {
      if (!res) return;
      // Parse result as newline-separated suggestions or JSON array
      try {
        const parsed = JSON.parse(res);
        if (Array.isArray(parsed)) { setChips(parsed.slice(0, 3)); return; }
      } catch {}
      const lines = res.split('\n').map(l => l.replace(/^[-*\d.]\s*/, '').trim()).filter(Boolean);
      setChips(lines.slice(0, 3));
    }).catch(() => {});
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!affordance) return null;

  const handleChip = (text) => {
    if (onSelect) {
      onSelect(text);
    } else {
      navigator.clipboard?.writeText(text).catch(() => {});
      setCopied(text);
      setTimeout(() => setCopied(null), 1500);
    }
  };

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
      <span style={{ color: 'var(--faint)', fontSize: '0.72rem' }}>✨</span>
      {chips === null ? (
        <>
          <Shimmer width={80} height={24} style={{ borderRadius: 20 }} />
          <Shimmer width={100} height={24} style={{ borderRadius: 20 }} />
          <Shimmer width={90} height={24} style={{ borderRadius: 20 }} />
        </>
      ) : chips.length === 0 ? null : (
        chips.map((chip, i) => (
          <button
            key={i}
            onClick={e => { e.stopPropagation(); handleChip(chip); }}
            style={{
              padding: '4px 12px',
              borderRadius: 20,
              border: '1px solid rgba(56,189,248,0.3)',
              background: copied === chip ? 'rgba(56,189,248,0.2)' : 'rgba(56,189,248,0.07)',
              color: copied === chip ? 'var(--blue)' : 'var(--muted)',
              fontSize: '0.78rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(56,189,248,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = copied === chip ? 'rgba(56,189,248,0.2)' : 'rgba(56,189,248,0.07)'}
          >
            {copied === chip ? '✓ Copied' : chip}
          </button>
        ))
      )}
    </div>
  );
}
