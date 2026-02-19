import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Play, Settings, Database, CheckSquare, Square, Filter, CheckCircle2, XCircle, Search, X, AlertTriangle, FileWarning } from 'lucide-react';
import FileInput from '../components/FileInput';
import PageHeader from '../components/PageHeader';
import { QueryDefinition, EXPECTED_DATABASES, ReportDefinition } from '../types';
import { prepareFinalSql } from '../utils/sqlFormatter';
import { useGlobalState } from '../context/GlobalStateContext';

const ReportDownloader: React.FC = () => {
  // Use Global State (Downloader Specific)
  const { 
    downloadReports, setDownloadReports, clearDownloadReports,
    downloadConfig, setDownloadConfig, clearDownloadConfig,
    downloadRegion, setDownloadRegion,
    downloadEnv, setDownloadEnv,
    downloadLoadId, setDownloadLoadId,
    addLog // Adding logger
  } = useGlobalState();

  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());
  
  // Sorted options
  const regions = ["Argentina", "Colombia", "España", "New York", "Perú", "Suiza"].sort();
  const environments = ["PRE", "PRO"].sort();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);

  // Validation Error Modal State
  const [validationError, setValidationError] = useState<{
    isOpen: boolean;
    fileName: string;
    errors: string[];
  }>({ isOpen: false, fileName: '', errors: [] });

  // Filtering State
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState("");
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
        setActiveFilterColumn(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const validateJsonStructure = (json: any): string[] => {
      const errors: string[] = [];
      if (!Array.isArray(json)) {
          return ["El archivo raíz debe ser un Array de reportes (ej. [{ report: '...', queries: [...] }])"];
      }

      json.forEach((repo: any, i: number) => {
          const idx = i + 1;
          if (!repo.report || typeof repo.report !== 'string') {
              errors.push(`Ítem #${idx}: Falta la propiedad obligatoria 'report' (string).`);
          }
          if (!repo.queries || !Array.isArray(repo.queries)) {
              const repName = repo.report || `Item #${idx}`;
              errors.push(`Reporte '${repName}': Falta la propiedad 'queries' o no es un array.`);
          } else {
              repo.queries.forEach((q: any, j: number) => {
                  const qIdx = j + 1;
                  const qId = `Query #${qIdx} en '${repo.report}'`;
                  if (!q.filename) errors.push(`${qId}: Falta 'filename'.`);
                  if (!q.sql) errors.push(`${qId}: Falta código 'sql'.`);
                  if (!q.database) errors.push(`${qId}: Falta 'database'.`);
                  if (!q.table) errors.push(`${qId}: Falta 'table'.`);
              });
          }
      });
      return errors;
  };

  const handleQueriesLoaded = (content: string, fileName: string) => {
    try {
      const json = JSON.parse(content);
      
      // Strict Validation
      const structureErrors = validateJsonStructure(json);
      
      if (structureErrors.length > 0) {
          setValidationError({
              isOpen: true,
              fileName: fileName,
              errors: structureErrors
          });
          addLog('DESCARGA', 'ERROR_VALIDACION', `El archivo ${fileName} tiene una estructura inválida.`, 'ERROR');
          // We intentionally do NOT set the data if validation fails
          throw new Error("Estructura JSON inválida");
      }

      setDownloadReports(json, fileName);
      addLog('DESCARGA', 'CARGA_ARCHIVO', `Archivo de queries cargado: ${fileName}`, 'SUCCESS');
    } catch (e: any) {
      // If it wasn't our validation error (e.g. JSON syntax error), catch it here
      if (e.message !== "Estructura JSON inválida") {
         setValidationError({
            isOpen: true,
            fileName: fileName,
            errors: ["El archivo no es un JSON válido (Error de sintaxis).", e.message]
         });
         addLog('DESCARGA', 'ERROR_CARGA', `Fallo al leer JSON de queries: ${fileName}`, 'ERROR');
      }
      // Rethrow to let FileInput show the red border
      throw e;
    }
  };

  const handleConfigLoaded = (content: string, fileName: string) => {
    try {
      const json = JSON.parse(content);
      setDownloadConfig(json, fileName);
      addLog('DESCARGA', 'CARGA_ARCHIVO', `Archivo de config cargado: ${fileName}`, 'SUCCESS');
    } catch (e) {
      alert("JSON de configuración inválido");
      addLog('DESCARGA', 'ERROR_CARGA', `Fallo al leer JSON de config: ${fileName}`, 'ERROR');
      throw e;
    }
  };

  const handleRemoveQueries = () => {
    addLog('DESCARGA', 'ELIMINAR_ARCHIVO', `Archivo de queries eliminado: ${downloadReports.fileName}`, 'INFO');
    clearDownloadReports();
    setSelectedQueries(new Set());
    setFilters({}); // Clear filters
  };

  const handleRemoveConfig = () => {
    addLog('DESCARGA', 'ELIMINAR_ARCHIVO', `Archivo de config eliminado: ${downloadConfig.fileName}`, 'INFO');
    clearDownloadConfig();
  };

  const toggleQuery = (id: string) => {
    const newSet = new Set(selectedQueries);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedQueries(newSet);
  };

  // Validation Logic - Purely based on Rules
  const validateQuery = (query: QueryDefinition) => {
    const errors: string[] = [];
    
    // 0. Pre-check: Region/Env selected?
    if (!downloadRegion || !downloadEnv) {
      return { valid: false, msg: "Seleccione Región y Entorno" };
    }

    // 1. Table Validation (metric, cashflow, result)
    const validTables = ['metric', 'cashflow', 'result'];
    const tableName = query.table ? query.table.toLowerCase() : '';
    if (!validTables.includes(tableName)) {
      errors.push(`Tabla '${query.table}' inválida (debe ser: metric, cashflow, result).`);
    }
    
    // 2. Database Validation (Strict check against EXPECTED_DATABASES)
    const allowedDbs = EXPECTED_DATABASES[downloadRegion]?.[downloadEnv];
    
    if (allowedDbs) {
      if (!allowedDbs.includes(query.database)) {
          if (allowedDbs.length === 0) {
             errors.push(`No hay bases de datos permitidas configuradas para ${downloadRegion} ${downloadEnv}.`);
          } else {
             errors.push(`BD '${query.database}' no válida para ${downloadRegion} ${downloadEnv}.`);
          }
      }
    } else {
       errors.push(`Configuración no encontrada para ${downloadRegion} ${downloadEnv}.`);
    }

    if (errors.length > 0) {
      return { valid: false, msg: errors.join(" ") };
    }

    return { valid: true, msg: "Válido" };
  };

  // Flatten data for table view
  const flatData = useMemo(() => {
    const items: { id: string, report: string, folder: string, filenameOnly: string, database: string, table: string, query: QueryDefinition }[] = [];
    if (Array.isArray(downloadReports.data)) {
        downloadReports.data.forEach(r => {
            if (Array.isArray(r.queries)) {
                r.queries.forEach(q => {
                    const parts = q.filename.split('/');
                    const folder = parts.length > 1 ? parts[0] : '';
                    const filenameOnly = parts.length > 1 ? parts.slice(1).join('/') : q.filename;

                    items.push({
                    id: `${r.report}|${q.filename}`,
                    report: r.report,
                    folder: folder,
                    filenameOnly: filenameOnly,
                    database: q.database,
                    table: q.table,
                    query: q
                    });
                });
            }
        });
    }
    return items;
  }, [downloadReports.data]);

  // Filter Data Logic
  const filteredData = useMemo(() => {
      return flatData.filter(item => {
          return Object.entries(filters).every(([key, val]) => {
              const selectedValues = val as Set<string>;
              if (selectedValues.size === 0) return true;
              return selectedValues.has(item[key as keyof typeof item] as string);
          });
      });
  }, [flatData, filters]);

  const toggleAll = () => {
    if (selectedQueries.size === filteredData.length && filteredData.length > 0) {
      // If all currently visible are selected, deselect them
      const newSet = new Set(selectedQueries);
      filteredData.forEach(item => newSet.delete(item.id));
      setSelectedQueries(newSet);
    } else {
      // Select all currently visible
      const newSet = new Set(selectedQueries);
      filteredData.forEach(item => newSet.add(item.id));
      setSelectedQueries(newSet);
    }
  };

  const runDownload = async () => {
    if (selectedQueries.size === 0 || !downloadConfig.data) {
      alert("Por favor carga los archivos y selecciona queries.");
      return;
    }
    if (!downloadRegion || !downloadEnv) {
      alert("Por favor selecciona región y entorno.");
      return;
    }
    if (!downloadLoadId.trim()) {
        alert("El LOAD ID es obligatorio para la descarga de informes.");
        return;
    }

    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    addLog('DESCARGA', 'INICIO_PROCESO', `Iniciando descarga de ${selectedQueries.size} informes para ${downloadRegion} ${downloadEnv}. LoadID: ${downloadLoadId}`, 'INFO');

    const queriesToRun: { report: string, query: QueryDefinition }[] = [];
    
    // We iterate over full flatData but check selection set
    flatData.forEach(item => {
        if (selectedQueries.has(item.id)) {
            queriesToRun.push({ report: item.report, query: item.query });
        }
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
        const finalSql = prepareFinalSql(item.query, downloadLoadId);
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
        errorCount++; // Count runtime errors too
      }
      setProgress(percent);
    }

    setIsProcessing(false);
    if (errorCount > 0) {
        const successCount = total - errorCount;
        addLog('DESCARGA', 'FIN_PROCESO', `Proceso finalizado. ${successCount} OK, ${errorCount} Fallidos.`, 'WARNING');
        alert(`Proceso finalizado con ${errorCount} queries omitidas por validación o error.`);
    } else {
        addLog('DESCARGA', 'FIN_PROCESO', `Descarga completada exitosamente (${total} archivos).`, 'SUCCESS');
        alert("Proceso finalizado correctamente.");
    }
  };

  // --- Filtering UI Helpers ---
  const getUniqueValues = (columnKey: string): string[] => {
      // Calculate available values based on OTHER active filters
      const relevantData = flatData.filter(item => {
          return Object.entries(filters).every(([key, val]) => {
              if (key === columnKey) return true; // Ignore the filter for the current column
              const selectedValues = val as Set<string>;
              if (selectedValues.size === 0) return true;
              return selectedValues.has(item[key as keyof typeof item] as string);
          });
      });

      const unique = new Set<string>(relevantData.map(item => String(item[columnKey as keyof typeof item] || '')));
      return Array.from(unique).sort();
  };

  const handleFilterChange = (column: string, value: string) => {
      setFilters(prev => {
          const columnFilters = new Set(prev[column] || []);
          if (columnFilters.has(value)) {
              columnFilters.delete(value);
          } else {
              columnFilters.add(value);
          }
          return { ...prev, [column]: columnFilters };
      });
  };

  const selectAllFilter = (column: string, values: string[]) => {
       setFilters(prev => ({ ...prev, [column]: new Set(values) }));
  };

  const clearFilter = (column: string) => {
      setFilters(prev => {
          const next = { ...prev };
          delete next[column];
          return next;
      });
  };

  const renderFilterDropdown = (columnKey: string) => {
      const allValues = getUniqueValues(columnKey);
      const filteredValues = allValues.filter(v => v.toLowerCase().includes(filterSearch.toLowerCase()));
      const currentFilters = filters[columnKey] || new Set();

      return (
          <div ref={filterDropdownRef} className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden animate-fade-in">
              <div className="p-3 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-2 py-1.5 mb-2 focus-within:ring-2 focus-within:ring-alquid-blue/20 transition-all">
                      <Search size={14} className="text-gray-400"/>
                      <input 
                          type="text" 
                          placeholder="Buscar..." 
                          className="w-full text-xs outline-none text-gray-700 bg-transparent"
                          value={filterSearch}
                          onChange={(e) => setFilterSearch(e.target.value)}
                          autoFocus
                      />
                      {filterSearch && <button onClick={() => setFilterSearch('')}><X size={12} className="text-gray-400 hover:text-red-500"/></button>}
                  </div>
                  <div className="flex justify-between text-[10px] font-bold text-alquid-blue">
                      <button onClick={() => selectAllFilter(columnKey, allValues)} className="hover:underline">Selec. Todo</button>
                      <button onClick={() => clearFilter(columnKey)} className="hover:underline text-red-500">Borrar Filtro</button>
                  </div>
              </div>
              <div className="max-h-60 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                  {filteredValues.map(val => (
                      <label key={val} className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer text-xs text-gray-700 select-none">
                          <input 
                              type="checkbox" 
                              checked={currentFilters.has(val)}
                              onChange={() => handleFilterChange(columnKey, val)}
                              className="rounded border-gray-300 text-alquid-navy focus:ring-alquid-navy"
                          />
                          <span className="truncate">{val || <i>(Vacío)</i>}</span>
                      </label>
                  ))}
                  {filteredValues.length === 0 && <div className="text-center py-4 text-gray-400 text-xs">No hay resultados</div>}
              </div>
          </div>
      );
  };

  const TableHeader: React.FC<{ label: string, columnKey: string, width?: string }> = ({ label, columnKey, width }) => {
      const isActive = filters[columnKey]?.size > 0;
      return (
          <th className={`py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 relative group select-none ${width}`}>
              <div className="flex items-center gap-2">
                  <span>{label}</span>
                  <button 
                      onClick={(e) => {
                          e.stopPropagation();
                          if (activeFilterColumn === columnKey) {
                              setActiveFilterColumn(null);
                          } else {
                              setActiveFilterColumn(columnKey);
                              setFilterSearch("");
                          }
                      }}
                      className={`p-1 rounded transition-colors ${isActive ? 'bg-alquid-blue text-white' : 'text-gray-300 hover:text-gray-600 hover:bg-gray-100'}`}
                  >
                      <Filter size={14} fill={isActive ? "currentColor" : "none"}/>
                  </button>
              </div>
              {activeFilterColumn === columnKey && renderFilterDropdown(columnKey)}
          </th>
      );
  };

  return (
    <div className="h-full flex flex-col animate-fade-in w-full relative">
      <PageHeader 
        title="Descarga de Informes" 
        subtitle="Ejecuta y descarga reportes desde cloud"
        icon={<Settings size={20}/>}
      />

      {/* ERROR MODAL */}
      {validationError.isOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-fade-in border border-red-200 overflow-hidden">
                  <div className="bg-red-50 p-6 border-b border-red-100 flex items-center gap-4">
                      <div className="p-3 bg-red-100 text-red-600 rounded-full shrink-0">
                          <FileWarning size={32} />
                      </div>
                      <div>
                          <h3 className="text-xl font-bold text-red-800">Estructura JSON Inválida</h3>
                          <p className="text-sm text-red-600 mt-1">El archivo <strong>{validationError.fileName}</strong> no cumple con el formato requerido.</p>
                      </div>
                  </div>
                  
                  <div className="p-6 flex-1 overflow-y-auto max-h-[50vh] bg-white">
                      <p className="text-sm text-gray-600 mb-4">
                          Se han detectado los siguientes errores críticos que impiden la carga del archivo. Por favor, corrígelos e intenta nuevamente.
                      </p>
                      <ul className="space-y-2">
                          {validationError.errors.map((err, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-xs text-gray-700 bg-red-50/50 p-2 rounded border border-red-100">
                                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                                  <span>{err}</span>
                              </li>
                          ))}
                      </ul>
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
                      <button 
                          onClick={() => setValidationError({ isOpen: false, fileName: '', errors: [] })}
                          className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-md transition-all hover:translate-y-px"
                      >
                          Entendido, cerrar
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="flex flex-1 gap-6 h-full relative overflow-hidden mt-6">
        
        {/* Fixed Sidebar Configuration */}
        <div 
          className="bg-white border border-alquid-gray40 border-opacity-40 shadow-lg rounded-xl flex flex-col z-10 w-80"
        >
          <div className="p-5 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
            
            {/* Files - Moved to Top */}
            <div>
               <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                 <Database size={16} /> Archivos de Configuración
               </h4>
               <FileInput 
                 label="Queries (JSON)" 
                 accept=".json" 
                 onFileLoaded={handleQueriesLoaded} 
                 onRemove={handleRemoveQueries}
                 initialFileName={downloadReports.fileName}
                 required 
               />
               <FileInput 
                 label="Accesos (JSON)" 
                 accept=".json" 
                 onFileLoaded={handleConfigLoaded} 
                 onRemove={handleRemoveConfig}
                 initialFileName={downloadConfig.fileName}
                 required 
               />
            </div>

            <hr className="border-gray-100" />

            {/* Environment Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Región</label>
                <div className="relative">
                  <select 
                     value={downloadRegion} 
                     onChange={(e) => setDownloadRegion(e.target.value)}
                     className={`w-full appearance-none bg-white border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-navy focus:border-transparent font-medium shadow-sm transition-all cursor-pointer hover:border-gray-400 ${downloadRegion === "" ? "text-gray-500" : "text-gray-900"}`}
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
                     value={downloadEnv} 
                     onChange={(e) => setDownloadEnv(e.target.value)}
                     className={`w-full appearance-none bg-white border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-navy focus:border-transparent font-medium shadow-sm transition-all cursor-pointer hover:border-gray-400 ${downloadEnv === "" ? "text-gray-500" : "text-gray-900"}`}
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
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Load ID <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={downloadLoadId}
                  onChange={(e) => setDownloadLoadId(e.target.value)}
                  placeholder="Seleccionar Load ID"
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-navy focus:border-transparent font-mono shadow-sm placeholder-gray-400"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white rounded-xl shadow-sm border border-alquid-gray40 border-opacity-40">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-alquid-gray40 border-opacity-40 flex justify-between items-center bg-alquid-gray10 rounded-t-xl flex-shrink-0 h-[72px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-400"/>
                <span className="font-bold text-gray-700">Queries ({selectedQueries.size} seleccionadas)</span>
                {Object.keys(filters).length > 0 && <span className="text-xs text-alquid-blue font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Filtros Activos</span>}
              </div>
            </div>
            
            <button 
              onClick={toggleAll}
              className="flex items-center gap-2 text-sm font-medium text-alquid-navy hover:bg-white px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-200"
            >
              {(filteredData.length > 0 && filteredData.every(item => selectedQueries.has(item.id)))
                ? <><CheckSquare size={16} /> Deseleccionar Visibles</> 
                : <><Square size={16} /> Seleccionar Visibles</>
              }
            </button>
          </div>
          
          {/* Query Table */}
          <div className="flex-1 overflow-auto bg-alquid-gray25">
            {flatData.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center animate-fade-in">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                        <Database size={40} className="text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-700 mb-2">Esperando configuración</h3>
                    <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                        Carga el archivo <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-600 font-bold text-xs">JSON</span> en el panel lateral para visualizar los datos.
                    </p>
                </div>
            ) : (
              <table className="w-full text-left border-collapse relative">
                <thead className="bg-alquid-gray10 sticky top-0 z-20 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center border-b border-gray-200">
                       <Square size={16} className="text-gray-400 mx-auto" />
                    </th>
                    <TableHeader label="Reporte" columnKey="report" />
                    <TableHeader label="Carpeta" columnKey="folder" />
                    <TableHeader label="Informe" columnKey="filenameOnly" />
                    <TableHeader label="Base de datos" columnKey="database" />
                    <TableHeader label="Tabla" columnKey="table" />
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-64">Validación</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredData.map((item, idx) => {
                    const isSelected = selectedQueries.has(item.id);
                    const validation = validateQuery(item.query);
                    
                    return (
                      <tr 
                        key={item.id} 
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
                              className="w-4 h-4 text-alquid-navy bg-white border-gray-300 rounded focus:ring-alquid-navy"
                            />
                          </div>
                        </td>
                        <td className="py-3 px-4 text-sm font-bold text-gray-700">
                          {item.report}
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-500">
                          {item.folder || <span className="text-gray-300 italic">-</span>}
                        </td>
                        <td className="py-3 px-4 text-sm font-semibold text-gray-800 group-hover:text-alquid-navy transition-colors">
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
                             <span className="inline-flex items-start gap-1.5 text-xs font-medium text-alquid-orange leading-tight" title={validation.msg}>
                               <XCircle size={14} className="mt-0.5 flex-shrink-0" /> 
                               <span>{validation.msg}</span>
                             </span>
                           )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                      <tr>
                          <td colSpan={7} className="text-center py-8 text-gray-400 italic">
                              No hay resultados para los filtros seleccionados
                          </td>
                      </tr>
                  )}
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
                  <div className="bg-gradient-to-r from-alquid-navy to-alquid-blue h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}
            
            <button 
              onClick={runDownload}
              disabled={isProcessing || !downloadConfig.data || selectedQueries.size === 0}
              className={`w-full py-4 rounded-xl font-medium text-white shadow-lg flex justify-center items-center gap-3 transition-all transform active:scale-[0.99]
                ${isProcessing || !downloadConfig.data || selectedQueries.size === 0
                  ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                  : 'bg-alquid-navy hover:bg-opacity-90 hover:shadow-xl hover:-translate-y-0.5'
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