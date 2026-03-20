import React, { useState, useEffect } from 'react';
import { useGlobalState } from '../context/GlobalStateContext';
import { FileJson, ChevronRight, Folder, Database, X } from 'lucide-react';
import { Client, Geography } from '../types';

interface RepositoryExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (file: any) => void;
}

const RepositoryExplorerModal: React.FC<RepositoryExplorerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const { repositoryData, fetchRepositoryFiles } = useGlobalState();
  const clients: Client[] = ["Banca March", "Bankinter", "BBVA", "Pichincha"];
  const envs = ["PRE", "PRO"];
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGeography, setSelectedGeography] = useState<Geography | null>(null);
  const [selectedEnv, setSelectedEnv] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<any | null>(null);

  const CLIENT_GEOGRAPHIES: Record<string, Geography[] | undefined> = {
    "Banca March": ["Luxemburgo"],
    "BBVA": ["Argentina", "Colombia", "España", "Nueva York", "Perú", "Suiza"],
    "Bankinter": undefined,
    "Pichincha": undefined
  };

  const getFiles = () => {
    if (!selectedClient || !selectedEnv) return [];
    const geoKey = selectedGeography || 'null';
    return repositoryData[selectedClient]?.[geoKey]?.[selectedEnv] || [];
  };

  // Resetear selecciones al cerrar el modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedClient(null);
      setSelectedGeography(null);
      setSelectedEnv(null);
      setSelectedFile(null);
    }
  }, [isOpen]);

  // Cargar archivos cuando se completa la selección
  useEffect(() => {
    if (isOpen && selectedClient && selectedEnv) {
      fetchRepositoryFiles(selectedClient, selectedGeography || null, selectedEnv);
    }
  }, [isOpen, selectedClient, selectedGeography, selectedEnv]);

  if (!isOpen) return null;

  const hasGeo = selectedClient ? !!CLIENT_GEOGRAPHIES[selectedClient] : false;

  return (
    <div className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col animate-fade-in border border-gray-200 overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h3 className="text-xl font-bold">Seleccionar archivo del repositorio</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {/* Breadcrumb navigation */}
        {selectedClient && (
          <div className="flex items-center gap-1 px-6 py-3 border-b border-gray-100 bg-gray-50 text-sm flex-wrap">
            <button
              onClick={() => { setSelectedClient(null); setSelectedGeography(null); setSelectedEnv(null); setSelectedFile(null); }}
              className="text-blue-600 hover:underline font-medium"
            >
              Clientes
            </button>
            <ChevronRight size={14} className="text-gray-400 shrink-0" />
            <button
              onClick={() => { setSelectedGeography(null); setSelectedEnv(null); setSelectedFile(null); }}
              className={`font-medium ${(selectedGeography || (!hasGeo && selectedEnv)) ? 'text-blue-600 hover:underline' : 'text-gray-700 cursor-default'}`}
            >
              {selectedClient}
            </button>
            {selectedGeography && (
              <>
                <ChevronRight size={14} className="text-gray-400 shrink-0" />
                <button
                  onClick={() => { setSelectedEnv(null); setSelectedFile(null); }}
                  className={`font-medium ${selectedEnv ? 'text-blue-600 hover:underline' : 'text-gray-700 cursor-default'}`}
                >
                  {selectedGeography}
                </button>
              </>
            )}
            {selectedEnv && (
              <>
                <ChevronRight size={14} className="text-gray-400 shrink-0" />
                <span className="text-gray-700 font-medium">{selectedEnv}</span>
              </>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 min-h-[400px]">
          {/* Paso 1: Seleccionar cliente */}
          {!selectedClient && (
            <div className="grid grid-cols-2 gap-4">
              {clients.map(client => (
                <div key={client} onClick={() => setSelectedClient(client)} className="bg-white rounded-xl p-4 shadow border hover:border-blue-400 cursor-pointer flex items-center gap-3">
                  <Folder size={20} className="text-gray-400" />
                  <span className="font-bold text-gray-800">{client}</span>
                  <ChevronRight size={16} className="ml-auto text-gray-300" />
                </div>
              ))}
            </div>
          )}

          {/* Paso 2: Seleccionar geografía (si aplica) */}
          {selectedClient && CLIENT_GEOGRAPHIES[selectedClient] && !selectedGeography && (
            <div className="grid grid-cols-2 gap-4">
              {CLIENT_GEOGRAPHIES[selectedClient]?.map(geo => (
                <div key={geo} onClick={() => setSelectedGeography(geo)} className="bg-white rounded-xl p-4 shadow border hover:border-blue-400 cursor-pointer flex items-center gap-3">
                  <Database size={20} className="text-gray-400" />
                  <span className="font-bold text-gray-800">{geo}</span>
                  <ChevronRight size={16} className="ml-auto text-gray-300" />
                </div>
              ))}
            </div>
          )}

          {/* Paso 3: Seleccionar entorno */}
          {selectedClient && ((CLIENT_GEOGRAPHIES[selectedClient] && selectedGeography) || !CLIENT_GEOGRAPHIES[selectedClient]) && !selectedEnv && (
            <div className="grid grid-cols-2 gap-4">
              {envs.map(env => (
                <div key={env} onClick={() => setSelectedEnv(env)} className="bg-white rounded-xl p-4 shadow border hover:border-blue-400 cursor-pointer flex items-center gap-3">
                  <FileJson size={20} className="text-gray-400" />
                  <span className="font-bold text-gray-800">{env}</span>
                  <ChevronRight size={16} className="ml-auto text-gray-300" />
                </div>
              ))}
            </div>
          )}

          {/* Paso 4: Seleccionar archivo */}
          {selectedClient && selectedEnv && ((CLIENT_GEOGRAPHIES[selectedClient] && selectedGeography) || !CLIENT_GEOGRAPHIES[selectedClient]) && (
            <div>
              <h4 className="font-bold mb-2">Archivos disponibles:</h4>
              <div className="space-y-2">
                {getFiles().length === 0 && <div className="text-gray-400">No hay archivos en este entorno.</div>}
                {getFiles().map((file: any) => (
                  <div key={file.id} onClick={() => setSelectedFile(file)} className={`bg-white rounded-lg p-3 border shadow-sm flex items-center gap-3 cursor-pointer hover:border-blue-400 ${selectedFile?.id === file.id ? 'border-blue-500' : ''}`}>
                    <FileJson size={18} className="text-gray-400" />
                    <span className="font-medium text-gray-700">{file.fileName}</span>
                    <span className="ml-auto text-xs text-gray-400">v{file.version}</span>
                  </div>
                ))}
              </div>
              {selectedFile && (
                <div className="mt-6 bg-gray-100 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-gray-700">Vista previa:</span>
                    <button
                      onClick={() => { (document.activeElement as HTMLElement)?.blur(); onSelect(selectedFile); }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm"
                    >
                      Seleccionar
                    </button>
                  </div>
                  <pre className="text-xs bg-white p-3 rounded border border-gray-200 max-h-60 overflow-auto" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>{JSON.stringify(selectedFile.content, null, 2)}</pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepositoryExplorerModal;
