import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Database, Download, FileJson, Home, Menu, X, Bell, User, ChevronLeft, ChevronRight, Activity, Archive, Clock, CheckCircle2, AlertCircle, Info, XCircle, ShieldCheck, LogOut } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // State to track read notifications
  const [readCount, setReadCount] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);

  const { user, userLogs, logout } = useGlobalState();
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

  if (user?.role === 'admin') {
    navItems.splice(navItems.length - 1, 0, { name: 'Administración', path: '/admin', icon: <ShieldCheck size={20} /> });
  }

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
          fixed inset-y-0 left-0 z-40 bg-alquid-navy border-r border-white/5 shadow-premium transform transition-all duration-300 ease-in-out flex flex-col text-white
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
        <nav className="flex-1 py-8 px-3 space-y-2.5 overflow-y-auto overflow-x-hidden custom-scrollbar">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isSidebarCollapsed ? item.name : ''}
                className={`
                  flex items-center gap-3 py-3.5 rounded-2xl transition-all duration-300 group relative
                  ${isActive
                    ? 'bg-gradient-to-r from-alquid-blue to-[#60A5FA] text-white font-bold shadow-lg shadow-alquid-blue/30'
                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }
                  ${isSidebarCollapsed ? 'justify-center px-0' : 'px-5'}
                `}
              >
                <div className={`flex-shrink-0 transition-all duration-500 ${isActive ? 'scale-110 rotate-[5deg]' : 'group-hover:scale-110 group-hover:text-alquid-blue'}`}>
                  {item.icon}
                </div>

                <span
                  className={`
                        whitespace-nowrap overflow-hidden font-ubuntu tracking-wide text-sm transition-all duration-300
                        ${isSidebarCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}
                    `}
                >
                  {item.name}
                </span>

                {isActive && !isSidebarCollapsed && (
                  <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer - Premium Refresh */}
        <div className="p-6 border-t border-white/5 mt-auto bg-black/10 backdrop-blur-sm">
          {isSidebarCollapsed ? (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={logout}
                className="w-12 h-12 rounded-2xl text-gray-400 hover:text-alquid-red hover:bg-alquid-red/10 border border-transparent hover:border-alquid-red/20 transition-all flex items-center justify-center p-0 group"
                title="Cerrar Sesión"
              >
                <LogOut size={20} className="group-hover:-translate-x-0.5 group-active:scale-90 transition-transform" />
              </button>
              <div className="w-10 h-10 rounded-2xl bg-white/5 text-gray-500 flex items-center justify-center font-black text-xs cursor-default border border-white/5" title="ALQUID v2.5">
                v2
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <button
                onClick={logout}
                className="w-full flex items-center justify-between py-3.5 px-6 rounded-2xl text-sm font-black text-gray-400 hover:bg-alquid-red/10 hover:text-alquid-red transition-all border border-transparent hover:border-alquid-red/20 group shadow-sm active:scale-95"
              >
                <div className="flex items-center gap-3">
                  <LogOut size={18} className="transition-transform group-hover:rotate-12" />
                  Cerrar Sesión
                </div>
                <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all" />
              </button>
              <div className="flex items-center justify-between px-2">
                <span className="text-[10px] font-black text-gray-600 uppercase tracking-[0.2em]">Build 2026.02</span>
                <span className="text-[10px] font-bold text-alquid-blue px-2 py-0.5 bg-alquid-blue/10 rounded-full">PROD</span>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full relative">

        {/* Top Header - Enhanced Design */}
        <header className="h-16 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-4 md:px-8 shadow-sm z-30 flex-shrink-0 sticky top-0">
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

              <button className="flex items-center gap-3 hover:bg-gray-50 p-1.5 pr-3 rounded-full transition-all duration-200 border border-transparent hover:border-gray-200 active:scale-95">
                <div className="w-8 h-8 alquid-gradient rounded-full flex items-center justify-center text-white shadow-sm overflow-hidden ring-2 ring-white">
                  {user?.email?.[0]?.toUpperCase() || <User size={14} />}
                </div>
                <div className="hidden md:flex flex-col items-start max-w-[150px]">
                  <span className="text-xs font-bold text-gray-700 leading-none truncate w-full">
                    {user?.email?.split('@')[0] || "Usuario"}
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium leading-none mt-1 uppercase tracking-wider">
                    {user?.role === 'admin' ? "Administrador" : "Usuario Estándar"}
                  </span>
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