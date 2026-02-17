import { QueryDefinition } from '../types';

const MAX_LINE_WIDTH = 120; // Ancho máximo sugerido antes de forzar saltos
const INDENT_SIZE = 4;      // Espacios por nivel de indentación

// Palabras clave que siempre inician una nueva línea "dura" (nivel superior)
const TOP_LEVEL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'UNION', 'UNION ALL', 'LIMIT', 'WITH'
]);

// Palabras clave que inician nueva línea dentro de su bloque
const NEWLINE_KEYWORDS = new Set([
  'CASE', 'WHEN', 'ELSE', 'END', 'LEFT JOIN', 'INNER JOIN', 'RIGHT JOIN', 'OUTER JOIN', 'JOIN', 'ON'
]);

// Operadores lógicos que fuerzan salto si la línea es larga
const LOGICAL_OPS = new Set(['AND', 'OR']);

// Funciones de agregación comunes
const AGG_FUNCTIONS = new Set(['SUM', 'COUNT', 'AVG', 'MIN', 'MAX', 'COALESCE', 'ROUND', 'CAST']);

export const formatSqlBonito = (sql: string): string => {
  if (!sql) return "";

  // 1. Proteger cadenas de texto (Strings)
  const stringPlaceholders: string[] = [];
  let protectedSql = sql.replace(/'(?:''|[^'])*'/g, (match) => {
    stringPlaceholders.push(match);
    return `__STR_${stringPlaceholders.length - 1}__`;
  });

  // 2. Normalizar espacios
  protectedSql = protectedSql.replace(/\s+/g, ' ').trim();

  // 3. Tokenización mejorada:
  // Separa: parentesis, comas, operadores matemáticos, palabras clave compuestas
  protectedSql = protectedSql
    // Separar parentesis y comas
    .replace(/([(),])/g, ' $1 ')
    // Separar operadores matemáticos clave para fórmulas (+ - * /)
    .replace(/(\s+[-+*/]\s+)/g, ' $1 ') 
    // Asegurar que CASE, WHEN, END, ELSE estén separados
    .replace(/\b(CASE|WHEN|THEN|ELSE|END)\b/gi, ' $1 ')
    .trim();

  // Dividir en tokens por espacios
  const tokens = protectedSql.split(/\s+/);
  
  let formatted = "";
  let currentIndentLevel = 0;
  let currentLine = "";
  let parenthesisLevel = 0;

  const getIndent = (level: number) => " ".repeat(Math.max(0, level * INDENT_SIZE));

  const flushLine = () => {
    if (currentLine.trim()) {
      formatted += (formatted ? "\n" : "") + currentLine;
    }
    currentLine = getIndent(currentIndentLevel);
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upperToken = token.toUpperCase();
    const nextToken = tokens[i + 1] ? tokens[i + 1].toUpperCase() : "";
    const prevToken = tokens[i - 1] ? tokens[i - 1].toUpperCase() : "";

    // --- REGLAS DE ESTRUCTURA ---

    // 1. Palabras clave de Nivel Superior (SELECT, FROM...)
    if (TOP_LEVEL_KEYWORDS.has(upperToken) || (upperToken === 'GROUP' && nextToken === 'BY') || (upperToken === 'ORDER' && nextToken === 'BY')) {
      flushLine();
      if (upperToken === 'UNION') {
         // UNION suele ir entre bloques
      }
      currentLine = getIndent(0) + token + " "; // Reset indent visual para keywords principales
      
      // Manejar keywords compuestas
      if ((upperToken === 'GROUP' || upperToken === 'ORDER') && nextToken === 'BY') {
        currentLine += tokens[i + 1] + " ";
        i++; 
      } else if (upperToken === 'UNION' && nextToken === 'ALL') {
        currentLine += tokens[i + 1] + " ";
        i++;
      }
      
      currentIndentLevel = 1; // El contenido siguiente va indentado
      continue;
    }

    // 2. Palabras clave de estructura (CASE, WHEN, JOIN...)
    if (NEWLINE_KEYWORDS.has(upperToken)) {
      if (upperToken === 'CASE') {
        flushLine();
        currentIndentLevel++;
        currentLine = getIndent(currentIndentLevel) + token + " ";
      } else if (upperToken === 'END') {
        currentIndentLevel = Math.max(0, currentIndentLevel - 1);
        flushLine();
        currentLine = getIndent(currentIndentLevel) + token + " ";
        
        // Si END va seguido de AS "Alias", mantener en la misma línea
        if (nextToken === 'AS' || (tokens[i + 1] && !NEWLINE_KEYWORDS.has(tokens[i + 1].toUpperCase()) && tokens[i+1] !== ',' && tokens[i+1] !== ')')) {
           // No saltar línea aún
        }
      } else if (upperToken === 'ELSE') {
        flushLine();
        currentLine = getIndent(currentIndentLevel) + token + " ";
      } else if (upperToken === 'WHEN') {
        flushLine();
        currentLine = getIndent(currentIndentLevel) + token + " ";
      } else if (upperToken.includes('JOIN')) {
        flushLine();
        currentLine = getIndent(1) + token + " "; // Joins al nivel 1
      } else if (upperToken === 'ON') {
         currentLine += token + " "; // ON suele ir pegado al JOIN, o saltar si es largo (manejado por longitud)
      } else {
         currentLine += token + " ";
      }
      continue;
    }

    // 3. Manejo de Paréntesis (Funciones vs Agrupación Lógica)
    if (token === '(') {
      parenthesisLevel++;
      // Si el token anterior es una función de agregación (SUM, COUNT), intenta mantenerlo junto
      // a menos que dentro haya un CASE
      if (AGG_FUNCTIONS.has(prevToken)) {
         currentLine = currentLine.trimEnd() + token; // Pegar 'SUM' con '('
         // Check lookahead: si viene un CASE, forzar salto e indentación
         if (nextToken === 'CASE') {
             currentIndentLevel++;
             flushLine();
             currentLine = getIndent(currentIndentLevel);
         }
      } else {
         currentLine += token + " ";
      }
      continue;
    }

    if (token === ')') {
      parenthesisLevel--;
      // Si cerramos un bloque grande (ej. después de un END), quizás convenga ajustar
      // Si el parentesis cierra un bloque indentado que empezó con salto
      if (currentLine.trim() === '') {
         // Estamos en línea nueva, ajustar indent del cierre
         // currentIndentLevel = Math.max(0, currentIndentLevel - 1); 
         // (Opcional: lógica compleja de indentación de cierres)
         currentLine = getIndent(currentIndentLevel) + token + " ";
      } else {
         // Si cerramos justo después de un END, asegurarnos de que el END y el ) se vean bien
         if (prevToken === 'END') {
             currentIndentLevel = Math.max(0, currentIndentLevel - 1); // Bajar nivel del SUM(
             flushLine();
             currentLine = getIndent(currentIndentLevel) + token + " ";
         } else {
             currentLine = currentLine.trimEnd() + token + " ";
         }
      }
      continue;
    }

    // 4. Operadores Lógicos (AND/OR)
    if (LOGICAL_OPS.has(upperToken)) {
      // Si la línea actual ya es muy larga o estamos dentro de un WHERE complejo
      if (currentLine.length > 60) {
        flushLine();
        currentLine = getIndent(currentIndentLevel) + token + " ";
      } else {
        currentLine += token + " ";
      }
      continue;
    }

    // 5. Comas (separador de columnas)
    if (token === ',') {
      currentLine = currentLine.trimEnd() + token; // Pegar coma al anterior
      flushLine(); // Forzar salto después de coma (lista de columnas)
      continue;
    }

    // 6. Operadores Matemáticos (+ - * /) a nivel de bloque
    // Detectar patrones como ") - (" o "END - SUM"
    if (['+', '-', '*', '/'].includes(token)) {
        // Si es una operación entre bloques grandes (ej: SUM(...) - SUM(...))
        // Lo detectamos si la línea actual está casi vacía o si el anterior fue un cierre de bloque
        if (prevToken === ')' || prevToken === 'END' || currentLine.trim().length === 0) {
            flushLine();
            currentLine = getIndent(currentIndentLevel) + token + " ";
            continue;
        }
    }

    // --- REGLA DE LONGITUD DE LÍNEA ---
    // Añadir token normal
    const potentialLine = currentLine + token + " ";
    
    // Si la línea se pasa del máximo Y no es un string gigante único
    if (potentialLine.length > MAX_LINE_WIDTH) {
       // Intentar romper antes del token si no es un token "pegajoso"
       flushLine();
       // Indentar un poco extra para indicar continuación
       currentLine = getIndent(currentIndentLevel) + "  " + token + " ";
    } else {
       currentLine += token + " ";
    }
  }
  
  // Guardar última línea
  flushLine();

  // 4. Restaurar Strings
  formatted = formatted.replace(/__STR_(\d+)__/g, (_, index) => stringPlaceholders[parseInt(index)]);

  return formatted.trim();
};

export const prepareFinalSql = (queryData: QueryDefinition, loadIdVal: string): string => {
  let sql = queryData.sql.replace(/%s\.%s/g, `${queryData.schema}.${queryData.table}`);

  // Parameter substitution
  if (queryData.parameters) {
    Object.entries(queryData.parameters).forEach(([k, v]) => {
      const valRaw = v.value;
      const type = v.type;
      let valFinal = '';

      if (type === "LIST") {
        let lista: any[] = [];
        if (typeof valRaw === 'string' && valRaw.includes('[')) {
          try {
            lista = JSON.parse(valRaw.replace(/'/g, '"'));
          } catch (e) {
            lista = [valRaw];
          }
        } else if (Array.isArray(valRaw)) {
          lista = valRaw;
        } else {
          lista = [valRaw];
        }
        valFinal = lista.map(i => `'${String(i).trim()}'`).join(", ");
      } else {
        valFinal = `'${String(valRaw).trim()}'`;
      }
      // Replace :param
      sql = sql.replace(new RegExp(`:${k}`, 'g'), valFinal);
    });
  }

  // Load ID substitution
  sql = sql.replace(/':load_id'/g, ":load_id").replace(/":load_id"/g, ":load_id");
  if (loadIdVal.trim()) {
    const lId = loadIdVal.trim();
    const valId = /^\d+$/.test(lId) ? lId : `'${lId}'`;
    sql = sql.replace(/:load_id/g, valId);
  }

  return sql;
};
