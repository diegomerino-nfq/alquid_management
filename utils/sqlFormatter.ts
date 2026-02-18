import { QueryDefinition } from '../types';

const INDENT_STR = "  "; // 2 spaces based on Reference File 1

const TOP_LEVEL_KEYWORDS = new Set([
  'SELECT', 'FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 
  'UNION', 'UNION ALL', 'EXCEPT', 'INTERSECT', 'WITH'
]);

/**
 * Tokenizer that preserves strings and comments
 */
const tokenizeSql = (sql: string): string[] => {
  const tokens: string[] = [];
  let current = '';
  let mode: 'sql' | 'string' | 'comment' = 'sql';
  let quoteChar = '';

  for (let i = 0; i < sql.length; i++) {
    const char = sql[i];
    const nextChar = sql[i + 1];

    if (mode === 'string') {
      current += char;
      if (char === quoteChar) {
        if (nextChar === quoteChar) {
          current += nextChar; // Escaped quote
          i++;
        } else {
          tokens.push(current);
          current = '';
          mode = 'sql';
        }
      }
    } else if (mode === 'comment') {
      current += char;
      if (char === '\n') {
        tokens.push(current.trim());
        current = '';
        mode = 'sql';
      }
    } else {
      // SQL Mode
      if (char === "'" || char === '"') {
        if (current) tokens.push(current);
        current = char;
        mode = 'string';
        quoteChar = char;
      } else if (char === '-' && nextChar === '-') {
        if (current) tokens.push(current);
        current = '--';
        mode = 'comment';
        i++;
      } else if (/\s/.test(char)) {
        if (current) tokens.push(current);
        current = '';
      } else if (['(', ')', ',', ';', '+', '-', '*', '/'].includes(char)) {
        if (current) tokens.push(current);
        tokens.push(char);
        current = '';
      } else {
        current += char;
      }
    }
  }
  if (current) tokens.push(current);

  // Merge composite keywords
  const merged: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const up = t.toUpperCase();
    const next = tokens[i+1] ? tokens[i+1].toUpperCase() : '';
    
    if (up === 'GROUP' && next === 'BY') { merged.push('GROUP BY'); i++; }
    else if (up === 'ORDER' && next === 'BY') { merged.push('ORDER BY'); i++; }
    else if (up === 'UNION' && next === 'ALL') { merged.push('UNION ALL'); i++; }
    else if (up === 'LEFT' && next === 'JOIN') { merged.push('LEFT JOIN'); i++; }
    else if (up === 'RIGHT' && next === 'JOIN') { merged.push('RIGHT JOIN'); i++; }
    else if (up === 'INNER' && next === 'JOIN') { merged.push('INNER JOIN'); i++; }
    else if (up === 'OUTER' && next === 'JOIN') { merged.push('OUTER JOIN'); i++; }
    else if (up === 'CROSS' && next === 'JOIN') { merged.push('CROSS JOIN'); i++; }
    else { merged.push(t); }
  }
  return merged;
};

export const formatSqlBonito = (sql: string): string => {
  if (!sql) return "";
  
  const tokens = tokenizeSql(sql);
  let formatted = "";
  let currentIndent = 0;
  let currentLine = "";
  let parenLevel = 0; // The key to avoiding cascade
  
  const spaces = (level: number) => INDENT_STR.repeat(Math.max(0, level));

  const flush = () => {
    if (currentLine.trim()) {
      formatted += (formatted ? "\n" : "") + spaces(currentIndent) + currentLine.trim();
    }
    currentLine = "";
  };

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const upper = token.toUpperCase();
    
    // --- Comments ---
    if (token.startsWith('--')) {
      if (currentLine.trim()) flush();
      formatted += (formatted ? "\n" : "") + spaces(currentIndent) + token;
      continue;
    }

    // --- Main Clauses (Always Level 0) ---
    if (TOP_LEVEL_KEYWORDS.has(upper)) {
      flush();
      currentIndent = 0;
      formatted += (formatted ? "\n" : "") + token; 
      currentIndent = 1; 
      continue;
    }

    // --- CASE (Structure vs Inline) ---
    if (upper === 'CASE') {
      if (parenLevel === 0) {
        // Structural CASE (e.g. defining a column category)
        flush();
        currentLine = token; 
        flush(); // 'CASE' on its own line
        currentIndent = 2; // Indent body
      } else {
        // Inline CASE (e.g. inside SUM)
        currentLine += (currentLine ? " " : "") + token;
      }
      continue;
    }

    if (upper === 'WHEN') {
      if (parenLevel === 0) {
        flush(); 
        currentLine = token;
      } else {
        currentLine += " " + token;
      }
      continue;
    }

    if (upper === 'ELSE') {
      if (parenLevel === 0) {
        flush();
        currentLine = token;
      } else {
        currentLine += " " + token;
      }
      continue;
    }

    if (upper === 'END') {
      if (parenLevel === 0) {
        flush();
        currentIndent = 1; // Return to column indent level
        currentLine = token;
      } else {
        currentLine += " " + token;
      }
      continue;
    }

    // --- Logic Operators ---
    if (['AND', 'OR'].includes(upper)) {
      if (parenLevel === 0) {
        // Top level logic (WHERE clauses) gets new lines
        flush();
        currentLine = token;
      } else {
        // Logic inside parens (calculations/complex conditions) stays inline
        currentLine += " " + token;
      }
      continue;
    }

    // --- Commas ---
    if (token === ',') {
      currentLine += token;
      if (parenLevel === 0) {
        flush(); // List item separator
      }
      continue;
    }

    // --- Parentheses (Control Inline Mode) ---
    if (token === '(') {
      // Attach to previous word if function-like, else space
      const prev = tokens[i-1] ? tokens[i-1].toUpperCase() : '';
      // Heuristic: if prev is an operator or keyword space, if function no space
      const isFunc = /^[A-Z0-9_]+$/i.test(prev) && !['AND','OR','IN','WHEN','IF','ELSE'].includes(prev);
      
      currentLine += (isFunc || currentLine.endsWith('(') ? "" : " ") + token;
      parenLevel++;
      continue;
    }

    if (token === ')') {
      currentLine += token;
      parenLevel = Math.max(0, parenLevel - 1);
      continue;
    }

    // --- Joins ---
    if (upper.includes('JOIN')) {
       flush();
       currentIndent = 0; // JOINs usually align with FROM
       currentLine = token;
       // We might want to indent ON, but keeping it simple usually works
       continue;
    }
    if (upper === 'ON') {
       // Keep ON with JOIN or break? Reference usually keeps it flowy or simple break
       currentLine += " " + token;
       continue;
    }

    // --- Default Word Appending ---
    // Avoid space if line empty or after specific chars
    if (currentLine.length > 0 && !['(', '.'].includes(currentLine.slice(-1)) && token !== '.') {
      currentLine += " ";
    }
    currentLine += token;
  }
  
  flush();
  return formatted;
};

export const prepareFinalSql = (queryData: QueryDefinition, loadIdVal: string): string => {
  let sql = queryData.sql.replace(/%s\.%s/g, `${queryData.schema}.${queryData.table}`);

  // Parameter substitution
  if (queryData.parameters) {
    Object.entries(queryData.parameters).forEach(([k, v]) => {
      const valRaw = v.value;
      let valFinal = '';

      if (v.type === "LIST" || Array.isArray(valRaw)) {
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
    const valId = `'${lId.replace(/'/g, "")}'`; 
    sql = sql.replace(/:load_id/g, valId);
  }

  return sql;
};
