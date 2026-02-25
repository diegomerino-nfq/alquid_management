import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
   Download,
   Database,
   FileJson,
   Archive,
   ChevronRight,
   LayoutGrid,
   BookOpen,
   Zap,
   ArrowRight
} from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';

const HomePage: React.FC = () => {
   const navigate = useNavigate();
   const { user } = useGlobalState();

   const modules = [
      {
         id: 'downloader',
         title: 'Descarga Informes',
         description: 'Extracción masiva de informes desde Athena y BigQuery con configuración automática.',
         icon: <Download size={28} />,
         path: '/download',
         color: 'bg-alquid-blue',
         badge: 'Popular'
      },
      {
         id: 'repo',
         title: 'Repositorio',
         description: 'Control de versiones centralizado para todas las regiones y entornos (PRE/PRO).',
         icon: <Archive size={28} />,
         path: '/repository',
         color: 'bg-alquid-navy',
         badge: 'Core'
      },
      {
         id: 'extractor',
         title: 'Extracción SQL',
         description: 'Herramienta inteligente para parsear y limpiar queries SQL complejas.',
         icon: <Database size={28} />,
         path: '/extract',
         color: 'bg-alquid-red'
      },
      {
         id: 'editor',
         title: 'Editor JSON',
         description: 'Editor avanzado con validación estructural para archivos de configuración.',
         icon: <FileJson size={28} />,
         path: '/editor',
         color: 'bg-alquid-orange'
      }
   ];

   return (
      <div className="min-h-full flex flex-col space-y-10 animate-fade-in pb-12">
         {/* Hero Section with NFQ Branding */}
         <div className="relative overflow-hidden rounded-[2.5rem] bg-alquid-navy p-10 md:p-16 text-white shadow-2xl">
            {/* Abstract background shapes */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-alquid-blue/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-alquid-orange/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

            <div className="relative z-10 max-w-3xl">
               <div className="flex items-center gap-3 mb-6">
                  <span className="px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-xs font-black uppercase tracking-[0.2em] backdrop-blur-md">
                     Portal Centralizado
                  </span>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 border border-green-500/30 text-[10px] font-bold text-green-400">
                     <Zap size={10} fill="currentColor" /> SYSTEM ONLINE
                  </div>
               </div>

               <h1 className="text-5xl md:text-7xl font-ubuntu font-bold tracking-tight mb-6 leading-[1.1]">
                  ALQUID <span className="text-alquid-blue">Data</span> Suite.
               </h1>

               <p className="text-lg md:text-xl text-gray-300 font-medium max-w-2xl leading-relaxed mb-10">
                  Bienvenido de nuevo, <span className="text-white font-bold">{user?.email?.split('@')[0]}</span>.
                  Gestiona tus entornos de datos, automatiza extracciones y mantén el control total de las versiones desde un único lugar.
               </p>

               <div className="flex flex-wrap gap-4">
                  <button
                     onClick={() => navigate('/documentation')}
                     className="bg-white text-alquid-navy px-8 py-4 rounded-2xl font-black flex items-center gap-2 hover:bg-alquid-blue hover:text-white transition-all shadow-xl active:scale-95"
                  >
                     Ver Documentación <BookOpen size={20} />
                  </button>
               </div>
            </div>
         </div>

         {/* Modules Grid */}
         <div>
            <div className="flex items-center justify-between mb-8 px-2">
               <h2 className="text-2xl font-black text-alquid-navy flex items-center gap-3">
                  <LayoutGrid size={24} className="text-alquid-blue" />
                  Módulos de Trabajo
               </h2>
               <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Selecciona una herramienta</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {modules.map((module) => (
                  <div
                     key={module.id}
                     onClick={() => navigate(module.path)}
                     className="group bg-white rounded-3xl p-8 border border-gray-100 shadow-premium hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full"
                  >
                     {/* Accent line on top */}
                     <div className={`absolute top-0 left-0 w-full h-1.5 ${module.color} opacity-0 group-hover:opacity-100 transition-opacity`}></div>

                     {module.badge && (
                        <span className={`absolute top-6 right-8 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${module.color} text-white`}>
                           {module.badge}
                        </span>
                     )}

                     <div className={`w-16 h-16 rounded-2xl ${module.color} text-white flex items-center justify-center mb-8 shadow-lg group-hover:scale-110 transition-transform duration-500`}>
                        {module.icon}
                     </div>

                     <h3 className="text-xl font-black text-alquid-navy mb-4 group-hover:text-alquid-blue transition-colors">
                        {module.title}
                     </h3>

                     <p className="text-gray-500 text-sm leading-relaxed mb-8 flex-1">
                        {module.description}
                     </p>

                     <div className="flex items-center gap-2 text-xs font-bold text-alquid-blue uppercase tracking-widest pt-4 border-t border-gray-50 group-hover:gap-4 transition-all">
                        Acceder <ChevronRight size={14} />
                     </div>
                  </div>
               ))}
            </div>
         </div>

      </div>
   );
};

export default HomePage;
