import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, 'alquid.db');

const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user TEXT,
    module TEXT,
    action TEXT,
    details TEXT,
    type TEXT
  );

  CREATE TABLE IF NOT EXISTS repository_files (
    id TEXT PRIMARY KEY,
    client TEXT,
    geography TEXT,
    env TEXT,
    filename TEXT,
    version INTEGER,
    content TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    uploaded_by TEXT,
    comment TEXT
  );
`);

// --- MIGRATIONS ---
try {
  db.exec("ALTER TABLE repository_files ADD COLUMN comment TEXT");
  console.log("Migration: Added 'comment' column to repository_files");
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    // already exists
  }
}
try {
  db.exec("ALTER TABLE activity_logs ADD COLUMN user TEXT");
  console.log("Migration: Added 'user' column to activity_logs");
} catch (e: any) {
  if (!e.message.includes('duplicate column name')) {
    // already exists
  }
}
// Migration: Update repository_files schema from region to client/geography
try {
  db.exec("ALTER TABLE repository_files ADD COLUMN client TEXT");
  db.exec("ALTER TABLE repository_files ADD COLUMN geography TEXT");
  console.log("Migration: Added 'client' and 'geography' columns to repository_files");
} catch (e: any) {
  // already exists or already migrated
}

// Seed initial admin user if not exists
const adminEmail = 'diego.merino@nfq.es';
const checkUser = db.prepare('SELECT * FROM users WHERE email = ?');
const user = checkUser.get(adminEmail);

if (!user) {
  db.prepare('INSERT INTO users (email, role) VALUES (?, ?)').run(adminEmail, 'admin');
  console.log(`Seeded admin user: ${adminEmail}`);
}

export default db;

export const queries = {
  addLog: db.prepare('INSERT INTO activity_logs (user, module, action, details, type) VALUES (?, ?, ?, ?, ?)'),
  getLogs: db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 200'),
  clearLogs: db.prepare('DELETE FROM activity_logs'),

  addUser: db.prepare('INSERT INTO users (email, role) VALUES (?, ?)'),
  removeUser: db.prepare('DELETE FROM users WHERE email = ?'),
  getUsers: db.prepare('SELECT * FROM users ORDER BY created_at DESC'),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),

  addRepoFile: db.prepare(`
    INSERT INTO repository_files (id, client, geography, env, filename, version, content, uploaded_by, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getRepoFiles: db.prepare('SELECT * FROM repository_files WHERE client = ? AND geography IS ? AND env = ? ORDER BY version DESC'),
  getLatestVersion: db.prepare('SELECT MAX(version) as maxV FROM repository_files WHERE client = ? AND geography IS ? AND env = ? AND filename = ?'),
  getRepoSummary: db.prepare(`
    SELECT
      client,
      CASE WHEN geography IS NULL THEN 'general' ELSE geography END as geography,
      env,
      COUNT(*) as count
    FROM repository_files
    GROUP BY client, geography, env
    ORDER BY client, geography, env
  `),
  deleteRepoFile: db.prepare('DELETE FROM repository_files WHERE id = ?'),
};
