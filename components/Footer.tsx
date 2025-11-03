import React from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  isAuthenticated: boolean;
}

const Footer: React.FC<FooterProps> = ({ isAuthenticated }) => {
  return (
    <footer className="bg-slate text-background-light">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-sm">
        <p>&copy; {new Date().getFullYear()} Financial Resource Library. All Rights Reserved.</p>
        {!isAuthenticated && (
          <div className="mt-2">
            <Link to="/login" className="text-secondary hover:text-white underline transition-colors">
              Admin Portal Login
            </Link>
          </div>
        )}
      </div>
    </footer>
  );
};

export default Footer;
