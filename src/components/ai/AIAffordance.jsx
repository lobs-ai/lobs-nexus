import AISummarizeButton from './AISummarizeButton';
import AIReplyChips from './AIReplyChips';
import AIInlineText from './AIInlineText';
import AIBadge from './AIBadge';
import AIRewriteMenu from './AIRewriteMenu';
import AIContextPanel from './AIContextPanel';

/**
 * <AIAffordance affordance={affordance} context={contextData} {...extraProps} />
 * Generic wrapper — renders the right affordance component based on type.
 */
export default function AIAffordance({ affordance, context, ...props }) {
  if (!affordance) return null;

  const ctx = typeof context === 'string' ? context : JSON.stringify(context ?? '');

  switch (affordance.type) {
    case 'button':
      return <AISummarizeButton affordance={affordance} context={ctx} {...props} />;
    case 'chips':
      return <AIReplyChips affordance={affordance} context={ctx} {...props} />;
    case 'inline-text':
      return <AIInlineText affordance={affordance} context={ctx} {...props} />;
    case 'badge':
      return <AIBadge affordance={affordance} context={ctx} {...props} />;
    case 'rewrite-menu':
      return <AIRewriteMenu affordance={affordance} context={ctx} {...props} />;
    case 'context-panel':
      return <AIContextPanel affordance={affordance} context={ctx} {...props} />;
    default:
      return null;
  }
}

export { AISummarizeButton, AIReplyChips, AIInlineText, AIBadge, AIRewriteMenu, AIContextPanel };
