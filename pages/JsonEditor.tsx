import React, { useState } from 'react';
import { Save, Plus, RefreshCw, FileJson } from 'lucide-react';
import FileInput from '../components/FileInput';
import PageHeader from '../components/PageHeader';
import { ReportDefinition } from '../types';

const JsonEditor: React.FC = () => {
  const [data, setData] = useState<ReportDefinition[] | null>(null);

  const handleLoaded = (content: string) => {
    try {
      setData(JSON.parse(content));
    } catch (e) {
      alert("JSON inválido");
    }
  };

  const handleRemove = () => {
    setData(null);
  };

  const handleSave = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 4)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'queries_updated.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const addNewQueryStub = () => {
    if (!data) return;
    const newData = [...data];
    if (newData.length === 0) {
        newData.push({ report: "NUEVO REPORTE", queries: [] });
    }
    newData[0].queries.push({
        filename: "nueva_query.sql",
        sql: "SELECT * FROM table",
        database: "default",
        schema: "default",
        table: "default",
        parameters: {}
    });
    setData(newData);
    alert("Query añadida al primer grupo. Edita el JSON exportado para detalles.");
  };

  return (
    <div className="w-full space-y-6 animate-fade-in">
       <PageHeader 
        title="Editor JSON" 
        subtitle="Mantenimiento y limpieza del archivo de configuración"
        icon={<FileJson size={20}/>}
       />

       <div className="bg-white p-6 md:p-8 rounded-xl shadow-sm border border-gray-200 w-full">
          <FileInput 
            label="Cargar queries.json Base" 
            accept=".json" 
            onFileLoaded={handleLoaded}
            onRemove={handleRemove} 
          />
          
          {data ? (
            <div className="mt-6 border border-gray-200 rounded-xl bg-gray-50 p-4 max-h-[500px] overflow-y-auto custom-scrollbar font-mono text-xs text-gray-700 shadow-inner">
               <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
          ) : (
            <div className="mt-6 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50 h-64 flex flex-col items-center justify-center text-gray-400">
               <FileJson size={48} className="mb-4 opacity-20"/>
               <p>Visualización del JSON aparecerá aquí</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4 mt-8">
             <button 
               onClick={addNewQueryStub}
               disabled={!data}
               className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
             >
               <Plus size={18} /> Añadir Query (Stub)
             </button>
             
             <button 
                disabled={true}
                className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl font-bold flex justify-center items-center gap-2 cursor-not-allowed border border-gray-200"
                title="Funcionalidad de sustitución masiva simplificada para esta demo"
             >
               <RefreshCw size={18} /> Sustitución Masiva
             </button>

             <button 
               onClick={handleSave}
               disabled={!data}
               className="flex-1 bg-alquid-red hover:bg-red-600 text-white py-3 rounded-xl font-bold flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all transform active:scale-95"
             >
               <Save size={18} /> Guardar JSON
             </button>
          </div>
       </div>
    </div>
  );
};

export default JsonEditor;