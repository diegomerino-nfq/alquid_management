import React from 'react';
import { Link } from 'react-router-dom';
import { Database, Download, FileJson, ArrowRight, Zap, Shield, Code2, BookOpen } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="h-full overflow-y-auto animate-fade-in pb-10">
      
      {/* Hero Section */}
      <div className="relative bg-white rounded-3xl p-8 md:p-12 mb-8 shadow-sm border border-alquid-gray40 border-opacity-30 overflow-hidden group">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-gradient-to-br from-alquid-gray10 to-alquid-blue rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-700"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-alquid-gray10 border border-alquid-gray40 text-alquid-navy text-xs font-bold uppercase tracking-wider mb-6">
            <span className="w-2 h-2 rounded-full bg-alquid-navy animate-pulse"></span>
            v2.1 Stable Release
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-alquid-navy mb-6 leading-tight">
            Bienvenido a <span className="text-alquid-blue">ALQUID Data Tools</span>
          </h1>
          <p className="text-lg text-alquid-grayDark mb-8 leading-relaxed font-light">
            Una suite integral diseñada para optimizar el flujo de trabajo de datos. 
            Gestiona queries, extrae scripts SQL para producción y descarga informes financieros con validaciones automáticas.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/documentation" className="px-6 py-3 bg-alquid-navy text-white rounded-xl font-medium shadow-lg hover:bg-opacity-90 hover:-translate-y-0.5 transition-all flex items-center gap-2">
               <BookOpen size={18} /> Ver Documentación
            </Link>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <h2 className="text-xl font-bold text-alquid-navy mb-6 px-1">Herramientas Disponibles</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        
        {/* Card 1: Downloader */}
        <Link to="/download" className="group bg-white p-6 rounded-2xl border border-alquid-gray40 border-opacity-40 shadow-sm hover:shadow-xl hover:border-alquid-blue transition-all duration-300 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Download size={80} className="text-alquid-navy" />
           </div>
           <div className="w-12 h-12 bg-alquid-gray10 rounded-xl flex items-center justify-center text-alquid-navy mb-4 group-hover:scale-110 transition-transform duration-300">
              <Download size={24} />
           </div>
           <h3 className="text-lg font-bold text-alquid-navy mb-2 group-hover:text-alquid-blue transition-colors">Descarga de Informes</h3>
           <p className="text-sm text-gray-500 mb-4 font-light">
              Ejecuta descargas masivas validando bases de datos, regiones y entornos automáticamente.
           </p>
           <div className="flex items-center text-sm font-medium text-alquid-blue">
              Acceder <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
           </div>
        </Link>

        {/* Card 2: SQL Extractor */}
        <Link to="/extract" className="group bg-white p-6 rounded-2xl border border-alquid-gray40 border-opacity-40 shadow-sm hover:shadow-xl hover:border-alquid-red transition-all duration-300 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Database size={80} className="text-alquid-red" />
           </div>
           <div className="w-12 h-12 bg-alquid-gray10 rounded-xl flex items-center justify-center text-alquid-red mb-4 group-hover:scale-110 transition-transform duration-300">
              <Database size={24} />
           </div>
           <h3 className="text-lg font-bold text-alquid-navy mb-2 group-hover:text-alquid-red transition-colors">Extracción SQL</h3>
           <p className="text-sm text-gray-500 mb-4 font-light">
              Genera scripts limpios y formateados listos para despliegue en producción con inyección de LoadIDs.
           </p>
           <div className="flex items-center text-sm font-medium text-alquid-red">
              Acceder <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
           </div>
        </Link>

        {/* Card 3: JSON Editor */}
        <Link to="/editor" className="group bg-white p-6 rounded-2xl border border-alquid-gray40 border-opacity-40 shadow-sm hover:shadow-xl hover:border-alquid-orange transition-all duration-300 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <FileJson size={80} className="text-alquid-orange" />
           </div>
           <div className="w-12 h-12 bg-alquid-gray10 rounded-xl flex items-center justify-center text-alquid-orange mb-4 group-hover:scale-110 transition-transform duration-300">
              <FileJson size={24} />
           </div>
           <h3 className="text-lg font-bold text-alquid-navy mb-2 group-hover:text-alquid-orange transition-colors">Editor JSON</h3>
           <p className="text-sm text-gray-500 mb-4 font-light">
              Mantenimiento visual de archivos de configuración y queries con resaltado de sintaxis.
           </p>
           <div className="flex items-center text-sm font-medium text-alquid-orange">
              Acceder <ArrowRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
           </div>
        </Link>
      </div>

      {/* Info Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-alquid-gray40 border-opacity-40">
            <div className="p-3 bg-alquid-gray10 rounded-lg shadow-sm text-alquid-blue"><Zap size={20} /></div>
            <div>
               <h4 className="font-bold text-alquid-navy">Rápido</h4>
               <p className="text-xs text-gray-500">Procesamiento en cliente</p>
            </div>
         </div>
         <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-alquid-gray40 border-opacity-40">
            <div className="p-3 bg-alquid-gray10 rounded-lg shadow-sm text-alquid-navy"><Shield size={20} /></div>
            <div>
               <h4 className="font-bold text-alquid-navy">Seguro</h4>
               <p className="text-xs text-gray-500">Validación estricta de entornos</p>
            </div>
         </div>
         <div className="flex items-center gap-4 p-4 bg-white rounded-xl border border-alquid-gray40 border-opacity-40">
            <div className="p-3 bg-alquid-gray10 rounded-lg shadow-sm text-alquid-orange"><Code2 size={20} /></div>
            <div>
               <h4 className="font-bold text-alquid-navy">Estándar</h4>
               <p className="text-xs text-gray-500">Formato SQL unificado</p>
            </div>
         </div>
      </div>

    </div>
  );
};

export default HomePage;