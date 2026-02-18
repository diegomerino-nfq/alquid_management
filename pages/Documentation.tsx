import React from 'react';
import { BookOpen, FileText, Presentation, Download, Database, FileJson, Archive, Activity, Settings, ChevronRight } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import PptxGenJS from 'pptxgenjs';

const Documentation: React.FC = () => {

  // --- CONTENIDO DE LA DOCUMENTACIÓN ---
  const sections = [
    {
      id: 'intro',
      title: 'Introducción',
      icon: <BookOpen size={20} />,
      content: `ALQUID Data Tools es una suite integral diseñada para optimizar el flujo de trabajo de datos dentro del ecosistema ALQUID. 
      
      Esta herramienta permite a los equipos técnicos y de negocio gestionar consultas SQL, generar informes financieros validados y mantener un control de versiones sobre los archivos de configuración.`
    },
    {
      id: 'downloader',
      title: 'Descarga de Informes',
      icon: <Settings size={20} />,
      content: `El módulo de **Descarga de Informes** permite la ejecución masiva de consultas para obtener CSVs listos para análisis.

      **Características principales:**
      - Validación automática de tablas permitidas (metric, cashflow, result).
      - Validación estricta de bases de datos según la región y entorno (PRE/PRO).
      - Inyección dinámica de Load IDs.
      - Barra de progreso en tiempo real.`
    },
    {
      id: 'extractor',
      title: 'Extracción SQL',
      icon: <Database size={20} />,
      content: `El módulo de **Extracción SQL** está diseñado para generar scripts limpios (.sql) para despliegue en producción.

      **Funcionalidades:**
      - Formateo automático de SQL ("Pretty Print") respetando mayúsculas y tabulaciones.
      - Sustitución de variables de entorno y parámetros.
      - Eliminación de metadatos JSON para obtener SQL puro.`
    },
    {
      id: 'editor',
      title: 'Editor JSON',
      icon: <FileJson size={20} />,
      content: `El **Editor JSON** ofrece una interfaz visual para modificar el archivo 'queries.json' sin riesgo de errores de sintaxis.

      **Capacidades:**
      - Edición de SQL con resaltado de sintaxis inteligente.
      - Creación de nuevas queries mediante formularios.
      - Visualización tabular de todas las consultas agrupadas por reporte.
      - Importación directa de archivos .sql externos.`
    },
    {
      id: 'repository',
      title: 'Repositorio',
      icon: <Archive size={20} />,
      content: `El **Repositorio Centralizado** actúa como el sistema de control de versiones de la aplicación.

      **Flujo de trabajo:**
      1. Navegación jerárquica por Región > Entorno.
      2. Carga de nuevas versiones de archivos JSON.
      3. **Comparación de versiones (Diff):** Permite seleccionar dos archivos y visualizar lado a lado los cambios en el código SQL y configuración.
      4. Descarga de versiones históricas.`
    },
    {
      id: 'activity',
      title: 'Registro de Actividad',
      icon: <Activity size={20} />,
      content: `El **Log de Actividad** registra todas las operaciones críticas realizadas en la sesión actual.

      - Tipos de eventos: Éxito, Error, Advertencia, Info.
      - Trazabilidad de cargas de archivos y ejecuciones.
      - Estilo visual tipo consola para facilitar la lectura técnica.`
    }
  ];

  // --- GENERAR WORD (HTML Blob) ---
  const generateWord = () => {
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>Manual de Usuario ALQUID</title>
    <style>
      body { font-family: 'Calibri', sans-serif; line-height: 1.5; }
      h1 { color: #110841; font-size: 24pt; border-bottom: 2px solid #EE2833; padding-bottom: 10px; }
      h2 { color: #499CD9; font-size: 18pt; margin-top: 20px; }
      p { font-size: 11pt; color: #333; text-align: justify; }
      ul { margin-bottom: 10px; }
      li { margin-bottom: 5px; }
      .footer { font-size: 9pt; color: #888; text-align: center; margin-top: 50px; }
    </style>
    </head><body>`;
    
    let body = `<h1>Manual de Usuario - ALQUID Data Tools</h1>
                <p>Generado automáticamente el ${new Date().toLocaleDateString()}</p><br/>`;

    sections.forEach(sec => {
      // Convertir markdown básico a HTML simple para el Word
      let htmlContent = sec.content
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // Bold
        .replace(/\n/g, '<br/>'); // Line breaks

      body += `<h2>${sec.title}</h2><p>${htmlContent}</p><hr/>`;
    });

    const footer = `<div class='footer'>ALQUID Data Tools v2.1 - Documentación Oficial</div></body></html>`;
    const html = header + body + footer;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Manual_Usuario_ALQUID.doc';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- GENERAR POWERPOINT (PptxGenJS) ---
  const generatePPT = () => {
    const pres = new PptxGenJS();

    // Configuración General
    pres.layout = 'LAYOUT_16x9';
    pres.author = 'ALQUID Data Suite';
    pres.company = 'NFQ';
    pres.subject = 'Presentación Ejecutiva';

    // Slide Maestro (Fondo)
    pres.defineSlideMaster({
      title: 'MASTER_SLIDE',
      background: { color: 'F6F8F6' },
      objects: [
        { rect: { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: '110841' } } }, // Barra superior Navy
        { rect: { x: 0, y: 0.15, w: '100%', h: 0.05, fill: { color: 'EE2833' } } }, // Barra fina Roja
        { text: { text: 'ALQUID Data Tools', options: { x: 0.5, y: 0.3, fontSize: 10, color: '888888' } } }
      ]
    });

    // 1. Portada
    const slide1 = pres.addSlide({ masterName: 'MASTER_SLIDE' });
    slide1.addText('ALQUID Data Tools', { x: 1, y: 2.5, w: '80%', fontSize: 44, color: '110841', bold: true, align: 'center' });
    slide1.addText('Manual de Funcionalidades v2.1', { x: 1, y: 3.5, w: '80%', fontSize: 24, color: '499CD9', align: 'center' });
    slide1.addText(`Generado: ${new Date().toLocaleDateString()}`, { x: 1, y: 4.5, w: '80%', fontSize: 14, color: '888888', align: 'center' });

    // 2. Slides por Sección
    sections.forEach(sec => {
      const slide = pres.addSlide({ masterName: 'MASTER_SLIDE' });
      
      // Título
      slide.addText(sec.title, { x: 0.5, y: 0.8, fontSize: 32, color: '110841', bold: true });
      
      // Contenido (Limpiar markdown para PPT)
      const cleanContent = sec.content
        .replace(/\*\*/g, '')
        .split('\n')
        .filter(line => line.trim() !== '')
        .map(line => {
             if(line.trim().startsWith('-')) return { text: line.replace('-','').trim(), options: { bullet: true, fontSize: 16, color: '333333', breakLine: true } };
             if(line.trim().match(/^\d\./)) return { text: line.replace(/^\d\./,'').trim(), options: { bullet: { type: 'number' }, fontSize: 16, color: '333333', breakLine: true } };
             return { text: line.trim(), options: { fontSize: 18, color: '555555', breakLine: true, indent: 0 } };
        });

      // Añadir texto como bloques
      let currentY = 1.8;
      cleanContent.forEach((item: any) => {
          slide.addText(item.text, { x: 0.5, y: currentY, w: '90%', ...item.options });
          currentY += 0.5;
      });
    });

    pres.writeFile({ fileName: 'Presentacion_ALQUID.pptx' });
  };

  return (
    <div className="h-full flex flex-col animate-fade-in w-full">
      <PageHeader 
        title="Documentación del Sistema" 
        subtitle="Manual de usuario, guías de uso y descarga de recursos"
        icon={<BookOpen size={20}/>}
      />

      <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden">
        
        {/* Sidebar de Navegación (Sticky) */}
        <div className="lg:w-64 flex-shrink-0 space-y-6 overflow-y-auto pr-2 custom-scrollbar lg:block hidden">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">Tabla de Contenidos</h3>
                <nav className="space-y-1">
                    {sections.map(sec => (
                        <a 
                            key={sec.id} 
                            href={`#${sec.id}`}
                            className="flex items-center gap-3 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-blue-50 hover:text-alquid-blue transition-colors group"
                        >
                            <span className="text-gray-400 group-hover:text-alquid-blue transition-colors">{sec.icon}</span>
                            {sec.title}
                        </a>
                    ))}
                </nav>
            </div>

            {/* Bloque de Descarga */}
            <div className="bg-alquid-navy rounded-xl shadow-lg p-5 text-white">
                <h3 className="font-bold text-lg mb-2">Exportar</h3>
                <p className="text-xs text-blue-200 mb-4">Descarga esta documentación para uso offline.</p>
                
                <div className="space-y-3">
                    <button 
                        onClick={generateWord}
                        className="w-full flex items-center justify-between bg-white text-alquid-navy px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-100 transition-colors"
                    >
                        <span>Manual Word</span>
                        <FileText size={16} />
                    </button>
                    <button 
                        onClick={generatePPT}
                        className="w-full flex items-center justify-between bg-alquid-orange text-white px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-opacity-90 transition-colors"
                    >
                        <span>Presentación PPT</span>
                        <Presentation size={16} />
                    </button>
                </div>
            </div>
        </div>

        {/* Mobile Download Buttons (Only visible on small screens) */}
        <div className="lg:hidden flex gap-2">
             <button onClick={generateWord} className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 py-2 rounded-lg text-sm font-bold text-alquid-navy">
                 <FileText size={16}/> Manual Word
             </button>
             <button onClick={generatePPT} className="flex-1 flex items-center justify-center gap-2 bg-alquid-navy py-2 rounded-lg text-sm font-bold text-white">
                 <Presentation size={16}/> PPT Resumen
             </button>
        </div>

        {/* Contenido Principal Scrollable */}
        <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto p-8 lg:pr-12 scroll-smooth">
            <div className="max-w-3xl mx-auto space-y-12">
                
                {sections.map((sec, idx) => (
                    <section key={sec.id} id={sec.id} className="scroll-mt-24">
                        <div className="flex items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                            <div className={`p-3 rounded-xl ${idx === 0 ? 'bg-alquid-navy text-white' : 'bg-blue-50 text-alquid-blue'}`}>
                                {sec.icon}
                            </div>
                            <h2 className="text-2xl font-bold text-gray-800">{sec.title}</h2>
                        </div>
                        
                        <div className="prose prose-slate max-w-none text-gray-600 leading-relaxed space-y-4">
                            {sec.content.split('\n').map((paragraph, i) => {
                                // Simple parser for markdown-like bold syntax
                                const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                                return (
                                    <p key={i}>
                                        {parts.map((part, j) => {
                                            if (part.startsWith('**') && part.endsWith('**')) {
                                                return <strong key={j} className="text-gray-900 font-bold">{part.slice(2, -2)}</strong>;
                                            }
                                            return part;
                                        })}
                                    </p>
                                );
                            })}
                        </div>

                        {/* Visual Helper for Section End */}
                        {idx < sections.length - 1 && (
                            <div className="mt-12 flex justify-center">
                                <div className="w-16 h-1 bg-gray-100 rounded-full"></div>
                            </div>
                        )}
                    </section>
                ))}

            </div>
            
            {/* Footer del Documento */}
            <div className="mt-20 pt-10 border-t border-gray-200 text-center">
                <p className="text-gray-400 text-sm">© 2024 ALQUID Data Suite. Todos los derechos reservados.</p>
                <div className="flex justify-center gap-4 mt-4">
                    <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="text-alquid-blue text-sm hover:underline">
                        Volver arriba
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Documentation;