import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Database, Download, FileJson, Home, Menu, X } from 'lucide-react';
import { useState } from 'react';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: 'Inicio', path: '/', icon: <Home size={20} /> },
    { name: 'Descarga Informes', path: '/download', icon: <Download size={20} /> },
    { name: 'Extracción SQL', path: '/extract', icon: <Database size={20} /> },
    { name: 'Editor JSON', path: '/editor', icon: <FileJson size={20} /> },
  ];

  return (
    <div className="h-screen bg-gray-50 flex flex-col md:flex-row font-sans text-gray-800 overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden bg-alquid-blue text-white p-4 flex justify-between items-center shadow-md z-50 flex-shrink-0">
        <span className="text-xl font-bold tracking-tight">ALQUID</span>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside 
        className={`
          fixed md:relative h-full w-64 bg-white border-r border-gray-200 shadow-xl z-40 transform transition-transform duration-300 ease-in-out flex-shrink-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0
        `}
      >
        <div className="h-full flex flex-col">
          <div className="p-8 border-b border-gray-100 flex items-center justify-center bg-alquid-blue text-white">
             <h1 className="text-2xl font-bold tracking-wider">ALQUID</h1>
          </div>
          
          <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                    ${isActive 
                      ? 'bg-blue-50 text-alquid-blue font-semibold shadow-sm border-l-4 border-alquid-blue' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-alquid-blue'
                    }
                  `}
                >
                  {item.icon}
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="p-4 border-t border-gray-100 mt-auto">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100">
               <p className="text-xs text-blue-800 font-medium text-center">Data Tools Suite v2.1</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 relative w-full">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 w-full h-full">
           {children}
        </div>
      </main>
      
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;