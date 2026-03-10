import { ReportDefinition, QueryDefinition, EXPECTED_DATABASES, EXPECTED_TABLES } from '../types';

export type ValidationSeverity = 'CRITICAL' | 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationResult {
    severity: ValidationSeverity;
    reportIndex: number;
    queryIndex: number;
    reportName: string;
    filename: string;
    rule: string;
    message: string;
}

/**
 * Exhaustive JSON validator for report configuration files.
 * Returns an array of validation results sorted by severity.
 */
export function validateReportJson(
    data: any,
    region?: string,
    env?: string
): ValidationResult[] {
    const results: ValidationResult[] = [];

    const add = (
        severity: ValidationSeverity,
        ri: number,
        qi: number,
        reportName: string,
        filename: string,
        rule: string,
        message: string
    ) => {
        results.push({ severity, reportIndex: ri, queryIndex: qi, reportName, filename, rule, message });
    };

    // Rule 1: Top-level is an array
    if (!Array.isArray(data)) {
        add('CRITICAL', -1, -1, '-', '-', 'ESTRUCTURA', 'El archivo debe contener un array JSON en el nivel superior.');
        return results;
    }

    if (data.length === 0) {
        add('CRITICAL', -1, -1, '-', '-', 'VACÍO', 'El array de informes está vacío.');
        return results;
    }

    const reportNames = new Set<string>();
    const allFilenames = new Map<string, { ri: number; qi: number }>();

    data.forEach((report: any, ri: number) => {
        const rName = report?.report || `(sin nombre #${ri})`;

        // Rule 3: report field
        if (!report || typeof report !== 'object') {
            add('CRITICAL', ri, -1, rName, '-', 'TIPO_INFORME', `El elemento #${ri} no es un objeto válido.`);
            return;
        }

        if (!report.report || typeof report.report !== 'string' || !report.report.trim()) {
            add('CRITICAL', ri, -1, rName, '-', 'NOMBRE_INFORME', `Falta el campo "report" (nombre del informe).`);
        }

        // Rule 15: Duplicate report names
        if (report.report && reportNames.has(report.report.toLowerCase().trim())) {
            add('WARNING', ri, -1, rName, '-', 'INFORME_DUPLICADO', `Nombre de informe duplicado: "${report.report}".`);
        }
        if (report.report) reportNames.add(report.report.toLowerCase().trim());

        // Rule 4: queries array
        if (!Array.isArray(report.queries)) {
            add('CRITICAL', ri, -1, rName, '-', 'QUERIES_ARRAY', `El campo "queries" debe ser un array.`);
            return;
        }

        if (report.queries.length === 0) {
            add('ERROR', ri, -1, rName, '-', 'QUERIES_VACÍO', `El informe no contiene queries.`);
            return;
        }

        const reportFilenames = new Set<string>();

        report.queries.forEach((query: any, qi: number) => {
            const fName = query?.filename || `(sin nombre q#${qi})`;

            // Rule 5: sql field
            if (!query.sql || typeof query.sql !== 'string' || !query.sql.trim()) {
                add('CRITICAL', ri, qi, rName, fName, 'SQL_VACÍO', `El campo "sql" está vacío o no es un string.`);
            }

            // Rule 6: filename field (allow subfolder convention using '/'
            if (!query.filename || typeof query.filename !== 'string' || !query.filename.trim()) {
                add('ERROR', ri, qi, rName, fName, 'FILENAME_VACÍO', `El campo "filename" está vacío.`);
            } else if (query.filename.includes('/')) {
                // Validate that parts are non-empty (e.g., "1.Internos/SMM")
                const parts = query.filename.split('/');
                if (parts.some(p => !p || !p.trim())) {
                    add('ERROR', ri, qi, rName, fName, 'FILENAME_BARRA_INVALIDA', `El campo "filename" contiene segmentos vacíos: "${query.filename}".`);
                }
            }

            // Rule 7: database field
            if (!query.database || typeof query.database !== 'string' || !query.database.trim()) {
                add('ERROR', ri, qi, rName, fName, 'DATABASE_VACÍO', `El campo "database" está vacío.`);
            }

            // Rule 8: table field
            const validTables = ['metric', 'cashflow', 'result'];
            if (!query.table || typeof query.table !== 'string') {
                add('ERROR', ri, qi, rName, fName, 'TABLE_VACÍO', `El campo "table" está vacío.`);
            } else if (!validTables.includes(query.table.toLowerCase())) {
                add('ERROR', ri, qi, rName, fName, 'TABLE_INVÁLIDA', `Tabla "${query.table}" no es válida. Debe ser: metric, cashflow o result.`);
            }

            // Rule 9: database matches EXPECTED_DATABASES
            if (region && env && query.database) {
                // EXPECTED_DATABASES is keyed by client -> geography -> env
                // Aggregate allowed DBs for the selected geography across all clients
                let allowedDbs: string[] = [];
                for (const clientKey of Object.keys(EXPECTED_DATABASES)) {
                    const geoMap = (EXPECTED_DATABASES as any)[clientKey];
                    const geoEntry = geoMap?.[region];
                    if (geoEntry && geoEntry[env]) {
                        allowedDbs = allowedDbs.concat(geoEntry[env]);
                    }
                }
                allowedDbs = Array.from(new Set(allowedDbs));
                if (allowedDbs.length > 0) {
                    if (!allowedDbs.includes(query.database)) {
                        add('ERROR', ri, qi, rName, fName, 'DATABASE_NO_PERMITIDA',
                            `BD "${query.database}" no está permitida para ${region}/${env}. Permitidas: ${allowedDbs.join(', ')}`);
                    }
                }
            }

            // Rule 10: SQL contains :load_id
            if (query.sql && typeof query.sql === 'string' && !query.sql.includes(':load_id')) {
                add('WARNING', ri, qi, rName, fName, 'LOAD_ID_AUSENTE', `La SQL no contiene el placeholder ":load_id".`);
            }

            // Rule 11: SQL has absolute references (should use %s.%s)
            if (query.sql && typeof query.sql === 'string') {
                const absoluteRefs = findAbsoluteReferences(query.sql, query.database);
                if (absoluteRefs.length > 0) {
                    add('WARNING', ri, qi, rName, fName, 'REF_ABSOLUTA',
                        `SQL contiene ${absoluteRefs.length} referencia(s) absoluta(s) que necesitan %s.%s: ${absoluteRefs.slice(0, 3).join(', ')}.`);
                }
            }

            // Rule 12: parameters is an object
            if (query.parameters !== undefined && query.parameters !== null) {
                if (typeof query.parameters !== 'object' || Array.isArray(query.parameters)) {
                    add('WARNING', ri, qi, rName, fName, 'PARAMS_TIPO', `"parameters" debe ser un objeto, no ${typeof query.parameters}.`);
                } else {
                    // Rule 13: Each parameter has a value field
                    Object.entries(query.parameters).forEach(([key, param]: [string, any]) => {
                        if (param === null || param === undefined || (typeof param === 'object' && !('value' in param))) {
                            add('WARNING', ri, qi, rName, fName, 'PARAM_SIN_VALOR', `Parámetro "${key}" no tiene campo "value".`);
                        }
                    });
                }
            }

            // Rule 14: Duplicate filename within same report
            if (query.filename) {
                const normalizedName = query.filename.toLowerCase().trim();
                if (reportFilenames.has(normalizedName)) {
                    add('WARNING', ri, qi, rName, fName, 'FILENAME_DUPLICADO', `Filename duplicado dentro del informe: "${query.filename}".`);
                }
                reportFilenames.add(normalizedName);

                // Also check globally
                const globalKey = `${rName}::${normalizedName}`;
                if (allFilenames.has(globalKey)) {
                    const prev = allFilenames.get(globalKey)!;
                    add('WARNING', ri, qi, rName, fName, 'FILENAME_GLOBAL_DUP',
                        `Filename duplicado con informe #${prev.ri}, query #${prev.qi}.`);
                }
                allFilenames.set(globalKey, { ri, qi });
            }

            // Rule 16: SQL references correct table alias
            if (query.sql && query.table && typeof query.sql === 'string') {
                const tableAlias = query.table.toLowerCase();
                const otherTables = validTables.filter(t => t !== tableAlias);
                for (const other of otherTables) {
                    // Check if the SQL references another table alias in column references like result.column
                    const aliasRegex = new RegExp(`\\b${other}\\.[a-zA-Z_]`, 'gi');
                    if (aliasRegex.test(query.sql)) {
                        add('INFO', ri, qi, rName, fName, 'TABLA_CRUZADA',
                            `La SQL referencia "${other}.*" pero la tabla definida es "${tableAlias}".`);
                    }
                }
            }
        });
    });

    // Sort by severity priority
    const severityOrder: Record<ValidationSeverity, number> = { CRITICAL: 0, ERROR: 1, WARNING: 2, INFO: 3 };
    results.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

    return results;
}

/**
 * Detects absolute references in SQL that should be dynamic (%s.%s).
 * 
 * A reference is considered "absolute" if:
 * 1. It appears in a FROM/JOIN clause (like FROM database.table)
 * 2. The first part (database name) is NOT a known table alias
 * 3. The first part is NOT a known table name in that database
 * 4. The first part is NOT the same database being validated
 * 
 * This allows normal column references like "cashflow.payment_date" to pass through
 * while flagging problematic database.table references like "alquid.cashflow".
 * 
 * @param sql - The SQL query to analyze
 * @param database - The database name (used to look up known tables and exclude same-DB refs)
 * @returns Array of absolute references found (e.g., ["alquid.cashflow"])
 */
export function findAbsoluteReferences(sql: string, database?: string): string[] {
    const refs: string[] = [];

    // Remove string literals to avoid false positives
    const cleaned = sql.replace(/'[^']*'/g, "''");
    const cleaned2 = cleaned.replace(/`[^`]*`/g, '``');

    // Get list of known tables for this database
    const knownTables = new Set<string>();
    if (database && EXPECTED_TABLES[database]) {
        EXPECTED_TABLES[database].forEach(table => {
            knownTables.add(table.toUpperCase());
        });
    }
    // Always include the DEFAULT tables
    if (EXPECTED_TABLES["DEFAULT"]) {
        EXPECTED_TABLES["DEFAULT"].forEach(table => {
            knownTables.add(table.toUpperCase());
        });
    }

    // Extract table aliases from FROM/JOIN clauses
    // Pattern: FROM|JOIN ... [database.]table_name [AS] alias
    const tableAliasRegex = /\b(FROM|JOIN|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN|FULL\s+JOIN|CROSS\s+JOIN)\s+(?:[a-zA-Z_][a-zA-Z0-9_-]*\.)?[a-zA-Z_][a-zA-Z0-9_-]*\s+(?:AS\s+)?([a-zA-Z_][a-zA-Z0-9_]*)\b/gi;
    const tableAliases = new Set<string>();
    let aliasMatch;
    while ((aliasMatch = tableAliasRegex.exec(cleaned2)) !== null) {
        const alias = aliasMatch[2];
        // Exclude SQL keywords that might be incorrectly captured
        if (alias && !/^(ON|WHERE|GROUP|ORDER|LIMIT|JOIN|INNER|LEFT|RIGHT|FULL|CROSS|AND|OR|AS)$/i.test(alias)) {
            tableAliases.add(alias.toUpperCase());
        }
    }

    // Find all dotted identifiers in FROM/JOIN contexts
    const dotIdRegex = /\b([a-zA-Z_][a-zA-Z0-9_-]*\.[a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let match;
    while ((match = dotIdRegex.exec(cleaned2)) !== null) {
        const ref = match[1];
        
        // Ignore %s.%s placeholders
        if (ref === '%s.%s') {
            continue;
        }

        // Check if this reference appears in FROM/JOIN contexts
        const fromJoinPattern = new RegExp(`\\b(FROM|JOIN|INNER\\s+JOIN|LEFT\\s+JOIN|RIGHT\\s+JOIN|FULL\\s+JOIN|CROSS\\s+JOIN)\\s+.*\\b${ref.replace(/\./g, '\\.')}\\b`, 'i');
        if (fromJoinPattern.test(cleaned2)) {
            const firstPart = ref.split('.')[0].toUpperCase();
            
            // Only flag if ALL of these are true:
            // 1. First part is NOT a known table alias
            // 2. First part is NOT a known table name
            // 3. First part is NOT the same database being validated
            if (!tableAliases.has(firstPart) && 
                !knownTables.has(firstPart) && 
                firstPart !== database?.toUpperCase()) {
                refs.push(ref);
            }
        }
    }

    // Deduplicate and return
    return [...new Set(refs)];
}
