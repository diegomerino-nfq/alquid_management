import React, { useRef, useState, useMemo } from 'react';
import { Archive, Upload, FileJson, Download, MapPin, ChevronRight, Folder, Database, X, ArrowLeft, Server, GitCompare, ArrowRightLeft, Check, AlertTriangle, Plus, Minus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useGlobalState } from '../context/GlobalStateContext';
import { RepositoryFile, ReportDefinition, QueryDefinition } from '../types';
import { formatSqlBonito } from '../utils/sqlFormatter';

// --- Helper Types for Diff ---
type DiffStatus = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

interface QueryDiff {
    key: string; // ReportName + / + Filename
    report: string;
    filename: string;
    status: DiffStatus;
    oldQuery?: QueryDefinition;
    newQuery?: QueryDefinition;
    changes: string[]; // List of changed fields (e.g., 'sql', 'table')
}

const Repository: React.FC = () => {
  const { repositoryData, addRepositoryFile, addLog } = useGlobalState();
  const regions = ["Argentina", "Colombia", "España", "New York", "Perú", "Suiza"];
  const envs = ["PRE", "PRO"];

  // Navigation State
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  
  // State for Comparison
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  
  // State for File Details Modal
  const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);

  // Refs for hidden inputs
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, region: string, env: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const jsonContent = JSON.parse(content);
        addRepositoryFile(region, env, jsonContent, file.name);
      } catch (err) {
        alert("El archivo debe ser un JSON válido.");
        addLog('REPOSITORIO', 'ERROR_SUBIDA', `Error parseando JSON: ${file.name}`, 'ERROR');
      }
    };
    reader.readAsText(file);
    e.target.value = ''; 
  };

  const triggerUpload = () => {
      if (selectedRegion && selectedEnv) {
          fileInputRefs.current[`${selectedRegion}-${selectedEnv}`]?.click();
      }
  };

  const downloadFile = (file: RepositoryFile, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      const blob = new Blob([JSON.stringify(file.content, null, 4)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `[v${file.version}]_${file.fileName}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      addLog('REPOSITORIO', 'DESCARGA_VERSION', `Versión ${file.version} descargada`, 'INFO');
  };

  // --- Comparison Logic ---

  const toggleCompareSelection = (fileId: string, e: React.ChangeEvent<HTMLInputElement>) => {
      e.stopPropagation();
      setSelectedForCompare(prev => {
          if (prev.includes(fileId)) return prev.filter(id => id !== fileId);
          if (prev.length >= 2) return [prev[1], fileId]; // Keep max 2, FIFO
          return [...prev, fileId];
      });
  };

  const generateDiff = useMemo(() => {
     if (selectedForCompare.length !== 2 || !selectedRegion || !selectedEnv) return null;
     
     const files = repositoryData[selectedRegion][selectedEnv].filter(f => selectedForCompare.includes(f.id));
     // Sort by version ascending (Oldest vs Newest)
     const sortedFiles = files.sort((a, b) => a.version - b.version);
     const oldFile = sortedFiles[0];
     const newFile = sortedFiles[1];

     const oldData: ReportDefinition[] = Array.isArray(oldFile.content) ? oldFile.content : [];
     const newData: ReportDefinition[] = Array.isArray(newFile.content) ? newFile.content : [];

     // Flatten Data into Maps for easy lookup
     const flattenQueries = (data: ReportDefinition[]) => {
         const map = new Map<string, QueryDefinition>();
         data.forEach(r => {
             r.queries.forEach(q => {
                 map.set(`${r.report}::${q.filename}`, q);
             });
         });
         return map;
     };

     const oldMap = flattenQueries(oldData);
     const newMap = flattenQueries(newData);
     const allKeys = new Set([...oldMap.keys(), ...newMap.keys()]);
     
     const diffResults: QueryDiff[] = [];

     allKeys.forEach(key => {
         const oldQ = oldMap.get(key);
         const newQ = newMap.get(key);
         const [report, filename] = key.split('::');

         if (!oldQ && newQ) {
             diffResults.push({ key, report, filename, status: 'ADDED', newQuery: newQ, changes: [] });
         } else if (oldQ && !newQ) {
             diffResults.push({ key, report, filename, status: 'REMOVED', oldQuery: oldQ, changes: [] });
         } else if (oldQ && newQ) {
             // Check fields
             const changes: string[] = [];
             if (oldQ.database !== newQ.database) changes.push('database');
             if (oldQ.schema !== newQ.schema) changes.push('schema');
             if (oldQ.table !== newQ.table) changes.push('table');
             
             // Check SQL (normalize whitespace/formatting)
             const normOld = formatSqlBonito(oldQ.sql);
             const normNew = formatSqlBonito(newQ.sql);
             if (normOld !== normNew) changes.push('sql');

             if (changes.length > 0) {
                 diffResults.push({ key, report, filename, status: 'MODIFIED', oldQuery: oldQ, newQuery: newQ, changes });
             } else {
                 diffResults.push({ key, report, filename, status: 'UNCHANGED', oldQuery: oldQ, newQuery: newQ, changes: [] });
             }
         }
     });

     return {
         oldVersion: oldFile.version,
         newVersion: newFile.version,
         diffs: diffResults.sort((a, b) => {
             // Sort: Modified -> Added -> Removed -> Unchanged
             const score = (s: DiffStatus) => s === 'MODIFIED' ? 0 : s === 'ADDED' ? 1 : s === 'REMOVED' ? 2 : 3;
             return score(a.status) - score(b.status);
         })
     };

  }, [selectedForCompare, repositoryData, selectedRegion, selectedEnv]);

  // --- SQL Line Diff Helper ---
  const SqlDiffView = ({ oldSql, newSql }: { oldSql: string, newSql: string }) => {
      const oldLines = formatSqlBonito(oldSql).split('\n');
      const newLines = formatSqlBonito(newSql).split('\n');
      const maxLines = Math.max(oldLines.length, newLines.length);

      return (
          <div className="flex text-xs font-mono border rounded bg-gray-50 overflow-hidden">
              <div className="w-1/2 border-r border-gray-200">
                  <div className="bg-gray-100 px-2 py-1 text-gray-500 font-bold border-b">Versión Anterior</div>
                  <div className="p-2 overflow-x-auto">
                    {Array.from({ length: maxLines }).map((_, i) => {
                        const line = oldLines[i] || "";
                        const newLine = newLines[i] || "";
                        const isDiff = line.trim() !== newLine.trim();
                        return (
                            <div key={i} className={`${isDiff && line ? 'bg-red-100 text-red-800' : 'text-gray-600'} whitespace-pre`}>
                                {line || <br/>}
                            </div>
                        );
                    })}
                  </div>
              </div>
              <div className="w-1/2">
                  <div className="bg-gray-100 px-2 py-1 text-gray-500 font-bold border-b">Nueva Versión</div>
                  <div className="p-2 overflow-x-auto">
                    {Array.from({ length: maxLines }).map((_, i) => {
                        const line = oldLines[i] || "";
                        const newLine = newLines[i] || "";
                        const isDiff = line.trim() !== newLine.trim();
                        return (
                            <div key={i} className={`${isDiff && newLine ? 'bg-green-100 text-green-800 font-bold' : 'text-gray-600'} whitespace-pre`}>
                                {newLine || <br/>}
                            </div>
                        );
                    })}
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="h-full flex flex-col animate-fade-in relative">
      <PageHeader 
        title="Repositorio Centralizado" 
        subtitle={
            selectedRegion 
            ? `${selectedRegion} ${selectedEnv ? `/ ${selectedEnv}` : ''}` 
            : "Gestión jerárquica de configuraciones y versionado"
        }
        icon={<Archive size={20}/>}
      />

      {/* Main Content Area */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-alquid-gray40 border-opacity-40 overflow-hidden flex flex-col relative">
          
          {/* Back Button / Navigation Bar */}
          {(selectedRegion || selectedEnv) && (
              <div className="border-b border-gray-100 p-4 bg-gray-50 flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <button 
                    onClick={() => {
                        selectedEnv ? setSelectedEnv(null) : setSelectedRegion(null);
                        setSelectedForCompare([]);
                    }}
                    className="flex items-center gap-2 text-sm text-gray-500 hover:text-alquid-navy hover:bg-white px-3 py-1.5 rounded-lg border border-transparent hover:border-gray-200 transition-all"
                    >
                        <ArrowLeft size={16} /> Volver
                    </button>
                    <div className="h-4 w-px bg-gray-300 mx-2"></div>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Inicio</span>
                        <ChevronRight size={14} className="text-gray-300" />
                        <span className={selectedEnv ? "text-gray-400" : "font-bold text-alquid-navy"}>{selectedRegion}</span>
                        {selectedEnv && (
                            <>
                                <ChevronRight size={14} className="text-gray-300" />
                                <span className="font-bold text-alquid-navy">{selectedEnv}</span>
                            </>
                        )}
                    </div>
                 </div>

                 {/* Compare Action Button */}
                 {selectedRegion && selectedEnv && (
                     <button
                        onClick={() => setIsCompareModalOpen(true)}
                        disabled={selectedForCompare.length !== 2}
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all
                            ${selectedForCompare.length === 2 
                                ? 'bg-alquid-blue text-white shadow-md hover:bg-blue-600' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}
                        `}
                     >
                        <GitCompare size={16} /> 
                        Comparar Versiones {selectedForCompare.length > 0 && `(${selectedForCompare.length})`}
                     </button>
                 )}
              </div>
          )}

          <div className="flex-1 p-6 overflow-y-auto">
              
              {/* VIEW 1: REGIONS */}
              {!selectedRegion && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                      {regions.map(region => {
                          const totalFiles = envs.reduce((acc, env) => acc + (repositoryData[region]?.[env]?.length || 0), 0);
                          return (
                              <div 
                                key={region}
                                onClick={() => setSelectedRegion(region)}
                                className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg hover:border-alquid-blue cursor-pointer transition-all group relative overflow-hidden"
                              >
                                  <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity transform group-hover:scale-110">
                                      <MapPin size={80} />
                                  </div>
                                  <div className="flex items-center gap-4 mb-4">
                                      <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-alquid-navy group-hover:bg-alquid-blue group-hover:text-white transition-colors">
                                          <MapPin size={24} />
                                      </div>
                                      <h3 className="text-lg font-bold text-gray-800">{region}</h3>
                                  </div>
                                  <div className="flex items-center justify-between text-sm text-gray-500 mt-4 pt-4 border-t border-gray-100">
                                      <span>{totalFiles} Archivos</span>
                                      <ChevronRight size={16} className="text-gray-300 group-hover:text-alquid-blue group-hover:translate-x-1 transition-all" />
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              )}

              {/* VIEW 2: ENVIRONMENTS */}
              {selectedRegion && !selectedEnv && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto mt-6 animate-fade-in">
                      {envs.map(env => {
                          const filesCount = repositoryData[selectedRegion]?.[env]?.length || 0;
                          const isPro = env === 'PRO';
                          return (
                              <div 
                                key={env}
                                onClick={() => setSelectedEnv(env)}
                                className={`
                                    relative p-8 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-xl group
                                    ${isPro 
                                        ? 'border-blue-100 bg-blue-50/30 hover:border-alquid-blue' 
                                        : 'border-orange-100 bg-orange-50/30 hover:border-alquid-orange'
                                    }
                                `}
                              >
                                  <div className="flex items-center justify-between mb-6">
                                      <h3 className={`text-2xl font-bold ${isPro ? 'text-alquid-blue' : 'text-alquid-orange'}`}>
                                          {env}
                                      </h3>
                                      <div className={`p-3 rounded-full ${isPro ? 'bg-blue-100 text-alquid-blue' : 'bg-orange-100 text-alquid-orange'}`}>
                                          <Server size={24} />
                                      </div>
                                  </div>
                                  <p className="text-gray-600 mb-4">
                                      {isPro ? "Entorno de Producción" : "Entorno de Pre-producción"}
                                  </p>
                                  <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                                      <FileJson size={16} /> {filesCount} Archivos disponibles
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              )}

              {/* VIEW 3: FILE LIST */}
              {selectedRegion && selectedEnv && (
                  <div className="animate-fade-in h-full flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                          <div>
                              <h3 className="text-lg font-bold text-gray-800">Archivos de Configuración</h3>
                              <p className="text-sm text-gray-500">Historial de versiones para {selectedRegion} - {selectedEnv}</p>
                          </div>
                          <div>
                              <button 
                                  onClick={triggerUpload}
                                  className="bg-alquid-navy hover:bg-opacity-90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                              >
                                  <Upload size={18} /> Subir Nueva Versión
                              </button>
                              <input 
                                  type="file" 
                                  accept=".json"
                                  ref={(el) => { fileInputRefs.current[`${selectedRegion}-${selectedEnv}`] = el; }}
                                  className="hidden"
                                  onChange={(e) => handleFileUpload(e, selectedRegion, selectedEnv)}
                              />
                          </div>
                      </div>

                      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden flex-1">
                          {(!repositoryData[selectedRegion]?.[selectedEnv] || repositoryData[selectedRegion][selectedEnv].length === 0) ? (
                              <div className="h-64 flex flex-col items-center justify-center text-gray-400">
                                  <FileJson size={48} className="mb-4 text-gray-200" />
                                  <p>No hay archivos cargados en este entorno.</p>
                                  <button onClick={triggerUpload} className="mt-4 text-alquid-blue hover:underline font-medium">
                                    Subir el primer archivo
                                  </button>
                              </div>
                          ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold w-12 text-center">
                                                <input type="checkbox" disabled className="rounded border-gray-300" />
                                            </th>
                                            <th className="px-6 py-3 font-semibold w-24 text-center">Versión</th>
                                            <th className="px-6 py-3 font-semibold">Nombre Archivo</th>
                                            <th className="px-6 py-3 font-semibold">Fecha Carga</th>
                                            <th className="px-6 py-3 font-semibold">Usuario</th>
                                            <th className="px-6 py-3 font-semibold w-32 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {repositoryData[selectedRegion][selectedEnv].map((file, idx) => {
                                            const isSelected = selectedForCompare.includes(file.id);
                                            return (
                                                <tr 
                                                    key={file.id} 
                                                    onClick={() => setSelectedFile(file)}
                                                    className={`
                                                        group hover:bg-blue-50 cursor-pointer transition-colors
                                                        ${idx === 0 ? 'bg-blue-50/20' : ''}
                                                        ${isSelected ? 'bg-blue-100/50' : ''}
                                                    `}
                                                >
                                                    <td className="px-6 py-4 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={isSelected}
                                                            onChange={(e) => toggleCompareSelection(file.id, e)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            className="w-4 h-4 rounded border-gray-300 text-alquid-navy focus:ring-alquid-navy cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className={`
                                                            px-2 py-1 rounded text-xs font-mono font-bold
                                                            ${idx === 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}
                                                        `}>
                                                            v{file.version}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <FileJson size={18} className="text-gray-400 group-hover:text-alquid-blue" />
                                                            <span className="font-medium text-gray-700 group-hover:text-alquid-navy">{file.fileName}</span>
                                                            {idx === 0 && <span className="text-[10px] bg-green-500 text-white px-1.5 rounded ml-2">LATEST</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {file.uploadedAt}
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        {file.uploadedBy}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button 
                                                            onClick={(e) => downloadFile(file, e)}
                                                            className="text-gray-400 hover:text-alquid-blue p-2 rounded-full hover:bg-white transition-colors"
                                                            title="Descargar"
                                                        >
                                                            <Download size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                              </div>
                          )}
                      </div>
                  </div>
              )}

          </div>
      </div>

      {/* Comparison Modal */}
      {isCompareModalOpen && generateDiff && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-fade-in">
                  <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                      <div className="flex items-center gap-4">
                          <div className="p-2 bg-alquid-blue text-white rounded-lg">
                              <GitCompare size={24} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                  Comparación de Versiones
                              </h3>
                              <p className="text-xs text-gray-500 flex items-center gap-2">
                                  <span className="font-mono bg-gray-200 px-1.5 rounded text-gray-600">v{generateDiff.oldVersion}</span>
                                  <ArrowRightLeft size={12} />
                                  <span className="font-mono bg-green-100 px-1.5 rounded text-green-700 font-bold">v{generateDiff.newVersion}</span>
                              </p>
                          </div>
                      </div>
                      <div className="flex items-center gap-4">
                            <div className="flex gap-4 text-xs font-bold uppercase tracking-wider">
                                <span className="text-green-600 flex items-center gap-1"><Plus size={14}/> {generateDiff.diffs.filter(d => d.status === 'ADDED').length} Añadidos</span>
                                <span className="text-red-500 flex items-center gap-1"><Minus size={14}/> {generateDiff.diffs.filter(d => d.status === 'REMOVED').length} Eliminados</span>
                                <span className="text-yellow-600 flex items-center gap-1"><AlertTriangle size={14}/> {generateDiff.diffs.filter(d => d.status === 'MODIFIED').length} Modificados</span>
                            </div>
                            <button onClick={() => setIsCompareModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-0 bg-gray-50">
                      {generateDiff.diffs.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-400">
                              <Check size={48} className="mb-4 text-green-500" />
                              <p className="font-bold text-gray-600">No hay diferencias</p>
                              <p className="text-sm">Ambas versiones son idénticas.</p>
                          </div>
                      ) : (
                          <div className="divide-y divide-gray-200">
                              {generateDiff.diffs.map((diff, idx) => (
                                  <div key={idx} className="bg-white">
                                      {/* Diff Header Row */}
                                      <details className="group" open={diff.status === 'MODIFIED' || diff.status === 'ADDED'}>
                                          <summary className={`
                                              flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 select-none
                                              ${diff.status === 'UNCHANGED' ? 'opacity-50' : ''}
                                          `}>
                                              <div className="flex items-center gap-4">
                                                  <div className={`
                                                      w-8 h-8 rounded-full flex items-center justify-center text-white font-bold
                                                      ${diff.status === 'ADDED' ? 'bg-green-500' : ''}
                                                      ${diff.status === 'REMOVED' ? 'bg-red-500' : ''}
                                                      ${diff.status === 'MODIFIED' ? 'bg-yellow-500' : ''}
                                                      ${diff.status === 'UNCHANGED' ? 'bg-gray-300' : ''}
                                                  `}>
                                                      {diff.status === 'ADDED' && <Plus size={16} />}
                                                      {diff.status === 'REMOVED' && <Minus size={16} />}
                                                      {diff.status === 'MODIFIED' && <AlertTriangle size={16} />}
                                                      {diff.status === 'UNCHANGED' && <Check size={16} />}
                                                  </div>
                                                  <div>
                                                      <h4 className="font-bold text-gray-800 text-sm">{diff.filename}</h4>
                                                      <p className="text-xs text-gray-500">Reporte: {diff.report}</p>
                                                  </div>
                                              </div>
                                              <div className="flex items-center gap-4">
                                                  {diff.status === 'MODIFIED' && (
                                                      <div className="flex gap-2">
                                                          {diff.changes.map(c => (
                                                              <span key={c} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-[10px] uppercase font-bold rounded">
                                                                  {c} Changed
                                                              </span>
                                                          ))}
                                                      </div>
                                                  )}
                                                  <ChevronRight size={16} className="text-gray-400 transform group-open:rotate-90 transition-transform" />
                                              </div>
                                          </summary>
                                          
                                          {/* Diff Content */}
                                          <div className="p-4 border-t border-gray-100 bg-gray-50/50 pl-16">
                                              {diff.status === 'MODIFIED' && diff.changes.includes('sql') && diff.oldQuery && diff.newQuery && (
                                                  <div className="mt-2">
                                                      <p className="text-xs font-bold text-gray-500 mb-2">Diferencia en SQL:</p>
                                                      <SqlDiffView oldSql={diff.oldQuery.sql} newSql={diff.newQuery.sql} />
                                                  </div>
                                              )}
                                              {diff.status === 'MODIFIED' && !diff.changes.includes('sql') && (
                                                  <div className="flex gap-8 text-sm">
                                                      <div>
                                                          <span className="text-red-500 font-bold">Anterior:</span>
                                                          <pre className="text-xs bg-red-50 p-2 rounded mt-1">{JSON.stringify({ db: diff.oldQuery?.database, table: diff.oldQuery?.table }, null, 2)}</pre>
                                                      </div>
                                                      <div>
                                                          <span className="text-green-600 font-bold">Nuevo:</span>
                                                          <pre className="text-xs bg-green-50 p-2 rounded mt-1">{JSON.stringify({ db: diff.newQuery?.database, table: diff.newQuery?.table }, null, 2)}</pre>
                                                      </div>
                                                  </div>
                                              )}
                                              {diff.status === 'ADDED' && diff.newQuery && (
                                                  <div className="bg-green-50 p-3 rounded border border-green-100">
                                                      <pre className="text-xs text-green-800 whitespace-pre-wrap font-mono">{formatSqlBonito(diff.newQuery.sql)}</pre>
                                                  </div>
                                              )}
                                              {diff.status === 'REMOVED' && diff.oldQuery && (
                                                  <div className="bg-red-50 p-3 rounded border border-red-100">
                                                      <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono">{formatSqlBonito(diff.oldQuery.sql)}</pre>
                                                  </div>
                                              )}
                                          </div>
                                      </details>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* File Details Modal (Existing) */}
      {selectedFile && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in">
                  <div className="flex items-center justify-between p-5 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-alquid-blue text-white rounded-lg">
                              <FileJson size={24} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-gray-800">{selectedFile.fileName}</h3>
                              <p className="text-xs text-gray-500 flex items-center gap-2">
                                  <span className="font-mono bg-gray-200 px-1.5 rounded text-gray-600">v{selectedFile.version}</span>
                                  <span>•</span>
                                  <span>{selectedFile.uploadedAt}</span>
                                  <span>•</span>
                                  <span>Subido por: {selectedFile.uploadedBy}</span>
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5">
                      <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                          <Database size={16} /> Contenido del Archivo
                      </h4>
                      
                      {Array.isArray(selectedFile.content) ? (
                          <div className="space-y-3">
                              {selectedFile.content.map((report: ReportDefinition, idx: number) => (
                                  <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:border-alquid-blue transition-colors">
                                      <div className="flex justify-between items-start mb-2">
                                          <div className="flex items-center gap-2">
                                              <Folder size={16} className="text-yellow-500" />
                                              <span className="font-bold text-gray-800 text-sm">{report.report}</span>
                                          </div>
                                          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-mono">
                                              {report.queries?.length || 0} queries
                                          </span>
                                      </div>
                                      <div className="pl-6 text-xs text-gray-500 space-y-1">
                                          {(report.queries || []).slice(0, 3).map((q, qIdx) => (
                                              <div key={qIdx} className="flex items-center gap-1.5 truncate">
                                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                                                  <span className="truncate">{q.filename}</span>
                                              </div>
                                          ))}
                                          {(report.queries || []).length > 3 && (
                                              <div className="text-gray-400 italic pl-3">+ {(report.queries?.length || 0) - 3} más...</div>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <pre className="text-xs font-mono text-gray-600 whitespace-pre-wrap overflow-hidden">
                                  {JSON.stringify(selectedFile.content, null, 2).slice(0, 500)}
                                  {JSON.stringify(selectedFile.content).length > 500 && "..."}
                              </pre>
                          </div>
                      )}
                  </div>

                  <div className="p-5 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-end">
                      <button 
                          onClick={() => downloadFile(selectedFile)}
                          className="bg-alquid-navy hover:bg-opacity-90 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm transition-transform active:scale-95"
                      >
                          <Download size={18} /> Descargar JSON
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Repository;