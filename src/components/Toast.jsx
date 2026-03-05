import { useState, useEffect, useRef } from 'react';

let toastFn = null;
export function showToast(msg, type = 'info') {
  toastFn && toastFn(msg, type);
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef([]);

  useEffect(() => {
    toastFn = (msg, type) => {
      const id = Date.now();
      setToasts(t => [...t, { id, msg, type }]);
      const timer = setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
      timersRef.current.push(timer);
    };
    return () => {
      toastFn = null;
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
  }, []);

  const colors = { info: 'var(--blue)', success: 'var(--green)', error: 'var(--red)', warning: 'var(--amber)' };
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9998, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} className="glass-card" style={{ padding: '12px 20px', minWidth: 240, borderColor: colors[t.type] + '44', color: colors[t.type], fontSize: '0.9rem', animation: 'reveal 0.3s ease' }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}
