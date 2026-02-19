import React, { useRef } from 'react';
import { Activity, Terminal, Clock, CheckCircle2, AlertCircle, Info, XCircle, Trash2, FileJson, Database, Download } from 'lucide-react';
import { useGlobalState } from '../context/GlobalStateContext';
import PageHeader from '../components/PageHeader';

const ActivityLog: React.FC = () => {
  const { userLogs, clearLogs } = useGlobalState();
  const topLogRef = useRef<HTMLTableRowElement>(null);

  const getStatusStyle = (type: string) => {
    switch (type) {
      case 'SUCCESS': return 'text-green-600 bg-green-50 border-green-100';
      case 'ERROR': return 'text-red-600 bg-red-50 border-red-100';
      case 'WARNING': return 'text-yellow-600 bg-yellow-50 border-yellow-100';
      default: return 'text-blue-600 bg-blue-50 border-blue-100';
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'SUCCESS': return <CheckCircle2 size={14} />;
      case 'ERROR': return <XCircle size={14} />;
      case 'WARNING': return <AlertCircle size={14} />;
      default: return <Info size={14} />;
    }
  };

  const getModuleIcon = (module: string) => {
      switch(module) {
          case 'DESCARGA': return <Download size={14} />;
          case 'EXTRACCIÓN': return <Database size={14} />;
          case 'EDITOR': return <FileJson size={14} />;
          default: return <Terminal size={14} />;
      }
  };

  return (
    <div className="h-full flex flex-col animate-fade-in max-h-[calc(100vh-6rem)]">
      <PageHeader 
        title="Registro de Actividad" 
        subtitle="Historial detallado de operaciones y eventos del sistema"
        icon={<Activity size={20}/>}
      />

      {/* Action Log Console Container */}
      <div className="flex-1 mt-6 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
        
        {/* Console Header */}
        <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex justify-between items-center text-gray-300">
          <div className="flex items-center gap-2 text-sm font-mono">
            <Terminal size={14} className="text-green-500" />
            <span>user@alquid-console:~$ history</span>
          </div>
          <div className="flex items-center gap-4">
             <button 
                onClick={clearLogs}
                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
             >
                <Trash2 size={12} /> Limpiar
             </button>
             <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500/80"></div>
                <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
             </div>
          </div>
        </div>

        {/* Console Body */}
        <div className="flex-1 overflow-y-auto p-0 scroll-smooth bg-white">
          {userLogs.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                <Activity size={48} className="mb-4 text-gray-300" />
                <p className="text-lg font-medium">Sin actividad reciente</p>
                <p className="text-sm">Las acciones que realices en la herramienta aparecerán aquí.</p>
             </div>
          ) : (
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Hora</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-32">Módulo</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-40">Acción</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Detalle</th>
                    <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider w-24 text-center">Estado</th>
                </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {userLogs.map((log, index) => (
                    <tr key={log.id} ref={index === 0 ? topLogRef : null} className="hover:bg-blue-50/50 transition-colors group animate-fade-in">
                    <td className="px-6 py-3.5 whitespace-nowrap align-top">
                        <div className="flex items-center gap-2 text-gray-500 font-mono text-xs">
                        <Clock size={12} className="text-gray-300 group-hover:text-alquid-blue transition-colors" />
                        {log.timestamp}
                        </div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap align-top">
                        <span className="flex items-center gap-2 text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded border border-gray-200">
                            {getModuleIcon(log.module)}
                            {log.module}
                        </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap align-top">
                        <span className="text-xs font-bold text-gray-800 tracking-tight">
                        {log.action}
                        </span>
                    </td>
                    <td className="px-6 py-3.5 align-top">
                        <p className="text-sm text-gray-600 font-mono leading-relaxed break-words whitespace-pre-wrap">
                        {log.details}
                        </p>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-center align-top">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border uppercase tracking-wider ${getStatusStyle(log.type)}`}>
                        {getIcon(log.type)}
                        {log.type}
                        </span>
                    </td>
                    </tr>
                ))}
                </tbody>
            </table>
          )}
        </div>

        {/* Console Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-4 py-2 flex justify-between items-center text-xs text-gray-400">
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              <span>Monitor Activo</span>
           </div>
           <div>
              Total Eventos: {userLogs.length}
           </div>
        </div>

      </div>
    </div>
  );
};

export default ActivityLog;