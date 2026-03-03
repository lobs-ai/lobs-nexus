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
      <main className={`main-content ${collapsed ? 'collapsed' : ''}`} style={{ flex: 1, padding: '32px', position: 'relative', overflow: 'hidden' }}>
        <Outlet />
      </main>
      <Toast />
    </div>
  );
}
