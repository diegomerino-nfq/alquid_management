/**
 * RAG Engine — Retrieval-Augmented Generation sobre el repositorio de queries SQL.
 *
 * Requiere en .env:
 *   GOOGLE_GEMINI_API_KEY=AIza...   (obtenida en https://aistudio.google.com/apikey)
 *
 * Modelos usados:
 *   Embeddings : embedding-001       (768 dims, soportado en v1beta)
 *   Chat       : gemini-1.5-flash    (rápido, económico, con capa gratuita)
 */

import db from './database.js';

// ─── Schema ───────────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS rag_chunks (
    id           TEXT PRIMARY KEY,
    client       TEXT NOT NULL,
    geography    TEXT,
    env          TEXT NOT NULL,
    report_name  TEXT NOT NULL,
    filename     TEXT NOT NULL,
    content_text TEXT NOT NULL,
    embedding    TEXT NOT NULL,          -- JSON float array (768 dims)
    indexed_at   DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// ─── Prepared statements ─────────────────────────────────────────────────────

const stmtUpsert = db.prepare(`
  INSERT OR REPLACE INTO rag_chunks
    (id, client, geography, env, report_name, filename, content_text, embedding, indexed_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
`);

const stmtAllChunks    = db.prepare('SELECT id, client, geography, env, report_name, filename, content_text, embedding FROM rag_chunks');
const stmtCount        = db.prepare('SELECT COUNT(*) as count FROM rag_chunks');
const stmtLastIndexed  = db.prepare('SELECT MAX(indexed_at) as last FROM rag_chunks');
const stmtAllRepoFiles = db.prepare('SELECT * FROM repository_files');
const stmtExistingIds  = db.prepare('SELECT id FROM rag_chunks');

// Prepared statements para filtrado por metadatos (se generan dinámicamente abajo)
// ─── Metadata extractor ───────────────────────────────────────────────────────

/**
 * Extrae filtros de metadatos (geography, env, client) de la pregunta.
 * Devuelve null en cada campo si no se detecta mención.
 */
function extractMetadataFilters(question: string): {
  geography: string | null;
  env      : 'PRO' | 'PRE' | null;
  client   : string | null;
} {
  const q = question.toLowerCase();

  // Entorno
  let env: 'PRO' | 'PRE' | null = null;
  if (/\bpro\b/.test(q))        env = 'PRO';
  else if (/\bpre\b/.test(q))   env = 'PRE';

  // Geografías conocidas (añadir aquí nuevas cuando el repo crezca)
  const GEO_MAP: Record<string, string> = {
    colombia : 'Colombia',
    argentina: 'Argentina',
    peru     : 'Perú',
    perú     : 'Perú',
    suiza    : 'Suiza',
    switzerland: 'Suiza',
    mexico   : 'México',
    méxico   : 'México',
    brasil   : 'Brasil',
    brazil   : 'Brasil',
    chile    : 'Chile',
    turquia  : 'Turquía',
    turquía  : 'Turquía',
    turkey   : 'Turquía',
  };
  let geography: string | null = null;
  for (const [keyword, canonical] of Object.entries(GEO_MAP)) {
    if (q.includes(keyword)) { geography = canonical; break; }
  }

  // Clientes conocidos
  const CLIENT_MAP: Record<string, string> = {
    bbva: 'BBVA',
  };
  let client: string | null = null;
  for (const [keyword, canonical] of Object.entries(CLIENT_MAP)) {
    if (q.includes(keyword)) { client = canonical; break; }
  }

  return { geography, env, client };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Cosine similarity entre dos vectores de igual dimensión. */
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb) + 1e-10);
}

/**
 * Serializa una QueryDefinition como texto rico para embedding.
 * Incluye todos los metadatos relevantes + el SQL completo.
 */
/** Texto completo guardado en BD y enviado al LLM — SQL sin truncar. */
function queryToText(
  report   : string,
  query    : { sql: string; filename: string; database: string; schema?: string; table: string; parameters?: Record<string, any> },
  client   : string,
  geography: string | null,
  env      : string
): string {
  const header = [
    `Cliente: ${client}${geography ? ', Geografía: ' + geography : ''}, Entorno: ${env}`,
    `Reporte: ${report}`,
    `Archivo: ${query.filename}`,
    `Base de datos: ${query.database}${query.schema ? ', Schema: ' + query.schema : ''}, Tabla: ${query.table}`,
  ];
  if (query.parameters && Object.keys(query.parameters).length > 0) {
    header.push(`Parámetros: ${Object.keys(query.parameters).join(', ')}`);
  }
  header.push(`SQL:\n${query.sql}`);
  return header.join('\n');
}

/** Versión corta para embedding — SQL truncado a 1500 chars para respetar límite de tokens. */
function queryToEmbedText(
  report   : string,
  query    : { sql: string; filename: string; database: string; schema?: string; table: string; parameters?: Record<string, any> },
  client   : string,
  geography: string | null,
  env      : string
): string {
  const sqlShort = query.sql.length > 1500 ? query.sql.slice(0, 1500) + '...' : query.sql;
  return [
    `Cliente: ${client}${geography ? ', Geografía: ' + geography : ''}, Entorno: ${env}`,
    `Reporte: ${report}`, `Archivo: ${query.filename}`,
    `Base de datos: ${query.database}${query.schema ? ', Schema: ' + query.schema : ''}, Tabla: ${query.table}`,
    `SQL:\n${sqlShort}`,
  ].join('\n');
}

/**
 * Reintenta una operación async al recibir error 429 (rate-limit), con backoff.
 * Si el error es quota=0 (límite diario agotado) lanza directamente sin reintentar.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : '';
      const is429       = msg.includes('429');
      // Cuota diaria agotada: no tiene sentido reintentar hasta mañana
      const isDailyLimit = msg.includes('PerDay') || msg.includes('limit: 0');
      if (is429 && !isDailyLimit && attempt < maxRetries) {
        const retryMatch = msg.match(/retry in (\d+(?:\.\d+)?)s/i);
        const waitMs = retryMatch ? Math.ceil(parseFloat(retryMatch[1])) * 1000 + 2000 : (2 ** (attempt + 2)) * 5000;
        console.warn(`[RAG] 429 rate-limit — esperando ${waitMs / 1000}s (intento ${attempt + 1}/${maxRetries})…`);
        await new Promise(r => setTimeout(r, waitMs));
        continue;
      }
      throw e;
    }
  }
  throw new Error('Max retries exceeded');
}

/** Tamaño de lote para batchEmbedContents (máx recomendado: 100, usamos 10 por seguridad). */
const EMBED_BATCH_SIZE = 10;

/**
 * Genera embeddings para un lote de textos en una sola llamada HTTP.
 * Usa la API REST directamente (batchEmbedContents) porque el SDK JS
 * no expone este endpoint de forma conveniente.
 */
async function embedBatch(apiKey: string, texts: string[]): Promise<number[][]> {
  return withRetry(async () => {
    const url  = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:batchEmbedContents?key=${apiKey}`;
    const body = {
      requests: texts.map(text => ({
        model  : 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
      })),
    };
    const res = await fetch(url, {
      method : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body   : JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`[${res.status} ${res.statusText}] ${errText}`);
    }
    const data = await res.json() as { embeddings: Array<{ values: number[] }> };
    return data.embeddings.map(e => e.values);
  });
}

/** Modelos de chat a intentar en orden cuando los anteriores tienen quota=0. */
const CHAT_MODEL_FALLBACK = [
  'gemini-2.5-flash',       // mejor calidad, probado vía REST
  'gemini-2.5-flash-lite',  // más rápido
  'gemini-2.0-flash',       // fallback
  'gemini-2.0-flash-lite',  // fallback
  'gemma-3-27b-it',
  'gemma-3-12b-it',
  'gemma-3-4b-it',
];

/**
 * Llama a Gemini con fallback automático de modelos.
 * Usa REST directo (igual que embeddings) para evitar incompatibilidades del SDK v0.x.
 * Cada llamada es completamente autocontenida — sin historial de chat en el LLM.
 */
async function generateWithFallback(
  apiKey: string,
  currentMessage: string,
  systemPrompt: string,
): Promise<string> {
  let lastError: Error | null = null;

  for (const modelName of CHAT_MODEL_FALLBACK) {
    try {
      const url  = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
      const body: Record<string, any> = {
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: currentMessage }] }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
      };

      const res = await withRetry(async () => {
        const r = await fetch(url, {
          method : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body   : JSON.stringify(body),
        });
        if (!r.ok) {
          const errText = await r.text();
          throw new Error(`[${r.status}] ${errText.slice(0, 300)}`);
        }
        return r.json();
      });

      const text = (result: any) =>
        result?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Sin respuesta.';

      console.log(`[RAG] Respondido con modelo: ${modelName}`);
      return text(res) as string;
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : String(e);
      lastError = e;
      // Seguir al siguiente modelo si: cuota agotada, rate limit o modelo no disponible / accesible
      if (msg.includes('429') || msg.includes('[400]') || msg.includes('[403]') ||
          msg.includes('limit: 0') || msg.includes('RESOURCE_EXHAUSTED') ||
          msg.includes('quota') || msg.includes('not found')) {
        console.warn(`[RAG] Modelo ${modelName} no disponible → ${msg.slice(0, 120)}`);
        continue;
      }
      throw e;
    }
  }
  throw lastError ?? new Error('Todos los modelos de chat han agotado su cuota diaria.');
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface RagChunkSource {
  client    : string;
  geography : string | null;
  env       : string;
  reportName: string;
  filename  : string;
  score     : number;
}

/**
 * Indexa todos los archivos del repositorio en la tabla rag_chunks.
 * Cada QueryDefinition se convierte en un chunk independiente.
 */
export async function indexRepositoryFiles(): Promise<{ indexed: number; errors: number; skipped: number; quotaExhausted: boolean }> {
  const apiKey = process.env.GOOGLE_GEMINI_API_KEY!;

  const files = stmtAllRepoFiles.all() as any[];
  let indexed = 0, errors = 0;

  // ── 1. Recopilar todos los chunks antes de hacer llamadas a la API ──────────
  type Chunk = { id: string; client: string; geography: string | null; env: string; reportName: string; filename: string; text: string; embedText: string };
  const chunks: Chunk[] = [];

  for (const file of files) {
    let reports: Array<{ report: string; queries: any[] }>;
    try {
      const parsed = typeof file.content === 'string' ? JSON.parse(file.content) : file.content;
      reports = Array.isArray(parsed) ? parsed : [];
    } catch {
      console.warn(`[RAG] JSON inválido en archivo ${file.id}, omitiendo.`);
      errors++;
      continue;
    }
    for (const rep of reports) {
      if (!Array.isArray(rep.queries)) continue;
      for (let qi = 0; qi < rep.queries.length; qi++) {
        const q = rep.queries[qi];
        chunks.push({
          id        : `${file.id}::${rep.report}::${qi}`,
          client    : file.client,
          geography : file.geography ?? null,
          env       : file.env,
          reportName: rep.report,
          filename  : q.filename,
          text      : queryToText(rep.report, q, file.client, file.geography, file.env),       // full SQL — stored in DB
          embedText : queryToEmbedText(rep.report, q, file.client, file.geography, file.env), // truncated — for embedding
        });
      }
    }
  }

  // ── 2. Filtrar chunks ya indexados (indexado incremental) ────────────────────
  const existingIds = new Set(
    (stmtExistingIds.all() as { id: string }[]).map(r => r.id)
  );
  const pending = chunks.filter(c => !existingIds.has(c.id));
  const skipped = chunks.length - pending.length;
  console.log(`[RAG] Total chunks: ${chunks.length} | Ya indexados: ${skipped} | Pendientes: ${pending.length}`);

  if (pending.length === 0) {
    console.log('[RAG] Nada que indexar, todo está al día.');
    return { indexed: 0, errors: 0, skipped, quotaExhausted: false };
  }

  // ── 3. Procesar en lotes de EMBED_BATCH_SIZE ─────────────────────────────────
  const totalBatches = Math.ceil(pending.length / EMBED_BATCH_SIZE);
  console.log(`[RAG] ${pending.length} chunks pendientes → ${totalBatches} lotes de ${EMBED_BATCH_SIZE}`);

  let quotaExhausted = false;

  for (let i = 0; i < pending.length; i += EMBED_BATCH_SIZE) {
    const batch   = pending.slice(i, i + EMBED_BATCH_SIZE);
    const batchNo = Math.floor(i / EMBED_BATCH_SIZE) + 1;
    console.log(`[RAG] Lote ${batchNo}/${totalBatches} (chunks ${i + 1}–${i + batch.length})`);

    try {
      const embeddings = await embedBatch(apiKey, batch.map(c => c.embedText));
      for (let j = 0; j < batch.length; j++) {
        const c = batch[j];
        stmtUpsert.run(c.id, c.client, c.geography, c.env, c.reportName, c.filename, c.text, JSON.stringify(embeddings[j]));
        indexed++;
      }
    } catch (e: any) {
      const isDaily = e.message?.includes('PerDay') || e.message?.includes('EmbedContentRequests');
      console.error(`[RAG] Error en lote ${batchNo}: ${e.message?.slice(0, 200)}`);
      errors += batch.length;
      if (isDaily) {
        quotaExhausted = true;
        console.warn('[RAG] Cuota diaria de embeddings agotada (1000/día). Pendientes:', pending.length - indexed, 'chunks.');
        break;  // no seguir — mañana el indexado incremental retomará desde aquí
      }
    }

    // 4 500 ms entre lotes → ~13 lotes/min, bajo el límite de 15 RPM
    if (i + EMBED_BATCH_SIZE < pending.length) {
      await new Promise(r => setTimeout(r, 4500));
    }
  }

  console.log(`[RAG] Indexado: ${indexed} chunks OK, ${errors} errores, ${skipped} ya existían.`);
  return { indexed, errors, skipped, quotaExhausted };
}

/**
 * Dada una pregunta, recupera el contexto más relevante del repositorio
 * y llama a gpt-4o-mini para generar una respuesta.
 */
export async function ragQuery(
  question: string,
  history: Array<{ role: string; content: string }> = [],
  activeFilters: { geography: string | null; env: string | null; client: string | null } = { geography: null, env: null, client: null }
): Promise<{ answer: string; sources: RagChunkSource[] }> {

  const apiKey = process.env.GOOGLE_GEMINI_API_KEY!;

  // Usar los filtros resueltos por el frontend directamente — no re-extraer del texto.
  // El frontend ya heredó correctamente geografía/entorno del contexto activo de sesión.
  const filters = activeFilters;
  console.log(`[RAG] Filtros activos (del frontend):`, filters);

  // 2. Embed la pregunta — enriquecida con el contexto de geografía activa
  const questionForEmbedding = filters.geography
    ? `${question} — geografía: ${filters.geography}${filters.env ? ', entorno: ' + filters.env : ''}`
    : question;
  const [qEmb] = await embedBatch(apiKey, [questionForEmbedding]);

  // 3. Cargar el subconjunto de chunks con los filtros activos
  const conditions: string[] = [];
  const params   : any[]     = [];
  if (filters.geography) { conditions.push("geography = ?"); params.push(filters.geography); }
  if (filters.env)       { conditions.push("env = ?");       params.push(filters.env); }
  if (filters.client)    { conditions.push("client = ?");    params.push(filters.client); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const candidateChunks = db.prepare(
    `SELECT id, client, geography, env, report_name, filename, content_text, embedding FROM rag_chunks ${whereClause}`
  ).all(...params) as any[];

  // Estrategia de fallback:
  // - Si hay suficientes chunks con todos los filtros → usarlos
  // - Si tenemos geografía (directa o heredada) y faltan resultados → relajar env/client pero MANTENER geografía
  // - Solo ir al repo completo si NO hay ninguna geografía conocida
  let chunks: any[];
  if (candidateChunks.length >= 3) {
    chunks = candidateChunks;
  } else if (filters.geography) {
    // Relajar env/client pero mantener geografía
    const geoOnlyChunks = db.prepare(
      'SELECT id, client, geography, env, report_name, filename, content_text, embedding FROM rag_chunks WHERE geography = ?'
    ).all(filters.geography) as any[];
    chunks = geoOnlyChunks.length > 0 ? geoOnlyChunks : (stmtAllChunks.all() as any[]);
    console.log(`[RAG] Fallback parcial: ${geoOnlyChunks.length} chunks con geography=${filters.geography}`);
  } else {
    chunks = stmtAllChunks.all() as any[];
    console.log(`[RAG] Sin filtros: usando todo el repositorio (${chunks.length} chunks).`);
  }

  if (chunks.length === 0) {
    return {
      answer : 'El repositorio todavía no está indexado. Pulsa "Indexar Repositorio" para comenzar.',
      sources: [],
    };
  }

  // 4. Rankear por similitud coseno dentro de los chunks filtrados
  const allScored = chunks
    .map(c => ({ ...c, score: cosine(qEmb, JSON.parse(c.embedding) as number[]) }))
    .sort((a, b) => b.score - a.score);

  // Tomar los top-20 chunks por coseno — sin deduplicar por archivo:
  // cada chunk es una query SQL distinta; descartar duplicados eliminaría información real.
  const scored = allScored.slice(0, 20);
  // Deduplicar solo para la lista de fuentes que ve el usuario (no para el contexto del LLM)
  const seenSourceFiles = new Set<string>();
  const uniqueSources = scored.filter(c => {
    const key = `${c.report_name}::${c.filename}`;
    if (seenSourceFiles.has(key)) return false;
    seenSourceFiles.add(key);
    return true;
  });

  // 5. Construir el bloque de contexto
  const context = scored
    .map((s, i) =>
      `[${i + 1}] Cliente: ${s.client}${s.geography ? ' / ' + s.geography : ''} | Entorno: ${s.env} | Reporte: ${s.report_name} | Archivo: ${s.filename}\n${s.content_text}`
    )
    .join('\n\n---\n\n');

  // 6. Llamar a Gemini
  // Anclar el modelo a la geografía activa — instrucción más fuerte y repetida
  const geoAnchor = filters.geography
    ? `\n\n⚠️ INSTRUCCIÓN CRÍTICA — GEOGRAFÍA ACTIVA: "${filters.geography}"${filters.env ? ` / ${filters.env}` : ''}.
DEBES responder EXCLUSIVAMENTE sobre la geografía "${filters.geography}". 
NO menciones ni incluyas información de ninguna otra geografía (Perú, Colombia, Argentina, etc.) aunque aparezca en el contexto o en el historial.
Si el contexto no contiene información sobre "${filters.geography}", indícalo explícitamente en lugar de usar datos de otra geografía.`
    : '';

  const systemPrompt = `Eres un asistente técnico experto en SQL y en la suite de datos ALQUID del equipo de NFQ.
Tienes acceso al repositorio completo de queries SQL de la organización, incluyendo todos los clientes, geografías y entornos (PRE/PRO).${geoAnchor}

INSTRUCCIONES DE RESPUESTA:
- Responde SIEMPRE en español.
- Usa formato Markdown: encabezados, listas, bloques de código (\`\`\`sql) cuando muestres SQL.
- Cuando listés informes o archivos, usa una lista numerada con el nombre del archivo y una descripción de qué hace.
- Cuando expliques una query, indica: tabla(s) que consulta, base de datos, esquema, parámetros requeridos y un resumen de lo que calcula o extrae.
- ESCENARIOS: Cuando pregunten por escenarios, lee el SQL y extrae TODOS los valores únicos que encuentres en expresiones como CASE WHEN lower(scenario) = '...', WHERE scenario IN (...), WHEN scenario = '...', etc. Lista cada escenario encontrado aunque sean muchos. No te limites a mencionar solo 'base'.
- Si la pregunta es sobre diferencias PRE/PRO, compara explícitamente ambos entornos.
- Lista TODOS los elementos relevantes que aparezcan en el contexto; no omitas ninguno.
- Si hay información incompleta o ausente en el contexto, indícalo claramente.
- Sé técnico y preciso. Cita los nombres de tablas, bases de datos y parámetros tal como aparecen en el contexto.`;

  // Construir el mensaje actual con el contexto SQL fresco.
  // Nunca se incluye historial previo en la llamada al LLM:
  // - El filtro SQL (geography/env) garantiza que solo llegan chunks de la geografía activa.
  // - El embedding enriquecido ya orienta el coseno hacia el tema correcto.
  // - No hay riesgo de contaminación por respuestas previas de otras geografías.
  const geoHeader = filters.geography
    ? `Sesión activa → Geografía: ${filters.geography}${filters.env ? ` | Entorno: ${filters.env}` : ''}\n\n`
    : '';

  const currentMessage =
    `${geoHeader}Contexto del repositorio SQL filtrado por geografía activa:\n\n${context}\n\n---\n\nPregunta: ${question}`;

  const answer = await generateWithFallback(apiKey, currentMessage, systemPrompt);

  const sources: RagChunkSource[] = uniqueSources.map(s => ({
    client    : s.client,
    geography : s.geography ?? null,
    env       : s.env,
    reportName: s.report_name,
    filename  : s.filename,
    score     : Math.round(s.score * 1000) / 1000,
  }));

  return { answer, sources };
}

/** Estado actual del índice RAG. */
export function ragStatus(): { chunksCount: number; lastIndexedAt: string | null } {
  const { count } = stmtCount.get()        as { count: number };
  const { last  } = stmtLastIndexed.get()  as { last:  string | null };
  return { chunksCount: count, lastIndexedAt: last };
}
