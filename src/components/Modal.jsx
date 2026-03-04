import { useEffect, useRef } from 'react';

export default function Modal({ open, onClose, title, children, large, contentStyle }) {
  const modalRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onCloseRef.current(); };
    window.addEventListener('keydown', handler);

    let frame1 = 0;
    let frame2 = 0;

    const focusTarget = () => {
      const root = modalRef.current;
      if (!root) return;

      const target = root.querySelector('[data-autofocus="true"], [autofocus], input, textarea, select, button');
      if (target && typeof target.focus === 'function') {
        target.focus();
        if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && typeof target.select === 'function') {
          target.select();
        }
      }
    };

    frame1 = window.requestAnimationFrame(() => {
      frame2 = window.requestAnimationFrame(focusTarget);
    });

    return () => {
      window.removeEventListener('keydown', handler);
      window.cancelAnimationFrame(frame1);
      window.cancelAnimationFrame(frame2);
    };
  }, [open]);

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
