import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import NoiseOverlay from './NoiseOverlay';
import Toast from './Toast';

export default function Layout({ systemStatus, theme, onThemeToggle }) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div data-theme={theme} style={{ display: 'flex', minHeight: '100vh', background: 'var(--navy)' }}>
      <NoiseOverlay />
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
        systemStatus={systemStatus}
        theme={theme}
        onThemeToggle={onThemeToggle}
      />
      {collapsed && (
        <button
          onClick={() => setCollapsed(false)}
          style={{
            position: 'fixed', top: 22, left: 72, zIndex: 101,
            background: 'rgba(14,20,38,0.9)', border: '1px solid var(--border)',
            borderRadius: 8, padding: '6px 8px', cursor: 'pointer', color: 'var(--muted)',
            transition: 'all 0.2s', backdropFilter: 'blur(12px)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--teal)'; e.currentTarget.style.borderColor = 'rgba(45,212,191,0.3)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      )}
      <main className={`main-content ${collapsed ? 'collapsed' : ''}`} style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <Outlet />
      </main>
      <Toast />
    </div>
  );
}
