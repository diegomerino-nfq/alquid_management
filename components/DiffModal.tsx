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
    if (o === n) return 'bg-nafra-card text-nafra-text';
    if (o && !n) return 'bg-red-500/10 text-red-200';
    if (!o && n) return 'bg-green-500/10 text-green-200';
    return 'bg-amber-500/10 text-amber-200';
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-nafra-card text-nafra-text rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden border border-nafra-border">
        <div className="flex items-center justify-between p-4 border-b border-nafra-border bg-nafra-surface">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-bold">Comparación</h3>
            <div className="text-sm text-nafra-text-muted">Vista dividida</div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="h-10 w-10 flex items-center justify-center text-nafra-text-muted hover:text-nafra-text rounded-lg hover:bg-nafra-card transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nafra-accent/40">
              <X />
            </button>
          </div>
        </div>

        <div className="flex gap-0 h-full">
          <div className="w-1/2 border-r border-nafra-border flex flex-col">
            <div className="p-3 bg-nafra-surface border-b border-nafra-border flex items-center justify-between">
              <div className="text-sm font-medium">{leftTitle}</div>
            </div>
            <div className="flex-1 overflow-auto font-mono text-xs bg-nafra-card">
              {Array.from({ length: max }).map((_, i) => (
                <div key={`l-${i}`} className={`grid grid-cols-[48px_1fr] gap-2 items-start px-3 py-1 border-b border-nafra-border/50 ${getLineClass(i)}`}>
                  <div className="text-xs text-nafra-text-muted text-right pr-2">{oldLines[i] !== undefined ? i + 1 : ''}</div>
                  <div className="whitespace-pre-wrap break-words">{oldLines[i] ?? ''}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-1/2 flex flex-col">
            <div className="p-3 bg-nafra-surface border-b border-nafra-border flex items-center justify-between">
              <div className="text-sm font-medium">{rightTitle}</div>
            </div>
            <div className="flex-1 overflow-auto font-mono text-xs bg-nafra-card">
              {Array.from({ length: max }).map((_, i) => (
                <div key={`r-${i}`} className={`grid grid-cols-[48px_1fr] gap-2 items-start px-3 py-1 border-b border-nafra-border/50 ${getLineClass(i)}`}>
                  <div className="text-xs text-nafra-text-muted text-right pr-2">{newLines[i] !== undefined ? i + 1 : ''}</div>
                  <div className="whitespace-pre-wrap break-words">{newLines[i] ?? ''}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-3 border-t border-nafra-border bg-nafra-surface flex justify-end gap-2">
          <button onClick={onClose} className="h-10 px-4 text-sm font-bold rounded bg-nafra-card text-nafra-text border border-nafra-border hover:bg-nafra-card-hover transition-colors duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nafra-accent/40">Cerrar comparación</button>
        </div>
      </div>
    </div>
  );
};

export default DiffModal;
