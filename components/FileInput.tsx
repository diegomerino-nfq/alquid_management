import React, { useRef, useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';

interface FileInputProps {
  label: string;
  accept: string;
  onFileLoaded: (content: string, fileName: string) => void;
  onRemove?: () => void;
  required?: boolean;
  initialFileName?: string | null;
}

const FileInput: React.FC<FileInputProps> = ({ label, accept, onFileLoaded, onRemove, required, initialFileName }) => {
  const [fileName, setFileName] = useState<string | null>(initialFileName || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setFileName(initialFileName || null);
    if (initialFileName) setError(null);
  }, [initialFileName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        // Invoke parent callback. If parent validation fails, it should throw an error.
        onFileLoaded(content, file.name);
        
        // If successful
        setFileName(file.name);
        setError(null);
      } catch (err: any) {
        console.error("File input error:", err);
        setError(err.message || "Error procesando el archivo");
        setFileName(null);
      }
    };
    reader.readAsText(file);
    // Reset value to allow re-uploading the same file if needed
    e.target.value = '';
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFileName(null);
    setError(null);
    if (onRemove) onRemove();
  };

  return (
    <div className="mb-4 group">
      <label className="block text-sm font-semibold text-nafra-text mb-1.5">
        {label} {required && <span className="text-nafra-danger">*</span>}
      </label>
      <div 
        onClick={() => !fileName && fileInputRef.current?.click()}
        className={`
          relative border-2 rounded-xl p-4 transition-all duration-200 shadow-sm
          ${error 
            ? 'border-nafra-danger/60 bg-nafra-danger/10' 
            : fileName 
              ? 'border-green-400/70 bg-green-500/10 ring-1 ring-green-500/40' 
              : 'border-dashed border-nafra-border bg-nafra-surface hover:border-nafra-accent hover:bg-nafra-card cursor-pointer'
          }
        `}
        title={fileName || undefined}
      >
        <input 
          type="file" 
          accept={accept} 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          className="hidden" 
        />
        
        <div className="flex items-center gap-3">
          {fileName ? (
            <>
              <div className="bg-green-500/15 p-2 rounded-full flex-shrink-0 border border-green-500/30">
                 <CheckCircle className="text-green-300 w-6 h-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-green-200 truncate">{fileName}</p>
                <p className="text-xs text-green-300">Cargado correctamente</p>
              </div>
              <button 
                onClick={handleRemove}
                className="p-2 bg-nafra-card rounded-full text-nafra-text-muted hover:text-nafra-danger hover:bg-nafra-danger/10 shadow-sm transition-colors z-10 border border-nafra-border"
                title="Eliminar archivo"
              >
                <Trash2 size={18} />
              </button>
            </>
          ) : (
            <>
              <div className="bg-nafra-card p-2 rounded-full shadow-sm flex-shrink-0 border border-nafra-border">
                 <Upload className="text-nafra-text-muted w-6 h-6 group-hover:text-nafra-accent transition-colors" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-nafra-text-dim group-hover:text-nafra-accent">Haz clic para cargar</p>
                <p className="text-xs text-nafra-text-muted">{accept}</p>
              </div>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-nafra-danger mt-1.5 flex items-center gap-1 font-medium"><AlertCircle size={12}/> {error}</p>}
    </div>
  );
};

export default FileInput;