import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Play, Settings, Database, CheckSquare, Square, Filter, CheckCircle2, XCircle, Search, X, AlertTriangle, FileWarning, FolderOpen, Download, ShieldAlert } from 'lucide-react';
import axios from 'axios';
import FileInput from '../components/FileInput';
import PageHeader from '../components/PageHeader';
import { QueryDefinition, EXPECTED_DATABASES, ReportDefinition } from '../types';
import { prepareFinalSql } from '../utils/sqlFormatter';
import { useGlobalState } from '../context/GlobalStateContext';
import QueryValidatorModal, { InvalidQuery } from '../components/QueryValidatorModal';
import JsonValidationModal from '../components/JsonValidationModal';
import { validateReportJson, findAbsoluteReferences, ValidationResult } from '../utils/jsonValidator';

const ReportDownloader: React.FC = () => {
  // Use Global State (Downloader Specific)
  const {
    downloadReports, setDownloadReports, clearDownloadReports,
    downloadConfig, setDownloadConfig, clearDownloadConfig,
    downloadRegion, setDownloadRegion,
    downloadEnv, setDownloadEnv,
    downloadLoadId, setDownloadLoadId,
    addLog, addRepositoryFile // Adding logger and repo sync
  } = useGlobalState();

  const [selectedQueries, setSelectedQueries] = useState<Set<string>>(new Set());

  // Sorted options
  const regions = ["Argentina", "Colombia", "España", "New York", "Perú", "Suiza"].sort();
  const environments = ["PRE", "PRO"].sort();

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [directoryHandle, setDirectoryHandle] = useState<any>(null);

  // Validation Error Modal State
  const [validationError, setValidationError] = useState<{
    isOpen: boolean;
    fileName: string;
    errors: string[];
  }>({ isOpen: false, fileName: '', errors: [] });

  // Dynamic Reference Validator State
  const [invalidQueries, setInvalidQueries] = useState<InvalidQuery[]>([]);
  const [isValidatorOpen, setIsValidatorOpen] = useState(false);
  const [pendingReports, setPendingReports] = useState<{ data: any, fileName: string } | null>(null);

  // JSON Validation Modal State
  const [jsonValidationResults, setJsonValidationResults] = useState<ValidationResult[]>([]);
  const [isJsonValidationOpen, setIsJsonValidationOpen] = useState(false);
  const [pendingJsonFile, setPendingJsonFile] = useState<{ data: any, fileName: string } | null>(null);

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

  const handleQueriesLoaded = async (content: string, fileName: string) => {
    try {
      const json = JSON.parse(content);

      // Run exhaustive validation
      const validationResults = validateReportJson(json, downloadRegion || undefined, downloadEnv || undefined);
      const criticalErrors = validationResults.filter(r => r.severity === 'CRITICAL');

      // If CRITICAL errors, block entirely
      if (criticalErrors.length > 0) {
        setJsonValidationResults(validationResults);
        setIsJsonValidationOpen(true);
        setPendingJsonFile(null);
        addLog('DESCARGA', 'ERROR_VALIDACION', `${criticalErrors.length} error(es) crítico(s) en ${fileName}`, 'ERROR');
        return; // Don't load the file
      }

      // If non-critical issues, show modal but allow proceeding
      if (validationResults.length > 0) {
        setJsonValidationResults(validationResults);
        setIsJsonValidationOpen(true);
        setPendingJsonFile({ data: json, fileName });
        addLog('DESCARGA', 'VALIDACION', `${validationResults.length} aviso(s) en ${fileName}`, 'WARNING');
        return; // Wait for user decision
      }

      // No issues — load directly
      await acceptAndLoadQueries(json, fileName);
    } catch (e: any) {
      setValidationError({ isOpen: true, fileName, errors: ["Error de sintaxis JSON", e.message] });
      throw e;
    }
  };

  /** Accept validated JSON and load it into state */
  const acceptAndLoadQueries = async (json: any, fileName: string) => {
    // Check for absolute references (using tokenizer, not FROM/JOIN regex)
    const invalidDynamicQueries: InvalidQuery[] = [];
    json.forEach((repo: any, rIdx: number) => {
      if (repo.queries && Array.isArray(repo.queries)) {
        repo.queries.forEach((q: any, qIdx: number) => {
          if (q.sql && findAbsoluteReferences(q.sql).length > 0) {
            invalidDynamicQueries.push({ reportIndex: rIdx, queryIndex: qIdx, reportName: repo.report, query: q });
          }
        });
      }
    });

    // Update state
    setDownloadReports(json, fileName);

    // Auto-sync to repository
    if (downloadRegion && downloadEnv) {
      try {
        await addRepositoryFile(downloadRegion, downloadEnv, json, fileName);
        addLog('DESCARGA', 'AUTO_REPO', `Sincronización automática OK: ${fileName}`, 'SUCCESS');
      } catch (err) {
        console.error('Auto-sync failed:', err);
      }
    }

    if (invalidDynamicQueries.length > 0) {
      setInvalidQueries(invalidDynamicQueries);
      setIsValidatorOpen(true);
      addLog('DESCARGA', 'VALIDACION_DINAMICA', `Detectadas ${invalidDynamicQueries.length} refs absolutas en ${fileName}`, 'WARNING');
    } else {
      addLog('DESCARGA', 'CARGA_ARCHIVO', `Cargado: ${fileName}`, 'SUCCESS');
    }
  };

  /** User chose to proceed despite validation warnings */
  const handleJsonValidationProceed = async () => {
    setIsJsonValidationOpen(false);
    if (pendingJsonFile) {
      await acceptAndLoadQueries(pendingJsonFile.data, pendingJsonFile.fileName);
      setPendingJsonFile(null);
    }
  };

  const handleSelectFolder = async () => {
    try {
      // @ts-ignore
      const handle = await window.showDirectoryPicker();
      setDirectoryHandle(handle);
      addLog('DESCARGA', 'CARPETA_SELECCIONADA', `Carpeta seleccionada: ${handle.name}`, 'SUCCESS');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error selecting directory:', err);
        addLog('DESCARGA', 'ERROR_CARPETA', `Error al seleccionar carpeta: ${err.message}`, 'ERROR');
      }
    }
  };

  const handleConfigLoaded = async (content: string, fileName: string) => {
    try {
      const json = JSON.parse(content);
      setDownloadConfig(json, fileName);

      if (downloadRegion && downloadEnv) {
        try {
          await addRepositoryFile(downloadRegion, downloadEnv, json, fileName);
          addLog('DESCARGA', 'AUTO_REPO', `Sincronización config OK: ${fileName}`, 'SUCCESS');
        } catch (err) {
          console.error('Auto-sync failed:', err);
        }
      }
      addLog('DESCARGA', 'CARGA_ARCHIVO', `Config cargada: ${fileName}`, 'SUCCESS');
    } catch (e) {
      alert("JSON de configuración inválido");
      throw e;
    }
  };

  const cancelDownload = () => {
    abortControllerRef.current = true;
    addLog('DESCARGA', 'CANCELAR_SOLICITADO', 'Cancelando proceso...', 'WARNING');
  };

  const handleValidatorSave = (correctedQueries: InvalidQuery[], downloadJson: boolean = false) => {
    const newJson = JSON.parse(JSON.stringify(downloadReports.data));
    correctedQueries.forEach(item => {
      if (newJson[item.reportIndex]?.queries[item.queryIndex]) {
        newJson[item.reportIndex].queries[item.queryIndex] = item.query;
      }
    });

    const fileName = downloadReports.fileName || 'corrected_queries.json';
    setDownloadReports(newJson, fileName);
    setIsValidatorOpen(false);

    if (downloadJson) {
      const blob = new Blob([JSON.stringify(newJson, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      addLog('DESCARGA', 'DESCARGA_JSON', `JSON corregido descargado: ${fileName}`, 'SUCCESS');
    }
  };

  const handleRemoveQueries = () => {
    addLog('DESCARGA', 'ELIMINAR_ARCHIVO', `Archivo de queries eliminado`, 'INFO');
    clearDownloadReports();
    setSelectedQueries(new Set());
    setFilters({});
  };

  const handleRemoveConfig = () => {
    addLog('DESCARGA', 'ELIMINAR_ARCHIVO', `Archivo de config eliminado`, 'INFO');
    clearDownloadConfig();
  };

  const toggleQuery = (id: string) => {
    const newSet = new Set(selectedQueries);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedQueries(newSet);
  };

  // Validation Logic - Purely based on Rules
  const validateQuery = (query: QueryDefinition) => {
    const errors: string[] = [];

    // 0. Pre-check: Region/Env selected?
    if (!downloadRegion || !downloadEnv) {
      return { valid: false, msg: "Seleccione Región y Entorno" };
    }

    // 1. Table Validation (metric, cashflow, result)
    const validTables = ['metric', 'cashflow', 'result'];
    const tableName = query.table ? query.table.toLowerCase() : '';
    if (!validTables.includes(tableName)) {
      errors.push(`Tabla '${query.table}' inválida (debe ser: metric, cashflow, result).`);
    }

    // 2. Database Validation (Strict check against EXPECTED_DATABASES)
    const allowedDbs = EXPECTED_DATABASES[downloadRegion]?.[downloadEnv];

    if (allowedDbs) {
      if (!allowedDbs.includes(query.database)) {
        if (allowedDbs.length === 0) {
          errors.push(`No hay bases de datos permitidas configuradas para ${downloadRegion} ${downloadEnv}.`);
        } else {
          errors.push(`BD '${query.database}' no válida para ${downloadRegion} ${downloadEnv}.`);
        }
      }
    } else {
      errors.push(`Configuración no encontrada para ${downloadRegion} ${downloadEnv}.`);
    }

    if (errors.length > 0) {
      return { valid: false, msg: errors.join(" ") };
    }

    return { valid: true, msg: "Válido" };
  };

  // Flatten data for table view
  const flatData = useMemo(() => {
    const items: { id: string, report: string, folder: string, filenameOnly: string, database: string, table: string, query: QueryDefinition }[] = [];
    if (Array.isArray(downloadReports.data)) {
      downloadReports.data.forEach(r => {
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
  }, [downloadReports.data]);

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
      // If all currently visible are selected, deselect them
      const newSet = new Set(selectedQueries);
      filteredData.forEach(item => newSet.delete(item.id));
      setSelectedQueries(newSet);
    } else {
      // Select all currently visible
      const newSet = new Set(selectedQueries);
      filteredData.forEach(item => newSet.add(item.id));
      setSelectedQueries(newSet);
    }
  };

  // Per-file status tracking for the execution modal
  const [executionItems, setExecutionItems] = useState<{
    id: string;
    filename: string;
    status: 'pending' | 'running' | 'success' | 'error';
    error?: string;
  }[]>([]);
  const [isExecutionModalOpen, setIsExecutionModalOpen] = useState(false);
  const abortControllerRef = useRef<boolean>(false);

  const runDownload = async () => {
    abortControllerRef.current = false;
    if (selectedQueries.size === 0 || !downloadConfig.data) {
      alert("Por favor carga los archivos y selecciona queries.");
      return;
    }
    if (!downloadRegion || !downloadEnv) {
      alert("Por favor selecciona región y entorno.");
      return;
    }
    if (!downloadLoadId.trim()) {
      alert("El LOAD ID es obligatorio para la descarga de informes.");
      return;
    }

    // Initialize execution items
    const itemsToRun = flatData.filter(item => selectedQueries.has(item.id)).map(item => ({
      id: item.id,
      filename: item.query.filename,
      status: 'pending' as const,
      report: item.report,
      query: item.query
    }));

    setExecutionItems(itemsToRun.map(i => ({ id: i.id, filename: i.filename, status: 'pending' })));
    setIsExecutionModalOpen(true);
    setIsProcessing(true);
    setProgress(0);
    setLogs([]);
    addLog('DESCARGA', 'INICIO_PROCESO', `Iniciando descarga de ${itemsToRun.length} informes.`, 'INFO');

    const total = itemsToRun.length;
    let errorCount = 0;

    for (let i = 0; i < total; i++) {
      const item = itemsToRun[i];

      if (abortControllerRef.current) {
        addLog('DESCARGA', 'PROCESO_CANCELADO', `Descarga cancelada por el usuario.`, 'WARNING');
        break;
      }

      // Update status to running
      setExecutionItems(prev => prev.map(ei => ei.id === item.id ? { ...ei, status: 'running' } : ei));

      const validation = validateQuery(item.query);
      if (!validation.valid) {
        setExecutionItems(prev => prev.map(ei => ei.id === item.id ? { ...ei, status: 'error', error: validation.msg } : ei));
        errorCount++;
        continue;
      }

      try {
        const response = await axios.post('/api/download', {
          config: downloadConfig.data,
          query: item.query,
          loadId: downloadLoadId,
          region: downloadRegion,
          env: downloadEnv
        });

        const data = response.data;
        let csvContent = "";
        if (Array.isArray(data) && data.length > 0) {
          const headers = Object.keys(data[0]);
          // Use semicolon for localized Excel support
          const separator = ';';
          csvContent = [
            headers.join(separator),
            ...data.map(row => headers.map(fieldName => {
              const val = row[fieldName] === null || row[fieldName] === undefined ? "" : String(row[fieldName]);
              // Format for CSV (handle quotes and separators)
              if (val.includes(separator) || val.includes('"') || val.includes('\n') || val.includes(',')) {
                return `"${val.replace(/"/g, '""')}"`;
              }
              return val;
            }).join(separator))
          ].join('\n');
        } else if (Array.isArray(data) && data.length === 0) {
          csvContent = "No hay datos disponibles para esta consulta";
        } else {
          csvContent = JSON.stringify(data, null, 2);
        }

        // Add UTF-8 BOM for Excel column detection
        const blob = new Blob(["\uFEFF", csvContent], { type: 'text/csv;charset=utf-8;' });

        if (directoryHandle) {
          // Save using File System Access API
          const fsName = `${item.query.filename.replace(/\//g, '_')}.csv`;
          try {
            const fileHandle = await directoryHandle.getFileHandle(fsName, { create: true });
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
          } catch (fsErr: any) {
            console.error('FS Write Error:', fsErr);
            addLog('DESCARGA', 'ERROR_ESCRIBIENDO', `Error escribiendo a carpeta: ${fsErr.message}`, 'WARNING');
            // Fallback to regular download if FS fails
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fsName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
          }
        } else {
          // Standard Download
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${item.query.filename.replace(/\//g, '_')}.csv`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }

        setExecutionItems(prev => prev.map(ei => ei.id === item.id ? { ...ei, status: 'success' } : ei));
      } catch (e: any) {
        const backendError = e.response?.data?.error || e.message;
        const authDiag = e.response?.data?.authDiag;
        setExecutionItems(prev => prev.map(ei => ei.id === item.id ? { ...ei, status: 'error', error: backendError, authDiag } as any : ei));
        errorCount++;
      }
      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setIsProcessing(false);
    addLog('DESCARGA', 'FIN_PROCESO', `Proceso finalizado. ${total - errorCount} OK, ${errorCount} fallidos.`, errorCount > 0 ? 'WARNING' : 'SUCCESS');
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
            <Search size={14} className="text-gray-400" />
            <input
              type="text"
              placeholder="Buscar..."
              className="w-full text-xs outline-none text-gray-700 bg-transparent"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              autoFocus
            />
            {filterSearch && <button onClick={() => setFilterSearch('')}><X size={12} className="text-gray-400 hover:text-red-500" /></button>}
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
            <Filter size={14} fill={isActive ? "currentColor" : "none"} />
          </button>
        </div>
        {activeFilterColumn === columnKey && renderFilterDropdown(columnKey)}
      </th>
    );
  };

  return (
    <div className="h-full flex flex-col animate-fade-in w-full relative" >
      <PageHeader
        title="Descarga de Informes"
        subtitle="Ejecuta y descarga reportes desde cloud"
        icon={<Settings size={20} />}
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
      )
      }

      {/* DYNAMIC REFERENCE VALIDATOR MODAL */}
      <QueryValidatorModal
        isOpen={isValidatorOpen}
        invalidQueries={invalidQueries}
        onClose={() => {
          setIsValidatorOpen(false);
          setPendingReports(null);
          setInvalidQueries([]);
        }}
        onSave={handleValidatorSave}
      />

      {/* JSON VALIDATION MODAL */}
      <JsonValidationModal
        isOpen={isJsonValidationOpen}
        results={jsonValidationResults}
        fileName={pendingJsonFile?.fileName || downloadReports.fileName || 'archivo.json'}
        onClose={() => {
          setIsJsonValidationOpen(false);
          setJsonValidationResults([]);
          setPendingJsonFile(null);
        }}
        onProceed={handleJsonValidationProceed}
      />

      {/* EXECUTION STATUS MODAL */}
      {
        isExecutionModalOpen && (
          <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl flex flex-col border border-gray-100 overflow-hidden max-h-[85vh]">

              {/* Header */}
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-2xl shadow-sm ${isProcessing ? 'bg-alquid-blue text-white animate-pulse' : 'bg-green-100 text-green-600'}`}>
                    {isProcessing ? <Play size={24} fill="currentColor" /> : <CheckCircle2 size={24} />}
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                      {isProcessing ? 'Procesando Descargas' : 'Proceso Finalizado'}
                    </h3>
                    <p className="text-sm text-gray-500 font-medium">
                      {executionItems.filter(i => i.status === 'success').length} de {executionItems.length} completados con éxito
                    </p>
                  </div>
                </div>
                {!isProcessing ? (
                  <button
                    onClick={() => setIsExecutionModalOpen(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                  >
                    <X size={24} />
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      abortControllerRef.current = true;
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl font-bold text-sm transition-all border border-red-100"
                  >
                    <XCircle size={18} />
                    Cancelar Descarga
                  </button>
                )}
              </div>

              {/* Progress Detail */}
              <div className="px-8 pt-6 pb-2">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-xs font-bold text-alquid-navy uppercase tracking-widest">Progreso Global</span>
                  <span className="text-lg font-black text-alquid-navy">{progress}%</span>
                </div>
                <div className="h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200 p-0.5">
                  <div
                    className="h-full bg-gradient-to-r from-alquid-navy via-alquid-blue to-alquid-blue rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(30,58,138,0.3)]"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              {/* Items List */}
              <div className="p-8 flex-1 overflow-y-auto custom-scrollbar bg-white">
                <div className="space-y-3">
                  {executionItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex flex-col p-4 rounded-2xl border transition-all duration-300 ${item.status === 'running' ? 'bg-blue-50/50 border-blue-200 shadow-sm ring-1 ring-blue-100 scale-[1.01]' :
                        item.status === 'success' ? 'bg-green-50/30 border-green-100' :
                          item.status === 'error' ? 'bg-red-50/50 border-red-200' :
                            'bg-gray-50 border-gray-100 opacity-60'
                        }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${item.status === 'running' ? 'bg-blue-100 text-blue-600' :
                            item.status === 'success' ? 'bg-green-100 text-green-600' :
                              item.status === 'error' ? 'bg-red-100 text-red-600' :
                                'bg-gray-200 text-gray-400'
                            }`}>
                            {item.status === 'running' && <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />}
                            {item.status === 'success' && <CheckCircle2 size={16} />}
                            {item.status === 'error' && <X size={16} />}
                            {item.status === 'pending' && <div className="w-1.5 h-1.5 bg-gray-400 rounded-full" />}
                          </div>
                          <span className={`text-sm font-bold truncate ${item.status === 'error' ? 'text-red-700' : 'text-gray-700'}`}>
                            {item.filename}
                          </span>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded-md ${item.status === 'running' ? 'text-blue-600 bg-blue-100' :
                          item.status === 'success' ? 'text-green-600 bg-green-100' :
                            item.status === 'error' ? 'text-red-600 bg-red-100' :
                              'text-gray-500 bg-gray-200'
                          }`}>
                          {item.status === 'running' ? 'Ejecutando' :
                            item.status === 'success' ? 'Completado' :
                              item.status === 'error' ? 'Error' : 'Pendiente'}
                        </span>
                      </div>
                      {item.error && (
                        <div className="mt-2 ml-11 flex flex-col gap-2 bg-white/60 p-2 rounded-xl border border-red-100 animate-slide-up">
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-red-600 font-medium leading-tight">
                              {item.error}
                            </p>
                          </div>
                          {(item as any).authDiag && (
                            <div className="text-[9px] font-mono text-gray-400 bg-gray-50 p-1 rounded border border-gray-100 flex items-center gap-1">
                              <span className="font-bold text-gray-500 uppercase">Debug Auth:</span>
                              {(item as any).authDiag}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                  ALQUID Execution Engine v2.0
                </div>
                {!isProcessing && (
                  <button
                    onClick={() => setIsExecutionModalOpen(false)}
                    className="px-8 py-3 bg-alquid-navy hover:bg-alquid-blue text-white rounded-xl font-bold text-sm shadow-lg shadow-alquid-navy/20 transition-all hover:-translate-y-0.5"
                  >
                    Cerrar Informe
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      }

      <div className="flex flex-1 gap-6 h-full relative overflow-hidden mt-6">

        {/* Fixed Sidebar Configuration */}
        <div
          className="bg-white border border-alquid-gray40 border-opacity-40 shadow-lg rounded-xl flex flex-col z-10 w-80"
        >
          <div className="p-5 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

            {/* Files - Moved to Top */}
            <div>
              <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Database size={16} /> Archivos de Configuración
              </h4>
              <FileInput
                label="Queries (JSON)"
                accept=".json"
                onFileLoaded={handleQueriesLoaded}
                onRemove={handleRemoveQueries}
                initialFileName={downloadReports.fileName}
                required
              />
              <FileInput
                label="Accesos (JSON)"
                accept=".json"
                onFileLoaded={handleConfigLoaded}
                onRemove={handleRemoveConfig}
                initialFileName={downloadConfig.fileName}
                required
              />
            </div>

            <hr className="border-gray-100" />

            {/* Environment Settings */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Región</label>
                <div className="relative">
                  <select
                    value={downloadRegion}
                    onChange={(e) => setDownloadRegion(e.target.value)}
                    className={`w-full appearance-none bg-white border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-navy focus:border-transparent font-medium shadow-sm transition-all cursor-pointer hover:border-gray-400 ${downloadRegion === "" ? "text-gray-500" : "text-gray-900"}`}
                  >
                    <option value="" disabled>Seleccionar región</option>
                    {regions.map(r => (
                      <option key={r} value={r} className="text-gray-900">{r}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Entorno</label>
                <div className="relative">
                  <select
                    value={downloadEnv}
                    onChange={(e) => setDownloadEnv(e.target.value)}
                    className={`w-full appearance-none bg-white border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-navy focus:border-transparent font-medium shadow-sm transition-all cursor-pointer hover:border-gray-400 ${downloadEnv === "" ? "text-gray-500" : "text-gray-900"}`}
                  >
                    <option value="" disabled>Seleccionar entorno</option>
                    {environments.map(e => (
                      <option key={e} value={e} className="text-gray-900">{e}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Load ID <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={downloadLoadId}
                  onChange={(e) => setDownloadLoadId(e.target.value)}
                  placeholder="Seleccionar Load ID"
                  className="w-full bg-white text-gray-900 border border-gray-300 rounded-lg py-3 px-4 leading-tight focus:outline-none focus:ring-2 focus:ring-alquid-navy focus:border-transparent font-mono shadow-sm placeholder-gray-400"
                />
              </div>
            </div>

          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white rounded-xl shadow-sm border border-alquid-gray40 border-opacity-40">

          {/* Toolbar */}
          <div className="p-4 border-b border-alquid-gray40 border-opacity-40 flex justify-between items-center bg-alquid-gray10 rounded-t-xl flex-shrink-0 h-[72px]">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={18} className="text-gray-400" />
                <span className="font-bold text-gray-700">Queries ({selectedQueries.size} seleccionadas)</span>
                {Object.keys(filters).length > 0 && <span className="text-xs text-alquid-blue font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Filtros Activos</span>}
              </div>
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

          {/* Query Table */}
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
                    <th className="py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 w-64">Validación</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredData.map((item, idx) => {
                    const isSelected = selectedQueries.has(item.id);
                    const validation = validateQuery(item.query);

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
                        <td className="py-3 px-4 text-sm">
                          {validation.valid ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                              <CheckCircle2 size={14} /> Válido
                            </span>
                          ) : (
                            <span className="inline-flex items-start gap-1.5 text-xs font-medium text-alquid-orange leading-tight" title={validation.msg}>
                              <XCircle size={14} className="mt-0.5 flex-shrink-0" />
                              <span>{validation.msg}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-gray-400 italic">
                        No hay resultados para los filtros seleccionados
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          {/* Action Footer */}
          <div className="p-4 border-t border-gray-200 bg-white z-10 flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
            <div className="flex gap-2 mb-3">
              <button
                onClick={handleSelectFolder}
                className={`flex-1 py-3 px-4 rounded-xl border-2 transition-all flex items-center justify-center gap-2 font-semibold text-sm
                  ${directoryHandle
                    ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                    : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                  }
                `}
              >
                <FolderOpen size={18} />
                {directoryHandle ? `Carpeta: ${directoryHandle.name}` : 'Seleccionar Carpeta'}
              </button>
              {directoryHandle && (
                <button
                  onClick={() => setDirectoryHandle(null)}
                  className="p-3 rounded-xl border-2 border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                  title="Limpiar carpeta"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {isProcessing && (
              <div className="mb-3">
                <div className="flex justify-between text-xs font-semibold text-gray-600 mb-1">
                  <span>Procesando descarga...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className="bg-gradient-to-r from-alquid-navy to-alquid-blue h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={runDownload}
                disabled={isProcessing || !downloadConfig.data || selectedQueries.size === 0}
                className={`flex-[2] py-4 rounded-xl font-medium text-white shadow-lg flex justify-center items-center gap-3 transition-all transform active:scale-[0.99]
                  ${isProcessing || !downloadConfig.data || selectedQueries.size === 0
                    ? 'bg-gray-300 cursor-not-allowed shadow-none'
                    : 'bg-alquid-navy hover:bg-opacity-90 hover:shadow-xl hover:-translate-y-0.5'
                  }
                `}
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Ejecutando...
                  </>
                ) : (
                  <><Play size={20} fill="currentColor" /> EJECUTAR DESCARGA</>
                )}
              </button>

              {isProcessing && (
                <button
                  onClick={cancelDownload}
                  className="flex-1 py-4 rounded-xl bg-red-50 text-red-600 border-2 border-red-200 hover:bg-red-100 hover:border-red-300 transition-all font-bold flex items-center justify-center gap-2"
                >
                  <X size={20} />
                  CANCELAR
                </button>
              )}
            </div>

            {logs.length > 0 && (
              <div className="mt-3 bg-gray-900 text-green-400 font-mono text-[10px] p-3 rounded-lg max-h-24 overflow-y-auto">
                {logs[0]}
                {logs.length > 1 && <div className="opacity-50 text-xs">... y {logs.length - 1} más</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div >
  );
};

export default ReportDownloader;