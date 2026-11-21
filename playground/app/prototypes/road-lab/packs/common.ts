// Helpers shared by packs. A pack is about a page of rules; these keep it that way.
import { budgetOf, compile, needTiles } from "../engine/compiler";
import type { Ctx, Pack } from "../types";

/** True if checkpoint `check` was shown while choice `key` had its current value. */
export function seenFor(ctx: Ctx, check: string, key: string): boolean {
  const v = ctx.choices[key];
  return v !== undefined && ctx.seen.includes(`${check}@${key}=${v}`);
}

export const offered = (ctx: Ctx, key: string) => ctx.seen.includes(`fork:${key}`);
export const usedFact = (ctx: Ctx, id: string) => ctx.seen.includes(`fact:${id}`);

/** A fork need: unmet if no valid choice and no pending fork for the key. */
export function forkNeed(ctx: Ctx, key: string, valid: string[]): boolean {
  return !valid.includes(ctx.choices[key] ?? "") && !offered(ctx, key);
}

/** Lead-in tile for a branch: the fact signpost, or fog if the user's rules avoid its topic. */
export function lead(pack: Pack, ctx: Ctx, factId: string): string {
  const f = pack.facts(ctx)[factId];
  return f && f.topic && ctx.avoid.includes(f.topic) ? "(fog)" : `(signpost ${factId})`;
}

/**
 * Deterministic fallback paver. Fills slack with unused, allowed filler; otherwise builds the next unmet need.
 * Each tile is compiled before it is added, so the result always compiles (ROADLAB-2).
 * Returns null when the road cannot continue yet (for example, search results are not in).
 */
export function fallbackStretch(
  pack: Pack,
  ctx: Ctx,
  filler: (ctx: Ctx) => string[],
  build: (needId: string, ctx: Ctx) => string | null,
): string | null {
  const out: string[] = [];
  let c = ctx;
  for (let k = 0; k < 4; k++) {
    const needs = pack.requirements(c);
    if (needs.length === 0) break;
    const slack = budgetOf(pack, c) - c.used - needTiles(pack, c);
    let added = false;
    const candidates = [...(slack > 0 ? filler(c) : []), build(needs[0].id, c)].filter((x): x is string => !!x);
    for (const src of candidates) {
      const r = compile(`(stretch ${[...out, src].join(" ")})`, ctx, pack, "engine");
      if (!r.ok) continue;
      out.push(src);
      c = r.ctxAfter;
      added = true;
      break;
    }
    if (!added) break;
    const last = out[out.length - 1];
    if (/^\((fork|search|toll-booth)\b/.test(last)) break;
  }
  return out.length ? `(stretch ${out.join(" ")})` : null;
}

/** Filler candidates: unused facts whose topic the user does not avoid. */
export function factFiller(pack: Pack, ctx: Ctx, items: { src: string; fact: string }[]): string[] {
  const facts = pack.facts(ctx);
  return items.filter((i) => !usedFact(ctx, i.fact) && !(facts[i.fact]?.topic && ctx.avoid.includes(facts[i.fact].topic!))).map((i) => i.src);
}

export const GRAMMAR = `Write ONE form: (stretch TILE ...) with 3 or 4 tiles. No prose. No code fences. Symbols are lowercase.
Tiles:
  (signpost FACT-ID)                     a fact from the FACTS list, by id
  (signpost "Label" :topic TOPIC)        a short label, 1 to 6 words
  (vista FACT-ID) | (vista "Label")
  (bridge FACT-ID)                       crossing something scary, by fact id
  (fog)
  (checkpoint KIND)                      KIND from CHECKPOINTS; the engine writes its text
  (fork :key KEY (branch "Label" :value VALUE :lead TILE) (branch ...))   2 or 3 branches, LAST tile
  (fork (branch "Label" :lead TILE) (branch "Label" :lead TILE))          unkeyed fork for variety, LAST tile
  (toll-booth)                           the destination; LAST tile; the user sets every amount
  (deftile NAME (PARAMS) TILE)           optional: define a reusable tile from existing tiles
Rules the compiler enforces:
  - Labels are 1 to 6 words. No numbers unless listed in NUMBERS. No claim words (zero, guaranteed, safe, best, always, %).
  - Never state facts in labels. Facts come only by FACT-ID.
  - Never write effect words (contribute, book, save-pick, :effect, :amount).
  - Do not use topics in AVOID.
  - Spend road on extra tiles only if SLACK > 0. Otherwise write the next NEEDS in order.
  - :lead is ONE simple tile: signpost, vista, bridge, fog or checkpoint.`;
