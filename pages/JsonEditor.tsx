import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Save, FileJson, Edit3, X, Upload, Plus, Database, Maximize2, Minimize2, Wand2, SlidersHorizontal, Trash2, ChevronDown, Download, FileCode, FolderInput, FileText, Check, CheckCircle, AlertCircle, Filter, Search } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import PageHeader from '../components/PageHeader';
import { useGlobalState } from '../context/GlobalStateContext';
import { QueryDefinition, QueryParam, ReportDefinition } from '../types';
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


    // Estado para el modal de exploración de repositorio
    const [isRepoExplorerOpen, setIsRepoExplorerOpen] = useState(false);

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

    // Handler for selecting a file from the repository
    const handleSelectRepoFile = (file: any) => {
        if (!file) return;
        let json;
        try {
            json = typeof file.content === 'string' ? JSON.parse(file.content) : file.content;
            setEditorReports(json, file.fileName);
            setIsRepoExplorerOpen(false);
            setModifiedIndices(new Set());
            addLog('EDITOR', 'CARGA_ARCHIVO', `JSON cargado desde repositorio: ${file.fileName}`, 'SUCCESS');
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


    // Stub for reformatSql to avoid error
    const reformatSql = () => {};

    // Handler for saving JSON (download)
    const handleSaveJson = () => {
        if (!editorReports.data) return;
        const blob = new Blob([JSON.stringify(editorReports.data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = editorReports.fileName || 'queries.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        addLog('EDITOR', 'DESCARGA_JSON', `JSON descargado: ${editorReports.fileName || 'queries.json'}`, 'SUCCESS');
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
        setEditingItem({ reportIndex, queryIndex, data: { ...q } });
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
    const handleAddSqlToJson = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            let db = '';
            let schema = '';
            let table = '';
            let modifiedSql = content;
            const threePartMatch = content.match(/FROM\s+([a-zA-Z0-9_\-]+)\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i);
            const twoPartMatch = content.match(/FROM\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i);
            if (threePartMatch) {
                db = threePartMatch[1];
                schema = threePartMatch[2];
                table = threePartMatch[3];
                modifiedSql = content.replace(threePartMatch[0], `FROM %s.%s`);
            } else if (twoPartMatch) {
                schema = twoPartMatch[1];
                table = twoPartMatch[2];
                modifiedSql = content.replace(twoPartMatch[0], `FROM %s.%s`);
            }
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
            let db = editingItem.data.database;
            let schema = editingItem.data.schema;
            let table = editingItem.data.table;
            let modifiedContent = content;

            // Regex patterns to find FROM clause
            // Allow hyphens in the first part (Database/Project) to support BigQuery/GCP naming conventions
            const threePartMatch = content.match(/FROM\s+([a-zA-Z0-9_\-]+)\.([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i);
            const twoPartMatch = content.match(/FROM\s+([a-zA-Z0-9_]+)\.([a-zA-Z0-9_]+)/i);

            if (threePartMatch) {
                db = threePartMatch[1];
                schema = threePartMatch[2];
                table = threePartMatch[3];
                // Replace with standard placeholder
                modifiedContent = content.replace(threePartMatch[0], `FROM %s.%s`);
                addLog('EDITOR', 'AUTO_DETECT', `Detectado DB: ${db}, Schema: ${schema}, Table: ${table}`, 'INFO');
            } else if (twoPartMatch) {
                schema = twoPartMatch[1];
                table = twoPartMatch[2];
                modifiedContent = content.replace(twoPartMatch[0], `FROM %s.%s`);
                addLog('EDITOR', 'AUTO_DETECT', `Detectado Schema: ${schema}, Table: ${table}`, 'INFO');
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



    return (
        <div className="h-full flex flex-col animate-fade-in w-full relative">
            <PageHeader title="Editor JSON" subtitle="Mantenimiento y limpieza del archivo de configuración" icon={<FileJson size={20} />} />
            <RepositoryExplorerModal
                isOpen={isRepoExplorerOpen}
                onClose={() => setIsRepoExplorerOpen(false)}
                onSelect={handleSelectRepoFile}
            />

            {/* ADD SQL TO JSON MODAL */}
            {addSqlModal.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-fade-in border border-gray-200 flex flex-col overflow-hidden">
                        <div className="bg-alquid-navy p-5 text-white flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><FileCode size={18} /> Añadir SQL como informe</h3>
                            <button onClick={() => setAddSqlModal({ ...addSqlModal, isOpen: false })} className="hover:bg-white/20 p-1 rounded"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Reporte</label>
                                <input
                                    type="text"
                                    value={addSqlModal.reportName}
                                    onChange={e => setAddSqlModal({ ...addSqlModal, reportName: e.target.value })}
                                    list="add-sql-reports-list"
                                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none"
                                    placeholder="Nombre del reporte (existente o nuevo)"
                                    autoFocus
                                />
                                <datalist id="add-sql-reports-list">
                                    {(Array.isArray(editorReports.data) ? editorReports.data : []).map((r: any) => <option key={r.report} value={r.report} />)}
                                </datalist>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del archivo / informe</label>
                                <input
                                    type="text"
                                    value={addSqlModal.filename}
                                    onChange={e => setAddSqlModal({ ...addSqlModal, filename: e.target.value })}
                                    className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none"
                                    placeholder="carpeta/nombre_archivo"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">Puedes usar carpeta/nombre para organizar en subcarpetas.</p>
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Database</label>
                                    <input type="text" value={addSqlModal.database} onChange={e => setAddSqlModal({ ...addSqlModal, database: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Schema</label>
                                    <input type="text" value={addSqlModal.schema} onChange={e => setAddSqlModal({ ...addSqlModal, schema: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none bg-white" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tabla</label>
                                    <input type="text" value={addSqlModal.table} onChange={e => setAddSqlModal({ ...addSqlModal, table: e.target.value })} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none bg-white" />
                                </div>
                            </div>
                            {(addSqlModal.database || addSqlModal.schema || addSqlModal.table) && (
                                <p className="text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
                                    <Check size={14} /> Datos autodetectados del FROM. Puedes editarlos.
                                </p>
                            )}
                        </div>
                        <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
                            <button onClick={() => setAddSqlModal({ ...addSqlModal, isOpen: false })} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg text-sm">Cancelar</button>
                            <button
                                onClick={confirmAddSqlToJson}
                                disabled={!addSqlModal.reportName.trim() || !addSqlModal.filename.trim()}
                                className="px-6 py-2 bg-alquid-navy text-white font-bold rounded-lg hover:bg-blue-900 transition-colors shadow text-sm flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Plus size={16} /> Añadir al JSON
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RENAME MODAL */}
            {renameModal.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[1px] flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-fade-in border border-gray-200">
                        <div className="p-5">
                            <h3 className="text-lg font-bold text-gray-800 mb-4">
                                {renameModal.type === 'REPORT' ? 'Renombrar Reporte' : 'Renombrar Archivo'}
                            </h3>

                            {renameModal.type === 'FILE' && (
                                <div className="mb-3">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Carpeta</label>
                                    <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 bg-gray-50">
                                        <FolderInput size={16} className="text-gray-400" />
                                        <input
                                            type="text"
                                            value={renameModal.folderValue}
                                            onChange={(e) => setRenameModal({ ...renameModal, folderValue: e.target.value })}
                                            className="w-full bg-transparent outline-none text-sm text-gray-700"
                                            placeholder="Sin carpeta"
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">
                                    {renameModal.type === 'REPORT' ? 'Nombre del Reporte' : 'Nombre del Archivo'}
                                </label>
                                <div className="flex items-center gap-2 border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-alquid-blue transition-all bg-white">
                                    {renameModal.type === 'REPORT' ? <FileJson size={16} className="text-gray-400" /> : <FileText size={16} className="text-gray-400" />}
                                    <input
                                        type="text"
                                        value={renameModal.currentValue}
                                        onChange={(e) => setRenameModal({ ...renameModal, currentValue: e.target.value })}
                                        className="w-full bg-transparent outline-none text-sm font-medium"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3">
                                <button onClick={() => setRenameModal({ ...renameModal, isOpen: false })} className="px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-lg text-sm font-medium">Cancelar</button>
                                <button onClick={applyRename} className="px-4 py-2 bg-alquid-blue text-white rounded-lg text-sm font-bold shadow hover:bg-blue-600">Guardar</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDITOR MODAL */}
            {editingItem && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-0 md:p-4">
                    <div className={`bg-white shadow-2xl flex flex-col overflow-hidden transition-all duration-300 relative ${isFullscreen ? 'w-full h-full rounded-none' : 'w-[95vw] h-[90vh] md:max-w-6xl rounded-2xl border border-gray-200'}`}>
                        {paramModal.isOpen && (
                            <div className="absolute inset-0 z-[60] bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
                                <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90%] animate-fade-in border border-gray-200">
                                    <div className="bg-alquid-navy p-4 text-white flex justify-between items-center shrink-0">
                                        <h3 className="font-bold flex items-center gap-2">
                                            {paramModal.originalKey ? <Edit3 size={16} /> : <Plus size={16} />}
                                            {paramModal.originalKey ? 'Editar Parámetro' : 'Nuevo Parámetro'}
                                        </h3>
                                        <button onClick={() => setParamModal({ ...paramModal, isOpen: false })} className="hover:bg-white/20 p-1 rounded"><X size={20} /></button>
                                    </div>
                                    <div className="p-6 overflow-y-auto flex-1 space-y-6">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nombre del Parámetro (Key)</label>
                                            <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-alquid-blue focus-within:border-alquid-blue transition-all">
                                                <span className="text-gray-400 font-mono font-bold">:</span>
                                                <input type="text" value={paramModal.key} onChange={(e) => setParamModal({ ...paramModal, key: e.target.value })} placeholder="nombre_parametro" className="bg-transparent border-none outline-none w-full text-sm font-semibold text-gray-900 placeholder-gray-400" autoFocus />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Valor (Texto o JSON)</label>
                                            <textarea value={paramModal.value} onChange={(e) => setParamModal({ ...paramModal, value: e.target.value })} className="w-full h-32 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-alquid-blue outline-none placeholder-gray-400 shadow-sm font-mono" placeholder='Ejemplo: "MiValor" o ["Item1", "Item2"]' />
                                        </div>
                                    </div>
                                    <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 shrink-0">
                                        <button onClick={() => setParamModal({ ...paramModal, isOpen: false })} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg transition-colors text-sm">Cancelar</button>
                                        <button onClick={saveParamModal} className="px-6 py-2 bg-alquid-blue text-white font-bold rounded-lg hover:bg-blue-600 transition-colors shadow-lg text-sm flex items-center gap-2"><Check size={16} /> Guardar Parámetro</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="bg-gray-50 border-b border-gray-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
                            <div className="flex items-center gap-4">
                                <div className="bg-blue-100 p-2 rounded-lg text-alquid-blue"><Edit3 size={20} /></div>
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">{isNewQueryMode ? "Crear Nueva Query" : "Editar Query"}</h3>
                                    <p className="text-xs text-gray-500 font-mono">{isNewQueryMode ? "Nueva entrada" : editingItem.data.filename}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={reformatSql} className="p-2 text-gray-500 hover:text-alquid-blue hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 text-sm font-medium mr-2"><Wand2 size={16} /> <span className="hidden md:inline">Formatear</span></button>
                                <button onClick={() => setIsFullscreen(!isFullscreen)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">{isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}</button>
                                <button onClick={() => setEditingItem(null)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><X size={24} /></button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                            <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-gray-200">
                                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                    <span>Editor SQL</span>
                                    <div className="flex items-center gap-2">
                                        <input type="file" accept=".sql" ref={sqlInputRef} onChange={handleSqlFileUpload} className="hidden" />
                                        <button onClick={() => sqlInputRef.current?.click()} className="text-alquid-blue hover:underline flex items-center gap-1 cursor-pointer"><Upload size={12} /> Cargar .SQL</button>
                                    </div>
                                </div>
                                <div className="flex-1 overflow-auto bg-white relative">
                                    <div className="absolute inset-0 min-h-full">
                                        <Editor value={editingItem.data.sql} onValueChange={(code) => handleEditorChange('sql', code)} highlight={highlightSql} padding={24} className="font-mono text-sm leading-relaxed min-h-full" textareaClassName="focus:outline-none" style={{ fontFamily: '"Fira Code", "Menlo", "Monaco", "Consolas", monospace', fontSize: 14, backgroundColor: '#ffffff', minHeight: '100%' }} />
                                    </div>
                                </div>
                            </div>

                            <div className="w-full md:w-80 bg-gray-50 flex flex-col border-t md:border-t-0 h-[40vh] md:h-full flex-shrink-0 overflow-y-auto custom-scrollbar">
                                <div className="p-6 space-y-6">
                                    <h4 className="text-sm font-bold text-gray-800 border-b border-gray-200 pb-2 mb-4 flex items-center gap-2"><Database size={16} /> Configuración</h4>
                                    {isNewQueryMode && (
                                        <div className="space-y-4">
                                            {/* Dedicated Upload Section */}
                                            <div className="mb-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Importar Definición (Opcional)</label>
                                                <input type="file" accept=".sql" ref={importSqlInputRef} onChange={handleImportNewQuerySql} className="hidden" />

                                                {!importedFileName ? (
                                                    <div
                                                        onClick={() => importSqlInputRef.current?.click()}
                                                        className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-alquid-blue hover:bg-blue-50 transition-all group"
                                                    >
                                                        <div className="bg-white p-2 rounded-full mb-2 shadow-sm group-hover:scale-110 transition-transform">
                                                            <Upload size={20} className="text-gray-400 group-hover:text-alquid-blue" />
                                                        </div>
                                                        <span className="text-xs font-bold text-gray-500 group-hover:text-alquid-blue">Cargar .SQL</span>
                                                        <span className="text-[10px] text-gray-400 mt-1">Autodetecta DB y Tabla</span>
                                                    </div>
                                                ) : (
                                                    <div className="border border-green-200 bg-green-50 rounded-xl p-3 flex items-center justify-between">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <div className="bg-white p-1 rounded-full text-green-600 shadow-sm shrink-0">
                                                                <CheckCircle size={16} />
                                                            </div>
                                                            <div className="flex flex-col overflow-hidden">
                                                                <span className="text-xs font-bold text-green-800 truncate" title={importedFileName}>{importedFileName}</span>
                                                                <span className="text-[10px] text-green-600">Cargado con éxito</span>
                                                            </div>
                                                        </div>
                                                        <button onClick={clearImportedFile} className="p-1.5 hover:bg-white rounded-lg text-gray-400 hover:text-red-500 transition-colors">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                            <hr className="border-gray-100" />
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Reporte</label>
                                                <input type="text" value={newQueryReport} onChange={(e) => setNewQueryReport(e.target.value)} list="reports-list" className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none" placeholder="Nombre del reporte" />
                                                <datalist id="reports-list">{(Array.isArray(editorReports.data) ? editorReports.data : []).map(r => <option key={r.report} value={r.report} />)}</datalist>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 mb-1">Nombre Archivo</label>
                                                <input type="text" value={newQueryFilename} onChange={(e) => setNewQueryFilename(e.target.value)} className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none" placeholder="carpeta/nombre_archivo" />
                                            </div>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Database</label><input type="text" value={editingItem.data.database} onChange={(e) => handleEditorChange('database', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none bg-white" /></div>
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Schema</label><input type="text" value={editingItem.data.schema} onChange={(e) => handleEditorChange('schema', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none bg-white" /></div>
                                        <div><label className="block text-xs font-bold text-gray-500 mb-1">Table</label><input type="text" value={editingItem.data.table} onChange={(e) => handleEditorChange('table', e.target.value)} className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-alquid-blue outline-none bg-white" /></div>
                                    </div>
                                    <div className="pt-4 border-t border-gray-200">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2"><SlidersHorizontal size={16} /> Parámetros <span className="text-xs text-gray-400 font-normal">({Object.keys(editingItem.data.parameters || {}).length})</span></h4>
                                        </div>
                                        {!showParams ? (
                                            <button onClick={() => setShowParams(true)} className="w-full py-2.5 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center gap-2 transition-all">Ver/Editar Parámetros <ChevronDown size={16} /></button>
                                        ) : (
                                            <div className="space-y-3 animate-fade-in">
                                                {editingItem.data.parameters && Object.entries(editingItem.data.parameters).map(([key, paramObj]) => {
                                                    const rawValue = (paramObj as QueryParam).value;
                                                    const isComplex = typeof rawValue === 'object';
                                                    return (
                                                        <div key={key} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex items-center justify-between group hover:border-alquid-blue transition-all">
                                                            <div className="flex-1 min-w-0 mr-3 overflow-hidden">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={`w-2 h-2 rounded-full ${isComplex ? 'bg-alquid-blue' : 'bg-orange-400'}`}></span>
                                                                    <span className="text-sm font-bold text-gray-700 font-mono truncate" title={key}>:{key}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button onClick={() => openParamModal(key)} className="p-1.5 text-gray-400 hover:text-alquid-blue hover:bg-blue-50 rounded transition-colors" title="Editar"><Edit3 size={16} /></button>
                                                                <button onClick={() => deleteParameter(key)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <div className="flex gap-2">
                                                    <button onClick={() => openParamModal()} className="flex-1 py-3 text-sm font-bold text-alquid-blue border border-dashed border-alquid-blue/30 bg-blue-50/30 hover:bg-blue-50 rounded-lg flex items-center justify-center gap-2 transition-all hover:border-alquid-blue group"><div className="bg-white p-1 rounded-full text-alquid-blue shadow-sm group-hover:scale-110 transition-transform"><Plus size={14} /></div>Añadir</button>
                                                    <button onClick={() => setShowParams(false)} className="px-3 py-3 text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" title="Ocultar"><Minimize2 size={16} /></button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 flex-shrink-0">
                            <button onClick={() => setEditingItem(null)} className="px-6 py-2.5 rounded-xl text-gray-600 hover:bg-gray-200 font-bold transition-colors">Cancelar</button>
                            <button onClick={saveChanges} className="px-6 py-2.5 rounded-xl bg-alquid-blue text-white hover:bg-blue-800 font-bold shadow-lg transition-colors flex items-center gap-2"><Save size={18} /> {isNewQueryMode ? "Crear Query" : "Guardar Cambios"}</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-1 gap-6 h-full relative overflow-hidden mt-6">

                {/* Sidebar Configuration */}
                <div className="bg-white border border-alquid-gray40 border-opacity-40 shadow-lg rounded-xl flex flex-col z-10 w-80">
                    <div className="p-5 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <Database size={16} /> Archivos de Configuración
                            </h4>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => jsonFileInputRef.current?.click()}
                                    className="w-full py-3 bg-alquid-navy hover:bg-blue-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap transition-transform hover:-translate-y-0.5"
                                >
                                    <Upload size={18} /> Cargar desde local
                                </button>
                                <button
                                    onClick={() => setIsRepoExplorerOpen(true)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap transition-transform hover:-translate-y-0.5"
                                >
                                    <FileJson size={18} /> Cargar desde repositorio
                                </button>
                                <input
                                    ref={jsonFileInputRef}
                                    type="file"
                                    accept=".json"
                                    className="hidden"
                                    onChange={e => {
                                        const file = e.target.files?.[0];
                                        if (!file) return;
                                        const reader = new FileReader();
                                        reader.onload = (event) => handleLoaded(event.target?.result as string, file.name);
                                        reader.readAsText(file);
                                        e.target.value = '';
                                    }}
                                />
                            </div>
                        </div>
                        <hr className="border-alquid-gray40 border-opacity-40" />
                        <div>
                            <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                <Plus size={16} /> Añadir al JSON cargado
                            </h4>
                            <div className="flex flex-col gap-3">
                                <button
                                    onClick={() => {
                                        if (!editorReports.data) { alert('Primero carga un archivo JSON de configuración.'); return; }
                                        addSqlToJsonRef.current?.click();
                                    }}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-sm whitespace-nowrap transition-transform hover:-translate-y-0.5"
                                >
                                    <FileCode size={18} /> Añadir SQL como informe
                                </button>
                                <input
                                    ref={addSqlToJsonRef}
                                    type="file"
                                    accept=".sql"
                                    className="hidden"
                                    onChange={handleAddSqlToJson}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-xl shadow-sm border border-gray-200">

                    {/* Toolbar */}
                    <div className="p-4 border-b border-alquid-gray40 border-opacity-40 flex justify-between items-center bg-alquid-gray10 rounded-t-xl flex-shrink-0 h-[72px]">
                        <div className="flex items-center gap-2">
                            <Filter size={18} className="text-gray-400" />
                            <span className="font-bold text-gray-700">Queries ({modifiedIndices.size} editadas)</span>
                            {Object.keys(filters).length > 0 && <span className="text-xs text-alquid-blue font-bold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Filtros Activos</span>}
                        </div>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 overflow-auto bg-gray-50">
                        {(!editorReports.data || editorReports.data.length === 0) ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center animate-fade-in">
                                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6 shadow-inner">
                                    <Database size={40} className="text-gray-300" />
                                </div>
                                <h3 className="text-lg font-bold text-gray-700 mb-2">Esperando configuración</h3>
                                <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                                    Carga un archivo JSON o comienza creando una nueva query.
                                </p>
                            </div>
                        ) : (
                            <table className="w-full text-left border-collapse relative">
                                <thead className="bg-gray-100 sticky top-0 z-10 shadow-sm">
                                    <tr>
                                        <TableHeader label="Reporte" columnKey="report" width="w-[15%]" />
                                        <TableHeader label="Carpeta" columnKey="folder" width="w-[10%]" />
                                        <TableHeader label="Informe" columnKey="filenameOnly" width="w-[25%]" />
                                        <TableHeader label="Base de datos" columnKey="database" width="w-[20%]" />
                                        <TableHeader label="Tabla" columnKey="table" width="w-[20%]" />
                                        <th className="py-3 px-4 text-center w-[100px] border-b border-gray-200">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-100">
                                    {filteredData.map((item, idx) => {
                                        const isModified = modifiedIndices.has(`${item.reportIndex}-${item.queryIndex}`);
                                        return (
                                            <tr key={idx} className={`group hover:bg-blue-50/50 transition-colors relative ${isModified ? 'bg-yellow-50/30' : ''}`}>
                                                <td className="py-3 px-4 text-sm relative align-top">
                                                    <div className={`flex items-center justify-between pr-4 rounded p-1 ${item.isFirstOfReport ? 'group-hover:bg-blue-50/50' : ''}`}>
                                                        <span className={`truncate ${item.isFirstOfReport ? 'font-bold text-gray-800' : 'text-gray-400 font-medium'}`}>
                                                            {item.report}
                                                        </span>
                                                        {item.isFirstOfReport && (
                                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => openRenameModal('REPORT', item.reportIndex, -1)} className="p-1 text-blue-500 hover:bg-blue-100 rounded" title="Renombrar Reporte"><Edit3 size={14} /></button>
                                                                <button onClick={() => handleDeleteReport(item.reportIndex)} className="p-1 text-red-500 hover:bg-red-100 rounded" title="Eliminar Reporte Entero"><Trash2 size={14} /></button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-500 align-top pt-3">
                                                    {item.folder || '-'}
                                                </td>
                                                <td className="py-3 px-4 text-sm align-top pt-3">
                                                    <div className="flex items-center justify-between group/cell">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-gray-800">{item.filenameOnly}</span>
                                                            {isModified && <span className="text-[10px] text-yellow-600 font-bold mt-1">MODIFICADO</span>}
                                                        </div>
                                                        <button
                                                            onClick={() => openRenameModal('FILE', item.reportIndex, item.queryIndex)}
                                                            className="p-1.5 text-gray-300 hover:text-alquid-blue hover:bg-white rounded opacity-0 group-hover/cell:opacity-100 transition-all"
                                                            title="Renombrar carpeta/archivo"
                                                        >
                                                            <Edit3 size={14} />
                                                        </button>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm text-gray-600 align-top pt-3">{item.query.database}</td>
                                                <td className="py-3 px-4 text-sm text-gray-600 font-mono align-top pt-3">{item.query.table}</td>
                                                <td className="py-3 px-4 text-center align-top pt-3">
                                                    <div className="flex justify-center gap-2">
                                                        <button onClick={() => openEditor(item.reportIndex, item.queryIndex)} className="p-1.5 text-gray-400 hover:text-alquid-blue hover:bg-blue-50 rounded transition-colors" title="Editar Query Completa"><Edit3 size={16} /></button>
                                                        <button onClick={() => handleDeleteQuery(item.reportIndex, item.queryIndex)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors" title="Eliminar Query"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filteredData.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-8 text-gray-400 italic">
                                                No hay resultados para los filtros seleccionados
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="p-4 border-t border-gray-200 bg-white z-10 flex-shrink-0">
                        <button onClick={handleSaveJson} disabled={!editorReports.data || editorReports.data.length === 0} className={`w-full py-4 rounded-xl font-bold text-white shadow-lg flex justify-center items-center gap-3 transition-all transform active:scale-[0.99] ${!editorReports.data || editorReports.data.length === 0 ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-alquid-red hover:bg-red-600 hover:shadow-xl hover:-translate-y-0.5'}`}><Save size={20} /> DESCARGAR JSON ACTUALIZADO</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default JsonEditor;