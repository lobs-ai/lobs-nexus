import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/', label: 'Home', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>, mobile: true },
  { to: '/my-tasks', label: 'My Tasks', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>, mobile: true },
  { to: '/projects', label: 'Projects', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/></svg>, mobile: true },
  { to: '/team', label: 'Team', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>, mobile: true },
  { to: '/scheduler', label: 'Scheduler', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> },
  { to: '/intel', label: 'Intel Sweep', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg> },
  { to: '/explore', label: 'Explore', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>, mobile: true },
  { to: '/reflections', label: 'Reflections', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> },
  { to: '/inbox', label: 'Inbox', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>, mobile: true },
  { to: '/chat', label: 'Chat', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  { to: "/meetings", label: "Meetings", icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg> },
  { to: '/youtube', label: 'YouTube', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.95-1.96C18.88 4 12 4 12 4s-6.88 0-8.59.46A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58A2.78 2.78 0 0 0 3.41 19.6C5.12 20 12 20 12 20s6.88 0 8.59-.46a2.78 2.78 0 0 0 1.95-1.95A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58z"/><polygon points="9.75 15.02 15.5 12 9.75 8.98 9.75 15.02" fill="currentColor" stroke="none"/></svg> },
  { to: '/knowledge', label: 'Docs', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg> },
  { to: '/memory', label: 'Memory', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
  { to: '/usage', label: 'Usage', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, mobile: true },
  { to: '/workers', label: 'Workers', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  { to: '/learning', label: 'Learning', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg> },
  { to: '/training', label: 'Training', icon: <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/></svg> },
  // Daily Brief merged into Scheduler page
  { to: '/github', label: 'GitHub', icon: <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg> },
];

// Primary mobile tabs (shown in bottom bar)
const MOBILE_PRIMARY = ['/', '/projects', '/chat', '/inbox'];

export default function Sidebar({ collapsed, onToggle, systemStatus, isMobile }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const serverStatus = systemStatus?.status || 'connecting';
  const statusColor = serverStatus === 'healthy' ? 'var(--green)' : serverStatus === 'degraded' ? 'var(--amber)' : 'var(--red)';
  const statusText = serverStatus;
  const keys = systemStatus?.keys || {};

  // Check if current page is one of the non-primary pages (show its icon instead of one of the defaults)
  const currentPath = location.pathname === '/' ? '/' : '/' + location.pathname.split('/')[1];
  const isPrimaryActive = MOBILE_PRIMARY.includes(currentPath);
  const activeNonPrimary = !isPrimaryActive ? NAV.find(n => n.to === currentPath) : null;

  // Mobile: show 4 primary tabs + "More" button
  if (isMobile) {
    const primaryItems = NAV.filter(n => MOBILE_PRIMARY.includes(n.to));

    return (
      <>
        {/* More menu overlay */}
        {moreOpen && (
          <div
            className="mobile-more-backdrop"
            onClick={() => setMoreOpen(false)}
          >
            <div
              className="mobile-more-sheet"
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ color: 'var(--teal)', fontFamily: 'var(--mono)', fontSize: '0.65rem', fontWeight: 800, letterSpacing: '3px' }}>
                  ALL PAGES
                </span>
                <button
                  onClick={() => setMoreOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4 }}
                >
                  <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>
              <div className="mobile-more-grid">
                {NAV.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) => `mobile-more-item ${isActive ? 'active' : ''}`}
                    onClick={() => setMoreOpen(false)}
                  >
                    <span className="mobile-more-icon">{item.icon}</span>
                    <span className="mobile-more-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
              <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                <span className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: statusColor, flexShrink: 0 }} />
                <span style={{ color: 'var(--muted)', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>{statusText}</span>
              </div>
            </div>
          </div>
        )}

        {/* Bottom tab bar */}
        <div className="sidebar mobile-bottom-bar">
          {primaryItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `mobile-tab ${isActive ? 'active' : ''}`}
            >
              <span className="mobile-tab-icon">{item.icon}</span>
              <span className="mobile-tab-label">{item.label}</span>
            </NavLink>
          ))}

          {/* If on a non-primary page, show that page's icon as active */}
          {activeNonPrimary && (
            <div className="mobile-tab active">
              <span className="mobile-tab-icon">{activeNonPrimary.icon}</span>
              <span className="mobile-tab-label">{activeNonPrimary.label}</span>
            </div>
          )}

          {/* More button */}
          <button
            className={`mobile-tab ${moreOpen ? 'active' : ''}`}
            onClick={() => setMoreOpen(o => !o)}
          >
            <span className="mobile-tab-icon">
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
                <circle cx="12" cy="19" r="1.5" fill="currentColor"/>
              </svg>
            </span>
            <span className="mobile-tab-label">More</span>
          </button>
        </div>
      </>
    );
  }

  // Desktop sidebar
  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div style={{ padding: '22px 16px 18px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9,
          background: 'linear-gradient(135deg, var(--teal), var(--blue))',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          boxShadow: '0 0 16px rgba(45,212,191,0.4)',
        }}>
          <svg width="16" height="16" fill="white" viewBox="0 0 24 24">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
        </div>
        <span className="logo-text sidebar-logo">NEXUS</span>
        <button
          onClick={onToggle}
          style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--faint)', cursor: 'pointer', padding: 4, flexShrink: 0, transition: 'color 0.2s' }}
          onMouseEnter={e => e.target.style.color = 'var(--text)'}
          onMouseLeave={e => e.target.style.color = 'var(--faint)'}
        >
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Section label */}
      {!collapsed && (
        <div style={{ padding: '14px 24px 4px', color: 'var(--faint)', fontSize: '0.6rem', fontWeight: 800, letterSpacing: '3px', fontFamily: 'var(--mono)' }}>
          NAVIGATION
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {NAV.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? item.label : undefined}
          >
            <span style={{ flexShrink: 0 }}>{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer — key pool status */}
      <div style={{ padding: '14px 16px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            className="pulse-dot"
            style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor, color: statusColor, flexShrink: 0 }}
          />
          <span className="status-label" style={{ color: 'var(--muted)', fontSize: '0.75rem', flex: 1, fontFamily: 'var(--mono)' }}>
            {statusText}
          </span>
        </div>
        {!collapsed && Object.keys(keys).length > 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {Object.entries(keys).map(([provider, info]) => {
              const allHealthy = info.healthy === info.total;
              const noneHealthy = info.healthy === 0 && info.total > 0;
              const dotColor = noneHealthy ? 'var(--red)' : allHealthy ? 'var(--green)' : 'var(--amber)';
              return (
                <div key={provider} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                  <span style={{ color: 'var(--muted)', fontSize: '0.65rem', fontFamily: 'var(--mono)', textTransform: 'capitalize', flex: 1 }}>
                    {provider}
                  </span>
                  <span style={{ color: allHealthy ? 'var(--faint)' : 'var(--amber)', fontSize: '0.6rem', fontFamily: 'var(--mono)' }}>
                    {info.healthy}/{info.total}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        {!collapsed && (
          <div style={{ marginTop: 8, fontFamily: 'var(--mono)', fontSize: '0.6rem', color: 'var(--faint)', letterSpacing: '1px' }}>
            LOBS NEXUS v1
          </div>
        )}
      </div>
    </div>
  );
}
