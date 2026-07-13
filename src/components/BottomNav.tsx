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
      <div className="bottom-nav-row">
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
      </div>
    </nav>
  );
};
