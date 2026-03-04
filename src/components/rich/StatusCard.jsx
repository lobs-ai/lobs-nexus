export default function StatusCard({ data }) {
  const statusColors = { ok: 'var(--green)', warning: 'var(--amber)', error: 'var(--red)' };
  const items = data?.items || [];
  return (
    <div style={{ background: 'rgba(20,28,44,0.7)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', marginTop: 8, marginBottom: 8 }}>
      {data?.title && <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 12, textTransform: 'uppercase' }}>{data.title}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColors[item.status] || 'var(--faint)', boxShadow: `0 0 6px ${statusColors[item.status] || 'transparent'}`, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{item.label}</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text)', fontWeight: 600 }}>{item.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
