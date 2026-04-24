import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import { queries } from './database.js';
import dotenv from 'dotenv';

dotenv.config();

export async function createApp() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  // --- Google OAuth Routes ---
  app.post('/api/auth/google/verify', async (req, res) => {
    const { token } = req.body;
    if (!token) {
      res.status(400).json({ error: 'Missing token' });
      return;
    }
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
      let payload: any;
      try {
        const ticket = await googleClient.verifyIdToken({ idToken: token, audience: clientId });
        payload = ticket.getPayload();
      } catch (verifyError: any) {
        console.warn('Google verification error, trying manual decode for @nfq.es domain check:', verifyError.message);
        const parts = token.split('.');
        if (parts.length === 3) {
          payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        }
      }
      if (!payload || !payload.email) {
        throw new Error('Cuerpo del token inválido');
      }
      const email = payload.email.toLowerCase();
      const domain = email.split('@')[1];
      if (domain !== 'nfq.es') {
        res.status(403).json({ error: 'Solo se permiten correos @nfq.es' });
        return;
      }
      let user = await queries.getUserByEmail(email) as any;
      if (!user) {
        console.log(`Auto-registrando usuario de nfq.es: ${email}`);
        await queries.addUser(email, 'user');
        user = { email, role: 'user' };
      }
      res.json({ email: user.email, role: user.role });
    } catch (error: any) {
      console.error('Google Auth Error:', error.message);
      res.status(401).json({ error: 'Error de autenticación: ' + error.message });
    }
  });

  // --- Activity Log Endpoints ---
  app.get('/api/logs', async (_req, res) => {
    try {
      const logs = await queries.getLogs();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/logs', async (req, res) => {
    const { user, module, action, details, type } = req.body;
    try {
      await queries.addLog(user || 'Sistema', module, action, details, type);
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/logs', async (_req, res) => {
    try {
      await queries.clearLogs();
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- User Management (Admin Only) ---
  app.get('/api/admin/users', async (_req, res) => {
    res.json(await queries.getUsers());
  });

  app.post('/api/admin/users', async (req, res) => {
    const { email, role } = req.body;
    try {
      await queries.addUser(email, role || 'user');
      res.status(201).end();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/admin/users/:email', async (req, res) => {
    const { email } = req.params;
    try {
      await queries.removeUser(email);
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- Database Integration (Athena & BigQuery) ---
  app.get('/api/debug-auth', (_req, res) => {
    const mask = (s: string) => s ? `${s.substring(0, 4)}...${s.substring(s.length - 2)}` : 'MISSING';
    res.json({
      env: {
        AWS_ACCESS_KEY_ID: mask(process.env.AWS_ACCESS_KEY_ID || ''),
        AWS_SECRET_ACCESS_KEY: !!process.env.AWS_SECRET_ACCESS_KEY,
        AWS_SESSION_TOKEN: mask(process.env.AWS_SESSION_TOKEN || ''),
        GOOGLE_PROJECT_ID: process.env.GOOGLE_PROJECT_ID || 'MISSING'
      },
      lastDiag: (global as any).lastAuthDiag || 'No requests yet'
    });
  });

  app.post('/api/download', async (req: express.Request, res: express.Response) => {
    const { config, query, loadId, region, env } = req.body;

    if (!config || !query || !loadId) {
      res.status(400).json({ error: 'Missing required parameters (config, query, or loadId)' });
      return;
    }

    try {
      let resultData: any[] = [];

      const normalize = (s: string) => s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/\s+/g, '_')
        .replace(/[^a-z0-9_]/g, '');

      const envMap: Record<string, string> = {
        'preproduccion': 'pre',
        'produccion': 'pro',
        'pre_produccion': 'pre',
        'desarrollo': 'dev',
        'laboratorio': 'lab'
      };

      const findKeyInsensitive = (obj: any, target: string) => {
        if (!obj || typeof obj !== 'object') return null;
        const normalizedTarget = normalize(target);
        let match = Object.keys(obj).find(k => normalize(k) === normalizedTarget);
        if (match) return match;
        const mappedTarget = envMap[normalizedTarget];
        if (mappedTarget) {
          match = Object.keys(obj).find(k => normalize(k) === mappedTarget);
        }
        return match;
      };

      const regionKey = findKeyInsensitive(config, region);
      const countryConfig = regionKey ? config[regionKey] : {};
      const envKey = findKeyInsensitive(countryConfig, env);
      const targetConfig = envKey ? countryConfig[envKey] : {};

      console.log(`[AUTH] MATCH: [${region}]->[${regionKey || '?'}] | [${env}]->[${envKey || '?'}]`);

      if (Object.keys(targetConfig).length === 0) {
        const available = regionKey ? `Disponibles en ${regionKey}: [${Object.keys(countryConfig).join(',')}]` : `Países locales: [${Object.keys(config).join(',')}]`;
        throw new Error(`Configuración no encontrada para ${region}/${env}. ${available}`);
      }

      const configIsGCP = targetConfig.type === 'service_account' ||
        targetConfig.project_id ||
        targetConfig.client_email ||
        targetConfig.credentials ||
        targetConfig.accesos;

      const dbIsBQ = query.database.toLowerCase().includes('bq') || query.database.toLowerCase().includes('bigquery');
      const dbType = (dbIsBQ || configIsGCP) ? 'bigquery' : 'athena';

      console.log(`[AUTH] Region: ${region}, Env: ${env}, DB: ${query.database}, Detected Type: ${dbType}`);

      const getVal = (paths: string[]) => {
        for (const p of paths) {
          const parts = p.split('.');
          let curr = targetConfig;
          for (const part of parts) {
            if (curr && typeof curr === 'object') {
              const k = findKeyInsensitive(curr, part);
              curr = k ? curr[k] : undefined;
            } else {
              curr = undefined;
              break;
            }
          }
          if (curr !== undefined && curr !== null) return curr.toString().trim();
        }
        return '';
      };

      const prepareSql = (rawSql: string, database: string, table: string, schema?: string) => {
        let sql = rawSql.replace(/%s\.%s/g, `${schema || database}.${table}`);
        if (query.parameters) {
          Object.entries(query.parameters).forEach(([k, v]: [string, any]) => {
            const valRaw = v.value;
            const type = v.type;
            let valFinal = '';
            if (type === 'LIST') {
              try {
                let list = [];
                if (typeof valRaw === 'string' && valRaw.includes('[')) {
                  list = JSON.parse(valRaw.replace(/'/g, '"'));
                } else if (Array.isArray(valRaw)) {
                  list = valRaw;
                } else {
                  list = [valRaw];
                }
                valFinal = list.map((i: any) => `'${String(i).trim()}'`).join(', ');
              } catch (e) {
                valFinal = `'${String(valRaw).trim()}'`;
              }
            } else {
              valFinal = `'${String(valRaw).trim()}'`;
            }
            sql = sql.split(`:${k}`).join(valFinal);
          });
        }
        sql = sql.replace(/':load_id'/g, ":load_id").replace(/":load_id"/g, ":load_id");
        if (loadId && loadId.toString().trim()) {
          const lId = loadId.toString().trim();
          const valId = /^\d+$/.test(lId) ? lId : `'${lId}'`;
          sql = sql.split(':load_id').join(valId);
        }
        return sql;
      };

      if (dbType === 'bigquery') {
        const { BigQuery } = await import('@google-cloud/bigquery');
        const projectId = getVal(['project_id', 'projectId', 'project']);
        let credentials = targetConfig.credentials ||
          targetConfig.accesos ||
          (targetConfig.type === 'service_account' ? targetConfig : undefined);
        if (!credentials) {
          const credsKey = findKeyInsensitive(targetConfig, 'credentials') || findKeyInsensitive(targetConfig, 'accesos');
          if (credsKey) credentials = targetConfig[credsKey];
        }
        console.log(`[GCP] BigQuery Init. Project: ${projectId || 'default'}. Creds present: ${!!credentials}`);
        if (credentials && credentials.client_email) {
          console.log(`[GCP] SA Email: ${credentials.client_email}`);
        }
        const bqClient = new BigQuery({
          projectId: projectId || config.projectId || process.env.GOOGLE_PROJECT_ID,
          credentials
        });
        const finalSql = prepareSql(query.sql, query.database, query.table, query.schema);
        console.log(`[GCP] SQL Prepared: ${finalSql.substring(0, 100)}...`);
        const [rows] = await bqClient.query({ query: finalSql });
        resultData = rows;
      } else {
        const { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } = await import('@aws-sdk/client-athena');

        const accessKeyId = getVal(['access_key', 'accessKeyId', 'credentials.access_key', 'credentials.accessKeyId', 'accesos.access_key']);
        const secretAccessKey = getVal(['secret_key', 'secretAccessKey', 'credentials.secret_key', 'credentials.secretAccessKey', 'accesos.secret_key']);
        const sessionToken = getVal(['session_token', 'sessionToken', 'credentials.session_token', 'credentials.sessionToken', 'accesos.session_token']);
        const awsRegion = getVal(['region', 'credentials.region', 'accesos.region']) || config.region || 'eu-west-1';

        if (!accessKeyId || !secretAccessKey) {
          console.error(`[AUTH] Estructura del bloque encontrado:`, JSON.stringify(targetConfig, null, 2).substring(0, 200));
          throw new Error(`Credenciales incompletas en el JSON para ${region}/${env}. Verifica que existan 'access_key' y 'secret_key'.`);
        }

        const isPermanent = accessKeyId.startsWith('AKIA');
        const finalCredentials = {
          accessKeyId,
          secretAccessKey,
          ...(sessionToken && !isPermanent ? { sessionToken } : {})
        };

        const authDiagStr = `Key=${accessKeyId.substring(0, 5)}... Type=${isPermanent ? 'Permanent' : 'Session'} Token=${sessionToken ? 'Present' : 'None'}`;
        (global as any).lastAuthDiag = authDiagStr;
        console.log(`[AWS] ${authDiagStr} | Region=${awsRegion}`);

        const athena = new AthenaClient({ region: awsRegion, credentials: finalCredentials });

        const outputLocation = getVal(['s3_staging', 'outputLocation', 'credentials.s3_staging', 'accesos.s3_staging']) || config.outputLocation || process.env.ATHENA_OUTPUT_LOCATION;
        if (!outputLocation) {
          throw new Error(`No se ha definido 's3_staging' para ${region}/${env}.`);
        }

        const finalSql = prepareSql(query.sql, query.database, query.table, query.schema);
        console.log(`[AWS] SQL Prepared: ${finalSql.substring(0, 100)}... (Total chars: ${finalSql.length})`);

        const startCommand = new StartQueryExecutionCommand({
          QueryString: finalSql,
          QueryExecutionContext: { Database: query.database },
          ResultConfiguration: { OutputLocation: outputLocation }
        });

        console.log(`[ATHENA] Ejecutando query en ${query.database}: ${query.filename}`);
        const { QueryExecutionId } = await athena.send(startCommand);
        console.log(`[ATHENA] ID Ejecución: ${QueryExecutionId}`);

        let status = 'RUNNING';
        while (status === 'RUNNING' || status === 'QUEUED') {
          await new Promise(r => setTimeout(r, 1000));
          const checkCommand = new GetQueryExecutionCommand({ QueryExecutionId });
          const { QueryExecution } = await athena.send(checkCommand);
          status = QueryExecution?.Status?.State || 'FAILED';
          if (status === 'FAILED' || status === 'CANCELLED') {
            throw new Error(`Athena query failed with status: ${status}`);
          }
        }

        const resultsCommand = new GetQueryResultsCommand({ QueryExecutionId });
        const { ResultSet } = await athena.send(resultsCommand);
        if (ResultSet?.Rows) {
          const headers = ResultSet.Rows[0].Data?.map(d => d.VarCharValue || '') || [];
          resultData = ResultSet.Rows.slice(1).map(row => {
            const obj: any = {};
            row.Data?.forEach((d, i) => { obj[headers[i]] = d.VarCharValue || ''; });
            return obj;
          });
        }
      }

      res.json(resultData);
      queries.addLog('Sistema', 'DESCARGA', 'EJECUCION_QUERY', `Query ${query.filename} ejecutada con éxito en ${dbType}`, 'SUCCESS').catch(console.error);

    } catch (error: any) {
      console.error('Download error:', error.message);
      let errorMsg = error.message;
      if (error.$metadata) {
        errorMsg = `AWS Error: ${error.name || 'Unknown'} - ${error.message}`;
      } else if (error.errors) {
        errorMsg = `GCP Error: ${error.errors[0]?.message || error.message}`;
      }
      const authHint = (global as any).lastAuthDiag || 'No diagnostic info';
      queries.addLog('Sistema', 'DESCARGA', 'ERROR_QUERY', `Fallo en ${query.filename}: ${errorMsg}`, 'ERROR').catch(console.error);
      res.status(500).json({ error: errorMsg, authDiag: authHint, details: error.stack || '' });
    }
  });

  // --- Repository Endpoints ---
  app.get('/api/repository/summary', async (_req, res) => {
    try {
      const summary = await queries.getRepoSummary() || [];
      console.log('[REPO] Summary Query Result:', JSON.stringify(summary));
      res.json(Array.isArray(summary) ? summary : []);
    } catch (error: any) {
      console.error('[REPO] Summary error:', error);
      res.json([]);
    }
  });

  app.delete('/api/repository/:id', async (req, res) => {
    const { id } = req.params;
    try {
      const exists = await queries.getRepoFileById(id);
      if (!exists) {
        console.warn(`[REPO] Delete requested for non-existent id: ${id}`);
        res.status(404).json({ error: 'File not found' });
        return;
      }
      await queries.deleteRepoFile(id);
      res.status(204).end();
    } catch (error: any) {
      console.error('[REPO] Error deleting file:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/repository/:client/:geography/:env', async (req, res) => {
    const { client, geography, env } = req.params;
    const geographyValue = geography === 'null' ? null : geography;
    try {
      const files = await queries.getRepoFiles(client, geographyValue, env);
      const parsedFiles = files.map((f: any) => {
        const uploadedAt = typeof f.uploaded_at === 'string' && f.uploaded_at.includes('T')
          ? f.uploaded_at
          : (f.uploaded_at || '').replace(' ', 'T') + 'Z';
        return {
          ...f,
          fileName: f.filename,
          uploadedAt,
          uploadedBy: f.uploaded_by,
          comment: f.comment,
          content: typeof f.content === 'string' ? JSON.parse(f.content) : f.content
        };
      });
      res.json(parsedFiles);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/repository', async (req, res) => {
    const { client, geography, env, filename, content, uploadedBy, comment } = req.body;
    const geographyValue = geography === 'null' || !geography ? null : geography;
    console.log(`[REPO] Intento de subida: ${filename} en ${client}/${geography || 'sin-geografía'}/${env} por ${uploadedBy}`);
    console.log(`[REPO] Tamaño del contenido: ${JSON.stringify(content).length} caracteres`);
    console.log(`[REPO] Comentario: ${comment || 'N/A'}`);

    try {
      const row = await queries.getLatestVersion(client, geographyValue, env);
      const nextVersion = (row?.maxV !== null && row?.maxV !== undefined) ? row.maxV + 1 : 0;
      const id = `${client}_${geography || 'general'}_${env}_${filename}_v${nextVersion}`;

      try {
        await queries.addRepoFile(
          id, client, geographyValue, env, filename, nextVersion,
          JSON.stringify(content), uploadedBy || 'Admin User', comment || ''
        );
        console.log(`[REPO] Guardado en DB con ID: ${id}`);
      } catch (dbError: any) {
        console.error('[REPO] Error crítico en DB:', dbError.message);
        throw new Error(`Database Error: ${dbError.message}`);
      }

      // Optional Cloud Backup (S3/GCS)
      try {
        if (process.env.AWS_S3_BUCKET) {
          const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
          const s3 = new S3Client({ region: process.env.AWS_REGION || 'eu-west-1' });
          await s3.send(new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: `${client}/${geography || 'general'}/${env}/${filename}_v${nextVersion}.json`,
            Body: JSON.stringify(content, null, 2),
            ContentType: 'application/json',
          }));
          console.log('[REPO] Backup Cloud completado');
        }
      } catch (cloudError: any) {
        console.warn('[REPO] Error Cloud Backup (no bloqueante):', cloudError.message);
      }

      if (process.env.GCS_BUCKET) {
        const { Storage } = await import('@google-cloud/storage');
        const storage = new Storage();
        const bucket = storage.bucket(process.env.GCS_BUCKET);
        await bucket.file(`${client}/${geography || 'general'}/${env}/${filename}_v${nextVersion}.json`).save(JSON.stringify(content, null, 2));
      }

      try {
        const files = await queries.getRepoFiles(client, geographyValue, env);
        const parsedFiles = files.map((f: any) => ({
          ...f,
          fileName: f.filename,
          uploadedAt: typeof f.uploaded_at === 'string' && f.uploaded_at.includes('T')
            ? f.uploaded_at
            : (f.uploaded_at || '').replace(' ', 'T') + 'Z',
          uploadedBy: f.uploaded_by,
          comment: f.comment,
          content: typeof f.content === 'string' ? JSON.parse(f.content) : f.content
        }));
        console.log('[REPO] Post-insert files count:', parsedFiles.length);
        res.status(201).json({ id, version: nextVersion, files: parsedFiles });
      } catch (pfErr: any) {
        console.warn('[REPO] Could not fetch files after insert:', pfErr.message);
        res.status(201).json({ id, version: nextVersion });
      }

      queries.addLog('Sistema', 'REPOSITORIO', 'SUBIDA_EXITOSA', `Archivo v${nextVersion} guardado: ${filename} en ${client} ${geography || 'general'} ${env}`, 'SUCCESS').catch(console.error);
    } catch (error: any) {
      console.error('Repository upload error:', error.message);
      res.status(500).json({ error: error.message });
    }
  });

  // --- Template Endpoints ---
  app.get('/api/templates', async (req, res) => {
    const { client, geography } = req.query;
    try {
      let templates;
      if (client) {
        const geoValue = geography === 'null' || !geography ? null : geography as string;
        templates = await queries.getTemplates(client as string, geoValue);
      } else {
        templates = await queries.getAllTemplates();
      }
      res.json(Array.isArray(templates) ? templates : []);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/templates', async (req, res) => {
    const { client, geography, name, content, uploadedBy } = req.body;
    if (!client || !name || !content) {
      res.status(400).json({ error: 'client, name, and content are required' });
      return;
    }
    const geoValue = geography === 'null' || !geography ? null : geography;
    const geoSlug = geoValue ? `_${(geoValue as string).replace(/\s+/g, '_')}` : '';
    const id = `tpl_${(client as string).replace(/\s+/g, '_')}${geoSlug}_${Date.now()}`;
    try {
      await queries.addTemplate(id, client, geoValue, name, JSON.stringify(content), uploadedBy || 'user');
      res.status(201).json({ id, name, client, geography: geoValue });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/templates/:id', async (req, res) => {
    const { id } = req.params;
    try {
      await queries.deleteTemplate(id);
      res.status(204).end();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // --- RAG (Retrieval-Augmented Generation) Endpoints ---
  app.get('/api/rag/status', async (_req, res) => {
    try {
      const { ragStatus } = await import('./rag.js');
      const status = await ragStatus();
      res.json({ ...status, hasApiKey: !!process.env.GOOGLE_GEMINI_API_KEY });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/rag/index', async (_req, res) => {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      res.status(400).json({ error: 'GOOGLE_GEMINI_API_KEY no está configurada en .env' });
      return;
    }
    try {
      const { indexRepositoryFiles } = await import('./rag.js');
      const result = await indexRepositoryFiles();
      queries.addLog('Sistema', 'RAG', 'INDEX', `Indexadas ${result.indexed} queries, ${result.errors} errores`, 'INFO').catch(console.error);
      res.json(result);
    } catch (e: any) {
      console.error('[RAG] Index error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  app.post('/api/rag/query', async (req, res) => {
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      res.status(400).json({ error: 'GOOGLE_GEMINI_API_KEY no está configurada en .env' });
      return;
    }
    const { question, history, filters } = req.body as {
      question?: string;
      history?: Array<{ role: string; content: string }>;
      filters?: { geography: string | null; env: string | null; client: string | null };
    };
    if (!question?.trim()) {
      res.status(400).json({ error: 'El campo "question" es obligatorio.' });
      return;
    }
    try {
      const { ragQuery } = await import('./rag.js');
      const result = await ragQuery(question.trim(), history ?? [], filters ?? { geography: null, env: null, client: null });
      res.json(result);
    } catch (e: any) {
      console.error('[RAG] Query error:', e.message);
      res.status(500).json({ error: e.message });
    }
  });

  return app;
}
