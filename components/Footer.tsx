import React from 'react';
import { Link } from 'react-router-dom';

interface FooterProps {
  showManage: boolean;
}

const Footer: React.FC<FooterProps> = ({ showManage }) => {
  return (
    <footer className="bg-paper border-t border-line mt-12 py-8 text-ink2">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-semibold pb-4">
          <div>
            &copy; {new Date().getFullYear()} BiggerPockets Money. All Rights Reserved.
          </div>
        </div>
        <p className="mt-4 text-[11.5px] text-[#8a988f] leading-relaxed border-t border-line pt-4">
          <b>This is an estimate, not tax or financial advice.</b> Figures are projections based on published rates and your inputs. Consult a qualified professional before making decisions. &copy; {new Date().getFullYear()} Early Retirement Group, LLC d/b/a BiggerPockets Money. All Rights Reserved.
        </p>
      </div>
    </footer>
  );
};

export default Footer;
