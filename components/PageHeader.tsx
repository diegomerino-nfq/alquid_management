import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, action }) => {
  return (
    <div className="bg-nafra-surface/95 backdrop-blur-md border-b border-nafra-border px-8 py-6 mb-8 -mx-10 -mt-10 sticky top-0 z-20 flex items-center justify-between gap-5 text-nafra-text">
      <div className="flex items-center gap-5 min-w-0">
        {icon && <div className="w-12 h-12 bg-nafra-card text-nafra-accent rounded-2xl flex items-center justify-center shadow-inner-soft border border-nafra-border transition-transform">{icon}</div>}
        <div>
          <h1 className="text-2xl font-semibold text-nafra-text tracking-tight">{title}</h1>
          {subtitle && <p className="text-sm text-nafra-text-dim font-medium mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
};

export default PageHeader;