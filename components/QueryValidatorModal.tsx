import React, { useState } from 'react';
import { X, Save, AlertTriangle, CheckCircle2, Download, Wand2 } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { QueryDefinition } from '../types';
import { findAbsoluteReferences } from '../utils/jsonValidator';

export interface InvalidQuery {
  reportIndex: number;
  queryIndex: number;
  reportName: string;
  query: QueryDefinition;
}

interface QueryValidatorModalProps {
  isOpen: boolean;
  invalidQueries: InvalidQuery[];
  onClose: () => void;
  onSave: (correctedQueries: InvalidQuery[], download?: boolean) => void;
}

const QueryValidatorModal: React.FC<QueryValidatorModalProps> = ({ isOpen, invalidQueries, onClose, onSave }) => {
  const [editedQueries, setEditedQueries] = useState<InvalidQuery[]>(invalidQueries);

  // Update local state when props change
  React.useEffect(() => {
    setEditedQueries(invalidQueries);
  }, [invalidQueries]);

  if (!isOpen) return null;

  const handleSqlChange = (index: number, newSql: string) => {
    const updated = [...editedQueries];
    updated[index] = {
      ...updated[index],
      query: { ...updated[index].query, sql: newSql }
    };
    setEditedQueries(updated);
  };

  /**
   * Auto-fix: Replace all absolute dot references (e.g. alquid.result) with %s.%s
   * Uses the tokenizer-based approach that ignores content inside string literals.
   */
  const handleAutoFixAll = () => {
    const updated = editedQueries.map(item => {
      let sql = item.query.sql;
      const absRefs = findAbsoluteReferences(sql);

      // Replace each absolute reference with %s.%s
      // Sort by length descending to avoid partial replacements
      const sortedRefs = [...absRefs].sort((a, b) => b.length - a.length);
      for (const ref of sortedRefs) {
        // Only replace outside of string literals - use a careful regex
        // that skips content within single quotes
        const parts = sql.split(/('(?:[^'\\]|\\.)*')/);
        sql = parts.map((part, i) => {
          // Odd indices are quoted strings — skip them
          if (i % 2 === 1) return part;
          // Replace all occurrences of this ref in non-string parts
          return part.split(ref).join('%s.%s');
        }).join('');
      }

      return {
        ...item,
        query: { ...item.query, sql }
      };
    });
    setEditedQueries(updated);
  };

  const handleSaveOnly = () => {
    onSave(editedQueries);
  };

  /**
   * Syntax highlighting with absolute references highlighted in red.
   * Uses tokenizer: first masks string literals, then detects dot-identifiers,
   * then restores string literals.
   */
  const highlightSql = (code: string) => {
    let safeCode = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const placeholders: string[] = [];
    const mask = (content: string, className: string) => {
      const id = `__PH_${placeholders.length}__`;
      placeholders.push(`<span class="${className}">${content}</span>`);
      return id;
    };

    // 1. Mask string literals first (highest priority — prevents false positives)
    safeCode = safeCode.replace(/'([^']*)'/g, (match) => mask(match, "text-emerald-300"));

    // 2. Mask comments
    safeCode = safeCode.replace(/(--[^\n]*)/g, (match) => mask(match, "text-nafra-text-muted italic"));

    // 3. Detect absolute references (dotted identifiers) — highlight in RED
    safeCode = safeCode.replace(/\b([a-zA-Z_][a-zA-Z0-9_-]*\.[a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match) => {
      if (match === '%s.%s') return match; // Skip placeholders
      if (match.startsWith('__PH_')) return match; // Skip already masked
      return mask(match, "text-red-300 font-bold underline decoration-red-400 bg-red-500/15 px-0.5 rounded");
    });

    // 4. Mask SQL keywords
    safeCode = safeCode.replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|HAVING|LIMIT|OFFSET|JOIN|LEFT|RIGHT|INNER|OUTER|ON|AS|CASE|WHEN|THEN|ELSE|END|AND|OR|NOT|IN|IS|NULL|LIKE|BETWEEN|UNION|ALL|DISTINCT|INSERT|UPDATE|DELETE|CREATE|DROP|TABLE|VIEW|INDEX|ALTER)\b/gi, (match) => mask(match, "text-cyan-300 font-bold"));

    // 5. Mask functions
    safeCode = safeCode.replace(/\b(SUM|COUNT|AVG|MIN|MAX|COALESCE|DATE|DATE_ADD|DATE_SUB|NOW|CAST|CONCAT|SUBSTRING|TRIM|ABS|NULLIF|LOWER|UPPER)\b/gi, (match) => mask(match, "text-fuchsia-300 font-semibold"));

    // 6. Mask numbers
    safeCode = safeCode.replace(/\b(\d+)\b/g, (match) => mask(match, "text-amber-300"));

    return safeCode.replace(/__PH_(\d+)__/g, (_, index) => placeholders[parseInt(index)]);
  };

  const correctedCount = editedQueries.filter(q => findAbsoluteReferences(q.query.sql).length === 0).length;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-nafra-card text-nafra-text rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-fade-in border border-nafra-border">
        <div className="bg-nafra-surface p-6 border-b border-nafra-border flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 flex items-center justify-center bg-orange-500/15 text-orange-300 rounded-xl border border-orange-500/30">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-nafra-text">Saneamiento de Referencias SQL</h3>
              <p className="text-sm text-nafra-text-dim mt-1">
                Detectadas {invalidQueries.length} queries con referencias absolutas. Cámbialas a <code className="bg-nafra-surface border border-nafra-border px-1 rounded text-nafra-accent">%s.%s</code> para habilitar la descarga multi-entorno.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-lg text-nafra-text-muted hover:text-nafra-text hover:bg-nafra-card transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nafra-accent/40">
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-3 bg-nafra-card border-b border-nafra-border flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleAutoFixAll}
              className="h-10 px-4 bg-nafra-accent/10 text-nafra-accent rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-nafra-accent/20 transition-all duration-150 ease-out border border-nafra-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nafra-accent/40"
            >
              <Wand2 size={14} /> Auto-corregir Todo (%s.%s)
            </button>
          </div>
          <span className="text-[10px] font-bold text-nafra-text-muted uppercase tracking-widest">
            {correctedCount} corregidas de {editedQueries.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-nafra-bg space-y-6">
          {editedQueries.map((item, idx) => {
            const absRefs = findAbsoluteReferences(item.query.sql);
            const isValidNow = absRefs.length === 0;
            return (
              <div key={idx} className={`bg-nafra-card rounded-xl border shadow-sm overflow-hidden transition-all duration-150 ease-out ${isValidNow ? 'border-green-400/40 ring-4 ring-green-400/10' : 'border-red-400/35'}`}>
                <div className="bg-nafra-surface px-4 py-2 border-b border-nafra-border flex justify-between items-center">
                  <span className="text-xs font-bold text-nafra-text-muted uppercase tracking-wider">
                    {item.reportName} - {item.query.filename}
                  </span>
                  <div className="flex items-center gap-2">
                    {!isValidNow && (
                      <span className="text-[10px] font-mono text-red-300 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/25">
                        {absRefs.slice(0, 3).join(', ')}{absRefs.length > 3 ? ` +${absRefs.length - 3}` : ''}
                      </span>
                    )}
                    {isValidNow ? (
                      <span className="flex items-center gap-1 text-xs font-bold text-green-300 bg-green-500/10 px-2 py-1 rounded border border-green-500/30">
                        <CheckCircle2 size={12} /> Referencia Limpia
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-bold text-red-300 bg-red-500/10 px-2 py-1 rounded border border-red-500/30">
                        <AlertTriangle size={12} /> Referencia Absoluta
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-0">
                  <Editor
                    value={item.query.sql}
                    onValueChange={(code) => handleSqlChange(idx, code)}
                    highlight={highlightSql}
                    padding={16}
                    style={{
                      fontFamily: '"Fira Code", "Fira Mono", monospace',
                      fontSize: 12,
                      backgroundColor: isValidNow ? '#122817' : '#2b1616',
                      color: '#e6edf3',
                    }}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-nafra-border bg-nafra-surface flex justify-end gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.10)]">
          <button onClick={onClose} className="h-10 px-5 text-nafra-text-muted hover:bg-nafra-card rounded-xl font-bold text-sm transition-colors duration-150 ease-out border border-transparent hover:border-nafra-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nafra-accent/40">
            Descartar cambios
          </button>

          <button
            onClick={handleSaveOnly}
            className="h-10 px-6 bg-nafra-surface hover:bg-nafra-card text-nafra-text rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all duration-150 ease-out active:scale-95 border border-nafra-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nafra-accent/40"
          >
            <Save size={16} /> Aplicar cambios en app
          </button>

          <button
            onClick={() => onSave(editedQueries, true)}
            className="h-10 px-8 bg-nafra-accent hover:bg-nafra-accent-dim text-white rounded-xl font-bold text-sm shadow-xl shadow-nafra-accent/20 flex items-center gap-2 transition-all duration-150 ease-out active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nafra-accent/50"
          >
            <Download size={16} /> Guardar y descargar JSON corregido
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryValidatorModal;
