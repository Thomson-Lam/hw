// Small helpers for road-lab route handlers.
import { NextResponse } from "next/server";
import { getPack } from "../packs";
import type { Pack } from "../types";

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
export const bad = (msg: string, status = 400) => NextResponse.json({ error: msg }, { status });

export function packOr400(id: unknown): Pack | Response {
  const p = typeof id === "string" ? getPack(id) : null;
  return p ?? bad(`unknown pack ${String(id)}`);
}

export const deviceOf = (v: unknown): string | null => (typeof v === "string" && /^[a-z0-9-]{6,64}$/i.test(v) ? v : null);

export async function body(req: Request): Promise<Record<string, unknown>> {
  try {
    const b = (await req.json()) as unknown;
    return b && typeof b === "object" ? (b as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** Wrap a handler: any throw becomes a 500 with a message, never an unhandled crash. */
export function safe<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A): Promise<Response> => {
    try {
      return await fn(...a);
    } catch (e) {
      return bad(e instanceof Error ? e.message : String(e), 500);
    }
  };
}
