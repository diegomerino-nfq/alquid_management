import React, { useState } from 'react';
import { X, Save, AlertTriangle, CheckCircle2 } from 'lucide-react';
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
  onSave: (correctedQueries: InvalidQuery[]) => void;
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

  const handleSave = () => {
    onSave(editedQueries);
  };

  // Syntax highlighting logic copied from JsonEditor.tsx to avoid extra dependencies
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
              <h3 className="text-xl font-bold text-orange-800">Validación de Referencias Dinámicas</h3>
              <p className="text-sm text-orange-600 mt-1">
                Se han detectado {invalidQueries.length} queries con referencias absolutas. Deben usar <code>%s.%s</code>.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-6">
          {editedQueries.map((item, idx) => {
            const isValidNow = item.query.sql.includes('%s.%s');
            return (
              <div key={idx} className={`bg-white rounded-xl border shadow-sm overflow-hidden ${isValidNow ? 'border-green-200' : 'border-red-200'}`}>
                <div className="bg-gray-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {item.reportName} - {item.query.filename}
                  </span>
                  {isValidNow ? (
                    <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      <CheckCircle2 size={12} /> Corregido
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

        <div className="p-4 border-t border-gray-200 bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-bold text-sm">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-alquid-navy hover:bg-blue-900 text-white rounded-lg font-bold text-sm shadow-lg flex items-center gap-2"
          >
            <Save size={16} /> Guardar Correcciones
          </button>
        </div>
      </div>
    </div>
  );
};

export default QueryValidatorModal;
