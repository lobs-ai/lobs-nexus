export default function Alert({ variant, title, message }) {
  const config = {
    info: { color: 'var(--blue)', icon: 'ℹ️', bg: 'rgba(56,189,248,0.08)', border: 'rgba(56,189,248,0.25)' },
    success: { color: 'var(--green)', icon: '✓', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.25)' },
    warning: { color: 'var(--amber)', icon: '⚠', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.25)' },
    error: { color: 'var(--red)', icon: '✕', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.25)' },
  };
  const c = config[variant] || config.info;
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 'var(--radius)', padding: '12px 16px', marginTop: 8, marginBottom: 8, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span style={{ fontSize: '1rem', flexShrink: 0, lineHeight: 1.4 }}>{c.icon}</span>
      <div>
        {title && <div style={{ fontSize: '0.85rem', fontWeight: 700, color: c.color, marginBottom: 2 }}>{title}</div>}
        {message && <div style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.5 }}>{message}</div>}
      </div>
    </div>
  );
}
