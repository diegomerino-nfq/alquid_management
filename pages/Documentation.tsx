import React from 'react';
import { BookOpen, FileText, Presentation, Download, Database, FileJson, Archive, Activity, Settings, ChevronRight, Info, AlertTriangle, CheckCircle, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import PptxGenJS from 'pptxgenjs';

const Documentation: React.FC = () => {

  // --- CONTENIDO EXHAUSTIVO DE LA DOCUMENTACIÓN ---
  const sections = [
    {
      id: 'intro',
      title: '1. Introducción y Propósito',
      icon: <BookOpen size={20} />,
      content: `ALQUID Data Tools es la suite oficial diseñada para estandarizar y asegurar el ciclo de vida del dato dentro de la organización.
      
      Esta plataforma centraliza herramientas que anteriormente estaban dispersas (scripts manuales, validaciones en Excel, correos electrónicos), proporcionando un entorno web seguro, validado y versionado.

      **Objetivos Principales:**
      - **Seguridad:** Eliminar la manipulación manual de archivos SQL sensibles.
      - **Estandarización:** Asegurar que todas las queries cumplan con los formatos de *naming convention* y *coding style*.
      - **Trazabilidad:** Registrar quién descargó qué y cuándo (Log de Actividad).
      - **Versionado:** Mantener un historial inmutable de las configuraciones por entorno (Repositorio).`
    },
    {
      id: 'downloader',
      title: '2. Descarga de Informes',
      icon: <Settings size={20} />,
      content: `Este módulo es la herramienta principal para usuarios de negocio y analistas que necesitan extraer datos procesados.

      **Flujo de Trabajo:**
      1. **Selección de Entorno:** El usuario debe seleccionar obligatoriamente una **Región** (ej. España, Latam) y un **Entorno** (PRE/PRO). Esto carga las reglas de validación específicas para esa combinación.
      2. **Load ID:** Campo obligatorio. Se inyecta dinámicamente en las queries SQL reemplazando la variable \`:load_id\`.
      3. **Carga de Archivos:**
         - *Queries JSON:* Archivo que contiene la lógica SQL.
         - *Accesos JSON:* Archivo de configuración que mapea entornos a esquemas de base de datos reales.
      4. **Selección de Queries:**
         - Tabla interactiva con checkbox.
         - Botón "Seleccionar Todo" para operaciones masivas.
         - **Validación en Tiempo Real:** La columna "Validación" analiza la query antes de permitir su selección.

      **Reglas de Validación Automática:**
      - **Tablas Permitidas:** El sistema bloquea cualquier query que no ataque a las tablas \`metric\`, \`cashflow\` o \`result\`.
      - **Base de Datos Correcta:** Se verifica que la base de datos definida en el JSON coincida con las permitidas para la Región/Entorno seleccionados (según \`EXPECTED_DATABASES\`).
      - Si una validación falla, la fila se marca en rojo y se deshabilita la descarga de esa query específica.

      **Salida:**
      - Archivos .csv descargados secuencialmente en el navegador.
      - Nombres de archivo normalizados basados en la ruta del reporte.`
    },
    {
      id: 'extractor',
      title: '3. Extracción SQL para Producción',
      icon: <Database size={20} />,
      content: `Módulo técnico dirigido a ingenieros de datos y DBAs. Su función es convertir las definiciones JSON (utilizadas por la app) en scripts SQL puros (.sql) ejecutables en bases de datos (Spark, Hive, Snowflake, etc.).

      **Características Técnicas:**
      - **Pretty Print SQL:** Utiliza un motor de formateo personalizado que indenta cláusulas (SELECT, FROM, WHERE), alinea JOINS y formatea sub-queries para máxima legibilidad.
      - **Inyección de Variables:**
         - Reemplaza \`%s.%s\` por \`schema.table\` definidos en el JSON.
         - Resuelve parámetros complejos (listas, arrays) dentro de la cláusula \`IN (...)\`.
         - Inyecta el \`Load ID\` proporcionado en la interfaz.
      
      **Caso de Uso:**
      - Generar el paquete de despliegue para una subida a producción.
      - Debuggear una query específica copiando el SQL generado y ejecutándolo en un cliente de base de datos externo (DBeaver, Hue).`
    },
    {
      id: 'editor',
      title: '4. Editor JSON Avanzado',
      icon: <FileJson size={20} />,
      content: `Entorno de desarrollo integrado (IDE) ligero para el mantenimiento de los archivos de configuración \`queries.json\`.

      **Funcionalidades de Edición:**
      - **Editor de Código:** Resaltado de sintaxis SQL (coloreado de palabras clave, strings, comentarios).
      - **Formateo Automático:** Botón "Varita Mágica" para indentar y limpiar el SQL automáticamente.
      - **Gestión de Parámetros:** Interfaz visual para añadir, editar o eliminar parámetros dinámicos (ej. \`:fecha_corte\`, \`:escenario\`) sin tocar el JSON crudo.
      
      **Operaciones de Estructura:**
      - **Crear Nueva Query:** Asistente paso a paso. Permite importar un archivo \`.sql\` externo y el sistema autodetecta la Base de Datos, Esquema y Tabla analizando la cláusula \`FROM\`.
      - **Renombrar:** Modificar nombres de reportes o archivos.
      - **Eliminación Segura:** Confirmación antes de borrar queries o reportes enteros.
      
      **Salida:**
      - Genera un nuevo archivo JSON validado listo para ser subido al Repositorio.`
    },
    {
      id: 'repository',
      title: '5. Repositorio Centralizado',
      icon: <Archive size={20} />,
      content: `Sistema de control de versiones simplificado para la gestión de configuraciones.

      **Estructura Jerárquica:**
      - Nivel 1: Región (Banderas visuales).
      - Nivel 2: Entorno (PRE/PRO).
      - Nivel 3: Historial de Archivos.

      **Control de Versiones:**
      - Cada subida genera una nueva versión (v1, v2, v3...) automáticamente.
      - No se sobrescriben archivos; se apilan históricamente.
      - La versión más reciente se marca automáticamente como **ACTUAL**.

      **Herramienta de Comparación (Diff):**
      - Permite seleccionar dos versiones cualesquiera y compararlas.
      - **Visualización de Cambios:**
         - **Verde:** Queries nuevas o líneas añadidas.
         - **Rojo:** Queries eliminadas o líneas borradas.
         - **Naranja:** Modificaciones en parámetros o metadatos (ej. cambio de tabla destino).
      - Muestra un "Diff" línea por línea del código SQL para detectar cambios sutiles en la lógica.`
    },
    {
      id: 'activity',
      title: '6. Registro de Actividad y Auditoría',
      icon: <Activity size={20} />,
      content: `Módulo de seguridad y observabilidad. Dado que la herramienta manipula datos sensibles y configuraciones críticas, cada acción deja una huella digital en la sesión.

      **Eventos Registrados:**
      - **Cargas:** Importación de archivos JSON/SQL.
      - **Ejecuciones:** Descargas masivas de informes (con conteo de éxito/error).
      - **Modificaciones:** Cambios en el editor, subidas al repositorio.
      - **Errores:** Fallos de validación o errores de parsing.

      **Interfaz:**
      - Diseño tipo "Consola de Sistema" para facilitar la lectura técnica.
      - Código de colores por severidad (INFO, SUCCESS, WARNING, ERROR).
      - Timestamps precisos para correlación de eventos.`
    }
  ];

  // --- FUNCIÓN DE SCROLL CORREGIDA ---
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    const container = document.getElementById('docs-content-container');
    
    if (element && container) {
        // Calculamos la posición relativa del elemento dentro del contenedor
        const topPos = element.offsetTop - container.offsetTop;
        container.scrollTo({
            top: topPos - 20, // 20px de padding visual
            behavior: 'smooth'
        });
    }
  };

  // --- GENERAR WORD (HTML AVANZADO) ---
  const generateWord = () => {
    const styles = `
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; }
        .cover { height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-after: always; }
        h1 { color: #110841; font-size: 28pt; margin-bottom: 10px; }
        .subtitle { color: #499CD9; font-size: 18pt; margin-bottom: 50px; }
        .meta { color: #666; font-size: 12pt; }
        
        .section-break { page-break-before: always; }
        h2 { color: #110841; font-size: 20pt; border-bottom: 2px solid #EE2833; padding-bottom: 10px; margin-top: 40px; }
        h3 { color: #499CD9; font-size: 14pt; margin-top: 20px; }
        p { margin-bottom: 15px; text-align: justify; }
        
        ul { margin-bottom: 15px; padding-left: 20px; }
        li { margin-bottom: 5px; }
        strong { color: #110841; font-weight: bold; }
        
        .code-block { background-color: #f4f4f4; border: 1px solid #ddd; padding: 10px; font-family: 'Courier New', monospace; font-size: 10pt; color: #d63384; margin: 10px 0; }
        
        .placeholder-img { 
            width: 100%; height: 200px; background-color: #eee; border: 2px dashed #aaa; 
            display: flex; align-items: center; justify-content: center; margin: 20px 0; color: #777; font-weight: bold;
            text-align: center; padding-top: 80px; box-sizing: border-box;
        }
        
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th { background-color: #110841; color: white; padding: 10px; text-align: left; }
        td { border: 1px solid #ddd; padding: 8px; }
      </style>
    `;

    const cover = `
      <div class="cover">
        <h1>ALQUID Data Tools</h1>
        <div class="subtitle">Manual de Usuario y Documentación Técnica</div>
        <div class="meta">
            <p><strong>Versión del Sistema:</strong> 2.1 Stable</p>
            <p><strong>Fecha de Generación:</strong> ${new Date().toLocaleDateString()}</p>
            <p><strong>Departamento:</strong> Data Engineering</p>
        </div>
      </div>
    `;

    let content = '';
    sections.forEach(sec => {
      // Parsear markdown básico a HTML
      let htmlBody = sec.content
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>')
        .replace(/`(.*?)`/g, '<span class="code-block">$1</span>');

      content += `
        <div class="section-break">
            <h2>${sec.title}</h2>
            <p>${htmlBody}</p>
            
            <div class="placeholder-img">
                [ INSERTAR CAPTURA DE PANTALLA DEL MÓDULO: ${sec.title.toUpperCase()} ]
            </div>
            
            <p><em>Nota: Consulte la documentación en línea para ver actualizaciones en tiempo real.</em></p>
        </div>
      `;
    });

    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'><title>Manual ALQUID</title>${styles}</head>
      <body>${cover}${content}</body></html>
    `;

    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Manual_ALQUID_Data_Tools_${new Date().toISOString().slice(0,10)}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- GENERAR PPT (DISEÑO CORPORATIVO) ---
  const generatePPT = () => {
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';
    pres.author = 'ALQUID Data Suite';
    pres.company = 'NFQ';
    pres.subject = 'Documentación Técnica';

    // Definir Patrón de Diapositiva (Master Slide)
    pres.defineSlideMaster({
      title: 'MASTER_ALQUID',
      background: { color: 'F6F8F6' },
      objects: [
        { rect: { x: 0, y: 0, w: '100%', h: 0.8, fill: { color: '110841' } } }, // Header Navy
        { rect: { x: 0, y: 0.8, w: '100%', h: 0.1, fill: { color: 'EE2833' } } }, // Linea Roja
        { text: { text: 'ALQUID Data Tools - Documentación Oficial', options: { x: 0.3, y: 0.2, fontSize: 18, color: 'FFFFFF', bold: true } } },
        { text: { text: 'Confidencial - Uso Interno', options: { x: 11, y: 0.3, fontSize: 10, color: 'CCCCCC', align: 'right' } } },
        { rect: { x: 0, y: 7.2, w: '100%', h: 0.3, fill: { color: 'E0E0E0' } } }, // Footer bar
      ],
      slideNumber: { x: 12.8, y: 7.25, color: '555555' }
    });

    // 1. Portada
    const slide1 = pres.addSlide();
    slide1.background = { color: '110841' };
    slide1.addText('ALQUID', { x: 1, y: 2.5, w: '80%', fontSize: 60, color: 'FFFFFF', bold: true });
    slide1.addText('DATA SUITE', { x: 1, y: 3.5, w: '80%', fontSize: 24, color: '499CD9', charSpacing: 10 });
    slide1.addText('Manual de Usuario & Especificaciones Técnicas', { x: 1, y: 5, w: '80%', fontSize: 18, color: 'CCCCCC' });
    slide1.addText(`Generado el: ${new Date().toLocaleDateString()}`, { x: 1, y: 6.5, fontSize: 12, color: '888888' });

    // 2. Diapositivas de Contenido
    sections.forEach(sec => {
      const slide = pres.addSlide({ masterName: 'MASTER_ALQUID' });
      
      // Título Sección
      slide.addText(sec.title, { x: 0.5, y: 1.2, fontSize: 28, color: '110841', bold: true, border: { pt: 0, pb: 2, color: '499CD9' } });

      // Procesar contenido para viñetas
      const lines = sec.content.split('\n').filter(l => l.trim().length > 0);
      let yPos = 2.2;
      
      lines.forEach(line => {
          let text = line.trim();
          let opts: any = { x: 0.5, y: yPos, w: '60%', fontSize: 14, color: '444444', breakLine: true };

          if (text.startsWith('**') && text.endsWith('**')) {
              // Subtítulos dentro del texto
              text = text.replace(/\*\*/g, '');
              opts.fontSize = 16;
              opts.color = 'EE2833';
              opts.bold = true;
              yPos += 0.2; // Extra espacio antes de título
          } else if (text.startsWith('-')) {
              // Viñetas
              text = text.substring(1).trim();
              opts.bullet = { type: 'round', color: '499CD9' };
              opts.indentLevel = 1;
          } else if (text.match(/^\d\./)) {
              // Listas numeradas
               opts.bullet = { type: 'number', color: '110841' };
               opts.indentLevel = 1;
          }

          // Eliminar markdown bold restante para limpieza
          text = text.replace(/\*\*/g, '');
          
          // Limitar items por slide si es muy largo (básico)
          if(yPos < 6.5) {
            slide.addText(text, opts);
            yPos += 0.5; // Espaciado entre líneas
          }
      });

      // Placeholder visual para imagen
      slide.addShape(pres.ShapeType.rect, { 
          x: 8.5, y: 2.2, w: 4.5, h: 3.5, 
          fill: { color: 'F0F0F0' }, 
          line: { color: 'CCCCCC', dashType: 'dash' } 
      });
      slide.addText('Espacio para Captura', { 
          x: 8.5, y: 3.8, w: 4.5, h: 0.5, 
          align: 'center', color: 'AAAAAA', fontSize: 12 
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

      <div className="flex flex-col lg:flex-row gap-8 h-full overflow-hidden mt-8">
        
        {/* Sidebar de Navegación (Sticky) */}
        <div className="lg:w-72 flex-shrink-0 space-y-6 overflow-y-auto pr-2 custom-scrollbar lg:block hidden pb-10">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 sticky top-0">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
                    <Search size={12}/> Tabla de Contenidos
                </h3>
                <nav className="space-y-1">
                    {sections.map(sec => (
                        <button 
                            key={sec.id} 
                            onClick={() => scrollToSection(sec.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 rounded-lg hover:bg-blue-50 hover:text-alquid-blue transition-all group text-left"
                        >
                            <span className="text-gray-400 group-hover:text-alquid-blue transition-colors bg-gray-50 p-1 rounded group-hover:bg-white">{sec.icon}</span>
                            <span className="truncate font-medium">{sec.title.split('.')[1] || sec.title}</span>
                        </button>
                    ))}
                </nav>
            </div>

            {/* Bloque de Descarga */}
            <div className="bg-gradient-to-br from-alquid-navy to-blue-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-2 -mr-2 w-20 h-20 bg-white opacity-10 rounded-full blur-xl"></div>
                <h3 className="font-bold text-lg mb-2 flex items-center gap-2"><Download size={18}/> Exportar Guía</h3>
                <p className="text-xs text-blue-100 mb-6 opacity-80 leading-relaxed">Descarga el manual completo con estilos profesionales para uso offline o presentaciones.</p>
                
                <div className="space-y-3">
                    <button 
                        onClick={generateWord}
                        className="w-full flex items-center justify-between bg-white text-alquid-navy px-4 py-3 rounded-lg text-sm font-bold hover:bg-blue-50 transition-all shadow-sm hover:translate-x-1"
                    >
                        <span className="flex items-center gap-2"><FileText size={16} className="text-blue-600"/> Manual Word</span>
                        <ChevronRight size={14} className="text-gray-300"/>
                    </button>
                    <button 
                        onClick={generatePPT}
                        className="w-full flex items-center justify-between bg-alquid-orange text-white px-4 py-3 rounded-lg text-sm font-bold hover:bg-red-600 transition-all shadow-sm hover:translate-x-1"
                    >
                        <span className="flex items-center gap-2"><Presentation size={16} /> Presentación PPT</span>
                        <ChevronRight size={14} className="text-white/50"/>
                    </button>
                </div>
            </div>
        </div>

        {/* Mobile Download Buttons */}
        <div className="lg:hidden flex gap-2">
             <button onClick={generateWord} className="flex-1 flex items-center justify-center gap-2 bg-white border border-gray-300 py-3 rounded-lg text-sm font-bold text-alquid-navy shadow-sm">
                 <FileText size={16}/> Manual Word
             </button>
             <button onClick={generatePPT} className="flex-1 flex items-center justify-center gap-2 bg-alquid-navy py-3 rounded-lg text-sm font-bold text-white shadow-sm">
                 <Presentation size={16}/> PPT Resumen
             </button>
        </div>

        {/* Contenido Principal Scrollable con ID para el scroll */}
        <div id="docs-content-container" className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 overflow-y-auto p-8 lg:pr-16 scroll-smooth relative">
            
            {/* Introducción Visual */}
            <div className="mb-12 pb-8 border-b border-gray-100">
                <h2 className="text-3xl font-black text-alquid-navy mb-4">Manual de Usuario v2.1</h2>
                <p className="text-lg text-gray-600 font-light leading-relaxed">
                    Bienvenido a la documentación oficial de <strong>ALQUID Data Suite</strong>. 
                    Esta guía detalla cada funcionalidad técnica, validación y flujo operativo disponible en la plataforma.
                </p>
                <div className="flex gap-4 mt-6">
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium">
                        <CheckCircle size={14}/> Documentación actualizada
                    </div>
                    <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full font-medium">
                        <AlertTriangle size={14}/> Última rev: {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-16">
                {sections.map((sec, idx) => (
                    <section key={sec.id} id={sec.id} className="scroll-mt-8 relative group">
                        
                        {/* Decoración lateral en hover */}
                        <div className="absolute -left-8 top-0 bottom-0 w-1 bg-alquid-blue opacity-0 group-hover:opacity-100 transition-opacity rounded-full"></div>

                        <div className="flex items-start gap-5 mb-6">
                            <div className={`p-4 rounded-2xl shadow-sm mt-1 shrink-0 ${idx === 0 ? 'bg-alquid-navy text-white' : 'bg-white border border-gray-100 text-alquid-blue'}`}>
                                {sec.icon}
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{sec.title}</h2>
                                <div className="h-1 w-20 bg-gradient-to-r from-alquid-blue to-transparent rounded-full"></div>
                            </div>
                        </div>
                        
                        <div className="prose prose-slate prose-lg max-w-none text-gray-600 leading-relaxed space-y-4 pl-0 md:pl-20">
                            {sec.content.split('\n').map((paragraph, i) => {
                                // Parser mejorado para markdown
                                const parts = paragraph.split(/(\*\*.*?\*\*|`.*?`)/g);
                                return (
                                    <p key={i} className={paragraph.trim().startsWith('-') ? 'pl-4 border-l-2 border-gray-200' : ''}>
                                        {parts.map((part, j) => {
                                            if (part.startsWith('**') && part.endsWith('**')) {
                                                return <strong key={j} className="text-alquid-navy font-bold">{part.slice(2, -2)}</strong>;
                                            }
                                            if (part.startsWith('`') && part.endsWith('`')) {
                                                return <code key={j} className="bg-gray-100 text-pink-600 px-1.5 py-0.5 rounded text-sm font-mono border border-gray-200">{part.slice(1, -1)}</code>;
                                            }
                                            return part;
                                        })}
                                    </p>
                                );
                            })}
                        </div>
                    </section>
                ))}

            </div>
            
            {/* Footer del Documento */}
            <div className="mt-24 pt-10 border-t border-gray-200 text-center">
                <div className="flex justify-center mb-4">
                     <div className="w-10 h-10 bg-alquid-gray10 rounded-full flex items-center justify-center text-gray-400">
                         <Info size={20}/>
                     </div>
                </div>
                <p className="text-gray-400 text-sm">© 2024 ALQUID Data Suite. Documentación generada automáticamente.</p>
                <div className="flex justify-center gap-4 mt-6">
                    <button onClick={() => scrollToSection(sections[0].id)} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-bold transition-colors">
                        Volver al inicio
                    </button>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Documentation;