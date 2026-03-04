export default function Progress({ title, steps = [] }) {
  return (
    <div style={{ background: 'rgba(20,28,44,0.7)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', marginTop: 8, marginBottom: 8 }}>
      {title && <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 14, textTransform: 'uppercase' }}>{title}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        {steps.map((step, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: 20 }}>
              {step.status === 'done' && <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', color: '#000', fontWeight: 700 }}>✓</div>}
              {step.status === 'active' && <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--teal)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--teal)' }} /></div>}
              {step.status === 'pending' && <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid var(--faint)' }} />}
              {i < steps.length - 1 && <div style={{ width: 2, height: 20, background: step.status === 'done' ? 'var(--green)' : 'rgba(255,255,255,0.06)' }} />}
            </div>
            <div style={{ fontSize: '0.85rem', color: step.status === 'pending' ? 'var(--faint)' : 'var(--text)', fontWeight: step.status === 'active' ? 600 : 400, paddingTop: 1 }}>{step.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
