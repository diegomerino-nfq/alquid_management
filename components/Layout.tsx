import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Database, Download, FileJson, Home, Menu, X, Bell, User, Search, ChevronLeft, ChevronRight, Activity, Archive } from 'lucide-react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Inicio', path: '/', icon: <Home size={20} /> },
    { name: 'Descarga Informes', path: '/download', icon: <Download size={20} /> },
    { name: 'Extracción SQL', path: '/extract', icon: <Database size={20} /> },
    { name: 'Editor JSON', path: '/editor', icon: <FileJson size={20} /> },
    { name: 'Repositorio', path: '/repository', icon: <Archive size={20} /> },
    { name: 'Actividad', path: '/activity', icon: <Activity size={20} /> },
  ];

  return (
    <div className="h-screen bg-alquid-gray25 flex font-sans text-alquid-grayDark overflow-hidden">
      
      {/* Sidebar Navigation */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-40 bg-alquid-navy border-r border-alquid-navy shadow-xl transform transition-all duration-300 ease-in-out flex flex-col text-white
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:relative
          ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
          w-64
        `}
      >
        {/* Sidebar Header - Cleaned up */}
        <div className={`
            h-16 flex items-center border-b border-white/10 bg-alquid-navy transition-all duration-300
            ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-end px-4'}
        `}>
           {/* Desktop Toggle Button Only */}
           <button 
             onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
             className="hidden md:flex text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-lg transition-colors"
             title={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
           >
             {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
           </button>

           {/* Mobile Close Button */}
           <button 
             onClick={() => setIsMobileMenuOpen(false)}
             className="md:hidden text-gray-400 hover:text-white"
           >
             <X size={24} />
           </button>
        </div>
        
        {/* Nav Items */}
        <nav className="flex-1 py-6 px-2 space-y-2 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isSidebarCollapsed ? item.name : ''}
                className={`
                  flex items-center gap-3 py-3 rounded-lg transition-all duration-200 group relative
                  ${isActive 
                    ? 'bg-alquid-blue text-white font-medium shadow-md' 
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }
                  ${isSidebarCollapsed ? 'justify-center px-0' : 'px-4'}
                `}
              >
                <div className={`flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-100' : 'group-hover:scale-110'}`}>
                    {item.icon}
                </div>
                
                <span 
                    className={`
                        whitespace-nowrap overflow-hidden transition-all duration-300
                        ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
                    `}
                >
                    {item.name}
                </span>
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/10 mt-auto">
            {isSidebarCollapsed ? (
                <div className="flex justify-center">
                    <div className="w-8 h-8 rounded-full bg-white/10 text-gray-300 flex items-center justify-center font-bold text-[10px] cursor-default" title="v2.1">
                        v2
                    </div>
                </div>
            ) : (
                <div className="px-2">
                    <p className="text-xs text-gray-400 font-medium text-center">Version 2.1.0 (Stable)</p>
                </div>
            )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
        
        {/* Top Header - Enhanced Design */}
        <header className="h-16 bg-white/90 backdrop-blur-md border-b border-alquid-gray40 border-opacity-40 flex items-center justify-between px-4 md:px-8 shadow-sm z-30 flex-shrink-0 sticky top-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-gray-500 hover:text-alquid-navy transition-colors"
            >
              <Menu size={24} />
            </button>
            
            {/* Attractive Branding with Graphic Logo */}
            <div className="flex items-center gap-3 select-none">
              <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg shadow-sm flex items-center justify-center overflow-hidden p-1">
                <img 
                    src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/210309%20-%20Isotipo%20Nfq%20%282%29-sNqToPbPhBOxDC23KKVfiE6DxUiUp8.png" 
                    alt="NFQ Logo" 
                    className="w-full h-full object-contain"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-bold tracking-tight text-alquid-navy leading-none">
                  ALQUID
                </span>
                <span className="text-[10px] font-bold text-alquid-blue tracking-widest uppercase leading-none mt-1">
                  Data Suite
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Search Bar */}
            <div className="hidden md:flex items-center bg-alquid-gray10 hover:bg-white rounded-full px-4 py-2 border border-transparent focus-within:border-alquid-blue focus-within:bg-white focus-within:shadow-sm transition-all duration-300 w-64">
              <Search size={16} className="text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar reporte..." 
                className="bg-transparent border-none outline-none text-sm ml-2 w-full text-gray-600 placeholder-gray-400"
              />
            </div>

            <div className="flex items-center gap-3">
                <button className="w-10 h-10 rounded-full hover:bg-alquid-gray10 flex items-center justify-center text-gray-500 hover:text-alquid-navy transition-colors relative">
                    <Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-alquid-orange rounded-full border-2 border-white"></span>
                </button>
                
                <div className="h-8 w-px bg-gray-200 mx-1 hidden md:block"></div>
                
                <button className="flex items-center gap-3 hover:bg-alquid-gray10 p-1.5 pr-3 rounded-full transition-colors border border-transparent hover:border-gray-200">
                    <div className="w-8 h-8 bg-alquid-navy rounded-full flex items-center justify-center text-white shadow-sm">
                        <User size={14} />
                    </div>
                    <div className="hidden md:flex flex-col items-start">
                        <span className="text-xs font-bold text-gray-700 leading-none">Admin User</span>
                        <span className="text-[10px] text-gray-400 leading-none mt-1">Global Access</span>
                    </div>
                </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto bg-alquid-gray25 p-4 md:p-8 w-full h-full relative">
           {children}
        </main>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-alquid-navy/40 backdrop-blur-sm z-30 md:hidden animate-fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Layout;