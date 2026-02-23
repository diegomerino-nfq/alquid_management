import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Archive, Upload, FileJson, Download, ChevronRight, Folder, Database, X, ArrowLeft, GitCompare, ArrowRightLeft, Check, AlertTriangle, Plus, Minus, Calendar, User, Clock, ShieldCheck, XCircle, FileText, Github, Save } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useGlobalState } from '../context/GlobalStateContext';
import { RepositoryFile, ReportDefinition, QueryDefinition, EXPECTED_DATABASES } from '../types';
import { formatSqlBonito } from '../utils/sqlFormatter';
import QueryValidatorModal, { InvalidQuery } from '../components/QueryValidatorModal';
import { Octokit } from 'octokit';

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

interface ValidationError {
    filename: string;
    database: string;
    report: string;
}

interface ValidationState {
    isOpen: boolean;
    status: 'SUCCESS' | 'ERROR' | 'IDLE';
    fileName: string;
    totalQueries: number;
    errors: ValidationError[];
    contentToUpload: ReportDefinition[] | null;
}

// Map regions to flag image URLs (using a stable CDN for flags)
const getFlagUrl = (region: string) => {
    switch (region) {
        case "Argentina": return "https://flagcdn.com/w160/ar.png";
        case "Colombia": return "https://flagcdn.com/w160/co.png";
        case "España": return "https://flagcdn.com/w160/es.png";
        case "Perú": return "https://flagcdn.com/w160/pe.png";
        case "Suiza": return "https://flagcdn.com/w160/ch.png";
        case "New York": return "https://flagcdn.com/w160/us.png"; // USA flag for New York
        default: return "";
    }
};

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

  // State for Validation Modal
  const [validation, setValidation] = useState<ValidationState>({
      isOpen: false,
      status: 'IDLE',
      fileName: '',
      totalQueries: 0,
      errors: [],
      contentToUpload: null
  });

  // Dynamic Reference Validator State
  const [invalidQueries, setInvalidQueries] = useState<InvalidQuery[]>([]);
  const [isValidatorOpen, setIsValidatorOpen] = useState(false);

  // GitHub Integration State
  const [githubToken, setGithubToken] = useState<string | null>(null);
  const [githubUser, setGithubUser] = useState<any>(null);
  const [githubRepos, setGithubRepos] = useState<any[]>([]);
  const [selectedRepo, setSelectedRepo] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('main');
  const [filePath, setFilePath] = useState<string>('');
  const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
  const [isPushing, setIsPushing] = useState(false);

  // Ref for the file input - Mounted at top level
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Listen for GitHub Auth Success
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
        if (event.data?.type === 'GITHUB_AUTH_SUCCESS' && event.data.token) {
            setGithubToken(event.data.token);
            addLog('GITHUB', 'AUTH_SUCCESS', 'Autenticación con GitHub exitosa', 'SUCCESS');
        }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [addLog]);

  // Fetch User and Repos when token is set
  useEffect(() => {
      if (githubToken) {
          const octokit = new Octokit({ auth: githubToken });
          octokit.rest.users.getAuthenticated().then(({ data }) => {
              setGithubUser(data);
          }).catch(err => console.error(err));

          octokit.rest.repos.listForAuthenticatedUser({ sort: 'updated', per_page: 100 }).then(({ data }) => {
              setGithubRepos(data);
          }).catch(err => console.error(err));
      }
  }, [githubToken]);

  const connectGitHub = async () => {
      try {
          const redirectUri = `${window.location.origin}/auth/callback`;
          const response = await fetch(`/api/auth/github/url?redirect_uri=${encodeURIComponent(redirectUri)}`);
          const { url } = await response.json();
          
          const width = 600;
          const height = 700;
          const left = window.screen.width / 2 - width / 2;
          const top = window.screen.height / 2 - height / 2;
          
          window.open(url, 'github_oauth', `width=${width},height=${height},top=${top},left=${left}`);
      } catch (error) {
          console.error('Failed to get auth URL', error);
          addLog('GITHUB', 'AUTH_ERROR', 'Error al iniciar autenticación', 'ERROR');
      }
  };

  const openGithubModal = (file: RepositoryFile) => {
      if (!githubToken) {
          connectGitHub();
          return;
      }
      setSelectedFile(file);
      // Default path: region/env/filename.json
      setFilePath(`${selectedRegion}/${selectedEnv}/${file.fileName}`);
      setIsGithubModalOpen(true);
  };

  const saveToGitHub = async () => {
      if (!githubToken || !selectedRepo || !selectedFile) return;
      
      setIsPushing(true);
      try {
          const octokit = new Octokit({ auth: githubToken });
          const [owner, repo] = selectedRepo.split('/');
          const content = JSON.stringify(selectedFile.content, null, 4);
          const message = `Update ${selectedFile.fileName} (v${selectedFile.version})`;
          
          // Check if file exists to get SHA
          let sha;
          try {
              const { data } = await octokit.rest.repos.getContent({
                  owner,
                  repo,
                  path: filePath,
                  ref: selectedBranch
              });
              if (!Array.isArray(data) && data.sha) {
                  sha = data.sha;
              }
          } catch (e) {
              // File doesn't exist, that's fine
          }

          await octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              path: filePath,
              message,
              content: btoa(unescape(encodeURIComponent(content))), // Base64 encode handling utf8
              branch: selectedBranch,
              sha
          });

          addLog('GITHUB', 'PUSH_SUCCESS', `Archivo guardado en ${selectedRepo}/${filePath}`, 'SUCCESS');
          setIsGithubModalOpen(false);
      } catch (error: any) {
          console.error(error);
          addLog('GITHUB', 'PUSH_ERROR', `Error al guardar en GitHub: ${error.message}`, 'ERROR');
          alert(`Error al guardar en GitHub: ${error.message}`);
      } finally {
          setIsPushing(false);
      }
  };

  const validateAndSetState = (jsonContent: ReportDefinition[], fileName: string) => {
        // 1. Validación de Estructura Básica
        if (!Array.isArray(jsonContent)) {
             alert("El archivo no parece ser un array de reportes válido.");
             addLog('REPOSITORIO', 'ERROR_SUBIDA', `Formato JSON incorrecto: ${fileName}`, 'ERROR');
             return;
        }

        // 2. Validación Estricta de Bases de Datos por Geografía/Entorno
        const allowedDbs = EXPECTED_DATABASES[selectedRegion!]?.[selectedEnv!] || [];
        const foundErrors: ValidationError[] = [];
        let queryCount = 0;

        jsonContent.forEach(report => {
            report.queries.forEach(query => {
                queryCount++;
                if (!allowedDbs.includes(query.database)) {
                    foundErrors.push({
                        filename: query.filename,
                        database: query.database,
                        report: report.report
                    });
                }
            });
        });

        // 3. Set Validation State instead of immediate upload
        if (foundErrors.length > 0) {
            setValidation({
                isOpen: true,
                status: 'ERROR',
                fileName: fileName,
                totalQueries: queryCount,
                errors: foundErrors,
                contentToUpload: null // Block upload
            });
            addLog('REPOSITORIO', 'INTENTO_FALLIDO', `Validación fallida para ${fileName} (${foundErrors.length} errores)`, 'WARNING');
        } else {
            setValidation({
                isOpen: true,
                status: 'SUCCESS',
                fileName: fileName,
                totalQueries: queryCount,
                errors: [],
                contentToUpload: jsonContent // Ready to upload
            });
        }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Access state directly from closure or verify state is set
    if (!selectedRegion || !selectedEnv) {
        alert("Error de estado: Región o entorno no seleccionados.");
        if (e.target) e.target.value = ''; // Reset
        return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const jsonContent: ReportDefinition[] = JSON.parse(content);

        // 0. Dynamic Reference Check (%s.%s)
        const invalidDynamicQueries: InvalidQuery[] = [];
        jsonContent.forEach((repo, rIdx) => {
            if (repo.queries && Array.isArray(repo.queries)) {
                repo.queries.forEach((q, qIdx) => {
                    if (q.sql && !q.sql.includes('%s.%s')) {
                        invalidDynamicQueries.push({
                            reportIndex: rIdx,
                            queryIndex: qIdx,
                            reportName: repo.report,
                            query: q
                        });
                    }
                });
            }
        });

        if (invalidDynamicQueries.length > 0) {
            setInvalidQueries(invalidDynamicQueries);
            setValidation({
                ...validation,
                fileName: file.name,
                contentToUpload: jsonContent // Store pending content here
            });
            setIsValidatorOpen(true);
            addLog('REPOSITORIO', 'VALIDACION_DINAMICA', `Se detectaron ${invalidDynamicQueries.length} queries con referencias absolutas.`, 'WARNING');
            return;
        }

        validateAndSetState(jsonContent, file.name);

      } catch (err) {
        alert("El archivo debe ser un JSON válido.");
        addLog('REPOSITORIO', 'ERROR_SUBIDA', `Error parseando JSON: ${file.name}`, 'ERROR');
      }
    };
    reader.readAsText(file);
    
    // IMPORTANT: Reset value to allow re-uploading same file if it failed previously
    e.target.value = ''; 
  };

  const handleValidatorSave = (correctedQueries: InvalidQuery[]) => {
      if (!validation.contentToUpload) return;

      const newJson = JSON.parse(JSON.stringify(validation.contentToUpload));

      correctedQueries.forEach(item => {
         if (newJson[item.reportIndex] && newJson[item.reportIndex].queries[item.queryIndex]) {
            newJson[item.reportIndex].queries[item.queryIndex] = item.query;
         }
      });

      setIsValidatorOpen(false);
      setInvalidQueries([]);
      
      // Now proceed to standard validation
      validateAndSetState(newJson, validation.fileName);
  };

  const confirmUpload = () => {
      if (validation.contentToUpload && selectedRegion && selectedEnv) {
          addRepositoryFile(selectedRegion, selectedEnv, validation.contentToUpload, validation.fileName);
          addLog('REPOSITORIO', 'SUBIDA_EXITOSA', `Archivo cargado en ${selectedRegion} ${selectedEnv}: ${validation.fileName}`, 'SUCCESS');
          setValidation({ ...validation, isOpen: false });
      }
  };

  const triggerUpload = () => {
      if (fileInputRef.current) {
          fileInputRef.current.click();
      } else {
          console.error("File input ref is null");
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
    <div className="h-full flex flex-col animate-fade-in relative bg-gray-50/50">
      <PageHeader 
        title="Repositorio Centralizado" 
        subtitle="Gestión jerárquica de configuraciones y versionado"
        icon={<Archive size={20}/>}
        action={
            <button 
                onClick={connectGitHub}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm ${githubToken ? 'bg-green-100 text-green-700' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
            >
                <Github size={18} />
                {githubToken ? (githubUser?.login || 'Conectado') : 'Conectar GitHub'}
            </button>
        }
      />
      
      {/* Hidden File Input - MOVED TO TOP LEVEL to avoid ref loss on conditional rendering */}
      <input 
          type="file" 
          accept=".json"
          ref={fileInputRef}
          className="hidden"
          onChange={handleFileUpload}
      />

      {/* Main Content Area - Removed max-w and mx-auto to align left, added mt-2 */}
      <div className="flex-1 rounded-xl overflow-hidden flex flex-col relative w-full">
          
          {/* Breadcrumb Navigation - Added mt-6 for spacing */}
          <div className="px-6 py-4 flex items-center justify-between mb-4 mt-6">
             <div className="flex items-center gap-3">
                <button 
                  onClick={() => {
                      if (selectedEnv) setSelectedEnv(null);
                      else if (selectedRegion) setSelectedRegion(null);
                      setSelectedForCompare([]);
                  }}
                  disabled={!selectedRegion}
                  className={`
                    p-2 rounded-full transition-colors 
                    ${!selectedRegion ? 'text-gray-300 cursor-default' : 'text-alquid-navy hover:bg-white hover:shadow-sm'}
                  `}
                >
                   <ArrowLeft size={20} />
                </button>
                
                <nav className="flex items-center text-lg">
                    <span 
                        onClick={() => { setSelectedRegion(null); setSelectedEnv(null); }}
                        className={`cursor-pointer transition-colors font-medium ${!selectedRegion ? 'text-alquid-navy font-bold' : 'text-gray-400 hover:text-alquid-blue'}`}
                    >
                        Inicio
                    </span>
                    
                    {selectedRegion && (
                        <>
                            <ChevronRight size={18} className="text-gray-300 mx-2" />
                            <span 
                                onClick={() => setSelectedEnv(null)}
                                className={`flex items-center gap-2 cursor-pointer transition-colors font-medium ${!selectedEnv ? 'text-alquid-navy font-bold' : 'text-gray-400 hover:text-alquid-blue'}`}
                            >
                                <img src={getFlagUrl(selectedRegion)} alt="" className="w-5 h-5 rounded-full object-cover shadow-sm" />
                                {selectedRegion}
                            </span>
                        </>
                    )}
                    
                    {selectedEnv && (
                        <>
                            <ChevronRight size={18} className="text-gray-300 mx-2" />
                            <span className="text-alquid-navy font-bold bg-white px-3 py-1 rounded-lg shadow-sm border border-gray-100">
                                {selectedEnv}
                            </span>
                        </>
                    )}
                </nav>
             </div>

             {/* Compare Action Button - Visible only in file list */}
             {selectedRegion && selectedEnv && (
                 <button
                    onClick={() => setIsCompareModalOpen(true)}
                    disabled={selectedForCompare.length !== 2}
                    className={`
                        flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-sm
                        ${selectedForCompare.length === 2 
                            ? 'bg-alquid-navy text-white hover:bg-opacity-90 hover:-translate-y-0.5' 
                            : 'bg-white text-gray-400 border border-gray-200 cursor-not-allowed'}
                    `}
                 >
                    <GitCompare size={18} /> 
                    Comparar ({selectedForCompare.length})
                 </button>
             )}
          </div>

          <div className="flex-1 px-6 pb-6 overflow-y-auto custom-scrollbar">
              
              {/* VIEW 1: REGIONS - REDESIGNED */}
              {!selectedRegion && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                      {regions.map(region => {
                          const totalFiles = envs.reduce((acc, env) => acc + (repositoryData[region]?.[env]?.length || 0), 0);
                          return (
                              <div 
                                key={region}
                                onClick={() => setSelectedRegion(region)}
                                className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/60 hover:shadow-xl hover:border-alquid-blue/30 cursor-pointer transition-all group relative overflow-hidden flex flex-col justify-between h-48"
                              >
                                  {/* Header */}
                                  <div className="flex items-start justify-between">
                                      <h3 className="text-xl font-bold text-gray-800 group-hover:text-alquid-navy transition-colors">{region}</h3>
                                      <img 
                                        src={getFlagUrl(region)} 
                                        alt={region} 
                                        className="w-12 h-12 rounded-full object-cover shadow-md border-2 border-white group-hover:scale-110 transition-transform duration-300"
                                      />
                                  </div>
                                  
                                  {/* Content */}
                                  <div>
                                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                          <Folder size={16} className="text-gray-400" />
                                          <span>{totalFiles} Archivos en total</span>
                                      </div>
                                      
                                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                        <span className="text-xs font-bold text-alquid-blue uppercase tracking-wider group-hover:underline">Ver Entornos</span>
                                        <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-alquid-blue group-hover:text-white transition-all">
                                            <ChevronRight size={16} />
                                        </div>
                                      </div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              )}

              {/* VIEW 2: ENVIRONMENTS - CONTROL PANEL REDESIGN */}
              {selectedRegion && !selectedEnv && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4 animate-fade-in">
                      {envs.map(env => {
                          const files = repositoryData[selectedRegion]?.[env] || [];
                          const filesCount = files.length;
                          const latestFile = files[0]; // Assuming sorted by newest first
                          const isPro = env === 'PRO';
                          
                          return (
                              <div 
                                key={env}
                                onClick={() => setSelectedEnv(env)}
                                className={`
                                    relative p-0 rounded-3xl border cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden group
                                    ${isPro 
                                        ? 'border-blue-100 bg-white hover:border-blue-300' 
                                        : 'border-orange-100 bg-white hover:border-orange-300'
                                    }
                                `}
                              >
                                  {/* Decorative Background Blur */}
                                  <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${isPro ? 'bg-blue-500' : 'bg-orange-500'}`}></div>

                                  <div className="p-8 relative z-10">
                                      <div className="flex items-center justify-between mb-8">
                                          <div>
                                              <h3 className={`text-4xl font-black tracking-tight ${isPro ? 'text-gray-800' : 'text-gray-800'}`}>
                                                  {env}
                                              </h3>
                                              <p className={`text-sm font-medium mt-1 ${isPro ? 'text-blue-500' : 'text-orange-500'}`}>
                                                  {isPro ? "Entorno de Producción" : "Entorno de Pre-producción"}
                                              </p>
                                          </div>
                                          {/* Glassmorphism Icon */}
                                          <div className={`
                                              w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md bg-white/50 border border-white/50
                                              ${isPro ? 'text-blue-600' : 'text-orange-600'}
                                          `}>
                                              <Database size={32} />
                                          </div>
                                      </div>

                                      {/* Metadata Stats */}
                                      <div className="space-y-3 mb-8">
                                          <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-gray-50 border border-gray-100">
                                              <div className="flex items-center gap-2 text-gray-500">
                                                  <FileJson size={16} /> Total Archivos
                                              </div>
                                              <span className="font-bold text-gray-800">{filesCount}</span>
                                          </div>
                                          
                                          <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-gray-50 border border-gray-100">
                                               <div className="flex items-center gap-2 text-gray-500">
                                                  <Check size={16} /> Versión Activa
                                              </div>
                                              <span className={`font-bold px-2 py-0.5 rounded text-xs ${filesCount > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
                                                  {filesCount > 0 ? `v${latestFile.version}` : 'N/A'}
                                              </span>
                                          </div>

                                          <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-gray-50 border border-gray-100">
                                               <div className="flex items-center gap-2 text-gray-500">
                                                  <Clock size={16} /> Última Actualización
                                              </div>
                                              <span className="font-medium text-gray-800 text-xs">
                                                  {filesCount > 0 ? latestFile.uploadedAt.split(',')[0] : '-'}
                                              </span>
                                          </div>
                                      </div>

                                      <div className={`
                                          flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors
                                          ${isPro 
                                            ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' 
                                            : 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white'}
                                      `}>
                                          Gestionar Archivos <ChevronRight size={16} />
                                      </div>
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              )}

              {/* VIEW 3: FILE LIST */}
              {selectedRegion && selectedEnv && (
                  <div className="animate-fade-in h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                      <div className="flex justify-between items-center p-6 border-b border-gray-100">
                          <div>
                              <h3 className="text-lg font-bold text-gray-800">Historial de Versiones</h3>
                              <p className="text-sm text-gray-500 mt-1">Gestión de archivos para {selectedRegion} ({selectedEnv})</p>
                          </div>
                          <div>
                              <button 
                                  onClick={triggerUpload}
                                  className="bg-alquid-navy hover:bg-blue-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-900/10 transition-all hover:-translate-y-0.5"
                              >
                                  <Upload size={18} /> Subir Nueva Versión
                              </button>
                          </div>
                      </div>

                      <div className="flex-1 overflow-hidden">
                          {(!repositoryData[selectedRegion]?.[selectedEnv] || repositoryData[selectedRegion][selectedEnv].length === 0) ? (
                              <div className="h-96 flex flex-col items-center justify-center text-center p-8">
                                  <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                      <Archive size={40} className="text-gray-300" />
                                  </div>
                                  <h3 className="text-xl font-bold text-gray-800 mb-2">Repositorio Vacío</h3>
                                  <p className="text-gray-500 max-w-sm mb-8">
                                      Aún no se han cargado configuraciones para este entorno. Comienza subiendo tu primer archivo JSON.
                                  </p>
                                  <button 
                                    onClick={triggerUpload} 
                                    className="px-8 py-3 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-alquid-blue hover:text-alquid-blue hover:bg-blue-50 transition-all"
                                  >
                                    + Subir primer archivo
                                  </button>
                              </div>
                          ) : (
                              <div className="overflow-x-auto h-full">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider border-b border-gray-200 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold w-12 text-center bg-gray-50">
                                                <input type="checkbox" disabled className="rounded border-gray-300" />
                                            </th>
                                            <th className="px-6 py-4 font-semibold w-24 text-center bg-gray-50">Versión</th>
                                            <th className="px-6 py-4 font-semibold bg-gray-50">Nombre Archivo</th>
                                            <th className="px-6 py-4 font-semibold bg-gray-50">Fecha Carga</th>
                                            <th className="px-6 py-4 font-semibold bg-gray-50">Usuario</th>
                                            <th className="px-6 py-4 font-semibold w-32 text-center bg-gray-50">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {repositoryData[selectedRegion][selectedEnv].map((file, idx) => {
                                            const isSelected = selectedForCompare.includes(file.id);
                                            return (
                                                <tr 
                                                    key={file.id} 
                                                    onClick={() => setSelectedFile(file)}
                                                    className={`
                                                        group hover:bg-blue-50 cursor-pointer transition-colors
                                                        ${idx === 0 ? 'bg-blue-50/10' : ''}
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
                                                            px-2.5 py-1 rounded-md text-xs font-mono font-bold
                                                            ${idx === 0 ? 'bg-green-100 text-green-700 ring-1 ring-green-200' : 'bg-gray-100 text-gray-600'}
                                                        `}>
                                                            v{file.version}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-gray-50 rounded-lg text-gray-400 group-hover:text-alquid-blue group-hover:bg-white transition-colors">
                                                                <FileJson size={18} />
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-gray-700 group-hover:text-alquid-navy block">{file.fileName}</span>
                                                                {idx === 0 && <span className="text-[10px] font-bold text-green-600">ACTUAL</span>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        <div className="flex items-center gap-2">
                                                            <Calendar size={14} className="text-gray-400"/>
                                                            {file.uploadedAt}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-sm text-gray-500">
                                                        <div className="flex items-center gap-2">
                                                            <User size={14} className="text-gray-400"/>
                                                            {file.uploadedBy}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center flex justify-center gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); openGithubModal(file); }}
                                                            className="text-gray-400 hover:text-gray-900 p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all shadow-sm hover:shadow"
                                                            title="Guardar en GitHub"
                                                        >
                                                            <Github size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => downloadFile(file, e)}
                                                            className="text-gray-400 hover:text-alquid-blue p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all shadow-sm hover:shadow"
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

      {/* VALIDATION MODAL (New Feature) */}
      {validation.isOpen && (
         <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-fade-in border border-gray-200 overflow-hidden">
                 {/* Header */}
                 <div className={`p-6 border-b flex items-center justify-between ${validation.status === 'SUCCESS' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                    <div className="flex items-center gap-4">
                         <div className={`p-3 rounded-full ${validation.status === 'SUCCESS' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                             {validation.status === 'SUCCESS' ? <ShieldCheck size={28}/> : <XCircle size={28}/>}
                         </div>
                         <div>
                             <h3 className={`text-lg font-bold ${validation.status === 'SUCCESS' ? 'text-green-800' : 'text-red-800'}`}>
                                 {validation.status === 'SUCCESS' ? 'Validación Exitosa' : 'Validación Fallida'}
                             </h3>
                             <p className={`text-sm ${validation.status === 'SUCCESS' ? 'text-green-600' : 'text-red-600'}`}>
                                 {validation.status === 'SUCCESS' ? 'El archivo es seguro para subir.' : 'Se han encontrado errores críticos.'}
                             </p>
                         </div>
                    </div>
                 </div>

                 {/* Body */}
                 <div className="p-6 max-h-[60vh] overflow-y-auto">
                     {validation.status === 'SUCCESS' ? (
                         <div className="text-center py-4">
                             <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-100">
                                 <p className="text-green-700 font-medium">
                                     Se han validado <span className="font-bold">{validation.totalQueries} queries</span> correctamente para el entorno <span className="underline decoration-green-300">{selectedRegion} - {selectedEnv}</span>.
                                 </p>
                             </div>
                             <p className="text-sm text-gray-500">
                                 Al confirmar, se generará la versión v{(repositoryData[selectedRegion!]?.[selectedEnv!]?.length || 0) + 1} de este archivo.
                             </p>
                         </div>
                     ) : (
                         <div>
                             <p className="text-gray-600 text-sm mb-4">
                                 Las siguientes queries intentan acceder a bases de datos no permitidas para <strong>{selectedRegion} - {selectedEnv}</strong>:
                             </p>
                             <div className="space-y-3">
                                 {validation.errors.map((err, idx) => (
                                     <div key={idx} className="bg-red-50 border border-red-100 rounded-lg p-3 flex gap-3 items-start">
                                         <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0"/>
                                         <div className="overflow-hidden">
                                             <div className="text-xs font-bold text-red-800 truncate mb-1" title={err.filename}>
                                                 {err.filename}
                                             </div>
                                             <div className="flex items-center gap-2 text-xs text-red-600">
                                                 <Database size={12}/> {err.database}
                                             </div>
                                             <div className="flex items-center gap-2 text-[10px] text-red-400 mt-1">
                                                 <FileText size={10}/> Reporte: {err.report}
                                             </div>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                     )}
                 </div>

                 {/* Footer */}
                 <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                     <button 
                         onClick={() => setValidation({...validation, isOpen: false})} 
                         className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-bold text-sm transition-colors"
                     >
                         {validation.status === 'SUCCESS' ? 'Cancelar' : 'Cerrar'}
                     </button>
                     {validation.status === 'SUCCESS' && (
                         <button 
                             onClick={confirmUpload} 
                             className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-transform hover:-translate-y-0.5"
                         >
                             <Upload size={16}/> Confirmar Subida
                         </button>
                     )}
                 </div>
             </div>
         </div>
      )}

      {/* DYNAMIC REFERENCE VALIDATOR MODAL */}
      <QueryValidatorModal 
        isOpen={isValidatorOpen}
        invalidQueries={invalidQueries}
        onClose={() => {
            setIsValidatorOpen(false);
            setInvalidQueries([]);
            // Optionally reset validation state if needed, but keeping it might be useful if they want to retry
        }}
        onSave={handleValidatorSave}
      />

      {/* GITHUB MODAL */}
      {isGithubModalOpen && (
          <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-fade-in border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b flex items-center justify-between bg-gray-50">
                      <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-900 text-white rounded-lg">
                              <Github size={24} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-gray-800">Guardar en GitHub</h3>
                              <p className="text-sm text-gray-500">Selecciona el repositorio y la ruta</p>
                          </div>
                      </div>
                      <button onClick={() => setIsGithubModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                          <X size={24} />
                      </button>
                  </div>
                  
                  <div className="p-6 space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Repositorio</label>
                          <select 
                              value={selectedRepo} 
                              onChange={(e) => setSelectedRepo(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                          >
                              <option value="">Seleccionar Repositorio...</option>
                              {githubRepos.map((repo: any) => (
                                  <option key={repo.id} value={repo.full_name}>{repo.full_name}</option>
                              ))}
                          </select>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Rama (Branch)</label>
                          <input 
                              type="text" 
                              value={selectedBranch}
                              onChange={(e) => setSelectedBranch(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                              placeholder="main"
                          />
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-1">Ruta del Archivo</label>
                          <input 
                              type="text" 
                              value={filePath}
                              onChange={(e) => setFilePath(e.target.value)}
                              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent font-mono text-sm"
                          />
                          <p className="text-xs text-gray-500 mt-1">La ruta incluye carpetas (ej: config/prod/archivo.json)</p>
                      </div>
                  </div>

                  <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                      <button 
                          onClick={() => setIsGithubModalOpen(false)} 
                          className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-bold text-sm transition-colors"
                      >
                          Cancelar
                      </button>
                      <button 
                          onClick={saveToGitHub}
                          disabled={isPushing || !selectedRepo || !filePath}
                          className={`
                              px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-transform hover:-translate-y-0.5
                              ${(isPushing || !selectedRepo || !filePath) ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                      >
                          {isPushing ? (
                              <>Wait...</>
                          ) : (
                              <>
                                  <Save size={16}/> Guardar Cambios
                              </>
                          )}
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Comparison Modal */}
      {isCompareModalOpen && generateDiff && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col animate-fade-in border border-gray-200">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white rounded-t-2xl">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-alquid-blue text-white rounded-xl shadow-lg shadow-blue-200">
                              <GitCompare size={24} />
                          </div>
                          <div>
                              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                                  Comparación de Versiones
                              </h3>
                              <p className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600 border border-gray-200">v{generateDiff.oldVersion}</span>
                                  <ArrowRightLeft size={14} className="text-gray-400" />
                                  <span className="font-mono bg-green-50 px-2 py-0.5 rounded text-green-700 font-bold border border-green-100">v{generateDiff.newVersion}</span>
                              </p>
                          </div>
                      </div>
                      <div className="flex items-center gap-6">
                            <div className="flex gap-4 text-xs font-bold uppercase tracking-wider bg-gray-50 px-4 py-2 rounded-lg border border-gray-100">
                                <span className="text-green-600 flex items-center gap-1.5"><Plus size={14} strokeWidth={3}/> {generateDiff.diffs.filter(d => d.status === 'ADDED').length} Añadidos</span>
                                <div className="w-px h-4 bg-gray-300"></div>
                                <span className="text-red-500 flex items-center gap-1.5"><Minus size={14} strokeWidth={3}/> {generateDiff.diffs.filter(d => d.status === 'REMOVED').length} Eliminados</span>
                                <div className="w-px h-4 bg-gray-300"></div>
                                <span className="text-yellow-600 flex items-center gap-1.5"><AlertTriangle size={14} strokeWidth={3}/> {generateDiff.diffs.filter(d => d.status === 'MODIFIED').length} Modificados</span>
                            </div>
                            <button onClick={() => setIsCompareModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                                <X size={24} />
                            </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-0 bg-gray-50/50">
                      {generateDiff.diffs.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-400">
                              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4">
                                  <Check size={40} className="text-green-500" />
                              </div>
                              <p className="font-bold text-gray-700 text-lg">No hay diferencias</p>
                              <p className="text-sm">Ambas versiones son idénticas.</p>
                          </div>
                      ) : (
                          <div className="divide-y divide-gray-200 border-t border-gray-200">
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
                                                      w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm
                                                      ${diff.status === 'ADDED' ? 'bg-green-500' : ''}
                                                      ${diff.status === 'REMOVED' ? 'bg-red-500' : ''}
                                                      ${diff.status === 'MODIFIED' ? 'bg-yellow-500' : ''}
                                                      ${diff.status === 'UNCHANGED' ? 'bg-gray-300' : ''}
                                                  `}>
                                                      {diff.status === 'ADDED' && <Plus size={20} />}
                                                      {diff.status === 'REMOVED' && <Minus size={20} />}
                                                      {diff.status === 'MODIFIED' && <AlertTriangle size={20} />}
                                                      {diff.status === 'UNCHANGED' && <Check size={20} />}
                                                  </div>
                                                  <div>
                                                      <h4 className="font-bold text-gray-800 text-sm">{diff.filename}</h4>
                                                      <p className="text-xs text-gray-500 font-mono mt-0.5">Reporte: {diff.report}</p>
                                                  </div>
                                              </div>
                                              <div className="flex items-center gap-4">
                                                  {diff.status === 'MODIFIED' && (
                                                      <div className="flex gap-2">
                                                          {diff.changes.map(c => (
                                                              <span key={c} className="px-2 py-1 bg-yellow-50 text-yellow-700 border border-yellow-200 text-[10px] uppercase font-bold rounded">
                                                                  {c}
                                                              </span>
                                                          ))}
                                                      </div>
                                                  )}
                                                  <ChevronRight size={16} className="text-gray-400 transform group-open:rotate-90 transition-transform" />
                                              </div>
                                          </summary>
                                          
                                          {/* Diff Content */}
                                          <div className="p-4 border-t border-gray-100 bg-gray-50/50 pl-18">
                                              {diff.status === 'MODIFIED' && diff.changes.includes('sql') && diff.oldQuery && diff.newQuery && (
                                                  <div className="mt-2 ml-14">
                                                      <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Diferencia en SQL:</p>
                                                      <SqlDiffView oldSql={diff.oldQuery.sql} newSql={diff.newQuery.sql} />
                                                  </div>
                                              )}
                                              {diff.status === 'MODIFIED' && !diff.changes.includes('sql') && (
                                                  <div className="flex gap-8 text-sm ml-14">
                                                      <div className="flex-1">
                                                          <span className="text-red-500 font-bold text-xs uppercase">Valor Anterior</span>
                                                          <pre className="text-xs bg-white border border-red-100 p-3 rounded-lg mt-1 text-gray-600 shadow-sm">{JSON.stringify({ db: diff.oldQuery?.database, table: diff.oldQuery?.table }, null, 2)}</pre>
                                                      </div>
                                                      <div className="flex-1">
                                                          <span className="text-green-600 font-bold text-xs uppercase">Valor Nuevo</span>
                                                          <pre className="text-xs bg-white border border-green-100 p-3 rounded-lg mt-1 text-gray-600 shadow-sm">{JSON.stringify({ db: diff.newQuery?.database, table: diff.newQuery?.table }, null, 2)}</pre>
                                                      </div>
                                                  </div>
                                              )}
                                              {diff.status === 'ADDED' && diff.newQuery && (
                                                  <div className="bg-green-50 p-4 rounded-xl border border-green-100 ml-14">
                                                      <pre className="text-xs text-green-800 whitespace-pre-wrap font-mono leading-relaxed">{formatSqlBonito(diff.newQuery.sql)}</pre>
                                                  </div>
                                              )}
                                              {diff.status === 'REMOVED' && diff.oldQuery && (
                                                  <div className="bg-red-50 p-4 rounded-xl border border-red-100 ml-14">
                                                      <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono leading-relaxed">{formatSqlBonito(diff.oldQuery.sql)}</pre>
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

      {/* File Details Modal */}
      {selectedFile && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in overflow-hidden">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white rounded-t-2xl flex-shrink-0">
                      <div className="flex items-center gap-4">
                          <div className="p-3 bg-alquid-navy text-white rounded-xl">
                              <FileJson size={24} />
                          </div>
                          <div>
                              <h3 className="text-xl font-bold text-gray-900">{selectedFile.fileName}</h3>
                              <p className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                                  <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600 border border-gray-200 font-bold">v{selectedFile.version}</span>
                                  <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
                                  <span>{selectedFile.uploadedAt}</span>
                              </p>
                          </div>
                      </div>
                      <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors">
                          <X size={24} />
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30 custom-scrollbar max-h-96">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2 sticky top-0 bg-gray-50/95 backdrop-blur py-2 z-10">
                           Contenido del Archivo
                      </h4>
                      
                      {Array.isArray(selectedFile.content) ? (
                          <div className="space-y-3">
                              {selectedFile.content.map((report: ReportDefinition, idx: number) => (
                                  <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-alquid-blue/50 hover:shadow-md transition-all">
                                      <div className="flex justify-between items-start mb-3">
                                          <div className="flex items-center gap-3">
                                              <div className="bg-orange-50 p-1.5 rounded-lg text-orange-500">
                                                  <Folder size={16} />
                                              </div>
                                              <span className="font-bold text-gray-800 text-sm">{report.report}</span>
                                          </div>
                                          <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded-full font-mono font-bold border border-gray-200">
                                              {report.queries?.length || 0} queries
                                          </span>
                                      </div>
                                      <div className="pl-10 text-xs text-gray-500 space-y-2 border-l-2 border-gray-50 ml-3">
                                          {(report.queries || []).map((q, qIdx) => (
                                              <div key={qIdx} className="flex items-center gap-2 truncate hover:bg-gray-50 p-1 rounded -ml-1">
                                                  <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
                                                  <span className="truncate font-mono text-gray-600">{q.filename}</span>
                                              </div>
                                          ))}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 shadow-inner">
                              <pre className="text-xs font-mono text-green-400 whitespace-pre-wrap overflow-hidden">
                                  {JSON.stringify(selectedFile.content, null, 2)}
                              </pre>
                          </div>
                      )}
                  </div>

                  <div className="p-6 border-t border-gray-200 bg-white rounded-b-2xl flex justify-end flex-shrink-0">
                      <button 
                          onClick={() => downloadFile(selectedFile)}
                          className="bg-alquid-navy hover:bg-opacity-90 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 shadow-lg shadow-blue-900/10 transition-transform active:scale-95"
                      >
                          <Download size={18} /> Descargar JSON Completo
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Repository;