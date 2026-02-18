import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Save, FileJson, Edit3, X, Upload, Plus, Database, Maximize2, Minimize2, Wand2 } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import FileInput from '../components/FileInput';
import PageHeader from '../components/PageHeader';
import { useGlobalState } from '../context/GlobalStateContext';
import { QueryDefinition, ReportDefinition } from '../types';
import { formatSqlBonito } from '../utils/sqlFormatter';

const JsonEditor: React.FC = () => {
  const { editorReports, setEditorReports, clearEditorReports, addLog } = useGlobalState();
  const [editingItem, setEditingItem] = useState<{ reportIndex: number, queryIndex: number, data: QueryDefinition } | null>(null);
  const [isNewQueryMode, setIsNewQueryMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true); 
  
  // State for new query creation
  const [newQueryReport, setNewQueryReport] = useState("");
  const [newQueryFilename, setNewQueryFilename] = useState("");

  const sqlInputRef = useRef<HTMLInputElement>(null);

  const handleLoaded = (content: string, fileName: string) => {
    try {
      setEditorReports(JSON.parse(content), fileName);
      addLog('EDITOR', 'CARGA_ARCHIVO', `JSON base cargado: ${fileName}`, 'SUCCESS');
    } catch (e) {
      alert("JSON inválido");
      addLog('EDITOR', 'ERROR_CARGA', `Fallo al leer JSON: ${fileName}`, 'ERROR');
    }
  };

  const handleClear = () => {
    addLog('EDITOR', 'ELIMINAR_ARCHIVO', `JSON base eliminado: ${editorReports.fileName}`, 'INFO');
    clearEditorReports();
  };

  const handleSaveJson = () => {
    if (editorReports.data.length === 0) return;
    const blob = new Blob([JSON.stringify(editorReports.data, null, 4)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'queries_updated.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    addLog('EDITOR', 'DESCARGA_JSON', `Archivo queries_updated.json generado y descargado con ${editorReports.data.reduce((acc, r) => acc + r.queries.length, 0)} queries.`, 'SUCCESS');
  };

  // Flatten data for table view
  const flatData = useMemo(() => {
    const items: { reportIndex: number, queryIndex: number, report: string, folder: string, filenameOnly: string, query: QueryDefinition }[] = [];
    editorReports.data.forEach((r, rIdx) => {
      r.queries.forEach((q, qIdx) => {
        const parts = q.filename.split('/');
        const folder = parts.length > 1 ? parts[0] : '';
        const filenameOnly = parts.length > 1 ? parts.slice(1).join('/') : q.filename;

        items.push({
          reportIndex: rIdx,
          queryIndex: qIdx,
          report: r.report,
          folder: folder,
          filenameOnly: filenameOnly,
          query: q
        });
      });
    });
    return items;
  }, [editorReports.data]);

  const openEditor = (rIdx: number, qIdx: number) => {
    const item = editorReports.data[rIdx].queries[qIdx];
    // Format SQL automatically when opening
    const formattedSql = formatSqlBonito(item.sql);
    
    setEditingItem({ 
        reportIndex: rIdx, 
        queryIndex: qIdx, 
        data: JSON.parse(JSON.stringify({ ...item, sql: formattedSql })) 
    });
    setIsNewQueryMode(false);
    setIsFullscreen(true);
  };

  const openNewQueryModal = () => {
    setNewQueryReport(editorReports.data.length > 0 ? editorReports.data[0].report : "");
    setNewQueryFilename("");
    setEditingItem({
        reportIndex: -1,
        queryIndex: -1,
        data: {
            filename: "",
            sql: "SELECT\n    *\nFROM\n    table",
            database: "default_db",
            schema: "default_schema",
            table: "metric",
            parameters: {}
        }
    });
    setIsNewQueryMode(true);
    setIsFullscreen(true);
  };

  const handleEditorChange = (field: keyof QueryDefinition, value: string) => {
    if (!editingItem) return;
    setEditingItem({
      ...editingItem,
      data: { ...editingItem.data, [field]: value }
    });
  };

  const reformatSql = () => {
    if (!editingItem) return;
    const formatted = formatSqlBonito(editingItem.data.sql);
    handleEditorChange('sql', formatted);
  };

  const saveChanges = () => {
    if (!editingItem) return;
    const newData = [...editorReports.data];

    if (isNewQueryMode) {
        if (!newQueryReport.trim() || !newQueryFilename.trim()) {
            alert("El nombre del reporte y el nombre del archivo son obligatorios.");
            return;
        }
        
        // Find existing report or create new
        let reportIdx = newData.findIndex(r => r.report === newQueryReport);
        if (reportIdx === -1) {
            newData.push({ report: newQueryReport, queries: [] });
            reportIdx = newData.length - 1;
        }

        const newQuery = { ...editingItem.data, filename: newQueryFilename };
        newData[reportIdx].queries.push(newQuery);
        addLog('EDITOR', 'CREAR_QUERY', `Nueva query creada: ${newQueryFilename} en reporte ${newQueryReport}`, 'SUCCESS');

    } else {
        newData[editingItem.reportIndex].queries[editingItem.queryIndex] = editingItem.data;
        addLog('EDITOR', 'EDITAR_QUERY', `Query modificada: ${editingItem.data.filename}`, 'INFO');
    }

    setEditorReports(newData, editorReports.fileName || "queries_edited.json");
    setEditingItem(null);
    setIsNewQueryMode(false);
  };

  const handleSqlFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingItem) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target?.result as string;
        const formatted = formatSqlBonito(content);
        setEditingItem({
            ...editingItem,
            data: { ...editingItem.data, sql: formatted }
        });
        addLog('EDITOR', 'IMPORTAR_SQL', `Contenido SQL importado desde ${file.name}`, 'INFO');
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset
  };

  // Robust SQL syntax highlighter with Masking to prevent regex collisions
  const highlightSql = (code: string) => {
    // 1. Escape HTML
    let safeCode = code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    const placeholders: string[] = [];
    
    // Helper to mask content and store it safely
    const mask = (content: string, className: string) => {
        const id = `__PH_${placeholders.length}__`;
        placeholders.push(`<span class="${className}">${content}</span>`);
        return id;
    };

    // 2. Mask Comments (Gray)
    safeCode = safeCode.replace(/(--[^\n]*)/g, (match) => mask(match, "text-gray-400 italic"));
    
    // 3. Mask Strings (Green)
    safeCode = safeCode.replace(/'([^']*)'/g, (match) => mask(match, "text-green-600"));

    // 4. Mask Keywords (Blue)
    safeCode = safeCode.replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|CASE|WHEN|THEN|ELSE|END|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|UNION|ALL|DISTINCT|INSERT|UPDATE|DELETE|CREATE|DROP|TABLE|VIEW|INDEX|ALTER)\b/gi, 
        (match) => mask(match, "text-blue-600 font-bold"));

    // 5. Mask Functions (Purple)
    safeCode = safeCode.replace(/\b(SUM|COUNT|AVG|MIN|MAX|COALESCE|DATE|DATE_ADD|DATE_SUB|NOW|CAST|CONCAT|SUBSTRING|TRIM)\b/gi, 
        (match) => mask(match, "text-purple-600 font-semibold"));

    // 6. Mask Numbers (Orange)
    // Note: Since keywords like "text-blue-600" are now hidden inside placeholders (e.g., __PH_2__),
    // this regex will NOT incorrectly match the "600" inside the class name.
    safeCode = safeCode.replace(/\b(\d+)\b/g, 
        (match) => mask(match, "text-orange-600"));

    // 7. Restore placeholders
    return safeCode.replace(/__PH_(\d+)__/g, (_, index) => placeholders[parseInt(index)]);
  };

  return (
    <div className="h-full flex flex-col animate-fade-in w-full relative">
       <PageHeader 
        title="Editor JSON" 
        subtitle="Mantenimiento y limpieza del archivo de configuración"
        icon={<FileJson size={20}/>}
       />

       {/* Editor Modal */}
       {editingItem && (
         <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
            <div 
                className={`
                    bg-white shadow-2xl flex flex-col overflow-hidden transition-all duration-300
                    ${isFullscreen ? 'w-full h-full rounded-none' : 'w-[95vw] h-[90vh] md:max-w-6xl rounded-2xl border border-gray-200'}
                `}
            >
               {/* Modal Header */}
               <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
                  <div className="flex items-center gap-4">
                      <div className="bg-blue-100 p-2 rounded-lg text-alquid-blue">
                         <Edit3 size={20} />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-gray-800">
                             {isNewQueryMode ? "Crear Nueva Query" : "Editar Query"}
                          </h3>
                          <p className="text-xs text-gray-500 font-mono">
                             {isNewQueryMode ? "Nueva entrada" : editingItem.data.filename}
                          </p>
                      </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                     <button 
                       onClick={reformatSql}
                       className="p-2 text-gray-500 hover:text-alquid-blue hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium mr-2"
                       title="Reformatear SQL"
                     >
                       <Wand2 size={16} /> <span className="hidden md:inline">Formatear</span>
                     </button>
                     
                     <button 
                       onClick={() => setIsFullscreen(!isFullscreen)}
                       className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                       title={isFullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
                     >
                       {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
                     </button>
                     
                     <button 
                        onClick={() => setEditingItem(null)} 
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                     >
                        <X size={24} />
                     </button>
                  </div>
               </div>
               
               {/* Modal Body */}
               <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                  
                  {/* SQL Editor Area */}
                  <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-gray-200">
                     <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <span>Editor SQL</span>
                        <div className="flex items-center gap-2">
                            <input 
                                type="file" 
                                accept=".sql" 
                                ref={sqlInputRef} 
                                onChange={handleSqlFileUpload} 
                                className="hidden" 
                            />
                            <button 
                                onClick={() => sqlInputRef.current?.click()}
                                className="text-alquid-blue hover:underline flex items-center gap-1 cursor-pointer"
                            >
                                <Upload size={12} /> Cargar .SQL
                            </button>
                        </div>
                     </div>
                     
                     <div className="flex-1 overflow-auto bg-white relative">
                        <div className="absolute inset-0 min-h-full">
                            <Editor
                                value={editingItem.data.sql}
                                onValueChange={(code) => handleEditorChange('sql', code)}
                                highlight={highlightSql}
                                padding={24}
                                className="font-mono text-sm leading-relaxed min-h-full"
                                textareaClassName="focus:outline-none"
                                style={{
                                    fontFamily: '"Fira Code", "Menlo", "Monaco", "Consolas", monospace',
                                    fontSize: 14,
                                    backgroundColor: '#ffffff',
                                    minHeight: '100%',
                                }}
                            />
                        </div>
                     </div>
                  </div>

                  {/* Metadata Sidebar */}
                  <div className="w-full md:w-80 bg-gray-50 flex flex-col border-t md:border-t-0 h-[40vh] md:h-full flex-shrink-0 overflow-y-auto">
                     <div className="p-6 space-y-6">
                        <h4 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 flex items-center gap-2">
                           <Database size={16} /> Configuración
                        </h4>

                        {isNewQueryMode && (
                            <div className="space-y-4 bg-white p-4 rounded-xl border border-blue-100 shadow-sm">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Reporte</label>
                                    <input 
                                    type="text" 
                                    value={newQueryReport}
                                    onChange={(e) => setNewQueryReport(e.target.value)}
                                    list="reports-list"
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none"
                                    placeholder="Nombre del reporte"
                                    />
                                    <datalist id="reports-list">
                                        {editorReports.data.map(r => <option key={r.report} value={r.report} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Archivo</label>
                                    <input 
                                    type="text" 
                                    value={newQueryFilename}
                                    onChange={(e) => setNewQueryFilename(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none"
                                    placeholder="carpeta/nombre_archivo"
                                    />
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Database</label>
                                <input 
                                type="text" 
                                value={editingItem.data.database}
                                onChange={(e) => handleEditorChange('database', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Schema</label>
                                <input 
                                type="text" 
                                value={editingItem.data.schema}
                                onChange={(e) => handleEditorChange('schema', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none bg-white"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1">Table</label>
                                <input 
                                type="text" 
                                value={editingItem.data.table}
                                onChange={(e) => handleEditorChange('table', e.target.value)}
                                className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none bg-white"
                                />
                            </div>
                        </div>

                        {/* Parameters (Read-only visualization for now, can be expanded) */}
                        {editingItem.data.parameters && Object.keys(editingItem.data.parameters).length > 0 && (
                            <div className="pt-4 border-t border-gray-200">
                                <label className="block text-xs font-bold text-gray-500 mb-2">Parámetros Detectados</label>
                                <div className="flex flex-wrap gap-2">
                                    {Object.keys(editingItem.data.parameters).map(param => (
                                        <span key={param} className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md text-xs font-mono">
                                            :{param}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                     </div>
                  </div>
               </div>

               {/* Modal Footer */}
               <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 flex-shrink-0">
                  <button 
                    onClick={() => setEditingItem(null)} 
                    className="px-6 py-2.5 rounded-xl text-gray-600 hover:bg-gray-200 font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={saveChanges} 
                    className="px-6 py-2.5 rounded-xl bg-alquid-blue text-white hover:bg-blue-800 font-bold shadow-lg transition-colors flex items-center gap-2"
                  >
                    <Save size={18} /> {isNewQueryMode ? "Crear Query" : "Guardar Cambios"}
                  </button>
               </div>
            </div>
         </div>
       )}

       {/* Main Content: File Load & Table */}
       <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="p-6 md:p-8 border-b border-gray-200 bg-white">
             <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
                <div className="flex-1 w-full">
                    <FileInput 
                        label="Cargar archivo de configuración .json" 
                        accept=".json" 
                        onFileLoaded={handleLoaded}
                        onRemove={handleClear}
                        initialFileName={editorReports.fileName}
                        required // Added required prop
                    />
                </div>
                {editorReports.data.length > 0 && (
                   <button 
                      onClick={openNewQueryModal}
                      className="mb-4 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-sm whitespace-nowrap transition-transform hover:-translate-y-0.5"
                   >
                      <Plus size={18} /> Añadir Nueva Query
                   </button>
                )}
             </div>
          </div>

          <div className="flex-1 overflow-auto bg-gray-50">
            {editorReports.data.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-gray-400 p-12">
                  <FileJson size={48} className="mx-auto mb-3 opacity-20" />
                  <p>Carga un archivo JSON para comenzar a editar</p>
               </div>
            ) : (
               <table className="w-full text-left border-collapse">
                 <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                   <tr>
                     <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Reporte</th>
                     <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Carpeta</th>
                     <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Informe</th>
                     <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Base de datos</th>
                     <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200">Tabla</th>
                     <th className="py-3 px-4 text-center w-16 border-b border-gray-200"></th>
                   </tr>
                 </thead>
                 <tbody className="bg-white divide-y divide-gray-100">
                   {flatData.map((item, idx) => (
                     <tr 
                       key={idx} 
                       onClick={() => openEditor(item.reportIndex, item.queryIndex)}
                       className="group hover:bg-blue-50 cursor-pointer transition-colors"
                     >
                       <td className="py-3 px-4 text-sm font-bold text-gray-700">{item.report}</td>
                       <td className="py-3 px-4 text-sm text-gray-500">{item.folder || '-'}</td>
                       <td className="py-3 px-4 text-sm font-semibold text-gray-800 group-hover:text-alquid-blue">{item.filenameOnly}</td>
                       <td className="py-3 px-4 text-sm text-gray-600">{item.query.database}</td>
                       <td className="py-3 px-4 text-sm text-gray-600 font-mono">{item.query.table}</td>
                       <td className="py-3 px-4 text-center text-gray-400 group-hover:text-alquid-blue">
                          <Edit3 size={16} />
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 bg-white z-10 flex-shrink-0">
             <button 
               onClick={handleSaveJson}
               disabled={editorReports.data.length === 0}
               className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex justify-center items-center gap-3 transition-all transform active:scale-[0.99]
                 ${editorReports.data.length === 0
                   ? 'bg-gray-300 cursor-not-allowed shadow-none' 
                   : 'bg-alquid-red hover:bg-red-600 hover:shadow-xl hover:-translate-y-0.5'
                 }
               `}
             >
               <Save size={20} /> DESCARGAR JSON ACTUALIZADO
             </button>
          </div>
       </div>
    </div>
  );
};

export default JsonEditor;