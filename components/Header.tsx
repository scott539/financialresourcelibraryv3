import React from 'react';
import { NavLink } from 'react-router-dom';

interface HeaderProps {
  isAuthenticated: boolean;
  onLogout: () => void;
  showManage: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isAuthenticated, onLogout, showManage }) => {
  const activeLinkClass = "text-primary bg-greensoft/40 font-black border-primary";
  const defaultLinkClass = "text-ink2 hover:text-ink border-transparent hover:bg-greensoft/10";

  return (
    <header className="bg-white border-b border-line2 sticky top-0 z-50 transition-all duration-300 py-1 sm:py-1.5">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-end h-11 sm:h-12">
          {/* Navigation Links */}
          <div className="flex items-center space-x-1 sm:space-x-2">
            {showManage ? (
              <>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold transition-all duration-300 border-b-2 ${
                      isActive ? activeLinkClass : defaultLinkClass
                    }`
                  }
                >
                  Manage
                </NavLink>
                <button 
                  onClick={onLogout} 
                  className="text-ink2 hover:text-red-600 hover:bg-red-50/60 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-lg text-xs font-black transition-all duration-250 cursor-pointer active:scale-95"
                >
                  Logout
                </button>
              </>
            ) : (
              <NavLink
                id="admin-header-btn"
                to="/admin"
                className="text-[9px] text-[#cbd5e1] hover:text-[#4b5563] transition-all duration-200 font-medium tracking-wider uppercase px-2 py-1 select-none opacity-50 hover:opacity-100 cursor-pointer"
              >
                Admin
              </NavLink>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};
