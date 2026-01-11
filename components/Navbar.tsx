
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Início', icon: 'home', path: '/home' },
    { label: 'Histórico', icon: 'history', path: '/history' },
    { label: 'Análises', icon: 'analytics', path: '/analytics' },
    { label: 'Perfil', icon: 'person', path: '/profile' },
  ];

  return (
    <nav className="sticky bottom-0 z-20 w-full bg-surface-light dark:bg-surface-dark border-t border-divider dark:border-gray-800 px-6 pb-6 pt-3 flex items-center justify-between">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-1 flex-1 transition-colors ${isActive ? 'text-primary' : 'text-gray-400 dark:text-gray-500'
              }`}
          >
            <span className={`material-symbols-outlined text-[26px] ${isActive ? 'fill-icon' : ''}`}>
              {item.icon}
            </span>
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navbar;
