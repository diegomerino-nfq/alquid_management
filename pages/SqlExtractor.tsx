import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileCode, Database, Code, Square, CheckSquare, Filter, Search, X, FileWarning, AlertTriangle, Upload, FileJson } from 'lucide-react';
import FileInput from '../components/FileInput';
import PageHeader from '../components/PageHeader';
import { QueryDefinition } from '../types';
import { prepareFinalSql, formatSqlBonito } from '../utils/sqlFormatter';
import { useGlobalState } from '../context/GlobalStateContext';
import RepositoryExplorerModal from '../components/RepositoryExplorerModal';

const SqlExtractor: React.FC = () => {
    // Estados mínimos para que compile y sidebar funcione igual
    const [validationError, setValidationError] = useState<{ isOpen: boolean, fileName: string, errors: string[] }>({ isOpen: false, fileName: '', errors: [] });
    const [extractLoadId, setExtractLoadId] = useState('');
    const [extractRegion, setExtractRegion] = useState('');
    const [extractEnv, setExtractEnv] = useState('');
    const regions = ["Argentina", "Colombia", "España", "New York", "Perú", "Suiza"];
    const environments = ["PRE", "PRO"];

    // Handler para FileInput (Queries JSON)
    const handleQueriesLoaded = (content: string, fileName: string) => {
      try {
        const json = JSON.parse(content);
        setExtractReports(json, fileName);
        setSelectedQueries(new Set());
        setFilters({});
        addLog('EXTRACTOR', 'CARGA_ARCHIVO', `JSON cargado: ${fileName}`, 'SUCCESS');
      } catch (e: any) {
        setValidationError({ isOpen: true, fileName, errors: ["Error de sintaxis JSON", e.message] });
        addLog('EXTRACTOR', 'ERROR', `Error de sintaxis JSON: ${fileName}`, 'ERROR');
      }
    };

    // Handler para eliminar archivo cargado
    const handleRemoveFile = () => {
      clearExtractReports();
      setSelectedQueries(new Set());
      setFilters({});
      addLog('EXTRACTOR', 'ELIMINAR_ARCHIVO', `Archivo de queries eliminado`, 'INFO');
    };

    // Handler para seleccionar/deseleccionar queries (checkbox)
    const toggleQuery = (id: string) => {
      const newSet = new Set(selectedQueries);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      setSelectedQueries(newSet);
    };

    // Handler para exportar — genera fichero .sql con las queries seleccionadas
    const handleExport = () => {
      const selected = flatData.filter(item => selectedQueries.has(item.id));
      if (selected.length === 0) return;

      const header = [
        `-- ============================================================`,
        `-- Exportación SQL — ALQUID Data Suite`,
        `-- Región   : ${extractRegion || '(sin especificar)'}`,
        `-- Entorno  : ${extractEnv || '(sin especificar)'}`,
        `-- Load ID  : ${extractLoadId.trim() || '(sin especificar)'}`,
        `-- Fecha    : ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`,
        `-- Queries  : ${selected.length}`,
        `-- ============================================================`,
        '',
      ].join('\n');

      const blocks = selected.map(item => {
        const prepared = prepareFinalSql(item.query, extractLoadId);
        const formatted = formatSqlBonito(prepared);
        return [
          `-- ------------------------------------------------------------`,
          `-- Reporte : ${item.report}`,
          `-- Archivo : ${item.query.filename}`,
          `-- BD/Tabla: ${item.query.database} / ${item.query.schema}.${item.query.table}`,
          `-- ------------------------------------------------------------`,
          formatted.trim(),
          '',
        ].join('\n');
      });

      const content = header + blocks.join('\n');
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const regionPart = (extractRegion || 'region').replace(/\s+/g, '_');
      const envPart = extractEnv || 'env';
      const loadPart = extractLoadId.trim() ? `_${extractLoadId.trim().replace(/\s+/g, '_')}` : '';
      a.href = url;
      a.download = `SQL_${regionPart}_${envPart}${loadPart}_${new Date().toISOString().slice(0,10)}.sql`;
      a.click();
      URL.revokeObjectURL(url);
      addLog('EXTRACTOR', 'EXPORTAR_SQL', `Exportadas ${selected.length} queries (${regionPart}/${envPart})`, 'SUCCESS');
    };
  // --- Global State and UI State ---
  const { extractReports, setExtractReports, clearExtractReports, addLog } = useGlobalState();
  const [isRepoExplorerOpen, setIsRepoExplorerOpen] = useState(false);
  const [filters, setFilters] = useState<Record<string, Set<string>>>({});
  const [activeFilterColumn, setActiveFilterColumn] = useState<string | null>(null);
  const [filterSearch, setFilterSearch] = useState("");
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());
  // ...otros estados necesarios (extractLoadId, extractRegion, extractEnv, etc.)

  // --- Handlers for FileInput and Repo ---
  const handleLoaded = (content: string, fileName: string) => {
    try {
      const json = JSON.parse(content);
      setExtractReports(json, fileName);
      setSelectedQueries(new Set());
      setFilters({});
      addLog('EXTRACTOR', 'CARGA_ARCHIVO', `JSON cargado: ${fileName}`, 'SUCCESS');
    } catch (e: any) {
      addLog('EXTRACTOR', 'ERROR', `Error de sintaxis JSON: ${fileName}`, 'ERROR');
      alert('Archivo JSON inválido.');
    }
  };

  const handleClear = () => {
    clearExtractReports();
    setSelectedQueries(new Set());
    setFilters({});
    addLog('EXTRACTOR', 'ELIMINAR_ARCHIVO', `Archivo de queries eliminado`, 'INFO');
  };

  const handleSelectRepoFile = (file: any) => {
    if (!file) return;
    let json;
    try {
      json = typeof file.content === 'string' ? JSON.parse(file.content) : file.content;
      (document.activeElement as HTMLElement)?.blur();
      setExtractReports(json, file.fileName);
      setIsRepoExplorerOpen(false);
      setSelectedQueries(new Set());
      setFilters({});
      addLog('EXTRACTOR', 'CARGA_ARCHIVO', `JSON cargado desde repositorio: ${file.fileName}`, 'SUCCESS');
    } catch (e: any) {
      setValidationError({ isOpen: true, fileName: file.fileName, errors: ["Error de sintaxis JSON", e.message] });
      addLog('EXTRACTOR', 'ERROR', `Error de sintaxis JSON (repositorio): ${file.fileName}`, 'ERROR');
    }
  };

  // --- Table Data ---
  const flatData = useMemo(() => {
    const items: any[] = [];
    if (Array.isArray(extractReports.data)) {
      extractReports.data.forEach((r: any, reportIndex: number) => {
        if (Array.isArray(r.queries)) {
          r.queries.forEach((q: any, queryIndex: number) => {
            const parts = q.filename.split('/');
            const folder = parts.length > 1 ? parts[0] : '';
            const filenameOnly = parts.length > 1 ? parts.slice(1).join('/') : q.filename;
            items.push({
              id: `${r.report}|${q.filename}`,
              report: r.report,
              folder,
              filenameOnly,
              database: q.database,
              table: q.table,
              query: q,
              reportIndex,
              queryIndex
            });
          });
        }
      });
    }
    return items;
  }, [extractReports.data]);

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
      const newSet = new Set(selectedQueries);
      filteredData.forEach(item => newSet.delete(item.id));
      setSelectedQueries(newSet);
    } else {
      const newSet = new Set(selectedQueries);
      filteredData.forEach(item => newSet.add(item.id));
      setSelectedQueries(newSet);
    }
  };

  // --- Filtering UI Helpers ---
  const getUniqueValues = (columnKey: string): string[] => {
    const relevantData = flatData.filter(item => {
      return Object.entries(filters).every(([key, val]) => {
        if (key === columnKey) return true;
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

  // --- Render ---
  return (
    <div className="h-full flex flex-col animate-fade-in w-full relative">
       <PageHeader 
        title="Extracción SQL" 
        subtitle="Genera scripts SQL limpios para producción"
        icon={<Code size={20}/>}
       />

        <RepositoryExplorerModal
          isOpen={isRepoExplorerOpen}
          onClose={() => setIsRepoExplorerOpen(false)}
          onSelect={handleSelectRepoFile}
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
        
         {/* Sidebar Configuration */}
         <div className="bg-white border border-alquid-gray40 border-opacity-40 shadow-lg rounded-xl flex flex-col z-10 w-80">
            <div className="p-5 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                    <Database size={16} /> Archivos de Configuración
                  </h4>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => document.getElementById('extract-json-file-input')?.click()}
                      className="w-full py-3 bg-alquid-navy hover:bg-blue-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap transition-transform hover:-translate-y-0.5"
                    >
                      <Upload size={18} /> Cargar desde local
                    </button>
                    <button
                      onClick={() => setIsRepoExplorerOpen(true)}
                      className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap transition-transform hover:-translate-y-0.5"
                    >
                      <FileJson size={18} /> Cargar desde repositorio
                    </button>
                    <input
                      id="extract-json-file-input"
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => handleQueriesLoaded(event.target?.result as string, file.name);
                        reader.readAsText(file);
                        e.target.value = '';
                      }}
                    />
                  </div>
                </div>

                <hr className="border-gray-100" />

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Región</label>
                  <div className="relative">
                    <select
                      value={extractRegion}
                      onChange={(e) => setExtractRegion(e.target.value)}
                      className={`w-full appearance-none bg-white border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-navy focus:border-transparent font-medium shadow-sm transition-all cursor-pointer hover:border-gray-400 ${extractRegion === "" ? "text-gray-500" : "text-gray-900"}`}
                    >
                      <option value="">Seleccionar región</option>
                      {regions.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Entorno</label>
                  <div className="relative">
                    <select
                      value={extractEnv}
                      onChange={(e) => setExtractEnv(e.target.value)}
                      className={`w-full appearance-none bg-white border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-navy focus:border-transparent font-medium shadow-sm transition-all cursor-pointer hover:border-gray-400 ${extractEnv === "" ? "text-gray-500" : "text-gray-900"}`}
                    >
                      <option value="">Seleccionar entorno</option>
                      {environments.map(en => <option key={en} value={en}>{en}</option>)}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                      <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Load ID</label>
                  <input
                    type="text"
                    value={extractLoadId}
                    onChange={(e) => setExtractLoadId(e.target.value)}
                    placeholder="Introducir Load ID"
                    className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-navy focus:border-transparent font-medium shadow-sm placeholder-gray-400"
                  />
                </div>

            </div>
         </div>

         {/* Main Content Area */}
         <div className="flex-1 flex flex-col h-full overflow-hidden bg-white rounded-xl shadow-sm border border-alquid-gray40 border-opacity-40">
           {/* Toolbar */}
           <div className="p-4 border-b border-alquid-gray40 border-opacity-40 flex justify-between items-center bg-alquid-gray10 rounded-t-xl flex-shrink-0 h-[72px]">
             <div className="flex items-center gap-2">
               <Filter size={18} className="text-gray-400"/>
               <span className="font-bold text-gray-700">Queries ({selectedQueries.size} seleccionadas)</span>
               {Object.keys(filters).length > 0 && <span className="text-xs text-alquid-blue font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Filtros Activos</span>}
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

           {/* Table Content */}
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
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {filteredData.map((item, idx) => {
                      const isSelected = selectedQueries.has(item.id);
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
                        </tr>
                      );
                    })}
                    {filteredData.length === 0 && (
                        <tr>
                            <td colSpan={6} className="text-center py-8 text-gray-400 italic">
                                No hay resultados para los filtros seleccionados
                            </td>
                        </tr>
                    )}
                  </tbody>
                </table>
              )}
           </div>

           {/* Footer Action */}
           <div className="p-4 border-t border-gray-200 bg-white z-10 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
              <button 
                 onClick={handleExport}
                 disabled={selectedQueries.size === 0}
                 className={`w-full py-4 rounded-xl font-medium text-white shadow-lg flex justify-center items-center gap-3 transition-all transform active:scale-[0.99]
                   ${selectedQueries.size === 0
                     ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                     : 'bg-alquid-navy hover:bg-opacity-90 hover:shadow-xl'
                   }
                 `}
               >
                 <FileCode size={20} /> GENERAR Y DESCARGAR SQL
               </button>
           </div>
         </div>
       </div>
    </div>
  );
};

export default SqlExtractor;