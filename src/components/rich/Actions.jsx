export default function Actions({ buttons = [], onAction }) {
  const variantStyles = {
    primary: { background: 'rgba(45,212,191,0.15)', color: 'var(--teal)', border: '1px solid rgba(45,212,191,0.3)', hoverBg: 'rgba(45,212,191,0.25)' },
    danger: { background: 'rgba(248,113,113,0.12)', color: 'var(--red)', border: '1px solid rgba(248,113,113,0.3)', hoverBg: 'rgba(248,113,113,0.22)' },
    secondary: { background: 'transparent', color: 'var(--muted)', border: '1px solid var(--border)', hoverBg: 'rgba(255,255,255,0.04)' },
  };
  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, marginBottom: 8 }}>
      {buttons.map((btn, i) => {
        const v = variantStyles[btn.variant] || variantStyles.secondary;
        return (
          <button key={i} onClick={() => onAction?.(btn.action)}
            style={{ background: v.background, color: v.color, border: v.border, padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font)', transition: 'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = v.hoverBg}
            onMouseLeave={e => e.currentTarget.style.background = v.background}>
            {btn.label}
          </button>
        );
      })}
    </div>
  );
}
