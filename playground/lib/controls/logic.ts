import type { Control, ControlSchema, ControlValues } from "./types";

export function defaults<S extends ControlSchema>(schema: S): ControlValues<S> {
  return Object.fromEntries(Object.entries(schema).map(([k, c]) => [k, c.default])) as ControlValues<S>;
}

function snap(c: Extract<Control, { type: "number" }>, v: number): number {
  const step = c.step ?? (c.max - c.min) / 100;
  const n = Math.round((v - c.min) / step) * step + c.min;
  const decimals = (String(step).split(".")[1] ?? "").length;
  return Math.min(c.max, Math.max(c.min, Number(n.toFixed(decimals))));
}

export function randomValue(c: Control, rand: () => number = Math.random): number | boolean | string {
  switch (c.type) {
    case "number":
      return snap(c, c.min + rand() * (c.max - c.min));
    case "boolean":
      return rand() < 0.5;
    case "select":
      return c.options[Math.floor(rand() * c.options.length)] ?? c.default;
  }
}

export function randomize<S extends ControlSchema>(schema: S, rand: () => number = Math.random): ControlValues<S> {
  return Object.fromEntries(Object.entries(schema).map(([k, c]) => [k, randomValue(c, rand)])) as ControlValues<S>;
}

/** Merge untrusted (persisted) data over defaults, dropping anything invalid. */
export function sanitize<S extends ControlSchema>(schema: S, raw: unknown): ControlValues<S> {
  const out = defaults(schema) as Record<string, unknown>;
  if (!raw || typeof raw !== "object") return out as ControlValues<S>;
  for (const [k, c] of Object.entries(schema)) {
    const v = (raw as Record<string, unknown>)[k];
    if (c.type === "number" && typeof v === "number" && Number.isFinite(v)) out[k] = snap(c, v);
    if (c.type === "boolean" && typeof v === "boolean") out[k] = v;
    if (c.type === "select" && typeof v === "string" && c.options.includes(v)) out[k] = v;
  }
  return out as ControlValues<S>;
}
