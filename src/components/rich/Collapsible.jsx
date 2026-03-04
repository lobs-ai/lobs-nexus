import { useState } from 'react';

function renderMarkdownInline(text) {
  if (!text) return '';
  return text
    .replace(/```([\s\S]*?)```/g, '<pre style="background:rgba(0,0,0,0.3);border-radius:6px;padding:10px;font-size:0.8rem;overflow-x:auto;margin:6px 0">$1</pre>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(45,212,191,0.08);border-radius:4px;padding:1px 5px;font-family:var(--mono);font-size:0.85em;color:var(--teal)">$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\n/g, '<br>');
}

export default function Collapsible({ title, content, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ background: 'rgba(20,28,44,0.7)', backdropFilter: 'blur(12px)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', marginTop: 8, marginBottom: 8, overflow: 'hidden' }}>
      <div onClick={() => setOpen(!open)} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, userSelect: 'none', transition: 'background 0.15s' }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,212,191,0.04)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <span style={{ fontSize: '0.7rem', color: 'var(--teal)', transition: 'transform 0.2s', transform: open ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▶</span>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{title || 'Details'}</span>
      </div>
      {open && (
        <div style={{ padding: '0 16px 14px 16px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
          <div dangerouslySetInnerHTML={{ __html: renderMarkdownInline(content) }} style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, paddingTop: 10 }} />
        </div>
      )}
    </div>
  );
}
