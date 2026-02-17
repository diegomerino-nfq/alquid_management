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
    if (initialFileName) {
      setFileName(initialFileName);
    } else {
      setFileName(null);
    }
  }, [initialFileName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        onFileLoaded(content, file.name);
        setFileName(file.name);
        setError(null);
      } catch (err) {
        setError("Error leyendo el archivo");
      }
    };
    reader.readAsText(file);
    // Reset input value to allow re-selecting the same file if needed after removal
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
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div 
        onClick={() => !fileName && fileInputRef.current?.click()}
        className={`
          relative border-2 rounded-xl p-4 transition-all duration-200 shadow-sm
          ${error 
            ? 'border-red-300 bg-red-50' 
            : fileName 
              ? 'border-green-500 bg-green-50 ring-1 ring-green-500' 
              : 'border-dashed border-gray-300 bg-gray-50 hover:border-alquid-blue hover:bg-blue-50 cursor-pointer'
          }
        `}
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
              <div className="bg-green-100 p-2 rounded-full flex-shrink-0">
                 <CheckCircle className="text-green-600 w-6 h-6" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-bold text-green-800 truncate">{fileName}</p>
                <p className="text-xs text-green-600">Cargado correctamente</p>
              </div>
              <button 
                onClick={handleRemove}
                className="p-2 bg-white rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 shadow-sm transition-colors z-10"
                title="Eliminar archivo"
              >
                <Trash2 size={18} />
              </button>
            </>
          ) : (
            <>
              <div className="bg-white p-2 rounded-full shadow-sm flex-shrink-0">
                 <Upload className="text-gray-400 w-6 h-6 group-hover:text-alquid-blue transition-colors" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600 group-hover:text-alquid-blue">Haz clic para cargar</p>
                <p className="text-xs text-gray-400">{accept}</p>
              </div>
            </>
          )}
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1 font-medium"><AlertCircle size={12}/> {error}</p>}
    </div>
  );
};

export default FileInput;