import { mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let DatabaseSync;

try {
  ({ DatabaseSync } = await import('node:sqlite'));
} catch (error) {
  throw new Error(
    `Xinhu backend requires Node.js 24+ with node:sqlite support. Current runtime cannot load node:sqlite: ${error.message}`
  );
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(BACKEND_ROOT, 'data');
const DATABASE_PATH = path.join(DATA_DIR, 'xinhu.sqlite');

let db = null;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  anonymous_id TEXT NOT NULL,
  transcript TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  timezone TEXT NOT NULL DEFAULT 'Asia/Shanghai',
  struggle TEXT,
  pattern TEXT,
  question TEXT,
  emotion_label TEXT NOT NULL,
  risk_level TEXT NOT NULL DEFAULT 'normal',
  saved INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  is_favorite INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS session_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  tag TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

CREATE TABLE IF NOT EXISTS session_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL UNIQUE,
  rating TEXT NOT NULL,
  most_useful_card TEXT,
  missed_card TEXT,
  tone_preference TEXT,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_created
ON sessions (anonymous_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_sessions_user_deleted
ON sessions (anonymous_id, is_deleted);

CREATE INDEX IF NOT EXISTS idx_session_tags_session
ON session_tags (session_id);

CREATE INDEX IF NOT EXISTS idx_session_feedback_session
ON session_feedback (session_id);
`;

export function initDatabase() {
  if (db) {
    return db;
  }

  mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DATABASE_PATH);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(SCHEMA_SQL);
  return db;
}

export function getDb() {
  return initDatabase();
}

export function closeDatabase() {
  if (!db) {
    return;
  }

  db.close();
  db = null;
}

export function getDatabasePath() {
  return DATABASE_PATH;
}
