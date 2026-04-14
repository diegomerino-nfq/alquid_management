import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Save, FileJson, Edit3, X, Upload, Plus, Database, Maximize2, Minimize2, Wand2, SlidersHorizontal, Trash2, ChevronDown, Download, FileCode, FolderInput, FileText, Check, CheckCircle, AlertCircle, Filter, Search, ArrowRight, ArrowLeft, MapPin, Globe, Building2, RefreshCw, Link, Unlink, BookOpen, LibraryBig } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import PageHeader from '../components/PageHeader';
import { useGlobalState } from '../context/GlobalStateContext';
import { QueryDefinition, QueryParam, ReportDefinition, Client, Geography, Environment, CLIENT_GEOGRAPHIES } from '../types';
import { formatSqlBonito } from '../utils/sqlFormatter';
import RepositoryExplorerModal from '../components/RepositoryExplorerModal';

// Helper interface for the Parameter Modal State
interface ParamModalState {
    isOpen: boolean;
    originalKey: string | null; // Null if new
    key: string;
    value: string; // Simplified: Always a string representation
}

// Helper for Quick Rename Modal
interface RenameModalState {
    isOpen: boolean;
    type: 'REPORT' | 'FILE';
    reportIndex: number;
    queryIndex: number; // -1 if report rename
    currentValue: string;
    folderValue?: string; // For file rename (folder separation)
}

const normalizeJsonFileName = (fileName: string): string => {
    const trimmed = (fileName || 'queries.json').trim();
    const sanitized = trimmed.replace(/[<>:"/\\|?*]+/g, '_');
    return sanitized.toLowerCase().endsWith('.json') ? sanitized : `${sanitized}.json`;
};

const writeJsonFile = async (directoryHandle: any, fileName: string, content: string) => {
    const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
};

const JsonEditor: React.FC = () => {
    const { editorReports, setEditorReports, clearEditorReports, addLog } = useGlobalState();
    const [editingItem, setEditingItem] = useState<{ reportIndex: number, queryIndex: number, data: QueryDefinition } | null>(null);
    const [isNewQueryMode, setIsNewQueryMode] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(true);

    // Track modified items
    const [modifiedIndices, setModifiedIndices] = useState<Set<string>>(new Set());

    // State for new query creation
    const [newQueryReport, setNewQueryReport] = useState("");
    const [newQueryFilename, setNewQueryFilename] = useState("");
    const [importedFileName, setImportedFileName] = useState<string | null>(null);

    // UI State
    const [showParams, setShowParams] = useState(false);

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

    // Parameter Modal
    const [paramModal, setParamModal] = useState<ParamModalState>({
        isOpen: false,
        originalKey: null,
        key: '',
        value: ''
    });

    // Rename Modal
    const [renameModal, setRenameModal] = useState<RenameModalState>({
        isOpen: false,
        type: 'REPORT',
        reportIndex: -1,
        queryIndex: -1,
        currentValue: '',
        folderValue: ''
    });

    const sqlInputRef = useRef<HTMLInputElement>(null);
    const importSqlInputRef = useRef<HTMLInputElement>(null);
    const jsonFileInputRef = useRef<HTMLInputElement>(null);
    const addSqlToJsonRef = useRef<HTMLInputElement>(null);
    const sqlFolderInputRef = useRef<HTMLInputElement>(null);


    // Estado para el modal de exploración de repositorio
    const [isRepoExplorerOpen, setIsRepoExplorerOpen] = useState(false);
    const [repoExplorerMode, setRepoExplorerMode] = useState<'load' | 'template'>('load');
    const [sqlImportTemplate, setSqlImportTemplate] = useState<{ data: ReportDefinition[] | null; fileName: string | null }>({ data: null, fileName: null });

    // Estado para el modal de añadir SQL al JSON
    const [addSqlModal, setAddSqlModal] = useState<{
        isOpen: boolean;
        sql: string;
        database: string;
        schema: string;
        table: string;
        reportName: string;
        filename: string;
    }>({ isOpen: false, sql: '', database: '', schema: '', table: '', reportName: '', filename: '' });

    useEffect(() => {
        if (!sqlFolderInputRef.current) return;
        sqlFolderInputRef.current.setAttribute('webkitdirectory', '');
        sqlFolderInputRef.current.setAttribute('directory', '');
    }, []);

    // Handler for selecting a file from the repository
    const handleSelectRepoFile = (file: any) => {
        if (!file) return;
        try {
            const json = typeof file.content === 'string' ? JSON.parse(file.content) : file.content;
            if (repoExplorerMode === 'template') {
                if (!Array.isArray(json)) {
                    alert('La plantilla seleccionada no tiene formato de lista de reportes.');
                    return;
                }
                setSqlImportTemplate({ data: json as ReportDefinition[], fileName: file.fileName || null });
                addLog('EDITOR', 'PLANTILLA_SQL', `Plantilla seleccionada: ${file.fileName}`, 'SUCCESS');
            } else {
                setEditorReports(json, file.fileName);
                setModifiedIndices(new Set());
                addLog('EDITOR', 'CARGA_ARCHIVO', `JSON cargado desde repositorio: ${file.fileName}`, 'SUCCESS');
            }
            setIsRepoExplorerOpen(false);
        } catch (e: any) {
            addLog('EDITOR', 'ERROR', `Error de sintaxis JSON (repositorio): ${file.fileName}`, 'ERROR');
            alert('Archivo JSON inválido (repositorio).');
        }
    };

    // --- HANDLERS FOR FILE INPUTS AND REPO ---
    // Handler for FileInput (JSON)
    const handleLoaded = (content: string, fileName: string) => {
        try {
            const json = JSON.parse(content);
            setEditorReports(json, fileName);
            setModifiedIndices(new Set());
            addLog('EDITOR', 'CARGA_ARCHIVO', `JSON cargado: ${fileName}`, 'SUCCESS');
        } catch (e: any) {
            addLog('EDITOR', 'ERROR', `Error de sintaxis JSON: ${fileName}`, 'ERROR');
            alert('Archivo JSON inválido.');
        }
    };

    // Handler for FileInput remove
    const handleClear = () => {
        clearEditorReports();
        setModifiedIndices(new Set());
        addLog('EDITOR', 'ELIMINAR_ARCHIVO', `Archivo de queries eliminado`, 'INFO');
    };


    const reformatSql = () => {
        if (!editingItem) return;
        const formattedSql = formatSqlBonito(editingItem.data.sql || '');
        setEditingItem({
            ...editingItem,
            data: { ...editingItem.data, sql: formattedSql }
        });
        setModifiedIndices(new Set([...modifiedIndices, `${editingItem.reportIndex}-${editingItem.queryIndex}`]));
        addLog('EDITOR', 'FORMATEAR_SQL', `SQL formateado: ${editingItem.data.filename || 'nueva_query.sql'}`, 'INFO');
    };

    // Handler for saving JSON (download)
    const handleSaveJson = async () => {
        if (!editorReports.data) return;
        const content = JSON.stringify(editorReports.data, null, 2);
        const fileName = normalizeJsonFileName(editorReports.fileName || 'queries.json');

        try {
            const pickerWindow = window as any;
            if (typeof pickerWindow.showDirectoryPicker !== 'function') {
                throw new Error('DIRECTORY_PICKER_NOT_SUPPORTED');
            }

            const directoryHandle = await pickerWindow.showDirectoryPicker({ mode: 'readwrite' });
            await writeJsonFile(directoryHandle, fileName, content);
            addLog('EDITOR', 'DESCARGA_JSON', `JSON guardado en carpeta seleccionada: ${fileName}`, 'SUCCESS');
            alert(`JSON guardado correctamente como ${fileName}.`);
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                addLog('EDITOR', 'DESCARGA_JSON_CANCELADA', 'Selección de carpeta cancelada por el usuario', 'INFO');
                return;
            }

            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            addLog('EDITOR', 'DESCARGA_JSON', `JSON descargado: ${fileName}`, 'SUCCESS');
            alert('Tu navegador no permite elegir carpeta directamente. Se ha realizado la descarga normal del archivo JSON.');
        }
    };

    // TableHeader stub for now (should be imported if exists)
    const TableHeader = ({ label, columnKey, width }: { label: string, columnKey: string, width?: string }) => (
        <th className={`py-3 px-4 text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 ${width || ''}`}>{label}</th>
    );

    // filteredData for table rendering
    const flatData = useMemo(() => {
        const items: any[] = [];
        if (Array.isArray(editorReports.data)) {
            editorReports.data.forEach((r: any, reportIndex: number) => {
                if (Array.isArray(r.queries)) {
                    r.queries.forEach((q: any, queryIndex: number) => {
                        const parts = q.filename.split('/');
                        const folder = parts.length > 1 ? parts[0] : '';
                        const filenameOnly = parts.length > 1 ? parts.slice(1).join('/') : q.filename;
                        items.push({
                            report: r.report,
                            folder,
                            filenameOnly,
                            database: q.database,
                            table: q.table,
                            query: q,
                            reportIndex,
                            queryIndex,
                            isFirstOfReport: queryIndex === 0
                        });
                    });
                }
            });
        }
        return items;
    }, [editorReports.data]);

    const filteredData = useMemo(() => {
        return flatData.filter(item => {
            return Object.entries(filters).every(([key, val]) => {
                const selectedValues = val as Set<string>;
                if (selectedValues.size === 0) return true;
                return selectedValues.has(item[key as keyof typeof item] as string);
            });
        });
    }, [flatData, filters]);

    // --- RENAME, DELETE, EDITOR, ETC. ---
    const openRenameModal = (type: 'REPORT' | 'FILE', reportIndex: number, queryIndex: number) => {
        if (type === 'REPORT') {
            setRenameModal({ isOpen: true, type, reportIndex, queryIndex, currentValue: editorReports.data[reportIndex]?.report || '', folderValue: '' });
        } else {
            const q = editorReports.data[reportIndex]?.queries[queryIndex];
            const parts = q?.filename?.split('/') || [''];
            setRenameModal({ isOpen: true, type, reportIndex, queryIndex, currentValue: parts.slice(1).join('/') || '', folderValue: parts[0] || '' });
        }
    };

    const applyRename = () => {
        if (!renameModal.isOpen) return;
        const { type, reportIndex, queryIndex, currentValue, folderValue } = renameModal;
        const newData = JSON.parse(JSON.stringify(editorReports.data));
        if (type === 'REPORT') {
            newData[reportIndex].report = currentValue;
        } else {
            const newFilename = folderValue ? `${folderValue}/${currentValue}` : currentValue;
            newData[reportIndex].queries[queryIndex].filename = newFilename;
        }
        setEditorReports(newData, editorReports.fileName);
        setRenameModal({ ...renameModal, isOpen: false });
        setModifiedIndices(new Set([...modifiedIndices, `${reportIndex}-${queryIndex}`]));
    };

    const handleDeleteReport = (reportIndex: number) => {
        const newData = editorReports.data.filter((_: any, idx: number) => idx !== reportIndex);
        setEditorReports(newData, editorReports.fileName);
        setModifiedIndices(new Set());
    };

    const handleDeleteQuery = (reportIndex: number, queryIndex: number) => {
        const newData = JSON.parse(JSON.stringify(editorReports.data));
        newData[reportIndex].queries.splice(queryIndex, 1);
        setEditorReports(newData, editorReports.fileName);
        setModifiedIndices(new Set([...modifiedIndices, `${reportIndex}-${queryIndex}`]));
    };

    const openEditor = (reportIndex: number, queryIndex: number) => {
        const q = editorReports.data[reportIndex].queries[queryIndex];
        setEditingItem({
            reportIndex,
            queryIndex,
            data: {
                ...q,
                sql: formatSqlBonito(q.sql || '')
            }
        });
        setIsNewQueryMode(false);
    };

    const handleEditorChange = (field: string, value: any) => {
        if (!editingItem) return;
        setEditingItem({ ...editingItem, data: { ...editingItem.data, [field]: value } });
        setModifiedIndices(new Set([...modifiedIndices, `${editingItem.reportIndex}-${editingItem.queryIndex}`]));
    };

    const saveChanges = () => {
        if (!editingItem) return;
        const { reportIndex, queryIndex, data } = editingItem;
        const newData = JSON.parse(JSON.stringify(editorReports.data));
        if (isNewQueryMode) {
            // Add new query
            const filename = newQueryFilename || 'nueva_query.sql';
            const reportName = newQueryReport || 'Nuevo Reporte';
            let reportIdx = newData.findIndex((r: any) => r.report === reportName);
            if (reportIdx === -1) {
                // Create new report
                newData.push({ report: reportName, queries: [{ ...data, filename }] });
            } else {
                newData[reportIdx].queries.push({ ...data, filename });
            }
        } else {
            newData[reportIndex].queries[queryIndex] = data;
        }
        setEditorReports(newData, editorReports.fileName);
        setEditingItem(null);
        setIsNewQueryMode(false);
        setModifiedIndices(new Set([...modifiedIndices, `${reportIndex}-${queryIndex}`]));
    };

    // --- HANDLERS FOR ADDING SQL TO JSON ---
    const extractSqlSource = (content: string) => {
        let db = '';
        let schema = '';
        let table = '';
        let modifiedSql = content;

        const normalizeSqlNewlines = (sql: string) => {
            let normalized = (sql || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

            // Recover SQL text that came with literal newline tokens ("\\n" or "/n").
            // We only do this when there are no real newlines to avoid altering valid SQL content.
            if (!normalized.includes('\n')) {
                const literalBackslashNCount = (normalized.match(/\\n/g) || []).length;
                const literalSlashNCount = (normalized.match(/\/n/g) || []).length;

                if (literalBackslashNCount >= 2 || literalSlashNCount >= 2) {
                    normalized = normalized.replace(/\\n/g, '\n').replace(/\/n/g, '\n');
                }
            }

            return normalized;
        };

        modifiedSql = normalizeSqlNewlines(modifiedSql);

        const normalizeLoadIdFilter = (sql: string) =>
            sql.replace(/(\b(?:[a-zA-Z0-9_]+\.)?load_id\b)\s*=\s*'[^']*'/gi, '$1=:load_id');

        const threePartMatch = content.match(/FROM\s+`?([a-zA-Z0-9_\-]+)`?\.`?([a-zA-Z0-9_]+)`?\.`?([a-zA-Z0-9_]+)`?/i);
        const twoPartMatch = content.match(/FROM\s+`?([a-zA-Z0-9_]+)`?\.`?([a-zA-Z0-9_]+)`?/i);

        if (threePartMatch) {
            db = threePartMatch[2];
            schema = threePartMatch[2];
            table = threePartMatch[3];
            modifiedSql = content.replace(threePartMatch[0], 'FROM %s.%s');
        } else if (twoPartMatch) {
            db = twoPartMatch[1];
            schema = twoPartMatch[1];
            table = twoPartMatch[2];
            modifiedSql = content.replace(twoPartMatch[0], 'FROM %s.%s');
        }

        modifiedSql = normalizeLoadIdFilter(modifiedSql);

        return { db, schema, table, modifiedSql };
    };

    const extractSqlMetadata = (content: string) => {
        let report = '';
        let archivo = '';

        const headerLines = content.split(/\r?\n/).slice(0, 40);
        for (const rawLine of headerLines) {
            const line = rawLine.trim();
            if (!line.startsWith('--')) continue;

            const normalized = line.replace(/^--\s*/, '');
            const separatorIndex = normalized.indexOf(':');
            if (separatorIndex === -1) continue;

            const key = normalized.slice(0, separatorIndex).trim().toLowerCase();
            const value = normalized.slice(separatorIndex + 1).trim();

            if (!report && (key === 'reporte' || key === 'report')) report = value;
            if (!archivo && (key === 'archivo' || key === 'file')) archivo = value;
        }

        return {
            report,
            archivo: archivo.replace(/\\/g, '/').replace(/\.sql$/i, '')
        };
    };

    const mergeWithTemplate = (template: ReportDefinition[], importedReports: ReportDefinition[]) => {
        const merged = JSON.parse(JSON.stringify(template)) as ReportDefinition[];

        const normalizeValue = (value: string) =>
            (value || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/\\/g, '/')
                .replace(/\.sql$/i, '');

        const normalizeIdentifier = (value: string) => normalizeValue(value).replace(/[^a-z0-9/]/g, '');
        const normalizeBasename = (value: string) => {
            const normalized = normalizeValue(value);
            const last = normalized.split('/').filter(Boolean).pop() || normalized;
            return last.replace(/[^a-z0-9]/g, '');
        };

        const reportIndexMap = new Map<string, number>();
        const exactQueryIndexMap = new Map<string, { reportIndex: number; queryIndex: number }>();
        const baseQueryIndexMap = new Map<string, { reportIndex: number; queryIndex: number }>();

        merged.forEach((r, reportIndex) => {
            reportIndexMap.set(normalizeIdentifier(r.report || ''), reportIndex);
            (r.queries || []).forEach((q, queryIndex) => {
                const exactKey = normalizeIdentifier(q.filename || '');
                const baseKey = normalizeBasename(q.filename || '');
                if (exactKey) exactQueryIndexMap.set(exactKey, { reportIndex, queryIndex });
                if (baseKey) baseQueryIndexMap.set(baseKey, { reportIndex, queryIndex });
            });
        });

        const defaultReportIndex = 0;
        const defaultFolder = (merged[defaultReportIndex]?.queries || [])
            .map(q => (q.filename || '').replace(/\\/g, '/'))
            .find(name => name.includes('/'))
            ?.split('/')[0] || '';

        for (const importedReport of importedReports) {
            for (const importedQuery of importedReport.queries || []) {
                const importedFilename = importedQuery.filename || '';
                const exactKey = normalizeIdentifier(importedFilename);
                const baseKey = normalizeBasename(importedFilename);
                const matched = (exactKey && exactQueryIndexMap.get(exactKey)) || (baseKey && baseQueryIndexMap.get(baseKey));

                if (matched) {
                    const existingQuery = merged[matched.reportIndex].queries[matched.queryIndex];
                    merged[matched.reportIndex].queries[matched.queryIndex] = {
                        ...existingQuery,
                        sql: importedQuery.sql,
                        database: importedQuery.database,
                        schema: importedQuery.schema,
                        table: importedQuery.table,
                        // Keep template filename to preserve folder structure/canonical naming.
                        filename: existingQuery.filename,
                        parameters: existingQuery.parameters || importedQuery.parameters || {}
                    };
                    continue;
                }

                const hintedReportIndex = reportIndexMap.get(normalizeIdentifier(importedReport.report || ''));
                const targetReportIndex = hintedReportIndex ?? defaultReportIndex;
                const targetReport = merged[targetReportIndex];

                let resolvedFilename = importedFilename;
                if (!resolvedFilename.includes('/') && defaultFolder) {
                    resolvedFilename = `${defaultFolder}/${resolvedFilename}`;
                }

                const newQuery: QueryDefinition = {
                    ...importedQuery,
                    filename: resolvedFilename,
                    parameters: importedQuery.parameters || {}
                };
                targetReport.queries.push(newQuery);

                const newQueryIndex = targetReport.queries.length - 1;
                const newExactKey = normalizeIdentifier(resolvedFilename);
                const newBaseKey = normalizeBasename(resolvedFilename);
                if (newExactKey) exactQueryIndexMap.set(newExactKey, { reportIndex: targetReportIndex, queryIndex: newQueryIndex });
                if (newBaseKey) baseQueryIndexMap.set(newBaseKey, { reportIndex: targetReportIndex, queryIndex: newQueryIndex });
            }
        }

        return merged;
    };

    const handleImportSqlFolderToJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? (Array.from(e.target.files) as File[]) : [];
        e.target.value = '';

        if (files.length === 0) return;

        const sqlFiles = files.filter((file: File) => file.name.toLowerCase().endsWith('.sql'));
        if (sqlFiles.length === 0) {
            alert('La carpeta no contiene archivos .sql.');
            addLog('EDITOR', 'IMPORTAR_CARPETA_SQL', 'No se encontraron .sql en la carpeta seleccionada', 'WARNING');
            return;
        }

        try {
            const reportsMap = new Map<string, QueryDefinition[]>();
            const firstRelativePath = (sqlFiles[0] as any).webkitRelativePath || sqlFiles[0].name;
            const rootFolderName = firstRelativePath.split('/')[0] || 'queries';

            for (const file of sqlFiles) {
                const content = await file.text();
                const { db, schema, table, modifiedSql } = extractSqlSource(content);
                const { report: sqlReport, archivo: sqlArchivo } = extractSqlMetadata(content);
                const relativePath = ((file as any).webkitRelativePath || file.name).replace(/\\/g, '/');
                const parts = relativePath.split('/').filter(Boolean);
                const relativeWithoutRoot = parts.length > 1 ? parts.slice(1) : [file.name];

                const fallbackReport = relativeWithoutRoot.length > 1 ? relativeWithoutRoot[0] : 'General';
                const fallbackFilename = (relativeWithoutRoot.length > 2 ? relativeWithoutRoot.slice(1).join('/') : relativeWithoutRoot[relativeWithoutRoot.length - 1])
                    .replace(/\.sql$/i, '');

                const reportName = sqlReport || fallbackReport;
                const filenamePath = sqlArchivo || fallbackFilename;

                const query: QueryDefinition = {
                    filename: filenamePath,
                    sql: formatSqlBonito(modifiedSql),
                    database: db,
                    schema,
                    table,
                    parameters: {}
                };

                if (!reportsMap.has(reportName)) {
                    reportsMap.set(reportName, []);
                }
                reportsMap.get(reportName)?.push(query);
            }

            const generatedReports: ReportDefinition[] = Array.from(reportsMap.entries())
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([report, queries]) => ({
                    report,
                    queries: queries.sort((q1, q2) => q1.filename.localeCompare(q2.filename))
                }));

            const useTemplate = Array.isArray(sqlImportTemplate.data) && sqlImportTemplate.data.length > 0;
            const finalReports = useTemplate ? mergeWithTemplate(sqlImportTemplate.data as ReportDefinition[], generatedReports) : generatedReports;
            const generatedFileName = normalizeJsonFileName(
                useTemplate
                    ? (sqlImportTemplate.fileName || `${rootFolderName}_queries.json`)
                    : `${rootFolderName}_queries.json`
            );

            setEditorReports(finalReports, generatedFileName);
            setModifiedIndices(new Set());
            addLog('EDITOR', 'IMPORTAR_CARPETA_SQL', `Generado JSON desde carpeta con ${sqlFiles.length} SQL${useTemplate ? ` usando plantilla ${sqlImportTemplate.fileName}` : ''}`, 'SUCCESS');
            alert(`JSON generado con ${sqlFiles.length} consultas SQL${useTemplate ? ' usando plantilla de configuración' : ''}.`);
        } catch (error: any) {
            addLog('EDITOR', 'ERROR', `Error importando carpeta SQL: ${error?.message || 'desconocido'}`, 'ERROR');
            alert('No se pudo procesar la carpeta SQL.');
        }
    };

    const handleAddSqlToJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const { db, schema, table, modifiedSql } = extractSqlSource(content);
            const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
            setAddSqlModal({
                isOpen: true,
                sql: formatSqlBonito(modifiedSql),
                database: db,
                schema,
                table,
                reportName: '',
                filename: nameWithoutExt
            });
        };
        reader.readAsText(file);
    };

    const confirmAddSqlToJson = () => {
        if (!addSqlModal.reportName.trim() || !addSqlModal.filename.trim()) return;
        if (!editorReports.data) {
            alert('Primero carga un archivo JSON de configuración.');
            return;
        }
        const newData = JSON.parse(JSON.stringify(editorReports.data));
        const newQuery: QueryDefinition = {
            sql: addSqlModal.sql,
            filename: addSqlModal.filename,
            database: addSqlModal.database,
            schema: addSqlModal.schema,
            table: addSqlModal.table,
            parameters: {}
        };
        const reportIdx = newData.findIndex((r: any) => r.report === addSqlModal.reportName);
        if (reportIdx === -1) {
            newData.push({ report: addSqlModal.reportName, queries: [newQuery] });
        } else {
            newData[reportIdx].queries.push(newQuery);
        }
        setEditorReports(newData, editorReports.fileName);
        addLog('EDITOR', 'AÑADIR_SQL', `SQL añadido: ${addSqlModal.filename} en reporte "${addSqlModal.reportName}"`, 'SUCCESS');
        setAddSqlModal({ ...addSqlModal, isOpen: false });
    };

    // --- END HANDLERS ---

    // --- SQL IMPORT WITH DETECTION ---
    const handleImportNewQuerySql = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !editingItem) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;

            // --- AUTO-DETECT DB/SCHEMA/TABLE ---
            const detected = extractSqlSource(content);
            const db = detected.db || editingItem.data.database;
            const schema = detected.schema || editingItem.data.schema;
            const table = detected.table || editingItem.data.table;
            const modifiedContent = detected.modifiedSql;

            if (detected.schema && detected.table) {
                addLog('EDITOR', 'AUTO_DETECT', `Detectado DB: ${db}, Schema: ${schema}, Table: ${table}`, 'INFO');
            }

            const formattedSql = formatSqlBonito(modifiedContent);

            setEditingItem({
                ...editingItem,
                data: {
                    ...editingItem.data,
                    sql: formattedSql,
                    database: db,
                    schema: schema,
                    table: table
                }
            });
            setImportedFileName(file.name);

            if (isNewQueryMode && !newQueryFilename) {
                const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
                setNewQueryFilename(nameWithoutExt);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const clearImportedFile = () => {
        setImportedFileName(null);
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
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    // --- PARAMETERS LOGIC ---
    const deleteParameter = (keyToDelete: string) => {
        if (!editingItem) return;
        const newParams = { ...editingItem.data.parameters };
        delete newParams[keyToDelete];
        setEditingItem({ ...editingItem, data: { ...editingItem.data, parameters: newParams } });
    };

    const openParamModal = (key: string | null = null) => {
        if (!editingItem) return;
        if (key) {
            const param = editingItem.data.parameters[key];
            const rawValue = param.value;
            const stringValue = typeof rawValue === 'object' ? JSON.stringify(rawValue) : String(rawValue);
            setParamModal({ isOpen: true, originalKey: key, key: key, value: stringValue });
        } else {
            setParamModal({ isOpen: true, originalKey: null, key: '', value: '' });
        }
    };

    const saveParamModal = () => {
        if (!editingItem || !paramModal.key.trim()) return;
        const newParams = { ...editingItem.data.parameters };
        if (paramModal.originalKey && paramModal.originalKey !== paramModal.key) delete newParams[paramModal.originalKey];
        let finalValue: any = paramModal.value;
        const trimmed = finalValue.trim();
        if ((trimmed.startsWith('[') && trimmed.endsWith(']')) || (trimmed.startsWith('{') && trimmed.endsWith('}'))) {
            try { finalValue = JSON.parse(trimmed); } catch (e) { }
        }
        newParams[paramModal.key] = { value: finalValue };
        setEditingItem({ ...editingItem, data: { ...editingItem.data, parameters: newParams } });
        setParamModal({ ...paramModal, isOpen: false });
    };

    const highlightSql = (code: string) => {
        let safeCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const placeholders: string[] = [];
        const mask = (content: string, className: string) => {
            const id = `__PH_${placeholders.length}__`;
            placeholders.push(`<span class="${className}">${content}</span>`);
            return id;
        };
        safeCode = safeCode.replace(/(--[^\n]*)/g, (match) => mask(match, "text-gray-400 italic"));
        safeCode = safeCode.replace(/'([^']*)'/g, (match) => mask(match, "text-green-600"));
        safeCode = safeCode.replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|CASE|WHEN|THEN|ELSE|END|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|UNION|ALL|DISTINCT|INSERT|UPDATE|DELETE|CREATE|DROP|TABLE|VIEW|INDEX|ALTER)\b/gi, (match) => mask(match, "text-blue-600 font-bold"));
        safeCode = safeCode.replace(/\b(SUM|COUNT|AVG|MIN|MAX|COALESCE|DATE|DATE_ADD|DATE_SUB|NOW|CAST|CONCAT|SUBSTRING|TRIM)\b/gi, (match) => mask(match, "text-purple-600 font-semibold"));
        safeCode = safeCode.replace(/\b(\d+)\b/g, (match) => mask(match, "text-orange-600"));

        // Absolute reference detection (Restricted to FROM/JOIN as requested)
        // Regex: (FROM|JOIN)\s+ followed by the absolute reference pattern
        const absRefRegex = /\b(FROM|JOIN)\s+((`?[a-zA-Z0-9_\-]+`?\.)*(`?[a-zA-Z0-9_\-]+`?))/gi;
        safeCode = safeCode.replace(absRefRegex, (fullMatch, keyword, reference) => {
            if (reference.includes('%s')) return fullMatch;
            // We mask the reference part, but keep the keyword as is (or re-apply keyword masking if needed)
            const maskedRef = mask(reference, "text-red-600 font-bold underline decoration-red-400 bg-red-50 px-0.5 rounded");
            return `${keyword} ${maskedRef}`;
        });

        return safeCode.replace(/__PH_(\d+)__/g, (_, index) => placeholders[parseInt(index)]);
    };



    // â”€â”€â”€ WIZARD STATE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    
    // PAGE VIEW
    const [pageView, setPageView] = useState<'wizard' | 'templates'>('wizard');

    // TEMPLATE LIBRARY STATE
    type StoredTemplate = { id: string; client: string; geography: string | null; name: string; content: string; uploaded_at: string };
    const [libraryClient, setLibraryClient] = useState<Client | ''>('');
    const [libraryGeography, setLibraryGeography] = useState<string>('');
    const [libraryTemplates, setLibraryTemplates] = useState<StoredTemplate[]>([]);
    const [libraryLoading, setLibraryLoading] = useState(false);
    const libraryUploadRef = useRef<HTMLInputElement>(null);

    const geographiesForLibraryClient: Geography[] | null = libraryClient ? CLIENT_GEOGRAPHIES[libraryClient as Client] : null;

    const fetchLibraryTemplates = async (client: Client | '', geography: string) => {
        if (!client) { setLibraryTemplates([]); return; }
        // For clients with geographies, require geography selection
        const clientGeos = CLIENT_GEOGRAPHIES[client as Client];
        if (clientGeos && !geography) { setLibraryTemplates([]); return; }
        setLibraryLoading(true);
        try {
            const geoParam = geography || 'null';
            const res = await fetch(`/api/templates?client=${encodeURIComponent(client)}&geography=${encodeURIComponent(geoParam)}`);
            const data = await res.json();
            setLibraryTemplates(Array.isArray(data) ? data : []);
        } catch { setLibraryTemplates([]); }
        setLibraryLoading(false);
    };

    const handleLibraryClientChange = (c: Client) => {
        setLibraryClient(c);
        setLibraryGeography('');
        setLibraryTemplates([]);
        const clientGeos = CLIENT_GEOGRAPHIES[c];
        if (!clientGeos) fetchLibraryTemplates(c, '');
    };

    const handleLibraryGeographyChange = (geo: string) => {
        setLibraryGeography(geo);
        fetchLibraryTemplates(libraryClient, geo);
    };

    const handleLibraryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !libraryClient) return;
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                const res = await fetch('/api/templates', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ client: libraryClient, geography: libraryGeography || null, name: file.name, content: json, uploadedBy: 'user' })
                });
                if (!res.ok) throw new Error(await res.text());
                const geoLabel = libraryGeography ? ` (${libraryGeography})` : '';
                addLog('EDITOR', 'PLANTILLA_SUBIDA', `Plantilla subida: ${file.name} para ${libraryClient}${geoLabel}`, 'SUCCESS');
                fetchLibraryTemplates(libraryClient, libraryGeography);
            } catch (err: any) {
                alert('Error al subir la plantilla: ' + err.message);
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleLibraryDelete = async (id: string, name: string) => {
        if (!confirm(`Eliminar plantilla "${name}"?`)) return;
        await fetch(`/api/templates/${encodeURIComponent(id)}`, { method: 'DELETE' });
        addLog('EDITOR', 'PLANTILLA_ELIMINADA', `Plantilla eliminada: ${name}`, 'INFO');
        fetchLibraryTemplates(libraryClient, libraryGeography);
    };

    const handleLibrarySelect = (tpl: StoredTemplate) => {
        try {
            const json = typeof tpl.content === 'string' ? JSON.parse(tpl.content) : tpl.content;
            if (!Array.isArray(json)) { alert('La plantilla no tiene formato de lista de reportes.'); return; }
            setSqlImportTemplate({ data: json as ReportDefinition[], fileName: tpl.name });
            setTemplateLoaded(true);
            setTemplateName(tpl.name);
            setPageView('wizard');
            setWizardStep(2);
            addLog('EDITOR', 'PLANTILLA_SELECCIONADA', `Plantilla seleccionada desde biblioteca: ${tpl.name}`, 'SUCCESS');
        } catch { alert('Error al cargar la plantilla.'); }
    };

    // WIZARD STATE
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
    const [selectedClient, setSelectedClient] = useState<Client | ''>('');
    const [selectedGeography, setSelectedGeography] = useState<string>('');
    const [selectedEnv, setSelectedEnv] = useState<Environment | ''>('');

    // Step 2: template
    const [templateLoaded, setTemplateLoaded] = useState<boolean>(false);
    const [templateName, setTemplateName] = useState<string>('');
    const templateLocalInputRef = useRef<HTMLInputElement>(null);

    // Step 3: SQL folder + mapping
    type MappingRow = {
        sqlFile: string;         // original SQL filename (without ext)
        sqlContent: string;      // parsed SQL
        sqlDatabase: string;
        sqlSchema: string;
        sqlTable: string;
        reportHint: string;      // from SQL metadata
        filenameHint: string;    // from SQL metadata
        jsonEntry: string;       // matched/selected JSON entry filename
        reportEntry: string;     // matched/selected JSON report name
        matched: boolean;
        availableEntries: { label: string; report: string; filename: string }[];
    };
    const [mappingRows, setMappingRows] = useState<MappingRow[]>([]);
    const [generatedResult, setGeneratedResult] = useState<ReportDefinition[] | null>(null);
    const wizardSqlFolderRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (!wizardSqlFolderRef.current) return;
        wizardSqlFolderRef.current.setAttribute('webkitdirectory', '');
        wizardSqlFolderRef.current.setAttribute('directory', '');
    }, []);

    const geographiesForClient: Geography[] | null = selectedClient ? CLIENT_GEOGRAPHIES[selectedClient as Client] : null;

    const handleWizardTemplateLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const json = JSON.parse(event.target?.result as string);
                if (!Array.isArray(json)) { alert('La plantilla no tiene formato de lista de reportes.'); return; }
                setSqlImportTemplate({ data: json as ReportDefinition[], fileName: file.name });
                setTemplateLoaded(true);
                setTemplateName(file.name);
                addLog('EDITOR', 'PLANTILLA_SQL', `Plantilla cargada: ${file.name}`, 'SUCCESS');
            } catch { alert('Archivo JSON inválido.'); }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleWizardTemplateRepo = (file: any) => {
        if (!file) return;
        try {
            const json = typeof file.content === 'string' ? JSON.parse(file.content) : file.content;
            if (!Array.isArray(json)) { alert('La plantilla seleccionada no tiene formato de lista de reportes.'); return; }
            setSqlImportTemplate({ data: json as ReportDefinition[], fileName: file.fileName || null });
            setTemplateLoaded(true);
            setTemplateName(file.fileName || 'plantilla');
            setIsRepoExplorerOpen(false);
            addLog('EDITOR', 'PLANTILLA_SQL', `Plantilla seleccionada: ${file.fileName}`, 'SUCCESS');
        } catch { alert('Archivo JSON inválido (repositorio).'); }
    };

    const handleWizardSqlFolder = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files ? Array.from(e.target.files) as File[] : [];
        e.target.value = '';
        const sqlFiles = files.filter(f => f.name.toLowerCase().endsWith('.sql'));
        if (sqlFiles.length === 0) { alert('La carpeta no contiene archivos .sql.'); return; }

        // Build all available JSON entries from template
        const templateEntries: { label: string; report: string; filename: string }[] = [];
        if (Array.isArray(sqlImportTemplate.data)) {
            for (const r of sqlImportTemplate.data) {
                for (const q of r.queries || []) {
                    templateEntries.push({ label: `${r.report} / ${q.filename}`, report: r.report, filename: q.filename });
                }
            }
        }

        const normalizeForMatch = (v: string) =>
            (v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\\/g, '/').replace(/\.sql$/i, '').replace(/[^a-z0-9/]/g, '');
        const basenameOf = (v: string) => {
            const parts = normalizeForMatch(v).split('/').filter(Boolean);
            return parts[parts.length - 1] || normalizeForMatch(v);
        };

        const rows: MappingRow[] = [];
        for (const file of sqlFiles) {
            const content = await file.text();
            const { db, schema, table, modifiedSql } = extractSqlSource(content);
            const { report: sqlReport, archivo: sqlArchivo } = extractSqlMetadata(content);
            const baseNameNoExt = file.name.replace(/\.sql$/i, '');

            // Try to find match in template
            const needle = normalizeForMatch(sqlArchivo || baseNameNoExt);
            const needleBase = basenameOf(sqlArchivo || baseNameNoExt);
            let matchedEntry = templateEntries.find(e => normalizeForMatch(e.filename) === needle);
            if (!matchedEntry) matchedEntry = templateEntries.find(e => basenameOf(e.filename) === needleBase);

            rows.push({
                sqlFile: baseNameNoExt,
                sqlContent: formatSqlBonito(modifiedSql),
                sqlDatabase: db,
                sqlSchema: schema,
                sqlTable: table,
                reportHint: sqlReport || '',
                filenameHint: sqlArchivo || baseNameNoExt,
                jsonEntry: matchedEntry ? matchedEntry.filename : '',
                reportEntry: matchedEntry ? matchedEntry.report : (sqlReport || ''),
                matched: !!matchedEntry,
                availableEntries: templateEntries,
            });
        }

        setMappingRows(rows);
    };

    const handleGenerateJson = () => {
        const useTemplate = Array.isArray(sqlImportTemplate.data) && sqlImportTemplate.data.length > 0;
        if (!useTemplate) {
            // No template: just build from SQL rows
            const reportsMap = new Map<string, QueryDefinition[]>();
            for (const row of mappingRows) {
                const report = row.reportEntry || 'General';
                const query: QueryDefinition = {
                    filename: row.filenameHint || row.sqlFile,
                    sql: row.sqlContent,
                    database: row.sqlDatabase,
                    schema: row.sqlSchema,
                    table: row.sqlTable,
                    parameters: {}
                };
                if (!reportsMap.has(report)) reportsMap.set(report, []);
                reportsMap.get(report)!.push(query);
            }
            const result: ReportDefinition[] = Array.from(reportsMap.entries()).map(([report, queries]) => ({ report, queries }));
            setGeneratedResult(result);
            const geoSuffix = selectedGeography && selectedGeography !== 'general' ? `_${selectedGeography.toLowerCase()}` : '';
            setEditorReports(result, `${(selectedClient || 'queries').toLowerCase().replace(/\s+/g, '_')}${geoSuffix}_${(selectedEnv || '').toLowerCase()}.json`);
        } else {
            // With template: apply mapped SQL
            const merged = JSON.parse(JSON.stringify(sqlImportTemplate.data)) as ReportDefinition[];
            for (const row of mappingRows) {
                if (row.jsonEntry) {
                    // Find in merged and update sql/db/schema/table
                    for (const r of merged) {
                        for (const q of r.queries || []) {
                            if (q.filename === row.jsonEntry) {
                                q.sql = row.sqlContent;
                                q.database = row.sqlDatabase;
                                q.schema = row.sqlSchema;
                                q.table = row.sqlTable;
                            }
                        }
                    }
                } else {
                    // Unmatched: add as new query to the report
                    const report = row.reportEntry || 'General';
                    let rEntry = merged.find(r => r.report === report);
                    if (!rEntry) { rEntry = { report, queries: [] }; merged.push(rEntry); }
                    rEntry.queries.push({
                        filename: row.filenameHint || row.sqlFile,
                        sql: row.sqlContent,
                        database: row.sqlDatabase,
                        schema: row.sqlSchema,
                        table: row.sqlTable,
                        parameters: {}
                    });
                }
            }
            setGeneratedResult(merged);
            const geoSuffix = selectedGeography && selectedGeography !== 'general' ? `_${selectedGeography.toLowerCase()}` : '';
            setEditorReports(merged, `${(selectedClient || 'queries').toLowerCase().replace(/\s+/g, '_')}${geoSuffix}_${(selectedEnv || '').toLowerCase()}.json`);
        }
        setWizardStep(4);
        addLog('EDITOR', 'GENERAR_JSON', `JSON generado: ${selectedClient} ${selectedGeography} ${selectedEnv} – ${mappingRows.length} consultas`, 'SUCCESS');
    };

    const totalQueries = (generatedResult || []).reduce((acc, r) => acc + (r.queries?.length || 0), 0);

    const handleWizardDownload = () => {
        if (!generatedResult) return;
        const geoSuffix = selectedGeography && selectedGeography !== 'general' ? `_${selectedGeography.toLowerCase()}` : '';
        const fileName = normalizeJsonFileName(`${(selectedClient || 'queries').toLowerCase().replace(/\s+/g, '_')}${geoSuffix}_${(selectedEnv || '').toLowerCase()}`);
        const content = JSON.stringify(generatedResult, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addLog('EDITOR', 'DESCARGA_JSON', `JSON descargado: ${fileName}`, 'SUCCESS');
    };

    const handleUploadToRepo = async () => {
        if (!generatedResult || !selectedClient || !selectedEnv) return;
        const geoSuffix = selectedGeography && selectedGeography !== 'general' ? `_${selectedGeography.toLowerCase()}` : '';
        const fileName = normalizeJsonFileName(`${(selectedClient).toLowerCase().replace(/\s+/g, '_')}${geoSuffix}_${selectedEnv.toLowerCase()}`);
        const content = JSON.stringify(generatedResult, null, 2);
        const geoParam = selectedGeography && selectedGeography !== 'general' ? selectedGeography : 'general';
        try {
            const res = await fetch('/api/repository/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client: selectedClient,
                    geography: geoParam,
                    env: selectedEnv,
                    fileName,
                    content,
                    comment: `Generado desde wizard – ${mappingRows.length} consultas SQL`,
                    uploadedBy: 'editor'
                })
            });
            if (!res.ok) throw new Error(await res.text());
            addLog('EDITOR', 'SUBIR_REPO', `JSON subido al repositorio: ${fileName}`, 'SUCCESS');
            alert(`JSON subido al repositorio correctamente como ${fileName}.`);
        } catch (err: any) {
            addLog('EDITOR', 'ERROR', `Error subiendo al repositorio: ${err.message}`, 'ERROR');
            alert('Error al subir al repositorio.');
        }
    };

    const resetWizard = () => {
        setWizardStep(1);
        setSelectedClient('');
        setSelectedGeography('');
        setSelectedEnv('');
        setTemplateLoaded(false);
        setTemplateName('');
        setSqlImportTemplate({ data: null, fileName: null });
        setMappingRows([]);
        setGeneratedResult(null);
    };

    const CLIENTS: Client[] = ['Banca March', 'Bankinter', 'BBVA', 'Pichincha'];

    // â”€â”€â”€ WIZARD STEP INDICATOR â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const StepIndicator = () => (
        <div className="flex items-center gap-0 mb-8">
            {[
                { n: 1, label: 'Entorno' },
                { n: 2, label: 'Plantilla' },
                { n: 3, label: 'SQL y Mapeo' },
                { n: 4, label: 'Resultado' },
            ].map((s, i, arr) => (
                <React.Fragment key={s.n}>
                    <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${wizardStep === s.n ? 'bg-nafra-accent border-nafra-accent text-white' : wizardStep > s.n ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-nafra-surface border-nafra-border text-nafra-text-muted'}`}>
                            {wizardStep > s.n ? <Check size={14} /> : s.n}
                        </div>
                        <span className={`text-[10px] mt-1 font-medium ${wizardStep === s.n ? 'text-nafra-accent' : wizardStep > s.n ? 'text-emerald-400' : 'text-nafra-text-muted'}`}>{s.label}</span>
                    </div>
                    {i < arr.length - 1 && (
                        <div className={`flex-1 h-0.5 mx-2 mb-4 transition-all ${wizardStep > s.n ? 'bg-emerald-500' : 'bg-nafra-border'}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );

    return (
        <div className="h-full flex flex-col animate-fade-in w-full relative">
            <PageHeader title="Creacion JSON" subtitle="Genera archivos de configuracion de consultas a partir de carpetas SQL" icon={<FileJson size={20} />} />
            <RepositoryExplorerModal
                isOpen={isRepoExplorerOpen}
                onClose={() => setIsRepoExplorerOpen(false)}
                onSelect={repoExplorerMode === 'template' ? handleWizardTemplateRepo : handleSelectRepoFile}
            />
            {/* Hidden inputs */}
            <input ref={templateLocalInputRef} type="file" accept=".json" className="hidden" onChange={handleWizardTemplateLocal} />
            <input ref={wizardSqlFolderRef} type="file" multiple accept=".sql" className="hidden" onChange={handleWizardSqlFolder} />
            <input ref={libraryUploadRef} type="file" accept=".json" className="hidden" onChange={handleLibraryUpload} />

            {/* TAB BAR */}
            <div className="flex items-center gap-2 px-4 pt-4 pb-2">
                <button
                    onClick={() => setPageView('wizard')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border ${
                        pageView === 'wizard'
                            ? 'bg-nafra-accent/10 border-nafra-accent text-nafra-accent'
                            : 'bg-nafra-surface border-nafra-border text-nafra-text-dim hover:text-nafra-text hover:bg-nafra-card-hover'
                    }`}
                >
                    <FileJson size={16} /> Asistente de creacion
                </button>
                <button
                    onClick={() => setPageView('templates')}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border ${
                        pageView === 'templates'
                            ? 'bg-nafra-accent/10 border-nafra-accent text-nafra-accent'
                            : 'bg-nafra-surface border-nafra-border text-nafra-text-dim hover:text-nafra-text hover:bg-nafra-card-hover'
                    }`}
                >
                    <LibraryBig size={16} /> Biblioteca de Plantillas
                </button>
            </div>

            {/* TEMPLATE LIBRARY VIEW */}
            {pageView === 'templates' && (
                <div className="flex-1 overflow-y-auto py-6 px-4 flex flex-col items-center">
                    <div className="w-full max-w-3xl">
                        <div className="bg-nafra-card border border-nafra-border rounded-2xl p-8 shadow-premium animate-fade-in">
                            <h2 className="text-lg font-bold text-nafra-text mb-1 flex items-center gap-2">
                                <LibraryBig size={20} className="text-nafra-accent" /> Biblioteca de Plantillas
                            </h2>
                            <p className="text-sm text-nafra-text-dim mb-6">
                                Gestiona las plantillas JSON por cliente. Usa el boton <strong>Usar</strong> para cargarla directamente en el asistente.
                            </p>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-nafra-text-muted uppercase mb-2">Cliente</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {CLIENTS.map(c => (
                                        <button key={c} onClick={() => handleLibraryClientChange(c)}
                                            className={`py-3 px-4 rounded-xl border text-sm font-semibold text-left transition-all ${
                                                libraryClient === c
                                                    ? 'bg-nafra-accent/10 border-nafra-accent text-nafra-accent'
                                                    : 'bg-nafra-surface border-nafra-border text-nafra-text hover:bg-nafra-card-hover'
                                            }`}>
                                            {c}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {libraryClient && geographiesForLibraryClient && (
                                <div className="mb-6">
                                    <label className="block text-xs font-bold text-nafra-text-muted uppercase mb-2">Geografia</label>
                                    <div className="flex flex-wrap gap-3">
                                        {geographiesForLibraryClient.map(g => (
                                            <button key={g} onClick={() => handleLibraryGeographyChange(g)}
                                                className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${
                                                    libraryGeography === g
                                                        ? 'bg-nafra-accent/10 border-nafra-accent text-nafra-accent'
                                                        : 'bg-nafra-surface border-nafra-border text-nafra-text hover:bg-nafra-card-hover'
                                                }`}>
                                                {g}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {libraryClient && (!geographiesForLibraryClient || libraryGeography) && (
                                <button
                                    onClick={() => libraryUploadRef.current?.click()}
                                    className="mb-5 w-full py-2.5 px-4 bg-nafra-accent hover:bg-nafra-accent-dim text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
                                >
                                    <Upload size={16} /> Subir plantilla para {libraryClient}{libraryGeography ? ` · ${libraryGeography}` : ''}
                                </button>
                            )}

                            {libraryClient && (!geographiesForLibraryClient || libraryGeography) && (
                                <div>
                                    {libraryLoading ? (
                                        <p className="text-sm text-nafra-text-muted text-center py-6">Cargando...</p>
                                    ) : libraryTemplates.length === 0 ? (
                                        <div className="border-2 border-dashed border-nafra-border rounded-xl py-10 flex flex-col items-center gap-2 text-nafra-text-muted">
                                            <BookOpen size={28} />
                                            <span className="text-sm">No hay plantillas para {libraryClient}{libraryGeography ? ` · ${libraryGeography}` : ''}</span>
                                            <span className="text-xs">Sube la primera con el boton de arriba</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {libraryTemplates.map(tpl => (
                                                <div key={tpl.id} className="flex items-center justify-between bg-nafra-surface border border-nafra-border rounded-xl px-4 py-3 hover:bg-nafra-card-hover transition-colors">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <FileJson size={18} className="text-nafra-accent shrink-0" />
                                                        <div className="min-w-0">
                                                            <p className="text-sm font-semibold text-nafra-text truncate" title={tpl.name}>{tpl.name}</p>
                                                            <p className="text-[10px] text-nafra-text-muted">
                                                                {new Date(tpl.uploaded_at.replace(' ', 'T') + 'Z').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <button
                                                            onClick={() => handleLibrarySelect(tpl)}
                                                            className="px-3 py-1.5 bg-nafra-accent/10 border border-nafra-accent/30 text-nafra-accent text-xs font-bold rounded-lg hover:bg-nafra-accent/20 transition-all"
                                                        >
                                                            Usar
                                                        </button>
                                                        <button
                                                            onClick={() => handleLibraryDelete(tpl.id, tpl.name)}
                                                            className="p-1.5 text-nafra-text-muted hover:text-nafra-danger hover:bg-nafra-danger/10 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* WIZARD VIEW */}
            {pageView === 'wizard' && (
            <div className="flex-1 overflow-y-auto py-8 px-4 flex flex-col items-center">
                <div className="w-full max-w-3xl">
                    <StepIndicator />

                    {/* â”€â”€ STEP 1: Entorno â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    {wizardStep === 1 && (
                        <div className="bg-nafra-card border border-nafra-border rounded-2xl p-8 shadow-premium animate-fade-in">
                            <h2 className="text-lg font-bold text-nafra-text mb-1 flex items-center gap-2"><Building2 size={20} className="text-nafra-accent" /> Seleccionar Entorno</h2>
                            <p className="text-sm text-nafra-text-dim mb-6">Elige el banco, la geografía (si aplica) y el entorno de destino.</p>

                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-nafra-text-muted uppercase mb-2">Banco</label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {CLIENTS.map(c => (
                                            <button key={c} onClick={() => { setSelectedClient(c); setSelectedGeography(''); }}
                                                className={`py-3 px-4 rounded-xl border text-sm font-semibold text-left transition-all ${selectedClient === c ? 'bg-nafra-accent/10 border-nafra-accent text-nafra-accent' : 'bg-nafra-surface border-nafra-border text-nafra-text hover:bg-nafra-card-hover'}`}>
                                                {c}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {selectedClient && geographiesForClient && (
                                    <div>
                                        <label className="block text-xs font-bold text-nafra-text-muted uppercase mb-2">Geografía</label>
                                        <div className="flex flex-wrap gap-3">
                                            {geographiesForClient.map(g => (
                                                <button key={g} onClick={() => setSelectedGeography(g)}
                                                    className={`py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all ${selectedGeography === g ? 'bg-nafra-accent/10 border-nafra-accent text-nafra-accent' : 'bg-nafra-surface border-nafra-border text-nafra-text hover:bg-nafra-card-hover'}`}>
                                                    {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {selectedClient && (
                                    <div>
                                        <label className="block text-xs font-bold text-nafra-text-muted uppercase mb-2">Entorno</label>
                                        <div className="flex gap-3">
                                            {(['PRE', 'PRO'] as Environment[]).map(env => (
                                                <button key={env} onClick={() => setSelectedEnv(env)}
                                                    className={`py-2.5 px-6 rounded-xl border text-sm font-bold transition-all ${selectedEnv === env ? 'bg-nafra-accent/10 border-nafra-accent text-nafra-accent' : 'bg-nafra-surface border-nafra-border text-nafra-text hover:bg-nafra-card-hover'}`}>
                                                    {env}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    disabled={!selectedClient || !selectedEnv || (!!geographiesForClient && !selectedGeography)}
                                    onClick={() => setWizardStep(2)}
                                    className="px-6 py-2.5 bg-nafra-accent hover:bg-nafra-accent-dim text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    Siguiente <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* â”€â”€ STEP 2: Plantilla â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    {wizardStep === 2 && (
                        <div className="bg-nafra-card border border-nafra-border rounded-2xl p-8 shadow-premium animate-fade-in">
                            <h2 className="text-lg font-bold text-nafra-text mb-1 flex items-center gap-2"><FileJson size={20} className="text-nafra-accent" /> Cargar Plantilla JSON</h2>
                            <p className="text-sm text-nafra-text-dim mb-6">
                                La plantilla define la estructura de reportes y los nombres canónicos de los archivos. Los SQL se inyectarán en sus entradas correspondientes.
                            </p>

                            {templateLoaded ? (
                                <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-5 py-4 mb-6">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle size={20} className="text-emerald-400 shrink-0" />
                                        <div>
                                            <p className="text-sm font-bold text-nafra-text">{templateName}</p>
                                            <p className="text-xs text-nafra-text-dim">
                                                {Array.isArray(sqlImportTemplate.data) ? `${sqlImportTemplate.data.length} reportes cargados` : ''}
                                            </p>
                                        </div>
                                    </div>
                                    <button onClick={() => { setTemplateLoaded(false); setTemplateName(''); setSqlImportTemplate({ data: null, fileName: null }); }}
                                        className="p-2 hover:bg-nafra-surface rounded-lg text-nafra-text-muted hover:text-nafra-danger transition-colors">
                                        <X size={16} />
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3 mb-6">
                                    <button
                                        onClick={() => {
                                            setPageView('templates');
                                            if (selectedClient) {
                                                handleLibraryClientChange(selectedClient as Client);
                                                if (selectedGeography && CLIENT_GEOGRAPHIES[selectedClient as Client]) {
                                                    handleLibraryGeographyChange(selectedGeography);
                                                }
                                            }
                                        }}
                                        className="w-full py-2.5 px-4 bg-nafra-accent/10 hover:bg-nafra-accent/20 text-nafra-accent text-sm font-semibold text-left rounded-lg transition border border-nafra-accent/30 flex items-center gap-2"
                                    >
                                        <LibraryBig size={16} /> Cargar desde biblioteca
                                    </button>
                                    <button onClick={() => templateLocalInputRef.current?.click()}
                                        className="w-full py-2.5 px-4 bg-nafra-surface hover:bg-nafra-card-hover text-nafra-text text-sm font-medium text-left rounded-lg transition border border-nafra-border">
                                        Cargar desde local
                                    </button>

                                </div>
                            )}

                            <p className="text-xs text-nafra-text-muted italic">Si no tienes plantilla todavía, puedes omitir este paso y el JSON se generará directamente desde los archivos SQL.</p>

                            <div className="mt-8 flex justify-between">
                                <button onClick={() => setWizardStep(1)} className="px-6 py-2.5 bg-nafra-surface border border-nafra-border text-nafra-text font-bold rounded-xl flex items-center gap-2 hover:bg-nafra-card-hover transition-all">
                                    <ArrowLeft size={16} /> Anterior
                                </button>
                                <button onClick={() => setWizardStep(3)} className="px-6 py-2.5 bg-nafra-accent hover:bg-nafra-accent-dim text-white font-bold rounded-xl flex items-center gap-2 transition-all">
                                    {templateLoaded ? 'Siguiente' : 'Omitir y continuar'} <ArrowRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* â”€â”€ STEP 3: SQL y Mapeo â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    {wizardStep === 3 && (
                        <div className="bg-nafra-card border border-nafra-border rounded-2xl p-8 shadow-premium animate-fade-in">
                            <h2 className="text-lg font-bold text-nafra-text mb-1 flex items-center gap-2"><FolderInput size={20} className="text-nafra-accent" /> Carpeta SQL y Mapeo</h2>
                            <p className="text-sm text-nafra-text-dim mb-6">Selecciona la carpeta con los archivos SQL. Verifica y ajusta el mapeo antes de generar el JSON.</p>

                            {mappingRows.length === 0 ? (
                                <button onClick={() => wizardSqlFolderRef.current?.click()}
                                    className="w-full py-10 border-2 border-dashed border-nafra-border rounded-xl flex flex-col items-center gap-3 text-nafra-text-muted hover:border-nafra-accent hover:text-nafra-accent transition-all cursor-pointer bg-nafra-surface">
                                    <FolderInput size={32} />
                                    <span className="font-semibold text-sm">Seleccionar carpeta SQL</span>
                                    <span className="text-xs">Haz clic para elegir una carpeta con archivos .sql</span>
                                </button>
                            ) : (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-sm font-semibold text-nafra-text">{mappingRows.length} archivos SQL detectados</span>
                                        <button onClick={() => { setMappingRows([]); wizardSqlFolderRef.current?.click(); }}
                                            className="text-xs text-nafra-accent hover:underline flex items-center gap-1">
                                            <RefreshCw size={12} /> Cambiar carpeta
                                        </button>
                                    </div>
                                    <div className="border border-nafra-border rounded-xl overflow-hidden">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-nafra-surface">
                                                <tr>
                                                    <th className="px-3 py-2.5 font-bold text-nafra-text-muted uppercase tracking-wide">Archivo SQL</th>
                                                    <th className="px-3 py-2.5 font-bold text-nafra-text-muted uppercase tracking-wide text-center w-6"><Link size={12} /></th>
                                                    <th className="px-3 py-2.5 font-bold text-nafra-text-muted uppercase tracking-wide">Reporte</th>
                                                    <th className="px-3 py-2.5 font-bold text-nafra-text-muted uppercase tracking-wide">Entrada JSON</th>
                                                    <th className="px-3 py-2.5 font-bold text-nafra-text-muted uppercase tracking-wide text-center">Estado</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-nafra-border bg-nafra-card">
                                                {mappingRows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-nafra-surface transition-colors">
                                                        <td className="px-3 py-2.5 font-mono text-nafra-text">{row.sqlFile}</td>
                                                        <td className="px-3 py-2.5 text-center text-nafra-text-muted">
                                                            <ArrowRight size={12} />
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            {row.availableEntries.length > 0 ? (
                                                                <select
                                                                    value={row.reportEntry}
                                                                    onChange={e => {
                                                                        const entry = row.availableEntries.find(ae => ae.report === e.target.value);
                                                                        const newRows = [...mappingRows];
                                                                        newRows[idx] = { ...row, reportEntry: e.target.value, jsonEntry: entry ? entry.filename : row.jsonEntry, matched: !!entry };
                                                                        setMappingRows(newRows);
                                                                    }}
                                                                    className="w-full bg-nafra-surface border border-nafra-border rounded-lg px-2 py-1 text-nafra-text text-xs outline-none focus:ring-1 focus:ring-nafra-accent"
                                                                >
                                                                    <option value="">– Sin asignar –</option>
                                                                    {[...new Set(row.availableEntries.map(e => e.report))].map(r => (
                                                                        <option key={r} value={r}>{r}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.reportEntry}
                                                                    onChange={e => { const newRows = [...mappingRows]; newRows[idx] = { ...row, reportEntry: e.target.value }; setMappingRows(newRows); }}
                                                                    className="w-full bg-nafra-surface border border-nafra-border rounded-lg px-2 py-1 text-nafra-text text-xs outline-none focus:ring-1 focus:ring-nafra-accent"
                                                                    placeholder="Nombre del reporte"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2.5">
                                                            {row.availableEntries.length > 0 ? (
                                                                <select
                                                                    value={row.jsonEntry}
                                                                    onChange={e => {
                                                                        const entry = row.availableEntries.find(ae => ae.filename === e.target.value);
                                                                        const newRows = [...mappingRows];
                                                                        newRows[idx] = { ...row, jsonEntry: e.target.value, reportEntry: entry ? entry.report : row.reportEntry, matched: !!e.target.value };
                                                                        setMappingRows(newRows);
                                                                    }}
                                                                    className="w-full bg-nafra-surface border border-nafra-border rounded-lg px-2 py-1 text-nafra-text text-xs outline-none focus:ring-1 focus:ring-nafra-accent"
                                                                >
                                                                    <option value="">– Nueva entrada –</option>
                                                                    {row.availableEntries.map(ae => (
                                                                        <option key={ae.filename} value={ae.filename}>{ae.filename}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <input
                                                                    type="text"
                                                                    value={row.filenameHint}
                                                                    onChange={e => { const newRows = [...mappingRows]; newRows[idx] = { ...row, filenameHint: e.target.value }; setMappingRows(newRows); }}
                                                                    className="w-full bg-nafra-surface border border-nafra-border rounded-lg px-2 py-1 text-nafra-text text-xs outline-none focus:ring-1 focus:ring-nafra-accent font-mono"
                                                                    placeholder="carpeta/nombre_archivo"
                                                                />
                                                            )}
                                                        </td>
                                                        <td className="px-3 py-2.5 text-center">
                                                            {row.matched
                                                                ? <span className="inline-flex items-center gap-1 text-emerald-400 font-semibold"><Check size={12} /> Vinculado</span>
                                                                : <span className="inline-flex items-center gap-1 text-amber-400 font-semibold"><AlertCircle size={12} /> Nuevo</span>
                                                            }
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-3 flex items-center gap-4 text-xs text-nafra-text-muted">
                                        <span className="flex items-center gap-1 text-emerald-400"><Check size={12} /> {mappingRows.filter(r => r.matched).length} vinculados</span>
                                        <span className="flex items-center gap-1 text-amber-400"><AlertCircle size={12} /> {mappingRows.filter(r => !r.matched).length} nuevos</span>
                                    </div>
                                </div>
                            )}

                            <div className="mt-8 flex justify-between">
                                <button onClick={() => setWizardStep(2)} className="px-6 py-2.5 bg-nafra-surface border border-nafra-border text-nafra-text font-bold rounded-xl flex items-center gap-2 hover:bg-nafra-card-hover transition-all">
                                    <ArrowLeft size={16} /> Anterior
                                </button>
                                <button
                                    disabled={mappingRows.length === 0}
                                    onClick={handleGenerateJson}
                                    className="px-6 py-2.5 bg-nafra-accent hover:bg-nafra-accent-dim text-white font-bold rounded-xl flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                >
                                    <FileJson size={16} /> Generar JSON
                                </button>
                            </div>
                        </div>
                    )}

                    {/* â”€â”€ STEP 4: Resultado â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
                    {wizardStep === 4 && generatedResult && (
                        <div className="bg-nafra-card border border-nafra-border rounded-2xl p-8 shadow-premium animate-fade-in">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center">
                                    <CheckCircle size={24} className="text-emerald-400" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-nafra-text">JSON generado correctamente</h2>
                                    <p className="text-sm text-nafra-text-dim">{selectedClient} {selectedGeography !== 'general' && selectedGeography ? `Â· ${selectedGeography}` : ''} Â· {selectedEnv}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 mb-8">
                                <div className="bg-nafra-surface border border-nafra-border rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-nafra-accent">{generatedResult.length}</p>
                                    <p className="text-xs text-nafra-text-muted mt-1">Reportes</p>
                                </div>
                                <div className="bg-nafra-surface border border-nafra-border rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-nafra-accent">{totalQueries}</p>
                                    <p className="text-xs text-nafra-text-muted mt-1">Consultas SQL</p>
                                </div>
                                <div className="bg-nafra-surface border border-nafra-border rounded-xl p-4 text-center">
                                    <p className="text-2xl font-bold text-emerald-400">{mappingRows.filter(r => r.matched).length}</p>
                                    <p className="text-xs text-nafra-text-muted mt-1">Vinculados</p>
                                </div>
                            </div>

                            <div className="flex flex-col gap-3 mb-6">
                                <button onClick={handleWizardDownload}
                                    className="w-full py-3 bg-nafra-accent hover:bg-nafra-accent-dim text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow">
                                    <Download size={18} /> Descargar JSON
                                </button>
                                <button onClick={handleUploadToRepo}
                                    className="w-full py-3 bg-nafra-surface border border-nafra-border hover:bg-nafra-card-hover text-nafra-text font-bold rounded-xl flex items-center justify-center gap-2 transition-all">
                                    <Upload size={18} /> Subir al Repositorio
                                </button>
                            </div>

                            <div className="flex justify-center">
                                <button onClick={resetWizard}
                                    className="px-5 py-2 text-nafra-text-dim hover:text-nafra-text text-sm flex items-center gap-2 hover:bg-nafra-surface rounded-lg transition-all">
                                    <RefreshCw size={14} /> Generar otro JSON
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            )}
        </div>
    );
};

export default JsonEditor;
