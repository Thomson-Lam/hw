// Benchmark: can we classify what a person types into the right road?
//   concept     -> they want to understand something (lesson path, few forks)
//   goal        -> they want to do, get good at, decide or plan something (choice path)
//   money_worry -> a fear or dare about their own money (money futures simulator)
// Compares three classifiers on the same labeled queries:
//   regex      today's keyword router in server/server.mjs
//   decisions  Gemini Decisions API (gemini-decision-1), one closed-set "choice" question
//   flashlite  gemini-3.5-flash-lite asked for one word as JSON (what the agent uses today)
// Usage (from uncharted-app/):  node scripts/bench-route.mjs            reads GEMINI_API_KEY from ../.env
//                               node scripts/bench-route.mjs --json     also writes scripts/bench-route.json
import fs from "node:fs";
import { ROAD_CRITERIA, ROAD_QUESTION } from "../server/route.mjs";

const ENV = fs.readFileSync(new URL("../../.env", import.meta.url), "utf8");
const KEY = process.env.GEMINI_API_KEY ?? ENV.match(/GEMINI_API_KEY\s*=\s*(.+)/)?.[1].trim().replace(/^["']|["']$/g, "");
const BASE = `${process.env.UNCHARTED_GEMINI_BASE ?? "https://generativelanguage.googleapis.com"}/v1beta`;
if (!KEY) { console.error("No GEMINI_API_KEY in ../.env"); process.exit(1); }

// Labeled set. Includes the real queries from the SQLite runs and deliberate edge cases.
// money_worry follows the Canada Life track (docs/tracks.md): worry about your own financial future. Dares are goals.
const CASES = [
  // concept
  ["teach me about transformers LLM", "concept"],
  ["how do LLMs work", "concept"],
  ["what is attention in neural networks", "concept"],
  ["explain photosynthesis", "concept"],
  ["photosynthesis", "concept"],
  ["how does compound interest work", "concept"],
  ["what is a TFSA", "concept"],
  ["why is the sky blue", "concept"],
  ["how do vaccines train the immune system", "concept"],
  ["the french revolution", "concept"],
  ["how does a bike gear system work", "concept"],
  ["what makes inflation happen", "concept"],
  ["quantum computing basics", "concept"],
  ["how do airplanes stay in the air", "concept"],
  ["black holes", "concept"],
  // goal
  ["move to albania", "goal"],
  ["get really good at running", "goal"],
  ["mountain biking", "goal"],
  ["get into mountain biking", "goal"],
  ["find a co-op", "goal"],
  ["start a job coop", "goal"],
  ["learn to play guitar", "goal"],
  ["run a half marathon by spring", "goal"],
  ["pick a laptop for university", "goal"],
  ["plan a week in japan", "goal"],
  ["get into astronomy", "goal"],
  ["cook on a student budget", "goal"],
  ["switch from biology to software engineering", "goal"],
  ["build a mobile app", "goal"],
  ["find a weekend hobby", "goal"],
  // money_worry
  ["layoffs in my field", "money_worry"],
  ["my hours get cut", "money_worry"],
  ["my rent jumps", "money_worry"],
  ["prices keep rising", "money_worry"],
  ["quit and travel for 4 months", "goal"], // a dare is a goal, not a money worry
  ["what if I lose my job", "money_worry"],
  ["go back to school", "goal"],
  ["everyone says AI will take entry level jobs", "money_worry"],
  ["can I afford to move out", "money_worry"],
  ["I'm scared I'll never save anything", "money_worry"],
];
const CLASSES = ["concept", "goal", "money_worry"];

// --- classifiers ---------------------------------------------------------
const FINANCE = /\b(sav|money|invest|tfsa|fhsa|rrsp|budget|debt|spend|rent|layoff|laid off|fired|job|hours|inflation|price|market|quit|travel|time off|school|tuition|afford|paycheque|paycheck|broke|bills)|\$/i;
const regex = async (q) => ({ label: FINANCE.test(q) ? "money_worry" : "goal", confidence: null }); // today: never "concept"

// Same wording the app uses (server/route.mjs), so the benchmark measures the real router.
const CRITERIA = ROAD_CRITERIA;
const INSTRUCTIONS = ROAD_QUESTION;

async function decisions(q) {
  const res = await fetch(`${BASE}/decisions`, {
    method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({ model: "gemini-decision-1", input: q, questions: { road: { type: "choice", instructions: INSTRUCTIONS, criteria: CRITERIA } } }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`decisions http ${res.status}: ${j.error?.message ?? JSON.stringify(j).slice(0, 200)}`);
  const a = j.answers?.road;
  return { label: a?.choice, confidence: a?.confidence, probabilities: a?.probabilities };
}

async function flashlite(q) {
  const prompt = `${INSTRUCTIONS}\nOptions:\n${CLASSES.map((c) => `- ${c}: ${CRITERIA[c]}`).join("\n")}\nReturn JSON only: {"road": "concept" | "goal" | "money_worry"}\n\nThey typed: ${JSON.stringify(q)}`;
  const res = await fetch(`${BASE}/models/gemini-3.5-flash-lite:generateContent`, {
    method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: prompt }] }], generationConfig: { temperature: 0, maxOutputTokens: 30, responseMimeType: "application/json" } }),
    signal: AbortSignal.timeout(15000),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`flash-lite http ${res.status}: ${j.error?.message ?? ""}`);
  const text = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  let label; try { label = JSON.parse(text).road; } catch { label = text.trim(); }
  return { label, confidence: null };
}

// --- run -----------------------------------------------------------------
async function runAll(name, fn) {
  const out = [];
  const queue = CASES.map((c, i) => [c, i]);
  const worker = async () => {
    while (queue.length) {
      const [[q, want], i] = queue.shift();
      const t0 = performance.now();
      try { const r = await fn(q); out[i] = { q, want, ...r, ms: performance.now() - t0 }; }
      catch (e) { out[i] = { q, want, label: "ERROR", error: String(e.message ?? e), ms: performance.now() - t0 }; }
    }
  };
  await Promise.all(Array.from({ length: 4 }, worker));
  return { name, rows: out };
}

const pct = (a, b) => (b ? `${Math.round((100 * a) / b)}%` : "-");
const q50 = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? Math.round(s[Math.floor(s.length * 0.5)]) : 0; };
const q95 = (xs) => { const s = [...xs].sort((a, b) => a - b); return s.length ? Math.round(s[Math.min(s.length - 1, Math.floor(s.length * 0.95))]) : 0; };

const results = [];
for (const [name, fn] of [["regex", regex], ["decisions", decisions], ["flashlite", flashlite]]) {
  process.stdout.write(`running ${name}… `);
  const r = await runAll(name, fn);
  results.push(r);
  console.log("done");
}

console.log(`\n${CASES.length} queries · classes: ${CLASSES.join(", ")}\n`);
console.log("method      accuracy  concept  goal   money  errors  p50 ms  p95 ms");
for (const { name, rows } of results) {
  const ok = rows.filter((r) => r.label === r.want).length;
  const per = CLASSES.map((c) => { const rs = rows.filter((r) => r.want === c); return pct(rs.filter((r) => r.label === c).length, rs.length).padEnd(6); });
  const errs = rows.filter((r) => r.label === "ERROR").length;
  const ms = rows.filter((r) => r.label !== "ERROR").map((r) => r.ms);
  console.log(`${name.padEnd(11)} ${pct(ok, rows.length).padEnd(9)} ${per.join(" ")} ${String(errs).padEnd(7)} ${String(q50(ms)).padEnd(7)} ${q95(ms)}`);
}

for (const { name, rows } of results.slice(1)) {
  const wrong = rows.filter((r) => r.label !== r.want);
  console.log(`\n${name}: ${wrong.length} wrong`);
  for (const r of wrong) console.log(`  "${r.q}"  want ${r.want}, got ${r.label}${r.confidence != null ? ` (${Math.round(r.confidence * 100)}%)` : ""}${r.error ? `  ${r.error}` : ""}`);
}
const dec = results.find((r) => r.name === "decisions").rows.filter((r) => r.confidence != null);
if (dec.length) {
  const low = dec.filter((r) => r.confidence < 0.7);
  console.log(`\ndecisions: ${low.length} answers under 70% confidence (candidates for asking the person instead of guessing)`);
  for (const r of low) console.log(`  "${r.q}"  ${r.label} ${Math.round(r.confidence * 100)}%${r.label === r.want ? "" : "  (wrong)"}`);
}
if (process.argv.includes("--json")) {
  fs.writeFileSync(new URL("./bench-route.json", import.meta.url), JSON.stringify(results, null, 2));
  console.log("\nwrote scripts/bench-route.json");
}
