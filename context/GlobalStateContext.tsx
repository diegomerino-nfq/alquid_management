import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { ReportDefinition, RepositoryData, RepositoryFile } from '../types';
import axios from 'axios';

// Define state structure for each page
interface PageState<T> {
  data: T;
  fileName: string | null;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  user?: string;
  module: 'SISTEMA' | 'DESCARGA' | 'EXTRACCIÓN' | 'EDITOR' | 'REPOSITORIO';
  action: string;
  details: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

export interface User {
  email: string;
  role: 'admin' | 'user';
}

interface GlobalState {
  // Auth State
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;

  // User Activity Logs
  userLogs: LogEntry[];
  addLog: (module: LogEntry['module'], action: string, details: string, type?: LogEntry['type']) => void;
  clearLogs: () => void;

  // Report Downloader State
  downloadReports: PageState<ReportDefinition[]>;
  downloadConfig: PageState<any>;
  downloadRegion: string;
  downloadEnv: string;
  downloadLoadId: string;
  setDownloadReports: (data: ReportDefinition[], fileName: string) => void;
  setDownloadConfig: (data: any, fileName: string) => void;
  setDownloadRegion: (r: string) => void;
  setDownloadEnv: (e: string) => void;
  setDownloadLoadId: (id: string) => void;
  clearDownloadReports: () => void;
  clearDownloadConfig: () => void;

  // SQL Extractor State
  extractReports: PageState<ReportDefinition[]>;
  extractLoadId: string;
  setExtractReports: (data: ReportDefinition[], fileName: string) => void;
  setExtractLoadId: (id: string) => void;
  clearExtractReports: () => void;

  // JSON Editor State
  editorReports: PageState<ReportDefinition[]>;
  setEditorReports: (data: ReportDefinition[], fileName: string) => void;
  clearEditorReports: () => void;

  // Repository State
  repositoryData: RepositoryData;
  repositorySummary: { region: string, env: string, count: number }[];
  fetchRepositoryFiles: (region: string, env: string) => Promise<void>;
  fetchRepositorySummary: () => Promise<void>;
  addRepositoryFile: (region: string, env: string, content: any, fileName: string, comment?: string) => Promise<void>;
  deleteRepositoryFile: (id: string, region: string, env: string) => Promise<void>;
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- AUTH STATE ---
  const [user, setUser] = useState<User | null>(null);

  // --- LOGGING STATE ---
  const [userLogs, setUserLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Fetch initial logs
    axios.get('/api/logs').then(res => {
      setUserLogs(res.data);
    }).catch(err => console.error('Error fetching logs:', err));
  }, []);

  const addLog = (module: LogEntry['module'], action: string, details: string, type: LogEntry['type'] = 'INFO') => {
    const userName = user?.email || 'Sistema';
    const newLogData = { user: userName, module, action, details, type };

    // Optimistic update
    const tempLog: LogEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toLocaleTimeString(),
      ...newLogData
    };
    setUserLogs(prev => [tempLog, ...prev]);

    // Persist to backend
    axios.post('/api/logs', newLogData).catch(err => console.error('Error saving log:', err));
  };

  const clearLogs = () => {
    setUserLogs([]);
    axios.delete('/api/logs').catch(err => console.error('Error clearing logs:', err));
  };

  // --- DOWNLOADER STATE ---
  const [downloadReports, setDownloadReportsState] = useState<PageState<ReportDefinition[]>>({ data: [], fileName: null });
  const [downloadConfig, setDownloadConfigState] = useState<PageState<any>>({ data: null, fileName: null });
  const [downloadRegion, setDownloadRegion] = useState("");
  const [downloadEnv, setDownloadEnv] = useState("");
  const [downloadLoadId, setDownloadLoadId] = useState("");

  const setDownloadReports = (data: ReportDefinition[], fileName: string) => setDownloadReportsState({ data, fileName });
  const setDownloadConfig = (data: any, fileName: string) => setDownloadConfigState({ data, fileName });
  const clearDownloadReports = () => setDownloadReportsState({ data: [], fileName: null });
  const clearDownloadConfig = () => setDownloadConfigState({ data: null, fileName: null });

  // --- EXTRACTOR STATE ---
  const [extractReports, setExtractReportsState] = useState<PageState<ReportDefinition[]>>({ data: [], fileName: null });
  const [extractLoadId, setExtractLoadId] = useState("");

  const setExtractReports = (data: ReportDefinition[], fileName: string) => setExtractReportsState({ data, fileName });
  const clearExtractReports = () => setExtractReportsState({ data: [], fileName: null });

  // --- EDITOR STATE ---
  const [editorReports, setEditorReportsState] = useState<PageState<ReportDefinition[]>>({ data: [], fileName: null });

  const setEditorReports = (data: ReportDefinition[], fileName: string) => setEditorReportsState({ data, fileName });
  const clearEditorReports = () => setEditorReportsState({ data: [], fileName: null });

  // --- REPOSITORY STATE ---
  const [repositoryData, setRepositoryDataState] = useState<RepositoryData>({});
  const [repositorySummary, setRepositorySummary] = useState<{ region: string, env: string, count: number }[]>([]);

  const fetchRepositorySummary = async () => {
    try {
      const res = await axios.get('/api/repository/summary');
      if (Array.isArray(res.data)) {
        setRepositorySummary(res.data);
      } else {
        console.warn('Repo summary response is not an array:', res.data);
        setRepositorySummary([]);
      }
    } catch (err) {
      console.error('Error fetching repo summary:', err);
      setRepositorySummary([]);
    }
  };

  useEffect(() => {
    fetchRepositorySummary();
  }, []);

  const fetchRepositoryFiles = async (client: string, geography: string | null, env: string) => {
    try {
      const geographyParam = geography || 'null';
      const res = await axios.get(`/api/repository/${client}/${geographyParam}/${env}`);
      setRepositoryDataState(prev => ({
        ...prev,
        [client]: {
          ...(prev[client] || {}),
          [geography || 'null']: {
            ...(prev[client]?.[geography || 'null'] || {}),
            [env]: res.data
          }
        }
      }));
    } catch (err) {
      console.error('Error fetching repo files:', err);
    }
  };

  const addRepositoryFile = async (client: string, geography: string | null, env: string, content: any, fileName: string, comment?: string) => {
    // Integrity Validation
    if (Array.isArray(content) && content.length > 0 && (content[0].report || content[0].queries)) {
      const { EXPECTED_DATABASES } = await import('../types');
      const geographyKey = geography || 'general';
      const allowedDbs = EXPECTED_DATABASES[client as any]?.[geographyKey]?.[env] || [];

      const errors: string[] = [];
      content.forEach((rep: any) => {
        if (rep.queries && Array.isArray(rep.queries)) {
          rep.queries.forEach((q: any) => {
            if (allowedDbs.length > 0 && !allowedDbs.includes(q.database)) {
              errors.push(`BD '${q.database}' no permitida para ${client} ${geography || 'sin geografía'} ${env}.`);
            }
          });
        }
      });

      if (errors.length > 0) {
        const errorMsg = `Error de Integridad de Repositorio: ${errors.slice(0, 3).join(' ')}${errors.length > 3 ? ' ...' : ''}`;
        addLog('REPOSITORIO', 'ERROR_INTEGRIDAD', errorMsg, 'ERROR');
        throw new Error(errorMsg);
      }
    }

    try {
      await axios.post('/api/repository', {
        client,
        geography,
        env,
        filename: fileName,
        content,
        uploadedBy: user?.email || "Admin User",
        comment: comment || ""
      });
      // Refresh both data and summary
      await fetchRepositoryFiles(client, geography, env);
      await fetchRepositorySummary();
      addLog('REPOSITORIO', 'SUBIDA_EXITOSA', `Archivo ${fileName} subido a ${client}/${geography || 'sin geografía'}/${env}`, 'SUCCESS');
    } catch (err) {
      console.error('Error uploading repo file:', err);
      throw err;
    }
  };

  const deleteRepositoryFile = async (id: string, client: string, geography: string | null, env: string) => {
    try {
      await axios.delete(`/api/repository/${id}`);
      // Refresh both data and summary
      await fetchRepositoryFiles(client, geography, env);
      await fetchRepositorySummary();
      addLog('REPOSITORIO', 'ELIMINAR_ARCHIVO', `Archivo eliminado ID: ${id}`, 'WARNING');
    } catch (err) {
      console.error('Error deleting repo file:', err);
      throw err;
    }
  };

  return (
    <GlobalStateContext.Provider value={{
      user, setUser,
      userLogs, addLog, clearLogs,

      downloadReports, downloadConfig, downloadRegion, downloadEnv, downloadLoadId,
      setDownloadReports, setDownloadConfig, setDownloadRegion, setDownloadEnv, setDownloadLoadId,
      clearDownloadReports, clearDownloadConfig,

      extractReports, extractLoadId,
      setExtractReports, setExtractLoadId,
      clearExtractReports,

      editorReports,
      setEditorReports,
      clearEditorReports,

      repositoryData, repositorySummary, fetchRepositoryFiles, fetchRepositorySummary,
      addRepositoryFile, deleteRepositoryFile,
      logout: () => {
        setUser(null);
        addLog('SISTEMA', 'LOGOUT', 'Sesión cerrada por el usuario', 'INFO');
      }
    }}>
      {children}
    </GlobalStateContext.Provider>
  );
};

export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }
  return context;
};