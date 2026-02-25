import React, { useState } from 'react';
import { X, Save, AlertTriangle, CheckCircle2, Download } from 'lucide-react';
import Editor from 'react-simple-code-editor';
import { QueryDefinition } from '../types';

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

  const handleAutoFixAll = () => {
    const absRefRegex = /\b(FROM|JOIN)\s+((`?[a-zA-Z0-9_\-]+`?\.)*(`?[a-zA-Z0-9_\-]+`?))/gi;
    const updated = editedQueries.map(item => {
      const fixedSql = item.query.sql.replace(absRefRegex, (fullMatch, keyword, reference) => {
        if (reference.includes('%s')) return fullMatch;
        return `${keyword} %s.%s`;
      });
      return {
        ...item,
        query: { ...item.query, sql: fixedSql }
      };
    });
    setEditedQueries(updated);
  };

  const handleSaveAndDownload = () => {
    onSave(editedQueries);
    // The actual download logic should be in the parent, 
    // but we can signal it if needed. For now, we'll just onSave.
  };

  const handleSaveOnly = () => {
    onSave(editedQueries);
  };

  // Syntax highlighting logic
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

    // Absolute reference detection (Restricted to FROM/JOIN)
    const absRefRegex = /\b(FROM|JOIN)\s+((`?[a-zA-Z0-9_\-]+`?\.)*(`?[a-zA-Z0-9_\-]+`?))/gi;
    safeCode = safeCode.replace(absRefRegex, (fullMatch, keyword, reference) => {
      if (reference.includes('%s')) return fullMatch;
      const maskedRef = mask(reference, "text-red-600 font-bold underline decoration-red-400 bg-red-50 px-0.5 rounded");
      return `${keyword} ${maskedRef}`;
    });

    return safeCode.replace(/__PH_(\d+)__/g, (_, index) => placeholders[parseInt(index)]);
  };

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col animate-fade-in border border-orange-200">
        <div className="bg-orange-50 p-6 border-b border-orange-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-full">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-orange-800">Saneamiento de Referencias SQL</h3>
              <p className="text-sm text-orange-600 mt-1">
                Detectadas {invalidQueries.length} referencias absolutas. Cámbialas a <code>%s.%s</code> para habilitar la descarga multi-entorno.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={handleAutoFixAll}
              className="px-4 py-2 bg-blue-50 text-alquid-blue rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-blue-100 transition-all border border-blue-200"
            >
              <CheckCircle2 size={14} /> Auto-corregir Todo (%s.%s)
            </button>
          </div>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            {editedQueries.filter(q => q.query.sql.includes('%s.%s')).length} corregidas de {editedQueries.length}
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
          {editedQueries.map((item, idx) => {
            const isValidNow = item.query.sql.includes('%s.%s');
            return (
              <div key={idx} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${isValidNow ? 'border-green-300 ring-4 ring-green-500/5' : 'border-red-200'}`}>
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {item.reportName} - {item.query.filename}
                  </span>
                  {isValidNow ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      <CheckCircle2 size={12} /> Referencia Limpia
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                      <AlertTriangle size={12} /> Referencia Absoluta
                    </span>
                  )}
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
                      backgroundColor: isValidNow ? '#f0fdf4' : '#fff5f5',
                    }}
                    className="min-h-[100px]"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3 shadow-[0_-4px_10px_rgba(0,0,0,0.02)]">
          <button onClick={onClose} className="px-5 py-2 text-gray-500 hover:bg-gray-100 rounded-xl font-bold text-sm transition-colors">
            Descartar
          </button>

          <button
            onClick={handleSaveOnly}
            className="px-6 py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-bold text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95"
          >
            <Save size={16} /> Aplicar Cambios (Solo App)
          </button>

          <button
            onClick={() => onSave(editedQueries, true)}
            className="px-8 py-2 bg-alquid-blue hover:bg-blue-600 text-white rounded-xl font-bold text-sm shadow-xl shadow-blue-500/20 flex items-center gap-2 transition-all animate-pulse-slow active:scale-95"
          >
            <Download size={16} /> Guardar y Descargar .json corregido
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryValidatorModal;
