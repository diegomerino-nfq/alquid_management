import React from 'react';
import { X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  oldText: string;
  newText: string;
  leftTitle?: string;
  rightTitle?: string;
}

const DiffModal: React.FC<Props> = ({ isOpen, onClose, oldText, newText, leftTitle = 'Antes', rightTitle = 'Ahora' }) => {
  if (!isOpen) return null;

  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  const max = Math.max(oldLines.length, newLines.length);

  const getLineClass = (i: number) => {
    const o = oldLines[i] ?? '';
    const n = newLines[i] ?? '';
    if (o === n) return 'bg-white text-gray-700';
    if (o && !n) return 'bg-red-50 text-red-700';
    if (!o && n) return 'bg-green-50 text-green-700';
    return 'bg-yellow-50 text-yellow-800';
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold">Comparación</h3>
            <div className="text-sm text-gray-500">Vista dividida</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800 p-2 rounded">
              <X />
            </button>
          </div>
        </div>

        <div className="flex gap-0 h-full">
          <div className="w-1/2 border-r border-gray-100 flex flex-col">
            <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
              <div className="text-sm font-medium">{leftTitle}</div>
            </div>
            <div className="flex-1 overflow-auto font-mono text-xs bg-white">
              {Array.from({ length: max }).map((_, i) => (
                <div key={`l-${i}`} className={`grid grid-cols-[48px_1fr] gap-2 items-start px-3 py-1 border-b border-gray-50 ${getLineClass(i)}`}>
                  <div className="text-xs text-gray-400 text-right pr-2">{oldLines[i] !== undefined ? i + 1 : ''}</div>
                  <div className="whitespace-pre-wrap break-words">{oldLines[i] ?? ''}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-1/2 flex flex-col">
            <div className="p-3 bg-gray-50 border-b flex items-center justify-between">
              <div className="text-sm font-medium">{rightTitle}</div>
            </div>
            <div className="flex-1 overflow-auto font-mono text-xs bg-white">
              {Array.from({ length: max }).map((_, i) => (
                <div key={`r-${i}`} className={`grid grid-cols-[48px_1fr] gap-2 items-start px-3 py-1 border-b border-gray-50 ${getLineClass(i)}`}>
                  <div className="text-xs text-gray-400 text-right pr-2">{newLines[i] !== undefined ? i + 1 : ''}</div>
                  <div className="whitespace-pre-wrap break-words">{newLines[i] ?? ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t bg-gray-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold rounded bg-gray-200 hover:bg-gray-300">Cerrar</button>
        </div>
      </div>
    </div>
  );
};

export default DiffModal;
