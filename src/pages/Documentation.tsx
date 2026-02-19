import React from 'react';
import { BookOpen, FileText, Presentation, Download, Database, FileJson, Archive, Settings, ChevronRight, Info, AlertTriangle, CheckCircle, Search, LayoutTemplate, MousePointerClick, PlayCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import PptxGenJS from 'pptxgenjs';

// --- MOCK UI COMPONENTS (Wireframes de alta fidelidad) ---

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
                <div className="h-6 w-full border border-gray-300 rounded text-[10px] flex items-center px-2 text-gray-400 font-mono">202312</div>
            </div>
            <div className="flex-1 bg-white border border-gray-200 rounded overflow-hidden">
                <div className="bg-gray-100 p-2 border-b flex gap-2">
                    <div className="w-4 h-4 bg-white border rounded"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded"></div>
                </div>
                <div className="p-2 space-y-2">
                    {[1, 2].map(i => (
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
      content: `ALQUID Data Tools es la suite oficial para la gestión del ciclo de vida del dato.
      
      Esta sección detalla de forma exhaustiva cada funcionalidad. La herramienta se divide en 4 pilares fundamentales diseñados para cubrir las necesidades de Analistas, Ingenieros de Datos y Gestores de Gobierno.

      **Conceptos Transversales:**
      - **Load ID:** Identificador único de carga (ej. '20231231'). Es fundamental en todas las herramientas ya que se inyecta dinámicamente en el SQL para filtrar particiones.
      - **Validación Estricta:** La herramienta contiene un mapa duro de bases de datos permitidas por región. Si intentas ejecutar una query de "Argentina" contra un entorno de "España", el sistema bloqueará la acción.
      - **Placeholders:** Usamos \`%s.%s\` para referirnos a \`database.table\` y \`:parametro\` para valores dinámicos.`,
      mock: null
    },
    {
      id: 'downloader',
      title: '2. Descarga de Informes (Detalle)',
      icon: <Settings size={20} />,
      content: `Herramienta de ejecución directa para usuarios de negocio.

      **Panel Lateral (Configuración):**
      - **FileInput (Queries):** Carga el archivo JSON con la lógica de negocio. Debe cumplir la estructura \`[{ report: string, queries: [] }]\`.
      - **Select (Región):** Filtro geográfico (ej. España, Latam). Al cambiarlo, se carga la "Allowlist" de bases de datos permitidas.
      - **Select (Entorno):** Alterna entre PRE (Preproducción) y PRO (Producción).
      - **Input (Load ID):** Valor alfanumérico que reemplazará a \`:load_id\` en todas las queries. *Campo obligatorio*.

      **Tabla Principal:**
      - **Columna Validación:** Muestra un *badge* verde o rojo.
        - *Verde:* La base de datos definida en el JSON coincide con la permitida para la Región/Entorno seleccionados.
        - *Rojo:* Error de seguridad. La query intenta acceder a una tabla no autorizada o fuera del ámbito geográfico.
      - **Botón Filtro (Embudo):** Presente en cada cabecera. Permite buscar texto o seleccionar valores únicos para filtrar la lista visible.
      - **Botón "Seleccionar Visibles":** Marca todas las queries que están actualmente filtradas en la tabla. Útil para descargas masivas por lotes.

      **Ejecución:**
      - **Botón "EJECUTAR DESCARGA":** Inicia un proceso asíncrono.
        1. Valida la query.
        2. Inyecta el Load ID.
        3. Simula la ejecución (en este entorno web).
        4. Genera un archivo CSV con nombre sanitizado (reemplaza \`/\` por \`_\`).`,
      mock: <DownloaderMock />
    },
    {
      id: 'extractor',
      title: '3. Extracción SQL (Detalle)',
      icon: <Database size={20} />,
      content: `Generador de código para despliegues en producción (CI/CD). A diferencia del descargador, este módulo no ejecuta la query, solo genera el archivo \`.sql\`.

      **Funcionalidades Específicas:**
      - **Inyección de Esquemas:** El sistema lee las propiedades \`database\` y \`table\` del JSON y reemplaza los símbolos \`%s.%s\` en el código SQL original.
      - **Pretty Print:** Formateo automático utilizando reglas de indentación estándar (2 espacios, mayúsculas para keywords).
      
      **Resolución de Parámetros:**
      Si el JSON define:
      \`"parameters": { "divisa": { "value": "EUR" } }\`
      Y el SQL contiene:
      \`WHERE currency = :divisa\`
      El resultado será:
      \`WHERE currency = 'EUR'\`

      **Listas:** Si el parámetro es una lista \`['A', 'B']\`, se transformará en \`'A', 'B'\` para usarse dentro de cláusulas \`IN (...)\`.

      **Botón "GENERAR Y DESCARGAR SQL":**
      Descarga un archivo \`.sql\` individual por cada query seleccionada. El navegador puede pedir confirmación para descargas múltiples la primera vez.`,
      mock: <ExtractorMock />
    },
    {
      id: 'editor',
      title: '4. Editor JSON (Detalle)',
      icon: <FileJson size={20} />,
      content: `IDE completo para la manipulación de archivos \`queries.json\`.

      **Operaciones de Tabla:**
      - **Renombrar (Lápiz):**
        - *En columna Reporte:* Renombra la agrupación lógica de queries.
        - *En columna Informe:* Renombra el archivo de salida y la carpeta virtual.
      - **Eliminar (Papelera):** Permite borrar una query individual o un reporte completo (con confirmación).

      **Modal de Edición (El corazón de la herramienta):**
      - **Editor de Código:** Área de texto con resaltado de sintaxis SQL. Soporta coloreado de keywords, strings y números.
      - **Botón "Varita Mágica" (Formatear):** Aplica el algoritmo de *Pretty Print* al SQL actual para mejorar la legibilidad.
      - **Botón "Pantalla Completa":** Maximiza el área de trabajo para queries complejas.
      
      **Importación Inteligente (.SQL):**
      Al usar "Cargar .SQL" dentro del modal, el sistema utiliza Expresiones Regulares (Regex) para analizar la cláusula \`FROM\`.
      - Detecta patrones \`FROM db.schema.table\` o \`FROM schema.table\`.
      - Rellena automáticamente los campos Database, Schema y Table.
      - Reemplaza la referencia en el SQL por \`%s.%s\` para mantener la flexibilidad.

      **Gestión de Parámetros:**
      - Permite añadir pares Clave-Valor.
      - Detecta automáticamente si el valor es un Array JSON (ej. \`["A", "B"]\`) y lo trata como lista en la generación SQL.`,
      mock: <EditorMock />
    },
    {
      id: 'repository',
      title: '5. Repositorio (Detalle)',
      icon: <Archive size={20} />,
      content: `Sistema de control de versiones (VCS) simplificado y centralizado.

      **Navegación:**
      - **Nivel 1 (Regiones):** Tarjetas con banderas. Muestra el conteo total de archivos.
      - **Nivel 2 (Entornos):** Selección entre PRE y PRO.
      - **Nivel 3 (Listado):** Tabla de versiones ordenadas cronológicamente (la más reciente arriba).

      **Subida de Archivos (Upload):**
      - Al seleccionar un archivo JSON, se ejecuta una **Validación Previa**.
      - El sistema comprueba *cada query* del archivo contra la matriz de seguridad \`EXPECTED_DATABASES\`.
      - Si una sola query apunta a una BD incorrecta (ej. apuntar a PRO desde PRE), la subida se bloquea y se muestra un informe de errores detallado.
      - Si es válido, se asigna automáticamente el número de versión siguiente (v+1).

      **Comparador de Versiones (Diff):**
      - Selecciona dos checkboxes en la lista de archivos.
      - Pulsa el botón "Comparar".
      - **Visualización:**
        - *Verde:* Queries nuevas o código añadido.
        - *Rojo:* Queries eliminadas o código borrado.
        - *Amarillo:* Queries modificadas. Se muestra un detalle campo por campo (si cambió la tabla) o un diff línea a línea del SQL.`,
      mock: <RepositoryMock />
    }
  ];

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    const container = document.getElementById('docs-content-container');
    if (element && container) {
        const topPos = element.offsetTop - container.offsetTop;
        container.scrollTo({ top: topPos - 20, behavior: 'smooth' });
    }
  };

  // --- GENERACIÓN DE WORD (MEJORADA) ---
  const generateWord = () => {
    // CSS en línea optimizado para el motor de renderizado de Word
    const css = `
        <style>
            @page { margin: 2.5cm; }
            body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #333; }
            
            /* Portada */
            .cover-page { text-align: center; page-break-after: always; padding-top: 5cm; }
            .cover-title { font-size: 36pt; color: #110841; font-weight: bold; margin-bottom: 20px; letter-spacing: -1px; }
            .cover-subtitle { font-size: 18pt; color: #499CD9; margin-bottom: 60px; font-weight: 300; text-transform: uppercase; }
            .cover-meta { border-top: 1px solid #ddd; padding-top: 20px; font-size: 12pt; color: #666; width: 60%; margin: 0 auto; }
            
            /* TOC */
            .toc { page-break-after: always; background-color: #f9f9f9; padding: 40px; }
            .toc h2 { color: #110841; border-bottom: 2px solid #110841; padding-bottom: 10px; margin-bottom: 20px; }
            .toc-item { margin-bottom: 10px; font-size: 12pt; border-bottom: 1px dotted #ccc; display: flex; justify-content: space-between; }
            
            /* Contenido */
            h1 { color: #110841; font-size: 24pt; margin-top: 0; page-break-before: always; border-bottom: 3px solid #EE2833; padding-bottom: 10px; }
            h2 { color: #499CD9; font-size: 16pt; margin-top: 30px; margin-bottom: 15px; }
            p { margin-bottom: 12px; text-align: justify; }
            strong { color: #110841; font-weight: bold; }
            
            /* Bloques de código y notas */
            .note { background-color: #e6f7ff; border-left: 5px solid #1890ff; padding: 15px; margin: 20px 0; font-style: italic; color: #555; }
            .code-inline { font-family: 'Consolas', monospace; color: #c7254e; background-color: #f9f2f4; padding: 2px 4px; border-radius: 4px; }
            
            /* Tablas */
            table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 10pt; }
            th { background-color: #110841; color: white; padding: 10px; text-align: left; }
            td { border: 1px solid #ddd; padding: 8px; }
            tr:nth-child(even) { background-color: #f2f2f2; }
        </style>
    `;

    const cover = `
        <div class="cover-page">
            <div class="cover-title">ALQUID Data Suite</div>
            <div class="cover-subtitle">Manual de Operaciones y Referencia Técnica</div>
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

  // --- GENERACIÓN DE PPT (MEJORADA - DISEÑO EJECUTIVO) ---
  const generatePPT = () => {
    const pres = new PptxGenJS();
    pres.layout = 'LAYOUT_16x9';
    pres.author = 'ALQUID Suite';
    pres.title = 'Documentación Técnica';

    // Definir Master Slide Limpio y Corporativo
    pres.defineSlideMaster({
      title: 'MASTER_CORP',
      background: { color: 'FFFFFF' },
      objects: [
        // Barra Lateral Azul
        { rect: { x: 0, y: 0, w: 0.4, h: '100%', fill: { color: '110841' } } },
        // Logo Placeholder
        { text: { text: 'ALQUID', options: { x: 0.6, y: 0.3, fontSize: 14, color: '110841', bold: true, fontFace: 'Arial' } } },
        { text: { text: 'DATA SUITE', options: { x: 0.6, y: 0.55, fontSize: 8, color: 'EE2833', bold: true, charSpacing: 4 } } },
        // Footer Line
        { line: { x: 0.6, y: 7.0, w: '90%', h: 0, line: { color: 'CCCCCC', width: 1 } } },
        { text: { text: 'Confidencial - Uso Interno', options: { x: 0.6, y: 7.1, fontSize: 9, color: '999999' } } }
      ],
      slideNumber: { x: 12.5, y: 7.1, fontSize: 9, color: '110841' }
    });

    // 1. Portada Impactante
    const slideCover = pres.addSlide();
    slideCover.background = { color: 'F0F2F5' }; // Gris muy claro
    // Elementos gráficos portada
    slideCover.addShape(pres.ShapeType.rect, { x: 0, y: 0, w: '40%', h: '100%', fill: { color: '110841' } });
    slideCover.addText('ALQUID', { x: 0.5, y: 3.0, fontSize: 54, color: 'FFFFFF', bold: true });
    slideCover.addText('DATA SUITE', { x: 0.5, y: 3.8, fontSize: 24, color: '499CD9', charSpacing: 8 });
    slideCover.addText('Manual Técnico v2.1', { x: 5.5, y: 3.5, fontSize: 32, color: '333333', bold: true });
    slideCover.addText('Gestión, Validación y Gobierno del Dato', { x: 5.5, y: 4.2, fontSize: 16, color: '666666' });

    // 2. Diapositivas de Contenido (Diseño de 2 Columnas)
    sections.forEach(sec => {
        const slide = pres.addSlide({ masterName: 'MASTER_CORP' });
        
        // Título de Sección
        slide.addText(sec.title, { x: 0.6, y: 1.0, fontSize: 24, color: '110841', bold: true, fontFace: 'Arial' });

        // Procesar Texto (Limpieza)
        const cleanText = sec.content
            .replace(/\*\*(.*?)\*\*/g, '$1') // Quitar negritas MD
            .replace(/`(.*?)`/g, '"$1"')     // Quitar backticks
            .split('\n')
            .filter(l => l.trim().length > 0 && !l.trim().startsWith('-')); // Filtrar bullets manuales para el resumen

        const bulletPoints = sec.content
            .split('\n')
            .filter(l => l.trim().startsWith('-'))
            .map(l => l.replace('-', '').trim());

        // Columna Izquierda: Texto Principal
        let yPos = 1.8;
        // Párrafo introductorio (primeras 2 líneas max)
        if (cleanText.length > 0) {
            slide.addText(cleanText.slice(0, 3).join(' '), { 
                x: 0.6, y: yPos, w: 6.0, fontSize: 11, color: '444444', align: 'justify' 
            });
            yPos += 1.2;
        }

        // Bullets (Puntos Clave)
        if (bulletPoints.length > 0) {
            slide.addText('Funcionalidades Clave:', { x: 0.6, y: yPos, fontSize: 11, color: '110841', bold: true });
            yPos += 0.3;
            bulletPoints.slice(0, 7).forEach(bp => {
                slide.addText(bp, { 
                    x: 0.6, y: yPos, w: 6.0, fontSize: 10, color: '555555', 
                    bullet: { type: 'number', color: 'EE2833' }, paraSpaceAfter: 4
                });
                yPos += 0.45;
            });
        }

        // Columna Derecha: Representación Visual (Mockup Abstracto)
        // Caja contenedora (Simula la pantalla)
        slide.addShape(pres.ShapeType.rect, { 
            x: 7.0, y: 1.8, w: 5.5, h: 4.0, 
            fill: { color: 'FFFFFF' }, line: { color: 'DDDDDD', width: 1 }, 
            shadow: { type: 'outer', color: '000000', opacity: 0.1, offset: 5, blur: 5 } 
        });
        
        // Header de la "Ventana"
        slide.addShape(pres.ShapeType.rect, { x: 7.0, y: 1.8, w: 5.5, h: 0.4, fill: { color: 'F3F4F6' } });
        slide.addShape(pres.ShapeType.ellipse, { x: 7.2, y: 1.95, w: 0.1, h: 0.1, fill: { color: 'FF5F56' } }); // Rojo
        slide.addShape(pres.ShapeType.ellipse, { x: 7.4, y: 1.95, w: 0.1, h: 0.1, fill: { color: 'FFBD2E' } }); // Amarillo
        slide.addShape(pres.ShapeType.ellipse, { x: 7.6, y: 1.95, w: 0.1, h: 0.1, fill: { color: '27C93F' } }); // Verde

        // Contenido Abstracto según sección
        if (sec.id === 'downloader' || sec.id === 'repository') {
            // Simular tabla/lista
            for(let i=0; i<4; i++) {
                slide.addShape(pres.ShapeType.rect, { 
                    x: 7.2, y: 2.4 + (i*0.5), w: 5.1, h: 0.35, 
                    fill: { color: i===0 ? 'E6F7FF' : 'F9FAFB' }, line: { color: 'EEEEEE' } 
                });
                // Líneas de texto simuladas
                slide.addShape(pres.ShapeType.rect, { x: 7.3, y: 2.5 + (i*0.5), w: 2.0, h: 0.1, fill: { color: 'CCCCCC' } });
                slide.addShape(pres.ShapeType.rect, { x: 11.5, y: 2.5 + (i*0.5), w: 0.5, h: 0.1, fill: { color: '87D068' } }); // Status verde
            }
        } else if (sec.id === 'extractor' || sec.id === 'editor') {
            // Simular código
            slide.addShape(pres.ShapeType.rect, { x: 7.2, y: 2.4, w: 5.1, h: 3.2, fill: { color: '1E1E1E' } });
            slide.addText('SELECT * FROM TABLE', { x: 7.4, y: 2.6, fontSize: 10, color: '569CD6', fontFace: 'Courier New' });
            slide.addText('WHERE date = :today', { x: 7.4, y: 3.0, fontSize: 10, color: 'D4D4D4', fontFace: 'Courier New' });
        } else {
            // Introducción / Generico
            slide.addText('ALQUID', { x: 8.5, y: 3.5, fontSize: 24, color: 'DDDDDD', bold: true, align: 'center' });
        }
    });

    pres.writeFile({ fileName: 'Presentacion_Ejecutiva_ALQUID.pptx' });
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