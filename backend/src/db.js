import initSqlJs from 'sql.js';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DB_PATH = join(__dirname, '..', 'data.db');

let db = null;

function saveDb() {
  if (db) {
    const data = db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

export async function initDb() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    db = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    db = new SQL.Database();
  }

  db.run('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT NOT NULL UNIQUE, password TEXT NOT NULL)');
  db.run('CREATE TABLE IF NOT EXISTS projects (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, total_amount REAL DEFAULT 0, reimbursed_amount REAL DEFAULT 0, created_at TEXT DEFAULT (datetime(\'now\',\'localtime\')), updated_at TEXT DEFAULT (datetime(\'now\',\'localtime\')))');
  db.run('CREATE TABLE IF NOT EXISTS project_steps (id INTEGER PRIMARY KEY AUTOINCREMENT, project_id INTEGER NOT NULL, step_index INTEGER NOT NULL, status TEXT DEFAULT \'pending\', data TEXT DEFAULT \'{}\', created_at TEXT DEFAULT (datetime(\'now\',\'localtime\')), updated_at TEXT DEFAULT (datetime(\'now\',\'localtime\')))');

  // Check if default user exists
  const stmt = db.prepare('SELECT id FROM users WHERE username = ?');
  stmt.bind(['admin']);
  const exists = stmt.step();
  stmt.free();

  if (!exists) {
    db.run('INSERT INTO users (username, password) VALUES (?, ?)', ['admin', 'admin123']);
  }

  saveDb();
  return db;
}

export function getDb() {
  return db;
}

export { saveDb };
