import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Zap, Cpu } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import RagChat from '../components/RagChat';

const HomePage: React.FC = () => {
   const navigate = useNavigate();
   const { user } = useGlobalState();

   return (
      <div className="min-h-full flex flex-col space-y-5 animate-fade-in pb-12">
         {/* Compact Hero */}
         <div className="relative overflow-hidden rounded-2xl bg-alquid-navy px-8 py-5 text-white shadow-xl flex items-center justify-between gap-6">
            <div className="absolute top-0 right-0 w-64 h-64 bg-alquid-blue/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="relative z-10 flex items-center gap-5 min-w-0">
               <div>
                  <div className="flex items-center gap-2 mb-1">
                     <h1 className="text-2xl font-ubuntu font-bold tracking-tight">
                        ALQUID <span className="text-alquid-blue">Data</span> Suite.
                     </h1>
                     <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-[9px] font-bold text-green-400 flex-shrink-0">
                        <Zap size={8} fill="currentColor" /> ONLINE
                     </div>
                  </div>
                  <p className="text-sm text-gray-300 leading-snug">
                     Bienvenido, <span className="text-white font-bold">{user?.email?.split('@')[0]}</span>.
                     Gestiona entornos de datos, automatiza extracciones y controla versiones desde un único lugar.
                  </p>
               </div>
            </div>
            <button
               onClick={() => navigate('/documentation')}
               className="relative z-10 flex-shrink-0 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-all"
            >
               <BookOpen size={14} /> Documentación
            </button>
         </div>

         {/* AI Assistant — full remaining space */}
         <div className="flex flex-col flex-1">
            <div className="flex items-center justify-between mb-3 px-1">
               <h2 className="text-base font-black text-alquid-navy flex items-center gap-2">
                  <Cpu size={18} className="text-alquid-blue" />
                  Asistente de Queries
               </h2>
               <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">RAG · Gemini · embedding-001</span>
            </div>
            <RagChat />
         </div>
      </div>
   );
};

export default HomePage;
