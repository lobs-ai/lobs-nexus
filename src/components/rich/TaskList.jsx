export default function TaskList({ data }) {
  const statusColors = { active: 'var(--teal)', blocked: 'var(--red)', done: 'var(--green)', pending: 'var(--faint)' };
  const agentColors = { programmer: 'var(--blue)', writer: 'var(--purple)', researcher: 'var(--amber)', reviewer: 'var(--green)', architect: 'var(--teal)' };
  const tasks = data?.tasks || [];
  return (
    <div style={{ background: 'rgba(20,28,44,0.7)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', marginTop: 8, marginBottom: 8 }}>
      {data?.title && <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 10, textTransform: 'uppercase' }}>{data.title}</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {tasks.map((t, i) => (
          <div key={t.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < tasks.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: statusColors[t.status] || 'var(--faint)', boxShadow: `0 0 5px ${statusColors[t.status] || 'transparent'}`, flexShrink: 0 }} />
            <div style={{ flex: 1, fontSize: '0.85rem', color: 'var(--text)' }}>{t.title}</div>
            {t.agent && <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4, background: `${agentColors[t.agent] || 'var(--muted)'}18`, color: agentColors[t.agent] || 'var(--muted)', fontFamily: 'var(--mono)' }}>{t.agent}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
