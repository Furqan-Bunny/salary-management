import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

export type Db = Database.Database;

// Money columns are INTEGER (whole units of local currency). CHECK constraints back up the app validation.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS employees (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_code  TEXT    UNIQUE,
  full_name      TEXT    NOT NULL,
  email          TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  job_title      TEXT    NOT NULL,
  department     TEXT    NOT NULL,
  country        TEXT    NOT NULL,
  gender         TEXT    NOT NULL DEFAULT 'undisclosed'
                 CHECK (gender IN ('female', 'male', 'non_binary', 'undisclosed')),
  hire_date      TEXT    NOT NULL,
  status         TEXT    NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  salary         INTEGER NOT NULL CHECK (salary > 0),
  version        INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_employees_country_title ON employees (country, job_title);
CREATE INDEX IF NOT EXISTS idx_employees_status ON employees (status);
CREATE INDEX IF NOT EXISTS idx_employees_name ON employees (full_name COLLATE NOCASE);
CREATE INDEX IF NOT EXISTS idx_employees_salary ON employees (salary);

CREATE TABLE IF NOT EXISTS salary_changes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id      INTEGER NOT NULL REFERENCES employees (id) ON DELETE CASCADE,
  previous_salary  INTEGER CHECK (previous_salary IS NULL OR previous_salary > 0),
  new_salary       INTEGER NOT NULL CHECK (new_salary > 0),
  effective_date   TEXT    NOT NULL,
  reason           TEXT    NOT NULL
                   CHECK (reason IN ('hire', 'merit', 'promotion', 'market_adjustment', 'correction')),
  note             TEXT,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_salary_changes_employee ON salary_changes (employee_id, effective_date);

CREATE TABLE IF NOT EXISTS salary_bands (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  country     TEXT    NOT NULL,
  job_title   TEXT    NOT NULL,
  min_salary  INTEGER NOT NULL,
  mid_salary  INTEGER NOT NULL,
  max_salary  INTEGER NOT NULL,
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (country, job_title),
  CHECK (min_salary > 0 AND min_salary < mid_salary AND mid_salary < max_salary)
);
`;

export function openDatabase(file: string): Db {
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA);
  return db;
}

export function defaultDatabasePath(): string {
  return process.env.DATABASE_PATH ?? path.join(process.cwd(), "data", "salary.db");
}

// One shared connection per server process. Next.js dev mode reloads modules, so it is cached on globalThis.
const globalForDb = globalThis as unknown as { salaryDb?: Db };

export function getDb(): Db {
  globalForDb.salaryDb ??= openDatabase(defaultDatabasePath());
  return globalForDb.salaryDb;
}
