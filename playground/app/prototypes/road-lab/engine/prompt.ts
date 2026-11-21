// Builds the paver prompt from the pack and the ctx. The LLM sees fact ids and result ids, never free facts to copy.
import { MERCH_GRAMMAR } from "../packs/merch-trail";
import { GRAMMAR } from "../packs/common";
import type { Ctx, Pack } from "../types";
import { budgetOf, needTiles } from "./compiler";

export function buildPrompt(pack: Pack, ctx: Ctx): { system: string; user: string } {
  const facts = pack.facts(ctx);
  const factLines = Object.entries(facts)
    .filter(([id]) => !pack.checkpointKinds.includes(id) && id !== "help")
    .map(([id, f]) => `  ${id} [topic ${f.topic ?? "-"}]${ctx.seen.includes(`fact:${id}`) ? " (used)" : ""}: ${f.short}`)
    .join("\n");
  const needs = pack.requirements(ctx);
  const slack = budgetOf(pack, ctx) - ctx.used - needTiles(pack, ctx);
  const results = pack.hasSearch
    ? ctx.results.map((r) => `  ${r.id}${ctx.seen.includes(`pick:${r.id}`) ? " (shown)" : ""}: ${r.title} [${r.license}]`).join("\n") || "  (none yet)"
    : null;
  const system = [pack.system, GRAMMAR, pack.hasSearch ? MERCH_GRAMMAR : ""].filter(Boolean).join("\n\n");
  const user = [
    `PACE: ${ctx.pace}   MOOD: ${ctx.mood ?? "unknown"}`,
    `PATH: ${ctx.path.slice(-10).join(" → ") || "start"}`,
    `CHOICES: ${Object.entries(ctx.choices).map(([k, v]) => `${k}=${v}`).join(", ") || "none"}`,
    `NEEDS (in order): ${needs.map((n) => n.id).join(", ") || "none"}`,
    `SLACK: ${slack} (tiles you may spend on extra road)`,
    `AVOID: ${ctx.avoid.join(", ") || "none"}`,
    `NUMBERS: ${ctx.numbers.join(", ") || "none"}`,
    `TOPICS: ${pack.topics.join(", ")}`,
    `CHECKPOINTS: ${pack.checkpointKinds.join(", ")}`,
    `FORK KEYS: ${Object.entries(pack.forkKeys).filter(([k]) => k !== "pick").map(([k, v]) => `${k}=${v.join("|")}`).join("; ")}`,
    `GROWN TILES: ${ctx.grown.map((g) => g.name).join(", ") || "none"}`,
    `FACTS:\n${factLines}`,
    results !== null ? `RESULTS:\n${results}` : "",
    "Write the next stretch now: 3 or 4 tiles, every fork branch with a :lead.",
  ]
    .filter(Boolean)
    .join("\n");
  return { system, user };
}
