export default function Metric({ data }) {
  const metrics = data?.metrics || [];
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8, marginBottom: 8 }}>
      {metrics.map((m, i) => (
        <div key={i} style={{ flex: '1 1 120px', background: 'rgba(20,28,44,0.7)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '14px 16px', minWidth: 120 }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--muted)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 6 }}>{m.label}</div>
          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>{m.value}</div>
          {m.change && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6 }}>
              <span style={{ fontSize: '0.75rem', color: m.trend === 'up' ? 'var(--green)' : 'var(--red)' }}>
                {m.trend === 'up' ? '↑' : '↓'}
              </span>
              <span style={{ fontSize: '0.75rem', color: m.trend === 'up' ? 'var(--green)' : 'var(--red)', fontFamily: 'var(--mono)' }}>{m.change}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
