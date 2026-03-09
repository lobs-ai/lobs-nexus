import { useState, useEffect, useRef } from 'react';
import { useAIInvoke } from '../../hooks/useAIInvoke';
import Shimmer from './Shimmer';

/**
 * <AIBadge affordance={affordance} context={contextData} />
 * Small badge with AI-generated status text.
 */
export default function AIBadge({ affordance, context }) {
  const [label, setLabel] = useState(null);
  const [failed, setFailed] = useState(false);
  const { invoke } = useAIInvoke();
  const invoked = useRef(false);

  useEffect(() => {
    if (invoked.current) return;
    invoked.current = true;
    invoke(affordance.pluginId, affordance.id, context)
      .then(res => { if (res !== null) setLabel(res.slice(0, 40)); else setFailed(true); })
      .catch(() => setFailed(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!affordance || failed) return null;

  if (label === null) {
    return <Shimmer width={60} height={18} style={{ borderRadius: 4, display: 'inline-block' }} />;
  }

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
      padding: '2px 7px',
      borderRadius: 5,
      background: 'rgba(167,139,250,0.1)',
      border: '1px solid rgba(167,139,250,0.25)',
      color: 'var(--purple)',
      fontSize: '0.72rem',
      fontWeight: 600,
    }}>
      ✨ {label}
    </span>
  );
}
