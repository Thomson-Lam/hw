// General pack (Merch Trail): an agent with one search tool finds a 3D-printable horse for Hack Western merch.
import type { Ctx, Fact, Need, Pack, Row, Tile } from "../types";
import { factFiller, fallbackStretch, forkNeed, lead, offered, seenFor } from "./common";

export const LICENSE_ALLOW = [/public domain/i, /^creative commons\W+attribution$/i, /^creative commons\W+attribution\W+share alike$/i, /^bsd license$/i];
export const MAX_STL_BYTES = 5 * 1024 * 1024;
export const STYLES = ["realistic", "low-poly", "articulated"];
const SEARCH_STYLES = [...STYLES, "any"];
const SUPPORTS = ["none", "any"];

export const licenseAllowed = (license: string) => LICENSE_ALLOW.some((r) => r.test(license.replace(/\s+/g, " ").trim()));
export const rowOf = (ctx: Ctx, id: string): Row | undefined => ctx.results.find((r) => r.id === id);
const shown = (ctx: Ctx) => ctx.seen.filter((s) => s.startsWith("pick:")).map((s) => s.slice(5));

function facts(ctx: Ctx): Record<string, Fact> {
  const row = rowOf(ctx, ctx.choices.pick ?? "");
  return {
    "merch-goal": { short: "Find a horse to print for Hack Western merch.", long: "We are looking for a 3D-printable horse that Hack Western can print and give away. The license must allow that.", topic: "merch", source: "Goal" },
    "horse-theme": { short: "Hack Western 13: discover the unknown.", long: "This year's theme is exploration. A horse on the trail fits it.", topic: "horses", source: "hackwestern.com" },
    "pla-basics": { short: "PLA is the usual printing plastic.", long: "Most hobby printers use PLA. It is easy to print and comes in many colours.", topic: "printing", source: "General" },
    "supports-basics": { short: "Supports hold up overhangs.", long: "Parts that hang in the air need support material, which you remove after printing. No supports means less cleanup.", topic: "printing", source: "General" },
    "print-in-place": { short: "Print-in-place joints move straight off the bed.", long: "Articulated models can print with working joints in one piece.", topic: "printing", source: "General" },
    "license-basics": { short: "Merch needs a license that allows it.", long: "Giving away prints is a use the license must allow. Non-commercial licenses do not.", topic: "license", source: "Creative Commons" },
    license: {
      short: row ? `${row.title}: ${row.license}.` : "Pick a model to see its license.",
      long: row ? `${row.title} is shared under ${row.license}. Credit: ${row.author ?? "the creator"} on Printables.` : "Pick a model to see its license.",
      topic: "license",
      source: row ? `printables.com/model/${row.id}` : "Printables",
    },
  };
}

const FILLER = [
  { src: "(signpost horse-theme)", fact: "horse-theme" },
  { src: "(signpost pla-basics)", fact: "pla-basics" },
  { src: "(signpost supports-basics)", fact: "supports-basics" },
  { src: "(signpost license-basics)", fact: "license-basics" },
];

function requirements(ctx: Ctx): Need[] {
  const n: Need[] = [];
  if (forkNeed(ctx, "style", STYLES)) n.push({ id: "fork:style", tiles: 2 });
  // Search again (broader) only after a finished search found fewer than 2 usable models.
  if (!ctx.searched || (ctx.seen.includes("results:done") && ctx.results.length < 2)) n.push({ id: "search", tiles: 1 });
  const need = Math.max(0, 2 - shown(ctx).length);
  if (!ctx.choices.pick && !offered(ctx, "pick") && need > 0) n.push({ id: "picks", tiles: need });
  if (!ctx.choices.pick && !offered(ctx, "pick")) n.push({ id: "fork:pick", tiles: 2 });
  if (!seenFor(ctx, "license", "pick")) n.push({ id: "checkpoint:license", tiles: 1 });
  if (!ctx.seen.includes("toll") && !ctx.tollConfirmed) n.push({ id: "toll", tiles: 1 });
  return n;
}

function rowProblem(ctx: Ctx, id: string): { inv: string; msg: string } | null {
  const row = rowOf(ctx, id);
  if (!row) return { inv: "real-results", msg: `model ${id} is not a result of this run's search` };
  if (!licenseAllowed(row.license)) return { inv: "merch-license", msg: `model ${id} license "${row.license}" does not allow merch` };
  if (row.stlBytes > MAX_STL_BYTES) return { inv: "phone-size", msg: `model ${id} STL is ${(row.stlBytes / 1048576).toFixed(1)} MB (max 5 MB)` };
  return null;
}

const pickIds = (t: Tile): string[] => (t.kind === "pick" ? [t.result] : t.kind === "fork" && t.key === "pick" ? t.branches.map((b) => b.result ?? "") : []);
const rowCheck = (inv: string) => (t: Tile, ctx: Ctx) => {
  for (const id of pickIds(t)) {
    const p = rowProblem(ctx, id);
    if (p && p.inv === inv) return p.msg;
  }
  return null;
};

export const merchTrail: Pack = {
  id: "merch-trail",
  title: "Merch Trail",
  track: "Overall · Most Adventurous",
  rome: "A printable horse saved to your merch board",
  romePredicate: "(reached toll-booth :effect save-pick)",
  moodQuestion: null,
  checkpointKinds: ["license"],
  topics: ["merch", "horses", "printing", "license"],
  protectedTopics: ["license"],
  forkKeys: { style: STYLES, pick: [] },
  facts,
  budget: { rush: 10, steady: 13, linger: 16 },
  banned: null,
  crisisExit: false,
  hasSearch: true,
  numbers: [],
  invariants: [
    { id: "real-results", doc: "Every candidate model is a row from this run's search.", check: rowCheck("real-results") },
    { id: "merch-license", doc: "Candidates have an allowlisted license: Public Domain, CC BY, CC BY-SA, BSD.", check: rowCheck("merch-license") },
    { id: "phone-size", doc: "Candidate STL files are 5 MB or less, so a phone can render them.", check: rowCheck("phone-size") },
    {
      id: "pick-shown",
      doc: "The pick fork offers only models already shown on the road.",
      check: (t, ctx) => {
        if (t.kind !== "fork" || t.key !== "pick") return null;
        const bad = t.branches.find((b) => !ctx.seen.includes(`pick:${b.result}`));
        return bad ? `pick fork offers model ${bad.result} that is not shown on the road` : null;
      },
    },
    {
      id: "search-form",
      doc: "A search uses a known style and supports value, and happens before any pick.",
      check: (t, ctx) => {
        if (t.kind === "search") {
          if (!SEARCH_STYLES.includes(t.style)) return `search :style ${t.style} not in ${SEARCH_STYLES.join("|")}`;
          if (!SUPPORTS.includes(t.supports)) return `search :supports ${t.supports} not in ${SUPPORTS.join("|")}`;
          if (ctx.searched && !(ctx.seen.includes("results:done") && ctx.results.length < 2)) return "search already done";
        }
        if (t.kind === "pick" && !ctx.searched) return "pick before search";
        return null;
      },
    },
    {
      id: "attribution",
      doc: "The license and credit of the chosen model are seen before the toll booth.",
      check: (t, ctx) => {
        if (t.kind === "checkpoint" && t.check === "license" && !ctx.choices.pick) return "license checkpoint before a model is chosen";
        return t.kind === "toll-booth" && !seenFor(ctx, "license", "pick") ? "toll-booth before the license and credit of the chosen model" : null;
      },
    },
  ],
  requirements,
  onChoice: (ctx) => ctx,
  opening: () =>
    `(stretch (signpost merch-goal) (fork :key style (branch "Realistic" :value realistic :lead (signpost horse-theme)) (branch "Low-poly" :value low-poly :lead (signpost pla-basics)) (branch "Articulated" :value articulated :lead (signpost print-in-place))))`,
  fallback(ctx) {
    return fallbackStretch(this, ctx, (c) => factFiller(this, c, FILLER), (need, c) => {
      if (need === "fork:style") return `(fork :key style (branch "Realistic" :value realistic :lead ${lead(this, c, "horse-theme")}) (branch "Low-poly" :value low-poly :lead ${lead(this, c, "pla-basics")}))`;
      if (need === "search") {
        const style = c.choices.style ?? "any";
        const retry = c.seen.includes("results:done");
        const q = retry ? "horse" : style === "low-poly" ? "low poly horse" : style === "articulated" ? "articulated horse" : "horse";
        return `(search "${q}" :style ${retry ? "any" : style} :supports any)`;
      }
      if (need === "picks") {
        const next = c.results.find((r) => !c.seen.includes(`pick:${r.id}`) && !rowProblem(c, r.id));
        return next ? `(pick ${next.id})` : null;
      }
      if (need === "fork:pick") {
        const ids = shown(c).filter((id) => !rowProblem(c, id)).slice(0, 3);
        return ids.length >= 2 ? `(fork :key pick ${ids.map((id) => `(branch ${id} :lead (vista "Your pick"))`).join(" ")})` : null;
      }
      if (need.startsWith("checkpoint:")) return `(checkpoint ${need.split(":")[1]})`;
      if (need === "toll") return "(toll-booth)";
      return null;
    });
  },
  effect: {
    name: "save-pick",
    label: "Save to my merch board",
    validate(ctx) {
      const id = ctx.choices.pick;
      if (!id) return "pick a model first";
      const p = rowProblem(ctx, id);
      if (p) return p.msg;
      if (!seenFor(ctx, "license", "pick")) return "license and credit not seen";
      return null;
    },
    params: (ctx) => {
      const row = rowOf(ctx, ctx.choices.pick ?? "");
      return { print: row?.id ?? "", title: row?.title ?? "", license: row?.license ?? "" };
    },
  },
  system:
    "You are a scout agent on a trail. The user wants a 3D-printable horse for Hack Western merch. You may write ONE (search \"words\" :style STYLE :supports none|any) when NEEDS says search, then show candidates with (pick ID) using ids from RESULTS only, then a (fork :key pick (branch ID :lead TILE) ...) of shown picks. Never invent models, titles or licenses.",
  injects: [
    {
      id: "nc-license",
      label: "Candidate with a NonCommercial license",
      ctx: (c) => ({
        ...c,
        searched: true,
        results: [
          ...c.results,
          { id: "nc-1", title: "Show Horse", license: "Creative Commons — Attribution — Noncommercial", likes: 900, stlBytes: 300000, stlFileId: "0", image: null, author: "someone" },
        ],
      }),
      src: "(stretch (pick nc-1))",
      expect: "merch-license",
    },
  ],
};

/** Grammar addendum for the merch pack (search + pick tiles). */
export const MERCH_GRAMMAR = `  (search "words" :style realistic|low-poly|articulated|any :supports none|any)   LAST tile; the engine runs it
  (pick RESULT-ID)                       show one candidate from RESULTS
  (fork :key pick (branch RESULT-ID :lead TILE) ...)   choose among shown candidates, LAST tile`;
