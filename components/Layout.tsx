import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Database, Download, FileJson, Home, Menu, X, Bell, User, ChevronLeft, ChevronRight, Activity, Archive, Clock, CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  // State to track read notifications
  const [readCount, setReadCount] = useState(0);
  
  const notifRef = useRef<HTMLDivElement>(null);
  
  const { userLogs } = useGlobalState();
  const location = useLocation();
  const navigate = useNavigate();

  // Calculate unread status
  const hasUnread = userLogs.length > readCount;

  const navItems = [
    { name: 'Inicio', path: '/', icon: <Home size={20} /> },
    { name: 'Descarga Informes', path: '/download', icon: <Download size={20} /> },
    { name: 'Extracción SQL', path: '/extract', icon: <Database size={20} /> },
    { name: 'Editor JSON', path: '/editor', icon: <FileJson size={20} /> },
    { name: 'Repositorio', path: '/repository', icon: <Archive size={20} /> },
    { name: 'Actividad', path: '/activity', icon: <Activity size={20} /> },
  ];

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleNotifications = () => {
      if (!showNotifications) {
          // If opening, mark all current as read
          setReadCount(userLogs.length);
      }
      setShowNotifications(!showNotifications);
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 size={14} className="text-green-500" />;
      case 'ERROR': return <XCircle size={14} className="text-red-500" />;
      case 'WARNING': return <AlertCircle size={14} className="text-yellow-500" />;
      default: return <Info size={14} className="text-blue-500" />;
    }
  };

  const handleViewAllActivity = () => {
    setShowNotifications(false);
    navigate('/activity');
  };

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
            {/* Search Bar Removed as requested */}

            <div className="flex items-center gap-3">
                {/* Notification Bell with Dropdown */}
                <div className="relative" ref={notifRef}>
                    <button 
                        onClick={handleToggleNotifications}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors relative ${showNotifications ? 'bg-alquid-gray10 text-alquid-navy' : 'text-gray-500 hover:bg-alquid-gray10 hover:text-alquid-navy'}`}
                    >
                        <Bell size={20} />
                        {hasUnread && (
                            <span className="absolute top-2 right-2 w-2 h-2 bg-alquid-orange rounded-full border-2 border-white animate-pulse"></span>
                        )}
                    </button>

                    {/* Notification Dropdown */}
                    {showNotifications && (
                        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-fade-in z-50">
                            <div className="px-4 py-3 border-b border-gray-50 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-bold text-sm text-gray-700">Última Actividad</h3>
                                <span className="text-[10px] text-gray-400 bg-white border px-2 py-0.5 rounded-full">{userLogs.length} eventos</span>
                            </div>
                            <div className="max-h-80 overflow-y-auto">
                                {userLogs.length === 0 ? (
                                    <div className="p-6 text-center text-gray-400 text-sm">
                                        No hay notificaciones recientes
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-50">
                                        {userLogs.slice(0, 5).map((log) => (
                                            <div key={log.id} className="p-4 hover:bg-blue-50/50 transition-colors">
                                                <div className="flex items-start gap-3">
                                                    <div className="mt-0.5">{getLogIcon(log.type)}</div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-semibold text-gray-800 truncate">{log.action}</p>
                                                        <p className="text-xs text-gray-500 truncate">{log.details}</p>
                                                        <div className="flex items-center gap-2 mt-1.5">
                                                            <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                                                <Clock size={10} /> {log.timestamp}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-gray-300 px-1.5 py-0.5 rounded bg-gray-100">{log.module}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-2 bg-gray-50 border-t border-gray-100">
                                <button 
                                    onClick={handleViewAllActivity}
                                    className="w-full py-2 text-xs font-bold text-alquid-blue hover:bg-white hover:shadow-sm rounded-lg transition-all"
                                >
                                    Ver toda la actividad
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                
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