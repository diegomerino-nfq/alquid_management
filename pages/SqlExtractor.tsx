import React, { useState, useMemo, useRef, useEffect } from 'react';
import { FileCode, Database, Code, Square, CheckSquare, Filter, Search, X, FileWarning, AlertTriangle } from 'lucide-react';
import FileInput from '../components/FileInput';
import PageHeader from '../components/PageHeader';
import { QueryDefinition } from '../types';
import { prepareFinalSql, formatSqlBonito } from '../utils/sqlFormatter';
import { useGlobalState } from '../context/GlobalStateContext';

const SqlExtractor: React.FC = () => {
  // Use Global State (Extractor Specific)
  const { 
    extractReports, setExtractReports, clearExtractReports,
    extractLoadId, setExtractLoadId,
    addLog // Adding logger
  } = useGlobalState();

  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());
  
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
                  // SQL Extractor might be less strict about database/table, but ideally should have them
              });
          }
      });
      return errors;
  };

  const handleQueriesLoaded = (content: string, fileName: string) => {
    try {
      const json = JSON.parse(content);
      
      const structureErrors = validateJsonStructure(json);
      
      if (structureErrors.length > 0) {
          setValidationError({
              isOpen: true,
              fileName: fileName,
              errors: structureErrors
          });
          addLog('EXTRACCIÓN', 'ERROR_VALIDACION', `El archivo ${fileName} tiene una estructura inválida.`, 'ERROR');
          throw new Error("Estructura JSON inválida");
      }

      setExtractReports(json, fileName);
      addLog('EXTRACCIÓN', 'CARGA_ARCHIVO', `Queries JSON cargado: ${fileName}`, 'SUCCESS');
    } catch (e: any) {
      if (e.message !== "Estructura JSON inválida") {
          setValidationError({
              isOpen: true,
              fileName: fileName,
              errors: ["El archivo no es un JSON válido (Error de sintaxis).", e.message]
          });
          addLog('EXTRACCIÓN', 'ERROR_CARGA', `Fallo al leer archivo: ${fileName}`, 'ERROR');
      }
      throw e;
    }
  };

  const handleRemoveFile = () => {
    addLog('EXTRACCIÓN', 'ELIMINAR_ARCHIVO', `Queries JSON eliminado: ${extractReports.fileName}`, 'INFO');
    clearExtractReports();
    setSelectedQueries(new Set());
    setFilters({});
  };

  const toggleQuery = (id: string) => {
    const newSet = new Set(selectedQueries);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedQueries(newSet);
  };

  const handleExport = () => {
    if (selectedQueries.size === 0) return alert("Selecciona al menos una query");
    
    let processedCount = 0;

    if (Array.isArray(extractReports.data)) {
        extractReports.data.forEach(r => {
            if (Array.isArray(r.queries)) {
                r.queries.forEach(q => {
                    const id = `${r.report}|${q.filename}`;
                    if (selectedQueries.has(id)) {
                    const rawSql = prepareFinalSql(q, extractLoadId);
                    const prettySql = formatSqlBonito(rawSql);
                    // Removed headers as requested
                    const content = prettySql;
                    
                    const blob = new Blob([content], { type: 'text/sql' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${q.filename.replace(/\//g, '_')}.sql`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    
                    processedCount++;
                    }
                });
            }
        });
    }

    if (processedCount > 0) {
        addLog('EXTRACCIÓN', 'EXPORTAR_SQL', `Generados ${processedCount} archivos SQL. LoadID: ${extractLoadId || 'N/A'}`, 'SUCCESS');
        alert(`Se descargaron ${processedCount} archivos SQL.`);
    }
  };

  // Flatten data for table view
  const flatData = useMemo(() => {
    const items: { id: string, report: string, folder: string, filenameOnly: string, database: string, table: string, query: QueryDefinition }[] = [];
    if (Array.isArray(extractReports.data)) {
        extractReports.data.forEach(r => {
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
  }, [extractReports.data]);

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
       // Deselect visible
       const newSet = new Set(selectedQueries);
       filteredData.forEach(item => newSet.delete(item.id));
       setSelectedQueries(newSet);
    } else {
       // Select visible
       const newSet = new Set(selectedQueries);
       filteredData.forEach(item => newSet.add(item.id));
       setSelectedQueries(newSet);
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
        title="Extracción SQL" 
        subtitle="Genera scripts SQL limpios para producción"
        icon={<Code size={20}/>}
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
                   <FileInput 
                     label="Queries (JSON)" 
                     accept=".json" 
                     onFileLoaded={handleQueriesLoaded} 
                     onRemove={handleRemoveFile}
                     initialFileName={extractReports.fileName}
                     required 
                   />
                </div>

                <hr className="border-gray-100" />

                <div>
                   <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Load ID</label>
                   <input 
                     type="text" 
                     value={extractLoadId}
                     onChange={(e) => setExtractLoadId(e.target.value)}
                     placeholder="Seleccionar Load ID"
                     className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-navy focus:border-transparent font-mono shadow-sm placeholder-gray-400"
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