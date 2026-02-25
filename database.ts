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
    module TEXT,
    action TEXT,
    details TEXT,
    type TEXT
  );

  CREATE TABLE IF NOT EXISTS repository_files (
    id TEXT PRIMARY KEY,
    region TEXT,
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
    // console.log("Migration skipped: 'comment' column already exists");
  }
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
  addLog: db.prepare('INSERT INTO activity_logs (module, action, details, type) VALUES (?, ?, ?, ?)'),
  getLogs: db.prepare('SELECT * FROM activity_logs ORDER BY timestamp DESC LIMIT 100'),
  clearLogs: db.prepare('DELETE FROM activity_logs'),

  addUser: db.prepare('INSERT INTO users (email, role) VALUES (?, ?)'),
  removeUser: db.prepare('DELETE FROM users WHERE email = ?'),
  getUsers: db.prepare('SELECT * FROM users ORDER BY created_at DESC'),
  getUserByEmail: db.prepare('SELECT * FROM users WHERE email = ?'),

  addRepoFile: db.prepare(`
    INSERT INTO repository_files (id, region, env, filename, version, content, uploaded_by, comment)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),
  getRepoFiles: db.prepare('SELECT * FROM repository_files WHERE region = ? AND env = ? ORDER BY version DESC'),
  getLatestVersion: db.prepare('SELECT MAX(version) as maxV FROM repository_files WHERE region = ? AND env = ? AND filename = ?'),
  getRepoSummary: db.prepare('SELECT region, env, COUNT(*) as count FROM repository_files GROUP BY region, env'),
  deleteRepoFile: db.prepare('DELETE FROM repository_files WHERE id = ?'),
};
