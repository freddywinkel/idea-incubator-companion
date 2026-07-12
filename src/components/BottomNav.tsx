import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Sun, Plus, Library, Download } from 'lucide-react';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/today', label: 'Today', icon: <Sun size={20} /> },
  { path: '/capture', label: 'Capture', icon: <Plus size={20} /> },
  { path: '/library', label: 'Library', icon: <Library size={20} /> },
  { path: '/export', label: 'Export', icon: <Download size={20} /> },
];

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const current = location.pathname === '/' ? '/today' : location.pathname;

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      {navItems.map((item) => {
        const isActive = current === item.path;
        return (
          <NavLink
            key={item.path}
            to={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="bottom-nav-icon" aria-hidden="true">{item.icon}</span>
            <span className="bottom-nav-label">{item.label}</span>
          </NavLink>
        );
      })}
      <style>{`
        .bottom-nav {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          height: var(--bottom-nav-height);
          padding-bottom: var(--safe-bottom);
          background: var(--color-surface);
          border-top: 1px solid var(--color-border);
          display: flex;
          justify-content: space-around;
          align-items: center;
          z-index: 50;
          box-shadow: 0 -2px 8px rgba(0,0,0,0.04);
        }
        .bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 8px 0;
          min-height: var(--tap-min);
          color: var(--color-text-tertiary);
          transition: color 150ms ease;
          background: none;
          border: none;
          cursor: pointer;
          font-family: inherit;
          text-decoration: none;
        }
        .bottom-nav-item.active {
          color: var(--color-accent);
        }
        .bottom-nav-item:focus-visible {
          outline: 2px solid var(--color-focus);
          outline-offset: -2px;
          border-radius: 8px;
        }
        .bottom-nav-icon {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .bottom-nav-label {
          font-size: 0.75rem;
          font-weight: 500;
        }
      `}</style>
    </nav>
  );
};
