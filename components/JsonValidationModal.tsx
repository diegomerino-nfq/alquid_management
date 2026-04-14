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
    CRITICAL: { label: 'Crítico', color: 'text-red-300', bg: 'bg-red-500/10', border: 'border-red-500/30', icon: <XCircle size={14} /> },
    ERROR: { label: 'Error', color: 'text-orange-300', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: <AlertTriangle size={14} /> },
    WARNING: { label: 'Aviso', color: 'text-amber-100', bg: 'bg-amber-500/18', border: 'border-amber-400/50', icon: <AlertCircle size={14} /> },
    INFO: { label: 'Info', color: 'text-cyan-100', bg: 'bg-cyan-500/18', border: 'border-cyan-400/50', icon: <Info size={14} /> },
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
            <div className="bg-nafra-card text-nafra-text rounded-2xl shadow-2xl w-full max-w-3xl h-[80vh] flex flex-col animate-fade-in border border-nafra-border">
                {/* Header */}
                <div className="bg-nafra-surface p-6 border-b border-nafra-border flex items-center justify-between rounded-t-2xl">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex items-center justify-center bg-red-500/15 text-red-300 rounded-xl border border-red-500/30">
                            <ShieldAlert size={20} />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-nafra-text">Validación de Archivo</h3>
                            <p className="text-sm text-nafra-text-muted mt-1 font-mono">{fileName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-lg text-nafra-text-muted hover:text-nafra-text hover:bg-nafra-card transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nafra-accent/40">
                        <X size={24} />
                    </button>
                </div>

                {/* Summary Counters */}
                <div className="px-6 py-3 bg-nafra-card border-b border-nafra-border flex items-center gap-3 flex-wrap">
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
                    <span className="ml-auto text-[10px] font-bold text-nafra-text-muted uppercase tracking-widest">
                        {results.length} problemas detectados
                    </span>
                </div>

                {/* Results Body */}
                <div className="flex-1 overflow-y-auto p-6 bg-nafra-bg space-y-4">
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
                                                        <span className="text-[10px] font-bold text-nafra-text-muted bg-nafra-surface px-1.5 py-0.5 rounded border border-nafra-border">
                                                            {r.reportName}
                                                        </span>
                                                    )}
                                                    {r.filename !== '-' && (
                                                        <span className="text-[10px] font-mono text-nafra-text-muted">
                                                            → {r.filename}
                                                        </span>
                                                    )}
                                                    <span className={`ml-auto text-[9px] font-bold uppercase tracking-widest ${cfg.color} opacity-60`}>
                                                        {r.rule}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-nafra-text">{r.message}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-nafra-border bg-nafra-surface flex justify-between items-center gap-3 rounded-b-2xl shadow-[0_-4px_10px_rgba(0,0,0,0.10)]">
                    <button onClick={onClose} className="h-10 px-5 text-nafra-text-muted hover:bg-nafra-card rounded-xl font-bold text-sm transition-colors duration-150 ease-out border border-transparent hover:border-nafra-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nafra-accent/40">
                        Descartar archivo
                    </button>

                    {hasCritical ? (
                        <div className="flex items-center gap-2 text-red-300 text-xs font-bold bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded-lg">
                            <XCircle size={16} />
                            Errores críticos — no se puede continuar
                        </div>
                    ) : (
                        <button
                            onClick={onProceed}
                            className="h-10 px-6 bg-nafra-accent hover:bg-nafra-accent-dim text-white rounded-xl font-bold text-sm shadow-lg shadow-nafra-accent/20 flex items-center gap-2 transition-all duration-150 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nafra-accent/50"
                        >
                            <CheckCircle2 size={16} />
                            Continuar con archivo
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default JsonValidationModal;
