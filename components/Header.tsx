
import React from 'react';
import { NavLink } from 'react-router-dom';

interface HeaderProps {
  isAuthenticated: boolean;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isAuthenticated, onLogout }) => {
  const activeLinkClass = "text-white bg-primary-dark";
  const defaultLinkClass = "text-blue-100 hover:bg-primary-dark hover:text-white";

  return (
    <header className="bg-primary shadow-md">
      <nav className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex-shrink-0">
            <NavLink to="/" className="text-2xl font-bold text-white">
              Financial Library
            </NavLink>
          </div>
          <div className="flex items-center space-x-4">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `${isActive ? activeLinkClass : defaultLinkClass} px-3 py-2 rounded-md text-sm font-medium`
              }
            >
              Resources
            </NavLink>
            {isAuthenticated && (
               <>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `${isActive ? activeLinkClass : defaultLinkClass} px-3 py-2 rounded-md text-sm font-medium`
                  }
                >
                  Admin
                </NavLink>
                <button onClick={onLogout} className={`${defaultLinkClass} px-3 py-2 rounded-md text-sm font-medium`}>
                  Logout
                </button>
               </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
};
