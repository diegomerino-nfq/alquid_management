import React, { useState, useMemo } from 'react';
import { FileCode, Database, Code, Square, CheckSquare, Filter } from 'lucide-react';
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

  const handleQueriesLoaded = (content: string, fileName: string) => {
    try {
      setExtractReports(JSON.parse(content), fileName);
      addLog('EXTRACCIÓN', 'CARGA_ARCHIVO', `Queries JSON cargado: ${fileName}`, 'SUCCESS');
    } catch (e) {
      alert("JSON inválido");
      addLog('EXTRACCIÓN', 'ERROR_CARGA', `Fallo al leer archivo: ${fileName}`, 'ERROR');
    }
  };

  const handleRemoveFile = () => {
    addLog('EXTRACCIÓN', 'ELIMINAR_ARCHIVO', `Queries JSON eliminado: ${extractReports.fileName}`, 'INFO');
    clearExtractReports();
    setSelectedQueries(new Set());
  };

  const toggleQuery = (id: string) => {
    const newSet = new Set(selectedQueries);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedQueries(newSet);
  };

  const getTotalQueries = () => {
    return extractReports.data.reduce((acc, r) => acc + r.queries.length, 0);
  };

  const toggleAll = () => {
    if (selectedQueries.size === getTotalQueries()) {
       setSelectedQueries(new Set());
    } else {
       const allIds = new Set<string>();
       extractReports.data.forEach(r => r.queries.forEach(q => allIds.add(`${r.report}|${q.filename}`)));
       setSelectedQueries(allIds);
    }
  };

  const handleExport = () => {
    if (selectedQueries.size === 0) return alert("Selecciona al menos una query");
    
    let processedCount = 0;

    extractReports.data.forEach(r => {
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
    });

    if (processedCount > 0) {
        addLog('EXTRACCIÓN', 'EXPORTAR_SQL', `Generados ${processedCount} archivos SQL. LoadID: ${extractLoadId || 'N/A'}`, 'SUCCESS');
        alert(`Se descargaron ${processedCount} archivos SQL.`);
    }
  };

  // Flatten data for table view
  const flatData = useMemo(() => {
    const items: { id: string, report: string, folder: string, filenameOnly: string, query: QueryDefinition }[] = [];
    extractReports.data.forEach(r => {
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
  }, [extractReports.data]);

  return (
    <div className="h-full flex flex-col animate-fade-in w-full">
       <PageHeader 
        title="Extracción SQL" 
        subtitle="Genera scripts SQL limpios para producción"
        icon={<Code size={20}/>}
       />

       <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-alquid-gray40 border-opacity-40 overflow-hidden">
         {/* Top Controls */}
         <div className="p-6 md:p-8 border-b border-alquid-gray40 border-opacity-40 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
               <FileInput 
                 label="Cargar archivo de configuración .json" 
                 accept=".json" 
                 onFileLoaded={handleQueriesLoaded} 
                 onRemove={handleRemoveFile}
                 initialFileName={extractReports.fileName}
                 required 
               />
               
               <div>
                 <label className="block text-sm font-semibold text-gray-700 mb-1.5">Load ID</label>
                 {/* Styled to exactly match FileInput structure: border-2 + p-4 + content height matching icon wrapper */}
                 <div className="border-2 border-gray-300 rounded-xl bg-white shadow-sm hover:border-alquid-blue transition-colors p-4 flex items-center">
                    <input 
                    type="text" 
                    value={extractLoadId}
                    onChange={(e) => setExtractLoadId(e.target.value)}
                    placeholder="Seleccionar Load ID"
                    className="w-full h-10 bg-transparent outline-none text-gray-800 placeholder-gray-400 font-medium"
                    />
                 </div>
               </div>
            </div>
         </div>

         {/* Toolbar */}
         <div className="p-4 border-b border-alquid-gray40 border-opacity-40 flex justify-between items-center bg-alquid-gray10 flex-shrink-0">
           <div className="flex items-center gap-2">
             <Filter size={18} className="text-gray-400"/>
             <span className="font-bold text-gray-700">Queries Disponibles ({selectedQueries.size})</span>
           </div>
           
           <button 
             onClick={toggleAll}
             className="flex items-center gap-2 text-sm font-medium text-alquid-navy hover:bg-white px-3 py-1.5 rounded-lg transition-colors border border-transparent hover:border-gray-200"
           >
             {selectedQueries.size === getTotalQueries() && getTotalQueries() > 0 
               ? <><CheckSquare size={16} /> Deseleccionar Todo</> 
               : <><Square size={16} /> Seleccionar Todo</>
             }
           </button>
         </div>

         {/* Table Content */}
         <div className="flex-1 overflow-auto bg-alquid-gray25">
            {flatData.length === 0 ? (
                 <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12">
                   <FileCode size={48} className="mx-auto mb-3 opacity-20" />
                   <p>Carga un archivo JSON para ver las queries</p>
                 </div>
               ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-alquid-gray10 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="py-3 px-4 w-12 text-center border-b border-gray-200">
                       <Square size={16} className="text-gray-400 mx-auto" />
                    </th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Reporte</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Carpeta</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Informe</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Base de datos</th>
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Tabla</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {flatData.map((item, idx) => {
                    const isSelected = selectedQueries.has(item.id);
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
  );
};

export default SqlExtractor;