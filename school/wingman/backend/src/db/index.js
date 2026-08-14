import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, "wingman.sqlite"));
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// node:sqlite's DatabaseSync has no built-in transaction() helper like better-sqlite3 -
// this wraps a batch of statements in BEGIN/COMMIT with a ROLLBACK on failure.
export function transaction(fn) {
  return (...args) => {
    db.exec("BEGIN");
    try {
      const result = fn(...args);
      db.exec("COMMIT");
      return result;
    } catch (err) {
      db.exec("ROLLBACK");
      throw err;
    }
  };
}

db.exec(`
CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  code TEXT,
  instructor TEXT,
  color TEXT NOT NULL DEFAULT '#B9603A',
  credit_hours REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS schedule_blocks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL, -- 0=Sunday .. 6=Saturday
  start_time TEXT NOT NULL,     -- 'HH:MM' 24hr
  end_time TEXT NOT NULL,
  location TEXT,
  label TEXT NOT NULL DEFAULT 'Class' -- Class, Lab, Recitation, etc
);

CREATE TABLE IF NOT EXISTS assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'assignment', -- exam, quiz, project, homework, reading, assignment
  due_at TEXT NOT NULL, -- ISO datetime
  weight_pct REAL,      -- % of final grade, if known
  difficulty INTEGER NOT NULL DEFAULT 3, -- 1-5 self rating, used by study plan generator
  status TEXT NOT NULL DEFAULT 'pending', -- pending, done
  notes TEXT,
  source TEXT NOT NULL DEFAULT 'manual', -- manual, syllabus
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  assignment_id INTEGER REFERENCES assignments(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_at TEXT NOT NULL, -- ISO datetime
  end_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned', -- planned, done, skipped
  source TEXT NOT NULL DEFAULT 'auto', -- auto, manual
  plan_batch TEXT -- id grouping sessions generated together, so a regenerate can clear just its own batch
);

CREATE TABLE IF NOT EXISTS syllabi (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  filename TEXT,
  raw_text TEXT,
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS quick_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0
);
`);

// Seed default UTK quick links on first run only.
const linkCount = db.prepare("SELECT COUNT(*) AS n FROM quick_links").get();
if (linkCount.n === 0) {
  const insert = db.prepare(
    "INSERT INTO quick_links (label, url, sort_order) VALUES (?, ?, ?)"
  );
  const defaults = [
    ["Canvas", "https://utk.instructure.com", 0],
    ["MyUTK", "https://myutk.utk.edu", 1],
    ["UTK Webmail", "https://outlook.office.com", 2],
    ["Vol Express (Registrar)", "https://registrar.utk.edu", 3],
  ];
  const insertMany = transaction((rows) => {
    for (const row of rows) insert.run(...row);
  });
  insertMany(defaults);
}

export default db;
