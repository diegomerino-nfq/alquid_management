import React from 'react';
import { X, AlertTriangle, XCircle, AlertCircle, Info, CheckCircle2, ShieldAlert } from 'lucide-react';
import { ValidationResult, ValidationSeverity } from '../utils/jsonValidator';

interface JsonValidationModalProps {
    isOpen: boolean;
    results: ValidationResult[];
    fileName: string;
    onClose: () => void;
    onProceed: () => void;
}

const SEVERITY_CONFIG: Record<ValidationSeverity, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
    CRITICAL: { label: 'Crítico', color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', icon: <XCircle size={14} /> },
    ERROR: { label: 'Error', color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', icon: <AlertTriangle size={14} /> },
    WARNING: { label: 'Aviso', color: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: <AlertCircle size={14} /> },
    INFO: { label: 'Info', color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', icon: <Info size={14} /> },
};

const JsonValidationModal: React.FC<JsonValidationModalProps> = ({ isOpen, results, fileName, onClose, onProceed }) => {
    if (!isOpen || results.length === 0) return null;

    const hasCritical = results.some(r => r.severity === 'CRITICAL');
    const counts: Record<ValidationSeverity, number> = { CRITICAL: 0, ERROR: 0, WARNING: 0, INFO: 0 };
    results.forEach(r => counts[r.severity]++);

    const grouped: Record<ValidationSeverity, ValidationResult[]> = { CRITICAL: [], ERROR: [], WARNING: [], INFO: [] };
    results.forEach(r => grouped[r.severity].push(r));

    return (
        <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col animate-fade-in border border-red-200">
                {/* Header */}
                <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 border-b border-red-100 flex items-center justify-between rounded-t-2xl">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-red-100 text-red-600 rounded-full">
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-gray-800">Validación de Archivo</h3>
                            <p className="text-sm text-gray-500 mt-1 font-mono">{fileName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Summary Counters */}
                <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-3 flex-wrap">
                    {(['CRITICAL', 'ERROR', 'WARNING', 'INFO'] as ValidationSeverity[]).map(sev => {
                        if (counts[sev] === 0) return null;
                        const cfg = SEVERITY_CONFIG[sev];
                        return (
                            <span key={sev} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${cfg.color} ${cfg.bg} border ${cfg.border}`}>
                                {cfg.icon}
                                {counts[sev]} {cfg.label}{counts[sev] > 1 ? 's' : ''}
                            </span>
                        );
                    })}
                    <span className="ml-auto text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {results.length} problemas detectados
                    </span>
                </div>

                {/* Results Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-4">
                    {(['CRITICAL', 'ERROR', 'WARNING', 'INFO'] as ValidationSeverity[]).map(sev => {
                        if (grouped[sev].length === 0) return null;
                        const cfg = SEVERITY_CONFIG[sev];

                        return (
                            <div key={sev}>
                                <h4 className={`text-xs font-bold uppercase tracking-wider mb-2 ${cfg.color}`}>
                                    {cfg.icon} {cfg.label}s ({grouped[sev].length})
                                </h4>
                                <div className="space-y-2">
                                    {grouped[sev].map((r, idx) => (
                                        <div key={idx} className={`${cfg.bg} border ${cfg.border} rounded-lg px-4 py-3 flex items-start gap-3`}>
                                            <div className={`mt-0.5 flex-shrink-0 ${cfg.color}`}>
                                                {cfg.icon}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    {r.reportName !== '-' && (
                                                        <span className="text-[10px] font-bold text-gray-500 bg-white px-1.5 py-0.5 rounded border border-gray-200">
                                                            {r.reportName}
                                                        </span>
                                                    )}
                                                    {r.filename !== '-' && (
                                                        <span className="text-[10px] font-mono text-gray-400">
                                                            → {r.filename}
                                                        </span>
                                                    )}
                                                    <span className={`ml-auto text-[9px] font-bold uppercase tracking-widest ${cfg.color} opacity-60`}>
                                                        {r.rule}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700">{r.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 bg-white flex justify-between items-center gap-3 rounded-b-2xl shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
                    <button onClick={onClose} className="px-5 py-2.5 text-gray-500 hover:bg-gray-100 rounded-xl font-bold text-sm transition-colors">
                        Descartar Archivo
                    </button>

                    {hasCritical ? (
                        <div className="flex items-center gap-2 text-red-600 text-xs font-bold">
                            <XCircle size={16} />
                            Errores críticos — no se puede continuar
                        </div>
                    ) : (
                        <button
                            onClick={onProceed}
                            className="px-6 py-2.5 bg-alquid-navy hover:bg-alquid-blue text-white rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95"
                        >
                            <CheckCircle2 size={16} />
                            Continuar de todas formas
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JsonValidationModal;
