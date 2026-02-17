import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon }) => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-5 mb-6 -mx-6 md:-mx-10 -mt-6 md:-mt-10 sticky top-0 z-20 shadow-sm flex items-center gap-4">
      {icon && <div className="p-2 bg-blue-50 text-alquid-blue rounded-lg">{icon}</div>}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
};

export default PageHeader;