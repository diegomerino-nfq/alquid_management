import React from 'react';
import { BookOpen, FileText, Presentation, Download, Database, FileJson, Archive, Activity, Settings, ChevronRight, Info, AlertTriangle, CheckCircle, Search, LayoutTemplate, MousePointerClick, Table, Terminal, GitBranch, PlayCircle, Eye } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import PptxGenJS from 'pptxgenjs';

// --- MOCK UI COMPONENTS (Para visualizar la herramienta sin capturas de imagen) ---

const MockWindow = ({ children, title }: { children?: React.ReactNode, title: string }) => (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden my-6 font-sans select-none transform transition-transform hover:scale-[1.01] duration-300">
        <div className="bg-gray-100 border-b border-gray-200 px-3 py-2 flex items-center gap-2">
            <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
            </div>
            <div className="flex-1 text-center text-[10px] text-gray-500 font-mono">{title}</div>
        </div>
        <div className="p-4 bg-gray-50">{children}</div>
    </div>
);

const DownloaderMock = () => (
    <MockWindow title="Módulo: Descarga de Informes">
        <div className="flex gap-4">
            <div className="w-1/4 bg-white border border-gray-200 rounded p-2 space-y-2">
                <div className="h-2 w-12 bg-gray-200 rounded"></div>
                <div className="h-6 w-full bg-blue-50 border border-blue-200 rounded text-[10px] flex items-center px-2 text-blue-700 font-bold">España</div>
                <div className="h-6 w-full bg-blue-50 border border-blue-200 rounded text-[10px] flex items-center px-2 text-blue-700 font-bold">PRO</div>
                <div className="h-2 w-12 bg-gray-200 rounded mt-2"></div>
                <div className="h-6 w-full border border-gray-300 rounded text-[10px] flex items-center px-2 text-gray-400">20231231_CIERRE</div>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded overflow-hidden">
                <div className="bg-gray-100 p-2 border-b flex gap-2">
                    <div className="w-4 h-4 bg-white border rounded"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                </div>
                <div className="p-2 space-y-2">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="flex items-center gap-2">
                            <div className="w-4 h-4 bg-blue-500 border-blue-600 border rounded flex items-center justify-center"><CheckCircle size={10} className="text-white"/></div>
                            <div className="flex-1 h-4 bg-gray-100 rounded flex items-center px-2 text-[10px] text-gray-500 font-mono">report_finance_0{i}.sql</div>
                            <div className="w-16 h-4 bg-green-100 text-green-700 text-[9px] rounded flex items-center justify-center font-bold">Válido</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
        <div className="mt-2 flex justify-end">
            <div className="bg-alquid-navy text-white px-3 py-1 rounded text-[10px] flex items-center gap-1 font-bold"><PlayCircle size={10}/> EJECUTAR</div>
        </div>
    </MockWindow>
);

const ExtractorMock = () => (
    <MockWindow title="Módulo: Extracción SQL">
        <div className="flex gap-4">
            <div className="w-1/4 space-y-2">
                <div className="p-2 bg-white border rounded text-[10px] text-gray-600 font-mono">queries.json</div>
                <div className="p-2 bg-white border border-blue-300 bg-blue-50 rounded text-[10px] text-blue-700 font-bold flex justify-between">
                    <span>Query 1</span> <CheckCircle size={10}/>
                </div>
            </div>
            <div className="flex-1 bg-gray-900 rounded p-3 font-mono text-[9px] text-green-400 leading-relaxed">
                <div>SELECT</div>
                <div className="pl-2">*</div>
                <div>FROM</div>
                <div className="pl-2">pro_spain.metrics</div>
                <div>WHERE</div>
                <div className="pl-2">load_id = <span className="text-yellow-400">'202312'</span></div>
            </div>
        </div>
    </MockWindow>
);

const EditorMock = () => (
    <MockWindow title="Módulo: Editor JSON">
        <div className="flex h-32 border border-gray-200 rounded bg-white">
            <div className="w-2/3 border-r border-gray-200 p-2 font-mono text-[10px] text-gray-600">
                <span className="text-purple-600">SELECT</span> sum(amount)<br/>
                <span className="text-purple-600">FROM</span> <span className="bg-yellow-100">%s.%s</span><br/>
                <span className="text-purple-600">WHERE</span> date = <span className="text-green-600">:fecha</span>
            </div>
            <div className="w-1/3 bg-gray-50 p-2 space-y-2">
                <div className="text-[10px] font-bold text-gray-500 border-b pb-1">Parámetros</div>
                <div className="bg-white border p-1 rounded flex justify-between items-center">
                    <span className="text-[9px] font-bold">:fecha</span>
                    <span className="text-[8px] bg-gray-100 px-1 rounded">'2024-01-01'</span>
                </div>
            </div>
        </div>
    </MockWindow>
);

const RepositoryMock = () => (
    <MockWindow title="Módulo: Repositorio">
        <div className="flex gap-4 items-start">
            <div className="flex-1 grid grid-cols-2 gap-2">
                <div className="bg-white border p-2 rounded text-center">
                    <div className="text-[10px] font-bold text-gray-400">PRE</div>
                    <div className="text-lg font-bold text-orange-500">v12</div>
                </div>
                <div className="bg-white border-blue-200 border p-2 rounded text-center shadow-sm">
                    <div className="text-[10px] font-bold text-gray-400">PRO</div>
                    <div className="text-lg font-bold text-blue-600">v8</div>
                </div>
            </div>
            <div className="flex-1 bg-white border rounded p-2 space-y-1">
                <div className="flex justify-between items-center text-[9px] border-b pb-1">
                    <span className="font-bold text-green-700 bg-green-100 px-1 rounded">v8 (Actual)</span>
                    <span className="text-gray-400">Hace 2h</span>
                </div>
                <div className="flex justify-between items-center text-[9px] text-gray-400">
                    <span>v7</span>
                    <span>Ayer</span>
                </div>
            </div>
        </div>
    </MockWindow>
);

const Documentation: React.FC = () => {

  const sections = [
    {
      id: 'intro',
      title: '1. Introducción y Propósito',
      icon: <BookOpen size={20} />,
      content: `ALQUID Data Tools es la suite oficial diseñada para estandarizar y asegurar el ciclo de vida del dato dentro de la organización.
      
      Esta plataforma centraliza herramientas que anteriormente estaban dispersas (scripts manuales, validaciones en Excel, correos electrónicos), proporcionando un entorno web seguro, validado y versionado.

      **Objetivos Principales:**
      - **Seguridad:** Eliminar la manipulación manual de archivos SQL sensibles.
      - **Estandarización:** Asegurar que todas las queries cumplan con los formatos de Naming Convention y Coding Style.
      - **Trazabilidad:** Registrar quién descargó qué y cuándo (Log de Actividad).
      - **Versionado:** Mantener un historial inmutable de las configuraciones por entorno (Repositorio).`,
      mock: null
    },
    {
      id: 'downloader',
      title: '2. Descarga de Informes',
      icon: <Settings size={20} />,
      content: `Este módulo es la herramienta principal para usuarios de negocio y analistas que necesitan extraer datos procesados.

      **Flujo de Trabajo:**
      1. **Selección de Entorno:** El usuario debe seleccionar obligatoriamente una **Región** (ej. España, Latam) y un **Entorno** (PRE/PRO). Esto carga las reglas de validación específicas para esa combinación.
      2. **Load ID:** Campo obligatorio. Se inyecta dinámicamente en las queries SQL reemplazando la variable \`:load_id\`.
      3. **Carga de Archivos:** Arrastra o selecciona tus archivos JSON de configuración.
      4. **Validación Automática:** Observa la columna "Validación". Si aparece en verde, la query es segura. Si está en rojo, revisa el mensaje de error (tabla incorrecta o BD no permitida).

      **Ejecución:**
      - Selecciona las queries deseadas y pulsa "EJECUTAR DESCARGA". El sistema generará y descargará los CSVs secuencialmente.`,
      mock: <DownloaderMock />
    },
    {
      id: 'extractor',
      title: '3. Extracción SQL para Producción',
      icon: <Database size={20} />,
      content: `Módulo técnico dirigido a ingenieros de datos y DBAs. Su función es convertir las definiciones JSON (utilizadas por la app) en scripts SQL puros (.sql) ejecutables en bases de datos (Spark, Hive, Snowflake, etc.).

      **Características Técnicas:**
      - **Pretty Print SQL:** El sistema formatea automáticamente el código, indentando cláusulas y alineando JOINS.
      - **Inyección de Variables:** Reemplaza los placeholders \`%s.%s\` por el esquema y tabla reales definidos en el JSON.
      - **Resolución de Parámetros:** Los valores definidos en el JSON (fechas, listas) se inyectan en el SQL final.
      
      **Uso:**
      Selecciona las queries y pulsa "GENERAR Y DESCARGAR SQL". Obtendrás archivos .sql listos para desplegar.`,
      mock: <ExtractorMock />
    },
    {
      id: 'editor',
      title: '4. Editor JSON Avanzado',
      icon: <FileJson size={20} />,
      content: `Entorno de desarrollo integrado (IDE) ligero para el mantenimiento de los archivos de configuración \`queries.json\`.

      **Funcionalidades de Edición:**
      - **Editor de Código:** Resaltado de sintaxis SQL.
      - **Formateo Automático:** Botón "Varita Mágica" para limpiar el código.
      - **Gestión de Parámetros:** Panel lateral para añadir parámetros dinámicos sin riesgo de romper el formato JSON.
      
      **Importación Inteligente:**
      Puedes cargar un archivo \`.sql\` existente y el editor detectará automáticamente la base de datos y la tabla analizando la cláusula \`FROM\`.`,
      mock: <EditorMock />
    },
    {
      id: 'repository',
      title: '5. Repositorio Centralizado',
      icon: <Archive size={20} />,
      content: `Sistema de control de versiones simplificado para la gestión de configuraciones.

      **Estructura Jerárquica:**
      Organizado por Región > Entorno (PRE/PRO).

      **Control de Versiones:**
      - Cada subida genera una nueva versión (v1, v2...) automáticamente.
      - **Comparador (Diff):** Selecciona dos versiones para ver qué ha cambiado. El sistema resaltará en verde lo nuevo y en rojo lo eliminado, e incluso mostrará diferencias línea a línea en el código SQL.`,
      mock: <RepositoryMock />
    }
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    const container = document.getElementById('docs-content-container');
    if (element && container) {
        container.scrollTo({ top: element.offsetTop - 32, behavior: 'smooth' });
    }
  };

  // --- GENERACIÓN DE WORD (MEJORADA) ---
  const generateWord = () => {
    // CSS en línea optimizado para el motor de renderizado de Word
    const css = `
        <style>
            @page { 
                margin: 3cm 2.5cm; 
                mso-page-orientation: portrait;
            }
            body { 
                font-family: 'Calibri', 'Arial', sans-serif; 
                font-size: 11pt; 
                line-height: 1.6; 
                color: #333; 
                background: white;
            }
            
            /* Portada */
            .cover-page { 
                text-align: center; 
                page-break-after: always; 
                padding-top: 6cm; 
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
            }
            .cover-title { 
                font-size: 36pt; 
                color: #110841; 
                font-weight: bold; 
                margin-bottom: 24px; 
                letter-spacing: -0.5px; 
            }
            .cover-subtitle { 
                font-size: 18pt; 
                color: #499CD9; 
                margin-bottom: 80px; 
                font-weight: 300; 
                text-transform: uppercase; 
                letter-spacing: 2px;
            }
            .cover-meta { 
                border-top: 2px solid #EE2833; 
                padding-top: 30px; 
                font-size: 12pt; 
                color: #555; 
                width: 60%; 
                margin: 0 auto; 
                text-align: center;
            }
            .cover-meta p {
                margin: 8px 0;
            }
            
            /* TOC */
            .toc { 
                page-break-after: always; 
                padding: 40px 0; 
            }
            .toc h2 { 
                color: #110841; 
                border-bottom: 2px solid #110841; 
                padding-bottom: 15px; 
                margin-bottom: 30px; 
                font-size: 20pt;
            }
            .toc-item { 
                margin-bottom: 15px; 
                font-size: 12pt; 
                border-bottom: 1px dotted #ccc; 
                padding-bottom: 5px;
                display: flex; 
                justify-content: space-between; 
            }
            
            /* Contenido */
            h1 { 
                color: #110841; 
                font-size: 24pt; 
                margin-top: 0; 
                page-break-before: always; 
                border-bottom: 3px solid #EE2833; 
                padding-bottom: 15px; 
                margin-bottom: 30px;
            }
            h2 { 
                color: #499CD9; 
                font-size: 16pt; 
                margin-top: 35px; 
                margin-bottom: 20px; 
                border-left: 4px solid #499CD9;
                padding-left: 10px;
            }
            p { 
                margin-bottom: 18px; 
                text-align: left; /* Justify can cause spacing issues in Word web view */
                margin-top: 0;
            }
            ul {
                margin-bottom: 18px;
                padding-left: 30px;
            }
            li {
                margin-bottom: 8px;
            }
            strong { 
                color: #110841; 
                font-weight: bold; 
            }
            
            /* Bloques de código y notas */
            .note { 
                background-color: #f0f7ff; 
                border: 1px solid #bae7ff;
                border-left: 5px solid #1890ff; 
                padding: 15px; 
                margin: 25px 0; 
                font-style: italic; 
                color: #0050b3; 
            }
            .code-inline { 
                font-family: 'Consolas', 'Courier New', monospace; 
                color: #c7254e; 
                background-color: #f9f2f4; 
                padding: 2px 5px; 
                border-radius: 3px; 
                font-size: 0.95em;
            }
        </style>
    `;

    const cover = `
        <div class="cover-page">
            <div class="cover-title">ALQUID Data Suite</div>
            <div class="cover-subtitle">Manual de Operaciones</div>
            <div class="cover-meta">
                <p><strong>Versión:</strong> 2.1 Stable</p>
                <p><strong>Fecha:</strong> ${new Date().toLocaleDateString()}</p>
                <p><strong>Departamento:</strong> Data Engineering & Architecture</p>
            </div>
        </div>
    `;

    // Generar Tabla de Contenidos manual (Word no actualiza TOCs automáticos sin macros)
    let tocHtml = `<div class="toc"><h2>Tabla de Contenidos</h2>`;
    sections.forEach((sec, idx) => {
        tocHtml += `<div class="toc-item"><span>${idx + 1}. ${sec.title.replace(/^\d+\.\s/, '')}</span></div>`;
    });
    tocHtml += `</div>`;

    let contentHtml = '';
    sections.forEach(sec => {
        // Transformar Markdown a HTML rico
        let body = sec.content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/`(.*?)`/g, '<span class="code-inline">$1</span>')
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br/>')
            .replace(/^- (.*)/gm, '<li>$1</li>'); // Listas simples

        // Envolver listas
        if (body.includes('<li>')) {
            body = body.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');
        }

        contentHtml += `
            <h1>${sec.title}</h1>
            <p>${body}</p>
            <div class="note">
                <strong>Nota Importante:</strong> Consulte la versión web de la herramienta para ver las simulaciones interactivas de esta funcionalidad.
            </div>
        `;
    });

    const fullHtml = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Manual ALQUID</title>${css}</head>
        <body>${cover}${tocHtml}${contentHtml}</body>
        </html>
    `;

    const blob = new Blob([fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Manual_Operativo_ALQUID_v2.1.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- GENERACIÓN DE PPT (MEJORADA - DISEÑO LIMPIO) ---
  const generatePPT = () => {
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';
    pres.author = 'ALQUID Suite';
    pres.title = 'Documentación Técnica';

    // Colores Corporativos
    const colors = {
        navy: '110841',
        orange: 'EE2833',
        blue: '499CD9',
        gray: 'F5F9F9',
        text: '383838'
    };

    // --- MASTER SLIDE ---
    pres.defineSlideMaster({
      title: 'MASTER_CLEAN',
      background: { color: 'FFFFFF' },
      objects: [
        // Header Bar
        { rect: { x: 0, y: 0, w: '100%', h: 0.15, fill: { color: colors.navy } } },
        { rect: { x: 0, y: 0.15, w: '100%', h: 0.05, fill: { color: colors.orange } } },
        
        // Footer
        { line: { x: 0.5, y: 7.0, w: '93%', h: 0, line: { color: 'CCCCCC', width: 1 } } },
        { text: { text: 'ALQUID Data Suite | Documentación Oficial', options: { x: 0.5, y: 7.1, fontSize: 9, color: '999999' } } },
        { text: { text: 'Confidencial', options: { x: 11.5, y: 7.1, fontSize: 9, color: '999999', align: 'right' } } }
      ],
      slideNumber: { x: 12.8, y: 7.1, fontSize: 9, color: colors.navy }
    });

    // --- 1. PORTADA ---
    const slideCover = pres.addSlide();
    slideCover.background = { color: colors.navy };
    
    // Logo / Título
    slideCover.addText('ALQUID', { 
        x: 1.0, y: 2.5, fontSize: 60, color: 'FFFFFF', bold: true, fontFace: 'Arial' 
    });
    slideCover.addText('DATA SUITE', { 
        x: 1.0, y: 3.4, fontSize: 24, color: colors.blue, charSpacing: 5, fontFace: 'Arial' 
    });

    // Línea separadora
    slideCover.addShape(pres.ShapeType.line, { 
        x: 1.0, y: 4.0, w: 4.0, h: 0, line: { color: colors.orange, width: 3 } 
    });

    // Subtítulo
    slideCover.addText('Manual de Operaciones y Referencia Técnica', { 
        x: 1.0, y: 4.5, fontSize: 18, color: 'E0E0E0' 
    });
    
    // Fecha
    slideCover.addText(`Generado: ${new Date().toLocaleDateString()}`, { 
        x: 1.0, y: 6.5, fontSize: 12, color: 'AAAAAA' 
    });

    // --- 2. CONTENIDO ---
    sections.forEach(sec => {
        const slide = pres.addSlide({ masterName: 'MASTER_CLEAN' });
        
        // Título de la diapositiva
        slide.addText(sec.title, { 
            x: 0.5, y: 0.5, w: '90%', fontSize: 24, color: colors.navy, bold: true 
        });

        // Procesar contenido para bullets
        const lines = sec.content.split('\n').filter(l => l.trim().length > 0);
        const bullets = [];
        let introText = "";

        lines.forEach(line => {
            const cleanLine = line.trim().replace(/\*\*/g, '').replace(/`/g, '');
            if (cleanLine.startsWith('-') || cleanLine.startsWith('1.')) {
                bullets.push(cleanLine.replace(/^[-1\.]+\s*/, ''));
            } else if (!introText && !cleanLine.endsWith(':')) {
                introText = cleanLine;
            }
        });

        // Columna Izquierda: Texto
        let yPos = 1.5;
        
        // Intro breve
        if (introText) {
            slide.addText(introText, { 
                x: 0.5, y: yPos, w: 6.5, fontSize: 14, color: colors.text, align: 'justify' 
            });
            yPos += 1.5;
        }

        // Bullets
        if (bullets.length > 0) {
            const bulletObjects = bullets.map(b => ({ text: b }));
            slide.addText(bulletObjects, { 
                x: 0.5, y: yPos, w: 6.5, h: 4.0, 
                fontSize: 12, color: '555555', 
                bullet: { type: 'number', color: colors.orange }, 
                paraSpaceAfter: 10,
                valign: 'top'
            });
        }

        // Columna Derecha: Visual Placeholder (Más limpio)
        // Caja de fondo
        slide.addShape(pres.ShapeType.rect, { 
            x: 7.5, y: 1.5, w: 5.0, h: 4.5, 
            fill: { color: 'F8F9FA' }, line: { color: 'E0E0E0', width: 1 },
            shadow: { type: 'outer', color: '000000', opacity: 0.1, offset: 3, blur: 3 }
        });

        // Header de la "ventana"
        slide.addShape(pres.ShapeType.rect, { 
            x: 7.5, y: 1.5, w: 5.0, h: 0.4, 
            fill: { color: 'E9ECEF' }, line: { color: 'E0E0E0', width: 0 } 
        });
        
        // Botones ventana
        slide.addShape(pres.ShapeType.ellipse, { x: 7.7, y: 1.65, w: 0.12, h: 0.12, fill: { color: 'FF5F56' } });
        slide.addShape(pres.ShapeType.ellipse, { x: 7.9, y: 1.65, w: 0.12, h: 0.12, fill: { color: 'FFBD2E' } });
        slide.addShape(pres.ShapeType.ellipse, { x: 8.1, y: 1.65, w: 0.12, h: 0.12, fill: { color: '27C93F' } });

        // Icono Central Grande
        // Como no podemos renderizar iconos React en PPT, usamos formas básicas o texto
        slide.addShape(pres.ShapeType.ellipse, { 
            x: 9.5, y: 3.2, w: 1.0, h: 1.0, 
            fill: { color: colors.navy } 
        });
        
        // Texto descriptivo en el placeholder
        slide.addText('Funcionalidad Interactiva', { 
            x: 7.5, y: 4.3, w: 5.0, fontSize: 14, color: colors.text, align: 'center', bold: true 
        });
        slide.addText('Ver en aplicación web', { 
            x: 7.5, y: 4.7, w: 5.0, fontSize: 10, color: '888888', align: 'center' 
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
                <div className="flex items-center gap-3 mb-4">
                    <div className="bg-alquid-navy text-white p-2 rounded-lg">
                        <LayoutTemplate size={24}/>
                    </div>
                    <h2 className="text-3xl font-black text-alquid-navy">Manual de Usuario v2.1</h2>
                </div>
                <p className="text-lg text-gray-600 font-light leading-relaxed">
                    Bienvenido a la documentación oficial de <strong>ALQUID Data Suite</strong>. 
                    Esta guía interactiva detalla cada funcionalidad técnica, validación y flujo operativo disponible en la plataforma.
                </p>
                <div className="flex gap-4 mt-6">
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 px-3 py-1 rounded-full font-medium border border-green-100">
                        <CheckCircle size={14}/> Documentación actualizada
                    </div>
                    <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 px-3 py-1 rounded-full font-medium border border-orange-100">
                        <AlertTriangle size={14}/> Última rev: {new Date().toLocaleDateString()}
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto space-y-16">
                {sections.map((sec, idx) => (
                    <section key={sec.id} id={sec.id} className="scroll-mt-8 relative group">
                        
                        <div className="flex items-start gap-5 mb-6">
                            <div className={`p-3 rounded-xl shadow-sm mt-1 shrink-0 flex items-center justify-center w-12 h-12 ${idx === 0 ? 'bg-alquid-navy text-white' : 'bg-white border border-gray-100 text-alquid-blue'}`}>
                                {sec.icon}
                            </div>
                            <div className="flex-1">
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">{sec.title}</h2>
                                <div className="h-1 w-20 bg-gradient-to-r from-alquid-blue to-transparent rounded-full mb-6"></div>
                                
                                <div className="prose prose-slate prose-lg max-w-none text-gray-600 leading-relaxed space-y-4">
                                    {sec.content.split('\n').map((paragraph, i) => {
                                        const parts = paragraph.split(/(\*\*.*?\*\*|`.*?`)/g);
                                        return (
                                            <p key={i} className={paragraph.trim().startsWith('-') ? 'pl-4 border-l-2 border-gray-200 text-gray-700 bg-gray-50/50 py-1 rounded-r' : ''}>
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

                                {/* INSERT MOCK UI COMPONENT HERE */}
                                {sec.mock && (
                                    <div className="mt-8 relative group/mock">
                                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg blur opacity-20 group-hover/mock:opacity-40 transition duration-500"></div>
                                        <div className="relative">
                                            <div className="absolute top-2 right-2 text-[10px] uppercase font-bold text-gray-400 bg-white/80 px-2 py-1 rounded backdrop-blur border border-gray-100 shadow-sm z-10 flex items-center gap-1">
                                                <MousePointerClick size={12}/> Interfaz Simulada
                                            </div>
                                            {sec.mock}
                                        </div>
                                    </div>
                                )}
                            </div>
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