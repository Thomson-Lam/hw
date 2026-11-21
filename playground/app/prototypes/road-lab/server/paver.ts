// Paver: Gemini writes a stretch, the compiler checks it, rejected text goes back with the errors (max 3 attempts).
import { compile } from "../engine/compiler";
import { buildPrompt } from "../engine/prompt";
import type { Ctx, Pack, Tile, Verdict } from "../types";
import { generate, PAVER_MODEL, type GenErr, type GenOk, type Msg } from "./gemini";

export type Attempt = { n: number; ms: number; inTok: number; outTok: number; ok: boolean; errors: Verdict[]; src: string };
export type PaveResult =
  | { ok: true; src: string; tiles: Tile[]; attempts: Attempt[]; model: string }
  | { ok: false; stopped: boolean; error: string; attempts: Attempt[]; model: string };

export type Generate = (o: { system: string; messages: Msg[]; signal?: AbortSignal }) => Promise<GenOk | GenErr>;

export const extract = (text: string): string => {
  const t = text.replace(/```[a-z]*|```/g, "");
  const i = t.indexOf("(stretch");
  return (i >= 0 ? t.slice(i) : t).trim();
};

export async function paveStretch(pack: Pack, ctx: Ctx, opts: { signal?: AbortSignal; gen?: Generate } = {}): Promise<PaveResult> {
  const gen = opts.gen ?? ((o) => generate({ ...o, model: PAVER_MODEL }));
  const { system, user } = buildPrompt(pack, ctx);
  const messages: Msg[] = [{ role: "user", text: user }];
  const attempts: Attempt[] = [];
  for (let n = 1; n <= 3; n++) {
    const r = await gen({ system, messages, signal: opts.signal });
    if (!r.ok) {
      attempts.push({ n, ms: r.ms, inTok: 0, outTok: 0, ok: false, errors: [{ inv: "paver", msg: `${r.status} ${r.message}` }], src: "" });
      return { ok: false, stopped: r.auth, error: `${r.status} ${r.message}`, attempts, model: PAVER_MODEL };
    }
    const src = extract(r.text);
    const res = compile(src, ctx, pack, "llm");
    attempts.push({ n, ms: r.ms, inTok: r.inTok, outTok: r.outTok, ok: res.ok, errors: res.errors, src: src.slice(0, 1200) });
    if (res.ok) return { ok: true, src, tiles: res.tiles, attempts, model: PAVER_MODEL };
    messages.push({ role: "model", text: r.text }, { role: "user", text: `Compiler rejected it:\n${res.errors.map((e) => `- ${e.inv}: ${e.msg}`).join("\n")}\nRewrite the whole stretch.` });
  }
  return { ok: false, stopped: false, error: "rejected 3 times", attempts, model: PAVER_MODEL };
}
