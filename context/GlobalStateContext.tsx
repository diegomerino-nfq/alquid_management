import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ReportDefinition, RepositoryData, RepositoryFile } from '../types';

// Define state structure for each page
interface PageState<T> {
  data: T;
  fileName: string | null;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  module: 'SISTEMA' | 'DESCARGA' | 'EXTRACCIÓN' | 'EDITOR' | 'REPOSITORIO';
  action: string;
  details: string;
  type: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
}

interface GlobalState {
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
  addRepositoryFile: (region: string, env: string, content: any, fileName: string) => void;
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // --- LOGGING STATE ---
  const [userLogs, setUserLogs] = useState<LogEntry[]>([]);

  const addLog = (module: LogEntry['module'], action: string, details: string, type: LogEntry['type'] = 'INFO') => {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString().slice(2, 5),
      timestamp: new Date().toLocaleTimeString(),
      module,
      action,
      details,
      type
    };
    // Add to top of list
    setUserLogs(prev => [newLog, ...prev]);
  };

  const clearLogs = () => setUserLogs([]);

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
  // Initialize with empty arrays for standard regions to avoid undefined checks later
  const initialRegions = ["Argentina", "Colombia", "España", "New York", "Perú", "Suiza"];
  const initialRepoState: RepositoryData = {};
  initialRegions.forEach(reg => {
      initialRepoState[reg] = { "PRE": [], "PRO": [] };
  });

  const [repositoryData, setRepositoryData] = useState<RepositoryData>(initialRepoState);

  const addRepositoryFile = (region: string, env: string, content: any, fileName: string) => {
      setRepositoryData(prev => {
          const newState = { ...prev };
          if (!newState[region]) newState[region] = { "PRE": [], "PRO": [] };
          if (!newState[region][env]) newState[region][env] = [];

          const currentList = newState[region][env];
          const newVersion = currentList.length + 1;

          const newFile: RepositoryFile = {
              id: Date.now().toString(),
              version: newVersion,
              fileName: fileName,
              content: content,
              uploadedAt: new Date().toLocaleString(),
              uploadedBy: "Admin User"
          };

          // Add to beginning of array (newest first)
          newState[region][env] = [newFile, ...currentList];
          return newState;
      });
      addLog('REPOSITORIO', 'NUEVA_VERSION', `v${(repositoryData[region]?.[env]?.length || 0) + 1} subida a ${region} ${env}: ${fileName}`, 'SUCCESS');
  };

  return (
    <GlobalStateContext.Provider value={{
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

      repositoryData,
      addRepositoryFile
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