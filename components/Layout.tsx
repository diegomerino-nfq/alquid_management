import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Database, Download, FileJson, Home, Menu, X, Bell, User, ChevronLeft, ChevronRight, Activity, Archive, Clock, CheckCircle2, AlertCircle, Info, XCircle, ShieldCheck, LogOut, BarChart3, Settings } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [readCount, setReadCount] = useState(0);

  const notifRef = useRef<HTMLDivElement>(null);

  const { user, userLogs, logout } = useGlobalState();
  const location = useLocation();
  const navigate = useNavigate();

  const hasUnread = userLogs.length > readCount;

  const navItems = [
    { name: 'Inicio', path: '/', icon: <Home size={20} /> },
    { name: 'Descarga Informes', path: '/download', icon: <Download size={20} /> },
    { name: 'Extracción SQL', path: '/extract', icon: <Database size={20} /> },
    { name: 'Creacion JSON', path: '/editor', icon: <FileJson size={20} /> },
    { name: 'Repositorio', path: '/repository', icon: <Archive size={20} /> },
    { name: 'Actividad', path: '/activity', icon: <Activity size={20} /> },
  ];

  if (user?.role === 'admin') {
    navItems.splice(navItems.length - 1, 0, { name: 'Administración', path: '/admin', icon: <ShieldCheck size={20} /> });
  }

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
      setReadCount(userLogs.length);
    }
    setShowNotifications(!showNotifications);
  };

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 size={14} className="text-nafra-success" />;
      case 'ERROR': return <XCircle size={14} className="text-nafra-danger" />;
      case 'WARNING': return <AlertCircle size={14} className="text-nafra-warning" />;
      default: return <Info size={14} className="text-nafra-accent" />;
    }
  };

  const handleViewAllActivity = () => {
    setShowNotifications(false);
    navigate('/activity');
  };

  return (
    <div className="h-screen bg-nafra-bg flex font-sans text-nafra-text overflow-hidden">

      {/* Sidebar Navigation */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 bg-nafra-sidebar border-r border-nafra-border shadow-premium transform transition-all duration-300 ease-in-out flex flex-col text-nafra-text
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:relative
          ${isSidebarCollapsed ? 'md:w-20' : 'md:w-64'}
          w-64
        `}
      >
        {/* Sidebar Header */}
        <div className={`
            h-16 flex items-center border-b border-nafra-border bg-nafra-sidebar transition-all duration-300
            ${isSidebarCollapsed ? 'justify-center px-0' : 'justify-start px-4'}
        `}>
          <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'hidden' : ''}`}>
            <div className="w-10 h-10 bg-nafra-accent/20 rounded-lg flex items-center justify-center">
              <BarChart3 size={20} className="text-nafra-accent" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-nafra-text">ALQUID</span>
              <span className="text-[10px] text-nafra-text-dim">Suite</span>
            </div>
          </div>
          
          {/* Desktop Toggle Button */}
          <button
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            className="hidden md:flex ml-auto text-nafra-text-dim hover:text-nafra-accent hover:bg-nafra-border p-1.5 rounded-lg transition-colors"
            title={isSidebarCollapsed ? "Expandir menú" : "Contraer menú"}
          >
            {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          </button>

          {/* Mobile Close Button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden ml-auto text-nafra-text-dim hover:text-nafra-text"
          >
            <X size={24} />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 py-8 px-3 space-y-2.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                title={isSidebarCollapsed ? item.name : ''}
                className={`
                  flex items-center gap-3 py-3.5 px-4 rounded-lg transition-all duration-300 group
                  ${isActive
                    ? 'bg-nafra-accent/20 text-nafra-accent font-semibold border-l-2 border-nafra-accent'
                    : 'text-nafra-text-dim hover:bg-nafra-border hover:text-nafra-text'
                  }
                  ${isSidebarCollapsed ? 'justify-center px-0' : ''}
                `}
              >
                <div className="flex-shrink-0">
                  {item.icon}
                </div>

                <span
                  className={`
                    whitespace-nowrap overflow-hidden text-sm transition-all duration-300
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
        <div className="p-4 border-t border-nafra-border bg-nafra-surface/50">
          {isSidebarCollapsed ? (
            <button
              onClick={logout}
              className="w-full h-10 rounded-lg text-nafra-text-dim hover:text-nafra-danger hover:bg-nafra-danger/10 transition-all flex items-center justify-center"
              title="Cerrar Sesión"
            >
              <LogOut size={20} />
            </button>
          ) : (
            <button
              onClick={logout}
              className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold text-nafra-text-dim hover:bg-nafra-danger/10 hover:text-nafra-danger transition-all"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden w-full">

        {/* Top Navbar */}
        <header className="h-16 bg-nafra-surface border-b border-nafra-border flex items-center justify-between px-4 md:px-8 z-30 flex-shrink-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden text-nafra-text-dim hover:text-nafra-text transition-colors"
            >
              <Menu size={24} />
            </button>

            <div className="text-sm font-semibold text-nafra-text">
              INTELIGENCIA FINANCIERA
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Notification Bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={handleToggleNotifications}
                className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all relative
                  ${showNotifications 
                    ? 'bg-nafra-accent/20 text-nafra-accent' 
                    : 'text-nafra-text-dim hover:bg-nafra-border hover:text-nafra-text'
                  }`}
              >
                <Bell size={18} />
                {hasUnread && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-nafra-danger rounded-full animate-pulse"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-full mt-3 w-96 bg-nafra-card rounded-lg shadow-lg border border-nafra-border overflow-hidden animate-slide-up z-50">
                  <div className="px-4 py-3 border-b border-nafra-border bg-nafra-surface flex justify-between items-center">
                    <h3 className="font-semibold text-sm text-nafra-text">Actividad Reciente</h3>
                    <span className="text-[10px] text-nafra-text-dim bg-nafra-border px-2 py-1 rounded">{userLogs.length}</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {userLogs.length === 0 ? (
                      <div className="p-6 text-center text-nafra-text-muted text-sm">
                        Sin notificaciones recientes
                      </div>
                    ) : (
                      <div className="divide-y divide-nafra-border">
                        {userLogs.slice(0, 5).map((log) => (
                          <div key={log.id} className="p-4 hover:bg-nafra-border/50 transition-colors">
                            <div className="flex items-start gap-3">
                              <div className="mt-0.5">{getLogIcon(log.type)}</div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-nafra-text truncate">{log.action}</p>
                                <p className="text-xs text-nafra-text-dim truncate mt-1">{log.details}</p>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-[10px] text-nafra-text-muted flex items-center gap-1">
                                    <Clock size={10} /> {log.timestamp}
                                  </span>
                                  <span className="text-[10px] font-bold text-nafra-text-muted px-1.5 py-0.5 rounded bg-nafra-border">{log.module}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="p-2 bg-nafra-border/30 border-t border-nafra-border">
                    <button
                      onClick={handleViewAllActivity}
                      className="w-full py-2 text-xs font-semibold text-nafra-accent hover:bg-nafra-accent/10 rounded transition-all"
                    >
                      Ver toda la actividad
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-6 w-px bg-nafra-border hidden md:block"></div>

            {/* User Profile */}
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-nafra-border transition-all cursor-pointer">
              <div className="w-8 h-8 bg-nafra-accent/20 rounded-lg flex items-center justify-center text-nafra-accent font-bold">
                {user?.email?.[0]?.toUpperCase() || <User size={14} />}
              </div>
              <div className="hidden md:flex flex-col max-w-[150px]">
                <span className="text-xs font-semibold text-nafra-text leading-tight truncate">
                  {user?.email?.split('@')[0] || "Usuario"}
                </span>
                <span className="text-[10px] text-nafra-text-dim leading-tight mt-0.5 uppercase tracking-wide">
                  {user?.role === 'admin' ? "Admin" : "Usuario"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 overflow-y-auto bg-nafra-bg p-6">
          {children}
        </main>

        {/* Mobile Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-30 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default Layout;