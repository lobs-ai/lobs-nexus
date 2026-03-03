export default function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--muted)' }}>
      {icon && <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>}
      <h3 style={{ color: 'var(--text)', marginBottom: 8 }}>{title}</h3>
      <p style={{ marginBottom: 24, maxWidth: 360, margin: '0 auto 24px' }}>{description}</p>
      {action}
    </div>
  );
}
