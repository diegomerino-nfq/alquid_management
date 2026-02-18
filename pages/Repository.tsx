import React, { useRef, useState } from 'react';
import { Archive, Upload, FileJson, Clock, Download, Plus, MapPin, ChevronRight, Folder, Database, X, ArrowLeft, Server, FileText } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useGlobalState } from '../context/GlobalStateContext';
import { RepositoryFile, ReportDefinition } from '../types';

const Repository: React.FC = () => {
  const { repositoryData, addRepositoryFile, addLog } = useGlobalState();
  const regions = ["Argentina", "Colombia", "España", "New York", "Perú", "Suiza"];
  const envs = ["PRE", "PRO"];

  // Navigation State
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  
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

  const resetSelection = () => {
      setSelectedEnv(null);
      setSelectedRegion(null);
  };

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
              <div className="border-b border-gray-100 p-4 bg-gray-50 flex items-center gap-2">
                 <button 
                   onClick={() => selectedEnv ? setSelectedEnv(null) : setSelectedRegion(null)}
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
                                  <button onClick={triggerUpload} className="mt-4 text-alquid-blue hover:underline">Subir el primer archivo</button>
                              </div>
                          ) : (
                              <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200">
                                        <tr>
                                            <th className="px-6 py-3 font-semibold w-24 text-center">Versión</th>
                                            <th className="px-6 py-3 font-semibold">Nombre Archivo</th>
                                            <th className="px-6 py-3 font-semibold">Fecha Carga</th>
                                            <th className="px-6 py-3 font-semibold">Usuario</th>
                                            <th className="px-6 py-3 font-semibold w-32 text-center">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {repositoryData[selectedRegion][selectedEnv].map((file, idx) => (
                                            <tr 
                                                key={file.id} 
                                                onClick={() => setSelectedFile(file)}
                                                className={`
                                                    group hover:bg-blue-50 cursor-pointer transition-colors
                                                    ${idx === 0 ? 'bg-blue-50/20' : ''}
                                                `}
                                            >
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
                                        ))}
                                    </tbody>
                                </table>
                              </div>
                          )}
                      </div>
                  </div>
              )}

          </div>
      </div>

      {/* File Details Modal */}
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