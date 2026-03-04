import { useEffect, useRef } from 'react';

export default function Modal({ open, onClose, title, children, large, contentStyle }) {
  const modalRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);

    const focusTimer = setTimeout(() => {
      const target = modalRef.current?.querySelector('[autofocus], [data-autofocus="true"]');
      if (target && typeof target.focus === 'function') target.focus();
    }, 0);

    return () => {
      window.removeEventListener('keydown', handler);
      clearTimeout(focusTimer);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div ref={modalRef} className="modal-box" style={{ ...(large ? { width: '98%', maxWidth: '1440px', maxHeight: '95vh' } : {}), ...(contentStyle || {}) }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 800 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', fontSize: '1.2rem', padding: 4, transition: 'color 0.2s' }}
            onMouseEnter={e => e.target.style.color = 'var(--text)'}
            onMouseLeave={e => e.target.style.color = 'var(--faint)'}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
