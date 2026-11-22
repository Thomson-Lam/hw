import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";

const SCHEMA = `
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  seed_json TEXT,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS nodes (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  parent_id TEXT REFERENCES nodes(id),
  option_index INTEGER,
  depth INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('speculative','taken','not_taken','stale')),
  status TEXT NOT NULL CHECK (status IN ('pending','ready','failed')),
  source TEXT CHECK (source IN ('agent','sim','fixed','fallback')),
  element_json TEXT,
  message TEXT,
  context_json TEXT,
  created_at INTEGER NOT NULL,
  ready_at INTEGER
);
CREATE INDEX IF NOT EXISTS nodes_parent ON nodes(parent_id);
CREATE INDEX IF NOT EXISTS nodes_session ON nodes(session_id);
CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES nodes(id),
  label TEXT NOT NULL,
  option_index INTEGER,
  value_json TEXT,
  created_at INTEGER NOT NULL,
  superseded_at INTEGER
);
CREATE TABLE IF NOT EXISTS rules (
  id TEXT PRIMARY KEY,
  answer_id TEXT NOT NULL REFERENCES answers(id),
  kind TEXT NOT NULL CHECK (kind IN ('prefer','avoid','max','set')),
  key TEXT NOT NULL,
  value_json TEXT,
  text TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  erased_at INTEGER
);
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  node_id TEXT NOT NULL REFERENCES nodes(id),
  attempt INTEGER NOT NULL,
  model TEXT NOT NULL,
  prompt_json TEXT NOT NULL,
  raw_text TEXT,
  errors_json TEXT NOT NULL,
  status_code INTEGER,
  ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sim_runs (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL REFERENCES sessions(id),
  params_json TEXT NOT NULL,
  result_json TEXT NOT NULL,
  ms INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (session_id, params_json)
);
`;

export function openDb(file) {
  const db = new DatabaseSync(file);
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(SCHEMA);
  // Added later: when a stop was actually on the person's road (pre-built speculative stops never get one).
  try { db.exec("ALTER TABLE nodes ADD COLUMN seen_at INTEGER"); } catch { /* column exists */ }
  return db;
}

export const id = () => randomUUID();
export const now = () => Date.now();
export const json = (v) => (v === undefined ? null : JSON.stringify(v));
export const parse = (s) => (s == null ? null : JSON.parse(s));
