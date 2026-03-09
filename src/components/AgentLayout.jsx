import React, { Children, useMemo } from 'react';

/**
 * AgentLayout — wraps dashboard widgets and arranges them per agent config.
 *
 * Props:
 *   widgetOrder     — ordered array of widget ids (empty = natural order)
 *   hiddenWidgets   — array of widget ids to hide
 *   agentHighlights — array of widget ids to glow-highlight
 *   isAgentSet      — whether this layout was set by the agent (shows badge)
 *   children        — each child must have a `data-widget-id` prop
 */
export default function AgentLayout({
  widgetOrder = [],
  hiddenWidgets = [],
  agentHighlights = [],
  isAgentSet = false,
  children,
}) {
  const ordered = useMemo(() => {
    const childArray = Children.toArray(children);

    // Build a map of id → child
    const byId = {};
    const noId = [];
    childArray.forEach((child) => {
      const id = child?.props?.['data-widget-id'];
      if (id) {
        byId[id] = child;
      } else {
        noId.push(child);
      }
    });

    // Filter out hidden widgets
    const hiddenSet = new Set(hiddenWidgets);
    const highlightSet = new Set(agentHighlights);

    // Order: explicit order first, then remaining in natural order
    const result = [];
    const placed = new Set();

    for (const id of widgetOrder) {
      if (byId[id] && !hiddenSet.has(id)) {
        result.push({ id, child: byId[id] });
        placed.add(id);
      }
    }

    // Remaining children with ids, in their natural order
    childArray.forEach((child) => {
      const id = child?.props?.['data-widget-id'];
      if (id && !placed.has(id) && !hiddenSet.has(id)) {
        result.push({ id, child });
      }
    });

    // Children without ids always appear
    noId.forEach((child, i) => {
      result.push({ id: `__no-id-${i}`, child });
    });

    return result.map(({ id, child }) => ({
      id,
      child,
      highlighted: highlightSet.has(id),
    }));
  }, [children, widgetOrder, hiddenWidgets, agentHighlights]);

  return (
    <div style={{ position: 'relative' }}>
      {isAgentSet && (
        <div style={{
          position: 'absolute',
          top: -8,
          right: 0,
          fontSize: '0.65rem',
          color: 'var(--teal)',
          fontFamily: 'var(--mono)',
          background: 'rgba(0,0,0,0.4)',
          border: '1px solid var(--teal)',
          borderRadius: 6,
          padding: '2px 8px',
          opacity: 0.7,
          zIndex: 10,
        }}>
          🤖 Agent arranged
        </div>
      )}
      {ordered.map(({ id, child, highlighted }) => (
        <div
          key={id}
          style={highlighted ? {
            boxShadow: '0 0 20px rgba(45,212,191,0.15), 0 0 40px rgba(45,212,191,0.05)',
            borderRadius: 16,
            transition: 'box-shadow 0.3s ease',
          } : undefined}
        >
          {child}
        </div>
      ))}
    </div>
  );
}
