export default function TaskCard({ data }) {
  const statusColors = { active: 'var(--teal)', blocked: 'var(--red)', done: 'var(--green)', pending: 'var(--faint)' };
  const agentColors = { programmer: 'var(--blue)', writer: 'var(--purple)', researcher: 'var(--amber)', reviewer: 'var(--green)', architect: 'var(--teal)' };
  const progress = data?.progress ?? 0;
  return (
    <div style={{ background: 'rgba(20,28,44,0.7)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', marginTop: 8, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ flex: 1, fontSize: '0.9rem', fontWeight: 700, color: 'var(--text)' }}>{data?.title || 'Untitled Task'}</div>
        <span style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: 6, background: `${statusColors[data?.status] || 'var(--faint)'}22`, color: statusColors[data?.status] || 'var(--faint)', border: `1px solid ${statusColors[data?.status] || 'var(--faint)'}44`, textTransform: 'uppercase', letterSpacing: '1px', fontFamily: 'var(--mono)' }}>{data?.status || '—'}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        {data?.agent && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: `${agentColors[data.agent] || 'var(--muted)'}18`, color: agentColors[data.agent] || 'var(--muted)', fontFamily: 'var(--mono)' }}>{data.agent}</span>}
        {data?.model && <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>{data.model}</span>}
      </div>
      {progress > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>Progress</span>
            <span style={{ fontSize: '0.7rem', color: 'var(--teal)', fontFamily: 'var(--mono)' }}>{progress}%</span>
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progress}%`, borderRadius: 2, background: 'linear-gradient(90deg, var(--teal), var(--blue))', transition: 'width 0.3s ease' }} />
          </div>
        </div>
      )}
      {data?.notes && <div style={{ fontSize: '0.8rem', color: 'var(--muted)', fontStyle: 'italic' }}>{data.notes}</div>}
    </div>
  );
}
