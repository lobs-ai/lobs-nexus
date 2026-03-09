import { useState, useRef, useEffect } from 'react';

const LAYOUTS = {
  'command-center': {
    label: 'Command Center',
    icon: '⬡',
    description: 'Everything visible',
    hiddenWidgets: [],
    widgetOrder: ['stats', 'workers', 'activity', 'quick-actions', 'health', 'meetings'],
  },
  'focus': {
    label: 'Focus Mode',
    icon: '◎',
    description: 'Current task + blockers',
    hiddenWidgets: ['activity', 'meetings', 'health'],
    widgetOrder: ['workers', 'stats', 'quick-actions'],
  },
  'briefing': {
    label: 'Briefing',
    icon: '📋',
    description: 'Read-only summary',
    hiddenWidgets: ['quick-actions', 'health'],
    widgetOrder: ['stats', 'activity', 'workers', 'meetings'],
  },
  'triage': {
    label: 'Triage',
    icon: '🚨',
    description: 'Inbox & actions first',
    hiddenWidgets: ['health'],
    widgetOrder: ['meetings', 'quick-actions', 'workers', 'stats', 'activity'],
  },
  'monitor': {
    label: 'Monitor',
    icon: '📡',
    description: 'System health & workers',
    hiddenWidgets: ['meetings', 'quick-actions'],
    widgetOrder: ['health', 'workers', 'stats', 'activity'],
  },
};

export { LAYOUTS };

export default function LayoutSwitcher({ current = 'command-center', onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const currentLayout = LAYOUTS[current] || LAYOUTS['command-center'];

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '6px 14px',
          color: 'var(--teal)',
          fontSize: '0.78rem',
          fontFamily: 'var(--mono)',
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transition: 'all 0.2s',
        }}
      >
        <span>{currentLayout.icon}</span>
        <span>{currentLayout.label}</span>
        <span style={{ fontSize: '0.6rem', opacity: 0.5, marginLeft: 2 }}>▼</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: 6,
          background: 'rgba(15,15,20,0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          padding: 6,
          minWidth: 220,
          zIndex: 100,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        }}>
          {Object.entries(LAYOUTS).map(([key, layout]) => (
            <button
              key={key}
              onClick={() => { onChange(key); setOpen(false); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '10px 12px',
                background: key === current ? 'rgba(45,212,191,0.08)' : 'transparent',
                border: key === current ? '1px solid rgba(45,212,191,0.2)' : '1px solid transparent',
                borderRadius: 8,
                cursor: 'pointer',
                color: 'var(--text)',
                textAlign: 'left',
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                if (key !== current) e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
              }}
              onMouseLeave={(e) => {
                if (key !== current) e.currentTarget.style.background = 'transparent';
              }}
            >
              <span style={{ fontSize: '1rem', width: 24, textAlign: 'center' }}>{layout.icon}</span>
              <div>
                <div style={{
                  fontSize: '0.82rem',
                  fontWeight: key === current ? 700 : 500,
                  color: key === current ? 'var(--teal)' : 'var(--text)',
                }}>{layout.label}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted)', marginTop: 1 }}>{layout.description}</div>
              </div>
              {key === current && (
                <span style={{ marginLeft: 'auto', color: 'var(--teal)', fontSize: '0.75rem' }}>✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
