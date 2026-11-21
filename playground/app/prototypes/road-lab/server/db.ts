// SQLite persistence (built-in node:sqlite). Local only: playground/.data/road-lab.db or $ROAD_LAB_DB.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const g = globalThis as unknown as { __roadLabDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (g.__roadLabDb) return g.__roadLabDb;
  const file = process.env.ROAD_LAB_DB ?? path.join(process.cwd(), ".data", "road-lab.db");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = new DatabaseSync(file);
  d.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS rules (id INTEGER PRIMARY KEY, pack TEXT NOT NULL, device TEXT NOT NULL, topic TEXT NOT NULL, form TEXT NOT NULL, source TEXT NOT NULL, created_at INTEGER NOT NULL, erased_at INTEGER);
    CREATE TABLE IF NOT EXISTS grown_tiles (id INTEGER PRIMARY KEY, pack TEXT NOT NULL, device TEXT NOT NULL, name TEXT NOT NULL, form TEXT NOT NULL, data TEXT, created_at INTEGER NOT NULL, undone_at INTEGER);
    CREATE TABLE IF NOT EXISTS runs (id INTEGER PRIMARY KEY, pack TEXT NOT NULL, device TEXT NOT NULL, started_at INTEGER NOT NULL, ended_at INTEGER, mood_before TEXT, mood_after TEXT, reached_rome INTEGER NOT NULL DEFAULT 0, stopped INTEGER NOT NULL DEFAULT 0, ctx TEXT);
    CREATE TABLE IF NOT EXISTS trace (id INTEGER PRIMARY KEY, run_id INTEGER NOT NULL, t INTEGER NOT NULL, stage TEXT NOT NULL, json TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS trace_run ON trace(run_id, id);
    CREATE TABLE IF NOT EXISTS control (k TEXT PRIMARY KEY, v TEXT NOT NULL);
  `);
  g.__roadLabDb = d;
  return d;
}

export type TraceEvent = { stage: string; [k: string]: unknown };

export function trace(runId: number, events: TraceEvent[]): void {
  const st = db().prepare("INSERT INTO trace (run_id, t, stage, json) VALUES (?, ?, ?, ?)");
  const now = Date.now();
  for (const e of events) st.run(runId, typeof e.t === "number" ? e.t : now, String(e.stage).slice(0, 40), JSON.stringify(e).slice(0, 20000));
}

export function control(k: string): string | null {
  const r = db().prepare("SELECT v FROM control WHERE k = ?").get(k) as { v: string } | undefined;
  return r?.v ?? null;
}

export function setControl(k: string, v: string): void {
  db().prepare("INSERT INTO control (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v").run(k, v);
}

export type RunRow = { id: number; pack: string; device: string; started_at: number; ended_at: number | null; mood_before: string | null; mood_after: string | null; reached_rome: number; stopped: number; ctx: string | null };

export function getRun(id: number): RunRow | null {
  return (db().prepare("SELECT * FROM runs WHERE id = ?").get(id) as RunRow | undefined) ?? null;
}

export function latestRun(): RunRow | null {
  return (db().prepare("SELECT * FROM runs ORDER BY id DESC LIMIT 1").get() as RunRow | undefined) ?? null;
}
