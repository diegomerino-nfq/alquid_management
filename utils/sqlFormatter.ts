import { QueryDefinition } from '../types';

// Helper to simulate the Python logic for splitting top level commas
const splitTopLevelCommas = (text: string): string[] => {
  const parts: string[] = [];
  let bracketLevel = 0;
  let current: string[] = [];

  for (const char of text) {
    if (char === '(') bracketLevel++;
    else if (char === ')') bracketLevel--;

    if (char === ',' && bracketLevel === 0) {
      parts.push(current.join("").trim());
      current = [];
    } else {
      current.push(char);
    }
  }
  parts.push(current.join("").trim());
  return parts.filter(p => p.length > 0);
};

// Main formatting function ported from Python
export const formatSqlBonito = (sql: string): string => {
  let formatted = sql.replace(/\s+/g, ' ').trim();

  // Pack IN clauses
  formatted = formatted.replace(/IN\s*\((.*?)\)/gi, (match, content) => {
    const elements = content.split(',').map((e: string) => e.trim());
    const packed: string[] = [];
    let currLine = "IN (";
    const indent = "            "; // 12 spaces

    elements.forEach((elem: string, i: number) => {
      const toAdd = elem + (i < elements.length - 1 ? ", " : "");
      if ((currLine + toAdd).length > 120) {
        packed.push(currLine.trimEnd());
        currLine = indent + toAdd;
      } else {
        currLine += toAdd;
      }
    });
    packed.push(currLine.trimEnd());
    return packed.join("\n") + ")";
  });

  // Keyword replacer
  const keywords = ['FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING', 'LEFT JOIN', 'INNER JOIN', 'JOIN', 'AND', 'OR', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END'];
  
  // A simplified tokenizing approach to avoid messing up strings
  // We utilize a placeholder strategy for strings to avoid replacing keywords inside them
  const stringPlaceholders: string[] = [];
  formatted = formatted.replace(/'(?:''|[^'])*'/g, (match) => {
    stringPlaceholders.push(match);
    return `__STR_${stringPlaceholders.length - 1}__`;
  });

  keywords.forEach(kw => {
    const regex = new RegExp(`\\b${kw}\\b`, 'gi');
    formatted = formatted.replace(regex, (match) => {
      const token = match.toUpperCase();
      if (['FROM', 'WHERE', 'GROUP BY', 'ORDER BY', 'HAVING'].includes(token)) return `\n${token} `;
      if (['LEFT JOIN', 'INNER JOIN', 'JOIN', 'AND', 'OR'].includes(token)) return `\n    ${token} `;
      if (['CASE', 'WHEN', 'THEN', 'ELSE', 'END'].includes(token)) return `\n        ${token} `;
      return token;
    });
  });

  // Restore strings
  formatted = formatted.replace(/__STR_(\d+)__/g, (_, index) => stringPlaceholders[parseInt(index)]);

  // Select formatting
  if (formatted.toUpperCase().includes("SELECT")) {
     const parts = formatted.split(/\nFROM/i);
     if (parts.length > 1) {
         let selectPart = parts[0].replace(/SELECT/i, "").trim();
         // Restore strings temporarily for comma splitting if needed, but simplistic approach here:
         const columns = splitTopLevelCommas(selectPart);
         const formattedColumns = columns.map((c, i) => 
            `    ${c.trim()}${i < columns.length - 1 ? ',' : ''}`
         );
         formatted = "SELECT\n" + formattedColumns.join("\n") + "\nFROM" + parts.slice(1).join("\nFROM");
     }
  }

  return formatted.replace(/\n\s*\n/g, '\n').trim();
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
