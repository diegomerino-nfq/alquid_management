/**
 * RAG Engine — Retrieval-Augmented Generation sobre el repositorio de queries SQL.
 *
 * Requiere en .env:
 *   GOOGLE_GEMINI_API_KEY=AIza...   (obtenida en https://aistudio.google.com/apikey)
 *
 * Modelos usados:
 *   Embeddings : text-embedding-004  (768 dims, gratuito con cuota generosa)
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
function queryToText(
  report   : string,
  query    : { sql: string; filename: string; database: string; schema?: string; table: string; parameters?: Record<string, any> },
  client   : string,
  geography: string | null,
  env      : string
): string {
  const parts: string[] = [
    `Cliente: ${client}${geography ? ', Geografía: ' + geography : ''}, Entorno: ${env}`,
    `Reporte: ${report}`,
    `Archivo: ${query.filename}`,
    `Base de datos: ${query.database}${query.schema ? ', Schema: ' + query.schema : ''}, Tabla: ${query.table}`,
  ];
  if (query.parameters && Object.keys(query.parameters).length > 0) {
    parts.push(`Parámetros: ${Object.keys(query.parameters).join(', ')}`);
  }
  parts.push(`SQL:\n${query.sql}`);
  return parts.join('\n');
}

/** Genera el embedding para un texto usando text-embedding-004. */
async function embed(genAI: any, text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(text);
  return result.embedding.values as number[];
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
export async function indexRepositoryFiles(): Promise<{ indexed: number; errors: number }> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

  const files = stmtAllRepoFiles.all() as any[];
  let indexed = 0, errors = 0;

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
        const q    = rep.queries[qi];
        const id   = `${file.id}::${rep.report}::${qi}`;
        const text = queryToText(rep.report, q, file.client, file.geography, file.env);

        try {
          const emb = await embed(genAI, text);
          stmtUpsert.run(
            id,
            file.client,
            file.geography ?? null,
            file.env,
            rep.report,
            q.filename,
            text,
            JSON.stringify(emb)
          );
          indexed++;
        } catch (e: any) {
          console.error(`[RAG] Error indexando chunk ${id}: ${e.message}`);
          errors++;
        }
      }
    }
  }

  console.log(`[RAG] Indexado: ${indexed} chunks OK, ${errors} errores.`);
  return { indexed, errors };
}

/**
 * Dada una pregunta, recupera el contexto más relevante del repositorio
 * y llama a gpt-4o-mini para generar una respuesta.
 */
export async function ragQuery(
  question: string
): Promise<{ answer: string; sources: RagChunkSource[] }> {

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY!);

  // 1. Embed la pregunta
  const qEmb = await embed(genAI, question);

  // 2. Recuperar top-5 chunks por similitud coseno
  const allChunks = stmtAllChunks.all() as any[];

  if (allChunks.length === 0) {
    return {
      answer : 'El repositorio todavía no está indexado. Pulsa "Indexar Repositorio" para comenzar.',
      sources: [],
    };
  }

  const scored = allChunks
    .map(c => ({ ...c, score: cosine(qEmb, JSON.parse(c.embedding) as number[]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  // 3. Construir el bloque de contexto
  const context = scored
    .map((s, i) =>
      `[${i + 1}] Cliente: ${s.client}${s.geography ? ' / ' + s.geography : ''} | Entorno: ${s.env} | Reporte: ${s.report_name} | Archivo: ${s.filename}\n${s.content_text}`
    )
    .join('\n\n---\n\n');

  // 4. Llamar a Gemini
  const systemPrompt =
    'Eres un asistente experto en SQL y datos del equipo ALQUID de NFQ. ' +
    'Tienes acceso al repositorio de queries SQL de la organización. ' +
    'Responde preguntas sobre qué hacen las queries, qué tablas y bases de datos usan, ' +
    'qué parámetros necesitan, diferencias entre entornos (PRE/PRO), etc. ' +
    'Sé preciso, técnico y conciso. Si la información está en el contexto, cítala directamente. ' +
    'Si no tienes información suficiente, dilo explícitamente.';

  const chatModel = genAI.getGenerativeModel({
    model          : 'gemini-1.5-flash',
    systemInstruction: systemPrompt,
    generationConfig: { temperature: 0.2, maxOutputTokens: 1200 },
  });

  const result = await chatModel.generateContent(
    `Contexto del repositorio:\n\n${context}\n\n---\n\nPregunta: ${question}`
  );
  const answer = result.response.text() ?? 'Sin respuesta.';

  const sources: RagChunkSource[] = scored.map(s => ({
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
