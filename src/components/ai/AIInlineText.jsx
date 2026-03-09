import { useState, useEffect, useRef } from 'react';
import { useAIInvoke } from '../../hooks/useAIInvoke';
import Shimmer from './Shimmer';

/**
 * <AIInlineText affordance={affordance} context={contextData} />
 * Loads AI-generated text inline on mount. Shows subtle shimmer while loading.
 */
export default function AIInlineText({ affordance, context, style = {} }) {
  const [text, setText] = useState(null);
  const [failed, setFailed] = useState(false);
  const { invoke } = useAIInvoke();
  const invoked = useRef(false);

  useEffect(() => {
    if (invoked.current) return;
    invoked.current = true;
    invoke(affordance.pluginId, affordance.id, context)
      .then(res => { if (res !== null) setText(res); else setFailed(true); })
      .catch(() => setFailed(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!affordance || failed) return null;

  if (text === null) {
    return <Shimmer width="60%" height={13} style={{ display: 'inline-block', ...style }} />;
  }

  return (
    <span style={{ color: 'var(--muted)', fontSize: '0.78rem', ...style }}>
      <span style={{ marginRight: 4, opacity: 0.7 }}>✨</span>{text}
    </span>
  );
}
