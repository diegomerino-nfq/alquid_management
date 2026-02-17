import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ReportDefinition } from '../types';

// Define state structure for each page
interface PageState<T> {
  data: T;
  fileName: string | null;
}

interface GlobalState {
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
}

const GlobalStateContext = createContext<GlobalState | undefined>(undefined);

export const GlobalStateProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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

  return (
    <GlobalStateContext.Provider value={{
      downloadReports, downloadConfig, downloadRegion, downloadEnv, downloadLoadId,
      setDownloadReports, setDownloadConfig, setDownloadRegion, setDownloadEnv, setDownloadLoadId,
      clearDownloadReports, clearDownloadConfig,

      extractReports, extractLoadId,
      setExtractReports, setExtractLoadId,
      clearExtractReports,

      editorReports,
      setEditorReports,
      clearEditorReports
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