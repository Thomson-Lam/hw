// Browser side of the engine deps: every call goes to /api/road-lab/*. Keys never reach the client.
import { storage, storageKey } from "@/lib/controls";
import type { Deps, RuleRow, TraceEvent } from "../engine/session";
import type { Ctx, Grown, PackId, Row } from "../types";

export const SLUG = "road-lab";
const API = "/api/road-lab";

async function post<T>(url: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body), signal });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
  return data;
}

export function deviceId(): string {
  const key = storageKey(SLUG, "device");
  const have = storage.get(key);
  if (typeof have === "string" && /^[a-z0-9-]{6,64}$/i.test(have)) return have;
  const id = `d-${crypto.randomUUID()}`;
  storage.set(key, id);
  return id;
}

export type RunBoot = { runId: number; rules: RuleRow[]; grown: Grown[] };

export async function bootRun(pack: PackId, device: string): Promise<RunBoot> {
  const { id } = await post<{ id: number }>(`${API}/runs`, { pack, device });
  const q = `device=${encodeURIComponent(device)}&pack=${pack}`;
  const [rules, grown] = await Promise.all([
    fetch(`${API}/rules?${q}`).then((r) => r.json() as Promise<RuleRow[]>),
    fetch(`${API}/tiles?${q}`).then((r) => r.json() as Promise<Grown[]>),
  ]);
  return { runId: id, rules, grown };
}

export function patchRun(runId: number, fields: Record<string, unknown>) {
  void fetch(`${API}/runs`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: runId, ...fields }) }).catch(() => {});
}

export function makeDeps(runId: number, device: string, pack: PackId): { deps: Deps; dispose: () => void } {
  let buffer: TraceEvent[] = [];
  const flush = () => {
    if (!buffer.length) return;
    const events = buffer;
    buffer = [];
    void post(`${API}/trace`, { run: runId, events }).catch(() => {});
  };
  const timer = setInterval(flush, 500);
  const deps: Deps = {
    live: true,
    now: () => performance.now(),
    trace: (e) => buffer.push({ ...e, t: Date.now() }),
    pave: async ({ ctx, startIndex, signal }) => {
      try {
        return await post(`${API}/pave`, { run: runId, ctx, startIndex }, signal);
      } catch (e) {
        return { ok: false, error: e instanceof Error ? e.message : String(e) };
      }
    },
    search: async (q) => (await post<{ rows: Row[] }>(`${API}/search`, { run: runId, ...q })).rows,
    addRule: async (topic) => {
      const r = await post<{ id: number; form: string }>(`${API}/rules`, { pack, device, topic, source: "skip" }).catch(() => null);
      return r ? { id: r.id, topic, form: r.form } : null;
    },
    eraseRule: async (id) => {
      await fetch(`${API}/rules?id=${id}`, { method: "DELETE" }).catch(() => {});
    },
    addGrown: async (g) => (await post<{ id: number }>(`${API}/tiles`, { pack, device, ...g }).catch(() => null))?.id ?? null,
    undoGrown: async (id) => {
      await fetch(`${API}/tiles?id=${id}`, { method: "DELETE" }).catch(() => {});
    },
  };
  return {
    deps,
    dispose: () => {
      clearInterval(timer);
      flush();
    },
  };
}

export const saveCtx = (runId: number, ctx: Ctx) => patchRun(runId, { ctx });
