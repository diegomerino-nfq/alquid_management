import React, { useState, useMemo } from 'react';
import { Play, Settings, Database, ChevronLeft, Sliders, CheckSquare, Square, Filter, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import FileInput from '../components/FileInput';
import PageHeader from '../components/PageHeader';
import { ReportDefinition, QueryDefinition, EXPECTED_DATABASES } from '../types';
import { prepareFinalSql } from '../utils/sqlFormatter';

const ReportDownloader: React.FC = () => {
  const [reportData, setReportData] = useState<ReportDefinition[]>([]);
  const [configData, setConfigData] = useState<any>(null);
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());
  
  // Configuration UI State
  const [isConfigOpen, setIsConfigOpen] = useState(true);

  // Sorted options
  const regions = ["Argentina", "Colombia", "España", "New York", "Perú", "Suiza"].sort();
  const environments = ["PRE", "PRO"].sort();

  const [region, setRegion] = useState("");
  const [env, setEnv] = useState("");
  const [loadId, setLoadId] = useState("");
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  const handleQueriesLoaded = (content: string) => {
    try {
      const json = JSON.parse(content);
      setReportData(json);
    } catch (e) {
      alert("JSON de queries inválido");
    }
  };

  const handleConfigLoaded = (content: string) => {
    try {
      const json = JSON.parse(content);
      setConfigData(json);
    } catch (e) {
      alert("JSON de configuración inválido");
    }
  };

  const handleRemoveQueries = () => {
    setReportData([]);
    setSelectedQueries(new Set());
  };

  const handleRemoveConfig = () => {
    setConfigData(null);
  };

  const toggleQuery = (id: string) => {
    const newSet = new Set(selectedQueries);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedQueries(newSet);
  };

  const toggleAll = () => {
    if (selectedQueries.size === getTotalQueries()) {
      setSelectedQueries(new Set());
    } else {
      const allIds = new Set<string>();
      reportData.forEach(r => r.queries.forEach(q => allIds.add(`${r.report}|${q.filename}`)));
      setSelectedQueries(allIds);
    }
  };

  const getTotalQueries = () => {
    return reportData.reduce((acc, r) => acc + r.queries.length, 0);
  };

  // Validation Logic - Purely based on Rules, independent of Access File
  const validateQuery = (query: QueryDefinition) => {
    const errors: string[] = [];
    
    // 0. Pre-check: Region/Env selected?
    if (!region || !env) {
      return { valid: false, msg: "Seleccione Región y Entorno" };
    }

    // 1. Table Validation (metric, cashflow, result)
    const validTables = ['metric', 'cashflow', 'result'];
    const tableName = query.table ? query.table.toLowerCase() : '';
    if (!validTables.includes(tableName)) {
      errors.push(`Tabla '${query.table}' inválida (debe ser: metric, cashflow, result).`);
    }
    
    // 2. Database Validation (Strict check against EXPECTED_DATABASES)
    const allowedDbs = EXPECTED_DATABASES[region]?.[env];
    
    if (allowedDbs) {
      if (!allowedDbs.includes(query.database)) {
          // Format allowed DBs for display
          const allowedStr = allowedDbs.length > 2 
            ? allowedDbs.slice(0, 2).join(", ") + "..." 
            : allowedDbs.join(" o ");
          
          if (allowedDbs.length === 0) {
             errors.push(`No hay bases de datos permitidas configuradas para ${region} ${env}.`);
          } else {
             errors.push(`BD '${query.database}' no válida para ${region} ${env}.`);
          }
      }
    } else {
       // Should not happen if regions map matches keys
       errors.push(`Configuración no encontrada para ${region} ${env}.`);
    }

    if (errors.length > 0) {
      return { valid: false, msg: errors.join(" ") };
    }

    return { valid: true, msg: "Válido" };
  };

  const runDownload = async () => {
    if (selectedQueries.size === 0 || !configData) {
      alert("Por favor carga los archivos y selecciona queries.");
      return;
    }
    if (!region || !env) {
      alert("Por favor selecciona región y entorno.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setLogs([]);

    const queriesToRun: { report: string, query: QueryDefinition }[] = [];
    reportData.forEach(r => {
      r.queries.forEach(q => {
        if (selectedQueries.has(`${r.report}|${q.filename}`)) {
          queriesToRun.push({ report: r.report, query: q });
        }
      });
    });

    const total = queriesToRun.length;
    let errorCount = 0;
    
    for (let i = 0; i < total; i++) {
      const item = queriesToRun[i];
      const validation = validateQuery(item.query);
      
      if (!validation.valid) {
         setLogs(prev => [`[${new Date().toLocaleTimeString()}] ⚠️ Saltando ${item.query.filename}: ${validation.msg}`, ...prev]);
         errorCount++;
         continue;
      }

      const percent = Math.round(((i + 1) / total) * 100);
      setLogs(prev => [`[${new Date().toLocaleTimeString()}] Iniciando: ${item.query.filename}...`, ...prev]);
      
      try {
        const finalSql = prepareFinalSql(item.query, loadId);
        if (!finalSql) throw new Error("Error generando SQL");
        await new Promise(r => setTimeout(r, 800)); 
        
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ✅ Éxito: ${item.query.filename} descargado.`, ...prev]);
        
        const dummyCsv = `col1;col2;col3\nval1;val2;${item.query.filename}`;
        const blob = new Blob([dummyCsv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${item.query.filename.replace(/\//g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
      } catch (e) {
        setLogs(prev => [`[${new Date().toLocaleTimeString()}] ❌ Error: ${item.query.filename}`, ...prev]);
      }
      setProgress(percent);
    }

    setIsProcessing(false);
    if (errorCount > 0) {
        alert(`Proceso finalizado con ${errorCount} queries omitidas por validación.`);
    } else {
        alert("Proceso finalizado correctamente.");
    }
  };

  // Flatten data for table view
  const flatData = useMemo(() => {
    const items: { id: string, report: string, folder: string, filenameOnly: string, query: QueryDefinition }[] = [];
    reportData.forEach(r => {
      r.queries.forEach(q => {
        const parts = q.filename.split('/');
        const folder = parts.length > 1 ? parts[0] : '';
        const filenameOnly = parts.length > 1 ? parts.slice(1).join('/') : q.filename;

        items.push({
          id: `${r.report}|${q.filename}`,
          report: r.report,
          folder: folder,
          filenameOnly: filenameOnly,
          query: q
        });
      });
    });
    return items;
  }, [reportData]);

  return (
    <div className="h-full flex flex-col animate-fade-in w-full">
      <PageHeader 
        title="Descarga de Informes" 
        subtitle="Ejecuta y descarga reportes desde cloud"
        icon={<Settings size={20}/>}
      />

      <div className="flex flex-1 gap-6 h-full relative overflow-hidden">
        
        {/* Collapsible Sidebar Configuration */}
        <div 
          className={`
            bg-white border border-gray-200 shadow-lg rounded-xl flex flex-col transition-all duration-300 ease-in-out z-10
            ${isConfigOpen ? 'w-80 translate-x-0 opacity-100' : 'w-0 -translate-x-full opacity-0 overflow-hidden border-0'}
          `}
        >
          <div className="p-5 border-b border-gray-100 bg-gray-50 flex items-center justify-between rounded-t-xl flex-shrink-0">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Settings size={18} className="text-alquid-blue"/> 
              Configuración
            </h3>
            <button onClick={() => setIsConfigOpen(false)} className="md:hidden">
              <ChevronLeft size={20} />
            </button>
          </div>

          <div className="p-5 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            {/* Environment Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Región</label>
                <div className="relative">
                  <select 
                     value={region} 
                     onChange={(e) => setRegion(e.target.value)}
                     className={`w-full appearance-none bg-white border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-blue focus:border-transparent font-medium shadow-sm transition-all cursor-pointer hover:border-gray-400 ${region === "" ? "text-gray-500" : "text-gray-900"}`}
                  >
                    <option value="" disabled>Seleccionar región</option>
                    {regions.map(r => (
                      <option key={r} value={r} className="text-gray-900">{r}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Entorno</label>
                <div className="relative">
                  <select 
                     value={env} 
                     onChange={(e) => setEnv(e.target.value)}
                     className={`w-full appearance-none bg-white border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-blue focus:border-transparent font-medium shadow-sm transition-all cursor-pointer hover:border-gray-400 ${env === "" ? "text-gray-500" : "text-gray-900"}`}
                  >
                    <option value="" disabled>Seleccionar entorno</option>
                    {environments.map(e => (
                       <option key={e} value={e} className="text-gray-900">{e}</option>
                    ))}
                  </select>
                   <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Load ID <span className="text-gray-400 font-normal">(Opcional)</span></label>
                <input 
                  type="text" 
                  value={loadId}
                  onChange={(e) => setLoadId(e.target.value)}
                  placeholder="Seleccionar Load ID"
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-blue focus:border-transparent font-mono shadow-sm placeholder-gray-400"
                />
              </div>
            </div>

            <hr className="border-gray-100" />

            {/* Files */}
            <div>
               <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                 <Database size={16} /> Archivos Requeridos
               </h4>
               <FileInput 
                 label="Queries (JSON)" 
                 accept=".json" 
                 onFileLoaded={handleQueriesLoaded} 
                 onRemove={handleRemoveQueries}
                 required 
               />
               <FileInput 
                 label="Accesos (JSON)" 
                 accept=".json" 
                 onFileLoaded={handleConfigLoaded} 
                 onRemove={handleRemoveConfig}
                 required 
               />
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl flex-shrink-0">
            <div className="flex items-center gap-3">
              {!isConfigOpen && (
                <button 
                  onClick={() => setIsConfigOpen(true)}
                  className="bg-white hover:bg-gray-100 text-alquid-blue p-2 rounded-lg border border-gray-300 shadow-sm transition-all"
                  title="Abrir Configuración"
                >
                  <Sliders size={20} />
                </button>
              )}
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-400"/>
                <span className="font-bold text-gray-700">Queries ({selectedQueries.size})</span>
              </div>
            </div>
            
            <button 
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm font-medium text-alquid-blue hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors"
            >
              {selectedQueries.size === getTotalQueries() && getTotalQueries() > 0 
                ? <><CheckSquare size={16} /> Deseleccionar Todo</> 
                : <><Square size={16} /> Seleccionar Todo</>
              }
            </button>
          </div>
          
          {/* Query Table */}
          <div className="flex-1 overflow-auto bg-gray-50">
            {flatData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                <Database size={48} className="mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold text-gray-600">No hay datos para mostrar</h3>
                <p className="text-sm max-w-md mt-2">Carga el archivo <span className="font-mono bg-gray-100 px-1 rounded">queries.json</span> en el panel de configuración para ver la lista de informes disponibles.</p>
                <button 
                  onClick={() => setIsConfigOpen(true)} 
                  className="mt-6 bg-white border border-gray-300 px-4 py-2 rounded-lg text-alquid-blue hover:bg-gray-50 shadow-sm text-sm font-semibold transition-all"
                >
                  Abrir Configuración
                </button>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center border-b border-gray-200">
                       <Square size={16} className="text-gray-400 mx-auto" />
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Reporte</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Carpeta</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Informe</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Base de datos</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Tabla</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-64">Validación</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {flatData.map((item, idx) => {
                    const isSelected = selectedQueries.has(item.id);
                    const validation = validateQuery(item.query);
                    
                    return (
                      <tr 
                        key={idx} 
                        onClick={() => toggleQuery(item.id)}
                        className={`
                          group transition-colors cursor-pointer hover:bg-blue-50/50
                          ${isSelected ? 'bg-blue-50/30' : ''}
                        `}
                      >
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center">
                            <input 
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleQuery(item.id)}
                              className="w-4 h-4 text-alquid-blue bg-white border-gray-300 rounded focus:ring-alquid-blue"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-gray-700">
                          {item.report}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {item.folder || <span className="text-gray-300 italic">-</span>}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-800 group-hover:text-alquid-blue transition-colors">
                          {item.filenameOnly}
                        </td>
                         <td className="py-3 px-4 text-sm text-gray-600 font-medium">
                          {item.query.database}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600 font-mono">
                           {item.query.table}
                        </td>
                        <td className="py-3 px-4 text-sm">
                           {validation.valid ? (
                             <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                               <CheckCircle2 size={14} /> Válido
                             </span>
                           ) : (
                             <span className="inline-flex items-start gap-1.5 text-xs font-medium text-red-600 leading-tight" title={validation.msg}>
                               <XCircle size={14} className="mt-0.5 flex-shrink-0" /> 
                               <span>{validation.msg}</span>
                             </span>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-gray-200 bg-white z-10 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            {isProcessing && (
              <div className="mb-3">
                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                  <span>Procesando descarga...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
            
            <button 
              onClick={runDownload}
              disabled={isProcessing || !configData || selectedQueries.size === 0}
              className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex justify-center items-center gap-3 transition-all transform active:scale-[0.99]
                ${isProcessing || !configData || selectedQueries.size === 0
                  ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                  : 'bg-alquid-red hover:bg-red-600 hover:shadow-xl hover:-translate-y-0.5'
                }
              `}
            >
               {isProcessing ? 'Ejecutando...' : <><Play size={20} fill="currentColor" /> EJECUTAR DESCARGA</>}
            </button>
            
            {logs.length > 0 && (
               <div className="mt-3 bg-gray-900 text-green-400 font-mono text-[10px] p-3 rounded-lg max-h-24 overflow-y-auto">
                 {logs[0]}
                 {logs.length > 1 && <div className="opacity-50 text-xs">... y {logs.length - 1} más</div>}
               </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportDownloader;