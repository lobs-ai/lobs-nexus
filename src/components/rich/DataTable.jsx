export default function DataTable({ title, columns = [], rows = [] }) {
  return (
    <div style={{ background: 'rgba(20,28,44,0.7)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '16px 18px', marginTop: 8, marginBottom: 8, overflowX: 'auto' }}>
      {title && <div style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '2px', color: 'var(--teal)', fontFamily: 'var(--mono)', marginBottom: 10, textTransform: 'uppercase' }}>{title}</div>}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr>
            {columns.map((col, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '6px 10px', color: 'var(--muted)', fontWeight: 600, fontFamily: 'var(--mono)', fontSize: '0.72rem', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ borderBottom: ri < rows.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none' }}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '6px 10px', color: 'var(--text)' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
