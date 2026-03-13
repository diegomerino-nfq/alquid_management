import React, { useRef, useState, useMemo, useEffect } from 'react';
import { Archive, Upload, FileJson, Download, ChevronRight, Folder, Database, X, ArrowLeft, GitCompare, ArrowRightLeft, Check, AlertTriangle, Plus, Minus, Calendar, User, Clock, ShieldCheck, XCircle, FileText, Github, Save, Trash2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useGlobalState } from '../context/GlobalStateContext';
import { RepositoryFile, ReportDefinition, QueryDefinition, EXPECTED_DATABASES, Client, Geography, CLIENT_GEOGRAPHIES } from '../types';
import { formatSqlBonito } from '../utils/sqlFormatter';
import { findAbsoluteReferences } from '../utils/jsonValidator';
import QueryValidatorModal, { InvalidQuery } from '../components/QueryValidatorModal';
import { Octokit } from 'octokit';

// Helper Types
type DiffStatus = 'ADDED' | 'REMOVED' | 'MODIFIED' | 'UNCHANGED';

interface QueryDiff {
    key: string;
    report: string;
    filename: string;
    status: DiffStatus;
    oldQuery?: QueryDefinition;
    newQuery?: QueryDefinition;
    changes: string[];
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

// Get client logo path
const getClientLogo = (client: Client) => {
    return `/imagenes/${client}.${client === 'Banca March' ? 'png' : 'jpg'}`;
};

// Get geography flag
const getGeographyFlag = (geography: Geography) => {
    const flagMap: Record<Geography, string> = {
        "Argentina": "https://flagcdn.com/w160/ar.png",
        "Colombia": "https://flagcdn.com/w160/co.png",
        "España": "https://flagcdn.com/w160/es.png",
        "Perú": "https://flagcdn.com/w160/pe.png",
        "Suiza": "https://flagcdn.com/w160/ch.png",
        "Nueva York": "https://flagcdn.com/w160/us.png",
        "Luxemburgo": "https://flagcdn.com/w160/lu.png"
    };
    return flagMap[geography] || "";
};

const Repository: React.FC = () => {
    const { repositoryData, repositorySummary, fetchRepositoryFiles, fetchRepositorySummary, addRepositoryFile, deleteRepositoryFile, addLog, user } = useGlobalState();
    const clients: Client[] = ["Banca March", "Bankinter", "BBVA", "Pichincha"];
    const envs = ["PRE", "PRO"];

    // Navigation State: client -> geography (optional) -> env
    const [selectedClient, setSelectedClient] = useState<Client | null>(null);
    const [selectedGeography, setSelectedGeography] = useState<Geography | null>(null);
    const [selectedEnv, setSelectedEnv] = useState<string | null>(null);

    // Fetch on selection change
    useEffect(() => {
        if (selectedClient && selectedGeography && selectedEnv) {
            fetchRepositoryFiles(selectedClient, selectedGeography, selectedEnv);
        } else if (selectedClient && !CLIENT_GEOGRAPHIES[selectedClient] && selectedEnv) {
            fetchRepositoryFiles(selectedClient, null, selectedEnv);
        }
    }, [selectedClient, selectedGeography, selectedEnv]);

    // Comparison State removed for MVP
    const [versionComment, setVersionComment] = useState("");

    // File Details Modal
    const [selectedFile, setSelectedFile] = useState<RepositoryFile | null>(null);

    // Validation Modal
    const [validation, setValidation] = useState<ValidationState>({
        isOpen: false,
        status: 'IDLE',
        fileName: '',
        totalQueries: 0,
        errors: [],
        contentToUpload: null
    });

    // Dynamic Reference Validator
    const [invalidQueries, setInvalidQueries] = useState<InvalidQuery[]>([]);
    const [isValidatorOpen, setIsValidatorOpen] = useState(false);

    // GitHub Integration
    const [githubToken, setGithubToken] = useState<string | null>(null);
    const [githubUser, setGithubUser] = useState<any>(null);
    const [githubRepos, setGithubRepos] = useState<any[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<string>('');
    const [selectedBranch, setSelectedBranch] = useState<string>('main');
    const [filePath, setFilePath] = useState<string>('');
    const [isGithubModalOpen, setIsGithubModalOpen] = useState(false);
    const [isPushing, setIsPushing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // GitHub Auth
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
        setFilePath(`${selectedClient}/${selectedGeography || 'general'}/${selectedEnv}/${file.fileName}`);
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
                // File doesn't exist
            }

            await octokit.rest.repos.createOrUpdateFileContents({
                owner,
                repo,
                path: filePath,
                message,
                content: btoa(unescape(encodeURIComponent(content))),
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
        if (!Array.isArray(jsonContent)) {
            alert("El archivo no parece ser un array de reportes válido.");
            addLog('REPOSITORIO', 'ERROR_SUBIDA', `Formato JSON incorrecto: ${fileName}`, 'ERROR');
            return;
        }

        const geographyKey = selectedGeography || 'general';
        const allowedDbs = EXPECTED_DATABASES[selectedClient!]?.[geographyKey]?.[selectedEnv!] || [];
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

        if (foundErrors.length > 0) {
            setValidation({
                isOpen: true,
                status: 'ERROR',
                fileName: fileName,
                totalQueries: queryCount,
                errors: foundErrors,
                contentToUpload: null
            });
            addLog('REPOSITORIO', 'INTENTO_FALLIDO', `Validación fallida para ${fileName} (${foundErrors.length} errores)`, 'WARNING');
        } else {
            setValidation({
                isOpen: true,
                status: 'SUCCESS',
                fileName: fileName,
                totalQueries: queryCount,
                errors: [],
                contentToUpload: jsonContent
            });
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!selectedClient || !selectedEnv || (CLIENT_GEOGRAPHIES[selectedClient] && !selectedGeography)) {
            alert("Error de estado: Cliente, geografía (si aplica) y entorno no seleccionados.");
            if (e.target) e.target.value = '';
            return;
        }

        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const jsonContent: ReportDefinition[] = JSON.parse(content);

                const invalidDynamicQueries: InvalidQuery[] = [];
                jsonContent.forEach((repo, rIdx) => {
                    if (repo.queries && Array.isArray(repo.queries)) {
                        repo.queries.forEach((q, qIdx) => {
                            if (q.sql && findAbsoluteReferences(q.sql, q.database).length > 0) {
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

                // Si hay referencias absolutas, mostrar aviso pero permitir la subida
                if (invalidDynamicQueries.length > 0) {
                    setInvalidQueries(invalidDynamicQueries);
                    // Mostrar aviso visible al usuario
                    alert(`⚠️ Se detectaron ${invalidDynamicQueries.length} referencias absolutas en el archivo.\n\nLas referencias detectadas son:\n${invalidDynamicQueries.map(q => `- ${q.reportName}: ${q.query.filename}`).join('\n')}\n\nEl archivo se subirá igual, pero considera revisar estas referencias para usar %s.%s en lugar de nombres absolutos.`);
                    addLog('REPOSITORIO', 'VALIDACION_DINAMICA', `Se detectaron ${invalidDynamicQueries.length} queries con referencias absolutas que necesitan revisión.`, 'WARNING');
                }

                validateAndSetState(jsonContent, file.name);

            } catch (err) {
                alert("El archivo debe ser un JSON válido.");
                addLog('REPOSITORIO', 'ERROR_SUBIDA', `Error parseando JSON: ${file.name}`, 'ERROR');
            }
        };
        reader.readAsText(file);

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

        validateAndSetState(newJson, validation.fileName);
    };

    const confirmUpload = async () => {
        if (validation.contentToUpload && selectedClient && selectedEnv) {
            try {
                const res = await addRepositoryFile(
                    selectedClient,
                    selectedGeography || null,
                    selectedEnv,
                    validation.contentToUpload,
                    validation.fileName,
                    versionComment
                );
                // If server returned the updated files list, use it to set the selected file immediately
                // Refresh repository data after upload. Do not open the file details modal automatically.
                await fetchRepositoryFiles(selectedClient, selectedGeography || null, selectedEnv);
                const geoKey = selectedGeography || 'null';
                const files = repositoryData[selectedClient]?.[geoKey]?.[selectedEnv] || [];
                // keep UI focused on repo list; user can open details manually if needed
                addLog('REPOSITORIO', 'SUBIDA_EXITOSA', `Archivo cargado en ${selectedClient} ${selectedGeography || 'sin geografía'} ${selectedEnv}: ${validation.fileName}`, 'SUCCESS');
                setValidation({ ...validation, isOpen: false });
                setVersionComment("");
            } catch (err) {
                alert("Error al subir el archivo al repositorio");
            }
        }
    };

    const triggerUpload = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
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

    // Comparison utilities removed for MVP

    return (
        <div className="h-full flex flex-col animate-fade-in relative bg-gray-50/50">
            <PageHeader
                title="Repositorio Centralizado"
                subtitle="Gestión jerárquica de configuraciones y versionado"
                icon={<Archive size={20} />}
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

            <input
                type="file"
                accept=".json"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileUpload}
            />

            <div className="flex-1 rounded-xl overflow-hidden flex flex-col relative w-full">

                {/* Breadcrumb Navigation */}
                <div className="px-6 py-4 flex items-center justify-between mb-4 mt-6">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                if (selectedEnv) setSelectedEnv(null);
                                else if (selectedGeography) setSelectedGeography(null);
                                else if (selectedClient) setSelectedClient(null);
                            }}
                            disabled={!selectedClient}
                            className={`
                                p-2 rounded-full transition-colors 
                                ${!selectedClient ? 'text-gray-300 cursor-default' : 'text-alquid-navy hover:bg-white hover:shadow-sm'}
                            `}
                        >
                            <ArrowLeft size={20} />
                        </button>

                        <nav className="flex items-center text-lg">
                            <span
                                onClick={() => { setSelectedClient(null); setSelectedGeography(null); setSelectedEnv(null); }}
                                className={`cursor-pointer transition-colors font-medium ${!selectedClient ? 'text-alquid-navy font-bold' : 'text-gray-400 hover:text-alquid-blue'}`}
                            >
                                Inicio
                            </span>

                            {selectedClient && (
                                <>
                                    <ChevronRight size={18} className="text-gray-300 mx-2" />
                                    <span
                                        onClick={() => { setSelectedGeography(null); setSelectedEnv(null); }}
                                        className={`cursor-pointer transition-colors font-medium ${!selectedGeography && !selectedEnv ? 'text-alquid-navy font-bold' : 'text-gray-400 hover:text-alquid-blue'}`}
                                    >
                                        {selectedClient}
                                    </span>
                                </>
                            )}

                            {selectedGeography && (
                                <>
                                    <ChevronRight size={18} className="text-gray-300 mx-2" />
                                    <span
                                        onClick={() => setSelectedEnv(null)}
                                        className={`flex items-center gap-2 cursor-pointer transition-colors font-medium ${!selectedEnv ? 'text-alquid-navy font-bold' : 'text-gray-400 hover:text-alquid-blue'}`}
                                    >
                                        <img src={getGeographyFlag(selectedGeography)} alt="" className="w-5 h-5 rounded-full object-cover shadow-sm" />
                                        {selectedGeography}
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

                    {/* Compare button removed for MVP */}
                </div>

                <div className="flex-1 px-6 pb-6 overflow-y-auto custom-scrollbar">

                    {/* LEVEL 1: CLIENTS */}
                    {!selectedClient && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                            {clients.map(client => {
                                const hasGeographies = CLIENT_GEOGRAPHIES[client];
                                const summaryArray = Array.isArray(repositorySummary) ? repositorySummary : [];
                                const totalFiles = summaryArray
                                    .filter(s => s.client === client)
                                    .reduce((acc, s) => acc + s.count, 0);

                                return (
                                    <div
                                        key={client}
                                        onClick={() => setSelectedClient(client)}
                                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/60 hover:shadow-xl hover:border-alquid-blue/30 cursor-pointer transition-all group relative overflow-hidden flex flex-col justify-between h-48"
                                    >
                                        <div className="flex items-start justify-between">
                                            <h3 className="text-xl font-bold text-gray-800 group-hover:text-alquid-navy transition-colors">{client}</h3>
                                            <img
                                                src={getClientLogo(client)}
                                                alt={client}
                                                className="w-12 h-12 rounded-full object-cover shadow-md border-2 border-white group-hover:scale-110 transition-transform duration-300"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/48?text=' + client.substring(0, 2).toUpperCase();
                                                }}
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                                <Folder size={16} className="text-gray-400" />
                                                <span>{totalFiles} archivos en total</span>
                                            </div>

                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                                <span className="text-xs font-bold text-alquid-blue uppercase tracking-wider group-hover:underline">
                                                    {hasGeographies ? 'Ver Geografías' : 'Ver Entornos'}
                                                </span>
                                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-alquid-blue group-hover:text-white transition-all">
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* LEVEL 2: GEOGRAPHIES (only for clients with geographies) */}
                    {selectedClient && CLIENT_GEOGRAPHIES[selectedClient] && !selectedGeography && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                            {(CLIENT_GEOGRAPHIES[selectedClient] || []).map(geography => {
                                const summaryArray = Array.isArray(repositorySummary) ? repositorySummary : [];
                                const totalFiles = summaryArray
                                    .filter(s => s.client === selectedClient && s.geography === geography)
                                    .reduce((acc, s) => acc + s.count, 0);

                                return (
                                    <div
                                        key={geography}
                                        onClick={() => setSelectedGeography(geography)}
                                        className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200/60 hover:shadow-xl hover:border-alquid-blue/30 cursor-pointer transition-all group relative overflow-hidden flex flex-col justify-between h-48"
                                    >
                                        <div className="flex items-start justify-between">
                                            <h3 className="text-xl font-bold text-gray-800 group-hover:text-alquid-navy transition-colors">{geography}</h3>
                                            <img
                                                src={getGeographyFlag(geography)}
                                                alt={geography}
                                                className="w-12 h-12 rounded-full object-cover shadow-md border-2 border-white group-hover:scale-110 transition-transform duration-300"
                                            />
                                        </div>

                                        <div>
                                            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                                                <Folder size={16} className="text-gray-400" />
                                                <span>{totalFiles} archivos en total</span>
                                            </div>

                                            <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-50">
                                                <span className="text-xs font-bold text-alquid-blue uppercase tracking-wider group-hover:underline">Ver Entornos</span>
                                                <div className="w-8 h-8 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-alquid-blue group-hover:text-white transition-all">
                                                    <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* LEVEL 3: ENVIRONMENTS */}
                    {selectedClient && !CLIENT_GEOGRAPHIES[selectedClient] && !selectedEnv && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4 animate-fade-in">
                            {envs.map(env => {
                                const summaryArray = Array.isArray(repositorySummary) ? repositorySummary : [];
                                const summary = summaryArray.find(s => s.client === selectedClient && !s.geography && s.env === env);
                                const filesCount = summary ? summary.count : 0;
                                const files = repositoryData?.[selectedClient]?.['null']?.[env] || [];
                                const sortedFiles = [...files].sort((a, b) => b.version - a.version);
                                const latestFile = sortedFiles[0];
                                const isPro = env === 'PRO';

                                return (
                                    <div
                                        key={env}
                                        onClick={() => setSelectedEnv(env)}
                                        className={`
                                            relative p-0 rounded-3xl border cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden group
                                            ${isPro ? 'border-blue-100 bg-white hover:border-blue-300' : 'border-orange-100 bg-white hover:border-orange-300'}
                                        `}
                                    >
                                        <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${isPro ? 'bg-blue-500' : 'bg-orange-500'}`}></div>

                                        <div className="p-8 relative z-10">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="text-4xl font-black tracking-tight text-gray-800">{env}</h3>
                                                    <p className={`text-sm font-medium mt-1 ${isPro ? 'text-blue-500' : 'text-orange-500'}`}>
                                                        {isPro ? "Entorno de Producción" : "Entorno de Pre-producción"}
                                                    </p>
                                                </div>
                                                <div className={`
                                                    w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md bg-white/50 border border-white/50
                                                    ${isPro ? 'text-blue-600' : 'text-orange-600'}
                                                `}>
                                                    <Database size={32} />
                                                </div>
                                            </div>

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
                                                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${filesCount > 0 && latestFile ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
                                                        {filesCount > 0 && latestFile ? `v${latestFile.version}` : 'N/A'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-gray-50 border border-gray-100">
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <Clock size={16} /> Última Actualización
                                                    </div>
                                                    <span className="font-medium text-gray-800 text-xs">
                                                        {filesCount > 0 && latestFile ? latestFile.uploadedAt?.split(',')[0] : '-'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={`
                                                flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors
                                                ${isPro ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white'}
                                            `}>
                                                Gestionar Archivos <ChevronRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* LEVEL 3: ENVIRONMENTS (for clients with geographies) */}
                    {selectedClient && CLIENT_GEOGRAPHIES[selectedClient] && selectedGeography && !selectedEnv && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-4 animate-fade-in">
                            {envs.map(env => {
                                const summaryArray = Array.isArray(repositorySummary) ? repositorySummary : [];
                                const summary = summaryArray.find(s => s.client === selectedClient && s.geography === selectedGeography && s.env === env);
                                const filesCount = summary ? summary.count : 0;
                                const files = repositoryData?.[selectedClient]?.[selectedGeography]?.[env] || [];
                                const sortedFiles = [...files].sort((a, b) => b.version - a.version);
                                const latestFile = sortedFiles[0];
                                const isPro = env === 'PRO';

                                return (
                                    <div
                                        key={env}
                                        onClick={() => setSelectedEnv(env)}
                                        className={`
                                            relative p-0 rounded-3xl border cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-1 overflow-hidden group
                                            ${isPro ? 'border-blue-100 bg-white hover:border-blue-300' : 'border-orange-100 bg-white hover:border-orange-300'}
                                        `}
                                    >
                                        <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full blur-3xl opacity-20 ${isPro ? 'bg-blue-500' : 'bg-orange-500'}`}></div>

                                        <div className="p-8 relative z-10">
                                            <div className="flex items-center justify-between mb-8">
                                                <div>
                                                    <h3 className="text-4xl font-black tracking-tight text-gray-800">{env}</h3>
                                                    <p className={`text-sm font-medium mt-1 ${isPro ? 'text-blue-500' : 'text-orange-500'}`}>
                                                        {isPro ? "Entorno de Producción" : "Entorno de Pre-producción"}
                                                    </p>
                                                </div>
                                                <div className={`
                                                    w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg backdrop-blur-md bg-white/50 border border-white/50
                                                    ${isPro ? 'text-blue-600' : 'text-orange-600'}
                                                `}>
                                                    <Database size={32} />
                                                </div>
                                            </div>

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
                                                    <span className={`font-bold px-2 py-0.5 rounded text-xs ${filesCount > 0 && latestFile ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-400'}`}>
                                                        {filesCount > 0 && latestFile ? `v${latestFile.version}` : 'N/A'}
                                                    </span>
                                                </div>

                                                <div className="flex items-center justify-between text-sm p-3 rounded-xl bg-gray-50 border border-gray-100">
                                                    <div className="flex items-center gap-2 text-gray-500">
                                                        <Clock size={16} /> Última Actualización
                                                    </div>
                                                    <span className="font-medium text-gray-800 text-xs">
                                                        {filesCount > 0 && latestFile ? latestFile.uploadedAt?.split(',')[0] : '-'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className={`
                                                flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-colors
                                                ${isPro ? 'bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white'}
                                            `}>
                                                Gestionar Archivos <ChevronRight size={16} />
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* LEVEL 4: FILE LIST */}
                    {selectedClient && selectedEnv && ((CLIENT_GEOGRAPHIES[selectedClient] && selectedGeography) || !CLIENT_GEOGRAPHIES[selectedClient]) && (
                        <div className="animate-fade-in h-full flex flex-col bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="flex justify-between items-center p-6 border-b border-gray-100">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800">Historial de Versiones</h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Gestión de archivos para {selectedClient} {selectedGeography && `(${selectedGeography})`} ({selectedEnv})
                                    </p>
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
                                {!repositoryData[selectedClient]?.[selectedGeography || 'null']?.[selectedEnv!] || repositoryData[selectedClient][selectedGeography || 'null'][selectedEnv!].length === 0 ? (
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
                                                                            <th className="px-6 py-4 font-semibold w-24 text-center bg-gray-50">Versión</th>
                                                    <th className="px-6 py-4 font-semibold bg-gray-50">Nombre Archivo</th>
                                                    <th className="px-6 py-4 font-semibold bg-gray-50">Comentario</th>
                                                    <th className="px-6 py-4 font-semibold bg-gray-50">Fecha Carga</th>
                                                    <th className="px-6 py-4 font-semibold bg-gray-50">Usuario</th>
                                                    <th className="px-6 py-4 font-semibold w-32 text-center bg-gray-50">Acciones</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100 bg-white">
                                                {[...repositoryData[selectedClient]![selectedGeography || 'null']![selectedEnv!]].sort((a, b) => b.version - a.version).map((file, idx) => {
                                                    return (
                                                        <tr
                                                            key={file.id}
                                                            onClick={() => setSelectedFile(file)}
                                                            className={`
                                                                group hover:bg-blue-50 cursor-pointer transition-colors
                                                                ${idx === 0 ? 'bg-blue-50/10' : ''}
                                                            `}
                                                        >
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
                                                            <td className="px-6 py-4">
                                                                <p className="text-xs text-gray-600 italic line-clamp-2 max-w-[200px]" title={file.comment}>
                                                                    {file.comment || <span className="text-gray-300">Sin comentario</span>}
                                                                </p>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                                <div className="flex items-center gap-2">
                                                                    <Calendar size={14} className="text-gray-400" />
                                                                    {new Date(file.uploadedAt).toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                                <div className="flex items-center gap-2">
                                                                    <User size={14} className="text-gray-400" />
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
                                                                {user?.role === 'admin' && (
                                                                    <button
                                                                        onClick={async (e) => {
                                                                            e.stopPropagation();
                                                                            if (window.confirm('¿Estás seguro de que deseas eliminar esta versión del archivo permanentemente?')) {
                                                                                try {
                                                                                    await deleteRepositoryFile(file.id, selectedClient, selectedGeography || null, selectedEnv);
                                                                                    // Forzar limpieza de selección/local UI para reflejar el cambio inmediatamente
                                                                                    setSelectedFile(prev => (prev && prev.id === file.id) ? null : prev);
                                                                                    // Compare selection cleared (feature removed)
                                                                                    // Asegurar refresco final por si algo no actualizó correctamente
                                                                                    if (selectedClient && selectedEnv) {
                                                                                        await fetchRepositoryFiles(selectedClient, selectedGeography || null, selectedEnv);
                                                                                        await fetchRepositorySummary();
                                                                                    }
                                                                                } catch (error: any) {
                                                                                    const msg = error?.response?.data?.error || error?.message || String(error);
                                                                                    alert('Error al eliminar el archivo: ' + msg);
                                                                                }
                                                                            }
                                                                        }}
                                                                        className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-white border border-transparent hover:border-gray-200 transition-all shadow-sm hover:shadow"
                                                                        title="Eliminar Versión"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                )}
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

            {/* VALIDATION MODAL */}
            {validation.isOpen && (
                <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col animate-fade-in border border-gray-200 overflow-hidden">
                        <div className={`p-6 border-b flex items-center justify-between ${validation.status === 'SUCCESS' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-full ${validation.status === 'SUCCESS' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {validation.status === 'SUCCESS' ? <ShieldCheck size={28} /> : <XCircle size={28} />}
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

                        <div className="p-6 max-h-[60vh] overflow-y-auto">
                            {validation.status === 'SUCCESS' ? (
                                <div className="text-center py-4">
                                    <div className="bg-green-50 rounded-xl p-4 mb-4 border border-green-100">
                                        <p className="text-green-700 font-medium">
                                            Se han validado <span className="font-bold">{validation.totalQueries} queries</span> correctamente.
                                        </p>
                                    </div>
                                    <p className="text-sm text-gray-500 mb-6">
                                        Al confirmar, se generará la versión v{((repositoryData[selectedClient!]?.[selectedGeography || 'null']?.[selectedEnv!]?.length || 0) + 1)} de este archivo.
                                    </p>

                                    <div className="text-left space-y-2">
                                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                                            Comentario de la Versión
                                        </label>
                                        <textarea
                                            value={versionComment}
                                            onChange={(e) => setVersionComment(e.target.value)}
                                            placeholder="Detalla qué cambios incluye esta subida..."
                                            className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-alquid-blue focus:border-transparent text-sm min-h-[100px] bg-white resize-none shadow-inner"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-gray-600 text-sm mb-4">
                                        Las siguientes queries intentan acceder a bases de datos no permitidas:
                                    </p>
                                    <div className="space-y-3">
                                        {validation.errors.map((err, idx) => (
                                            <div key={idx} className="bg-red-50 border border-red-100 rounded-lg p-3 flex gap-3 items-start">
                                                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                                                <div className="overflow-hidden">
                                                    <div className="text-xs font-bold text-red-800 truncate mb-1" title={err.filename}>
                                                        {err.filename}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-red-600">
                                                        <Database size={12} /> {err.database}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                            <button
                                onClick={() => setValidation({ ...validation, isOpen: false })}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-bold text-sm transition-colors"
                            >
                                {validation.status === 'SUCCESS' ? 'Cancelar' : 'Cerrar'}
                            </button>
                            {validation.status === 'SUCCESS' && (
                                <button
                                    onClick={confirmUpload}
                                    className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-lg flex items-center gap-2 transition-transform hover:-translate-y-0.5"
                                >
                                    <Upload size={16} /> Confirmar Subida
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
                                {isPushing ? 'Guardando...' : <><Save size={16} /> Guardar Cambios</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Comparison moved to dedicated page: /compare */}

            {/* FILE DETAILS MODAL */}
            {selectedFile && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col animate-fade-in overflow-hidden" style={{ resize: 'both', overflow: 'auto' }}>
                        <div className="flex items-center justify-between p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold">{selectedFile.fileName} (v{selectedFile.version})</h3>
                            <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                            <pre className="text-xs bg-white p-4 rounded border border-gray-200" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}>
                                {JSON.stringify(selectedFile.content, null, 2)}
                            </pre>
                        </div>
                        <div className="p-6 border-t flex justify-end">
                            <button
                                onClick={() => downloadFile(selectedFile)}
                                className="bg-alquid-navy hover:bg-blue-900 text-white px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2"
                            >
                                <Download size={18} /> Descargar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Repository;
