import React from 'react';
import { NavLink } from 'react-router-dom';
import { HomeIcon, AdminIcon, LoginIcon, LogoutIcon } from './icons';

interface BottomNavProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ isAuthenticated, onLogout }) => {
  const activeLinkClass = "text-primary";
  const defaultLinkClass = "text-slate hover:text-primary";
  const baseLinkClass = "flex flex-col items-center justify-center flex-1 py-2 px-1 text-xs sm:text-sm font-medium transition-colors duration-200";

  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)] z-50 md:hidden">
      <nav className="container mx-auto px-4">
        <div className="flex items-center justify-around h-16">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : defaultLinkClass}`}
          >
            <HomeIcon />
            <span>Resources</span>
          </NavLink>
          {isAuthenticated ? (
            <>
              <NavLink
                to="/admin"
                className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : defaultLinkClass}`}
              >
                <AdminIcon />
                <span>Admin</span>
              </NavLink>
              <button onClick={onLogout} className={`${baseLinkClass} ${defaultLinkClass}`}>
                <LogoutIcon />
                <span>Logout</span>
              </button>
            </>
          ) : (
             <NavLink to="/login" className={({ isActive }) => `${baseLinkClass} ${isActive ? activeLinkClass : defaultLinkClass}`}>
                <LoginIcon />
                <span>Admin Login</span>
            </NavLink>
          )}
        </div>
      </nav>
    </footer>
  );
};