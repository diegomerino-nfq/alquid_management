import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon }) => {
  return (
    <div className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-6 mb-8 -mx-10 -mt-10 sticky top-0 z-20 flex items-center gap-5">
      {icon && <div className="w-12 h-12 bg-alquid-gray10 text-alquid-navy rounded-2xl flex items-center justify-center shadow-inner-soft border border-white group-hover:scale-110 transition-transform">{icon}</div>}
      <div>
        <h1 className="text-2xl font-black text-alquid-navy tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-400 font-medium mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

export default PageHeader;