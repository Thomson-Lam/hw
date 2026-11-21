import fs from "node:fs";
const KEY = fs.readFileSync("/Users/tlam/hw/.env", "utf8").match(/GEMINI_API_KEY\s*=\s*(.+)/)?.[1].trim().replace(/^["']|["']$/g, "");
const MODEL = "gemini-3.5-flash-lite";
const OUT = new URL(".", import.meta.url).pathname;
const TAGS = ["outdoors", "night", "hands-on", "visual", "history", "math", "social", "reading", "free", "animals", "far", "food", "cheap", "quick", "music"];
const GOALS = ["Get into astronomy", "Learn to cook on a student budget"];
const PERSONAS = ["steady", "avoider"];
const POLICIES = ["keep", "last3", "keyed"];
const STEPS = 4;

const SYSTEM = `You fill the next stretch of a scrolling road for one user exploring a goal. You never write layout or free text blocks. You only fill slots of these designed elements, as JSON.
Output exactly: {"elements":[...]} with 3 or 4 elements, in this order: one question element (thisthat OR slider), then one or two "item", then exactly one "fork" last.
Element shapes:
- {"type":"item","title":string<=7 words,"line":string<=10 words,"tags":[1-3 tags],"hours":number 0.25-5}
- {"type":"thisthat","prompt":string<=8 words,"a":{"label":<=4 words,"sub":<=5 words,"rule":RULE},"b":{same}}
- {"type":"slider","key":"hours","prompt":string<=8 words,"min":0.5,"max":5,"step":0.5,"v":number}
- {"type":"fork","prompt":string<=5 words,"opts":[3 options, in order deeper, sideways, unknown, each {"label":<=6 words,"rule":RULE}]}
RULE = {"kind":"prefer"|"avoid","key":TAG}
TAG must be one of: ${TAGS.join(", ")}.
Hard constraints: every item must satisfy every active rule of kind "avoid" (no avoided tag) and "max" (hours <= value). Prefer rules only change ordering: put items with preferred tags first.
The fork's third option must point somewhere the user has not been: a tag that no active rule mentions.
Never invent prices, statistics, or claims of fact in titles or lines. Never repeat an item title listed under SEEN.`;

const words = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;
function active(rules, policy) { const live = rules; return policy === "last3" ? live.slice(-3) : live; }
function addRule(rules, r, policy) {
  if (policy === "keyed") rules = rules.filter((x) => !(x.key === r.key && (x.kind === r.kind || (x.kind !== "max" && r.kind !== "max"))));
  return [...rules, r];
}
function validate(out, rules, seen) {
  const errs = [], E = out?.elements;
  if (!Array.isArray(E) || E.length < 3 || E.length > 4) return ["shape: need 3-4 elements"];
  const okRule = (r) => r && ["prefer", "avoid"].includes(r.kind) && TAGS.includes(r.key);
  E.forEach((e, i) => {
    if (i === 0 && !["thisthat", "slider"].includes(e.type)) errs.push(`order: first must be thisthat or slider, got ${e.type}`);
    if (i === E.length - 1 && e.type !== "fork") errs.push("order: last must be fork");
    if (e.type === "item") {
      if (words(e.title) > 7 || words(e.line) > 10) errs.push(`length: item "${e.title}"`);
      if (!Array.isArray(e.tags) || !e.tags.length || e.tags.some((t) => !TAGS.includes(t))) errs.push(`vocab: item tags ${JSON.stringify(e.tags)}`);
      if (!(e.hours >= 0.25 && e.hours <= 5)) errs.push(`range: hours ${e.hours}`);
      for (const r of rules) {
        if (r.kind === "avoid" && e.tags?.includes(r.key)) errs.push(`rule: "${e.title}" has avoided tag ${r.key}`);
        if (r.kind === "max" && e.hours > r.value) errs.push(`rule: "${e.title}" ${e.hours}h > max ${r.value}h`);
      }
      if (seen.includes(e.title)) errs.push(`repeat: "${e.title}"`);
      if (/\$|\d+%|\bpercent\b/i.test(`${e.title} ${e.line}`)) errs.push(`grounded: claim or price in "${e.title}"`);
    } else if (e.type === "thisthat") {
      if (words(e.prompt) > 8) errs.push("length: thisthat prompt");
      for (const o of [e.a, e.b]) { if (!o || words(o.label) > 4 || words(o.sub) > 5) errs.push("length: thisthat side"); if (!okRule(o?.rule)) errs.push(`vocab: thisthat rule ${JSON.stringify(o?.rule)}`); }
    } else if (e.type === "slider") {
      if (e.key !== "hours" || !(e.v >= 0.5 && e.v <= 5)) errs.push("range: slider");
    } else if (e.type === "fork") {
      if (!Array.isArray(e.opts) || e.opts.length !== 3) errs.push("shape: fork needs 3 opts");
      else {
        e.opts.forEach((o) => { if (words(o.label) > 6) errs.push(`length: fork label "${o.label}"`); if (!okRule(o.rule)) errs.push(`vocab: fork rule ${JSON.stringify(o.rule)}`); });
        const u = e.opts[2]?.rule?.key; if (rules.some((r) => r.key === u)) errs.push(`unknown: third option tag ${u} already in rules`);
      }
    } else errs.push(`kind: unknown element type ${e.type}`);
  });
  return errs;
}
let stopped = false;
async function call(contents) {
  const t0 = performance.now();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
    method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: SYSTEM }] }, contents, generationConfig: { temperature: 0.8, maxOutputTokens: 900, responseMimeType: "application/json" } }),
    signal: AbortSignal.timeout(20000),
  });
  const j = await res.json().catch(() => ({}));
  const ms = Math.round(performance.now() - t0);
  if ([401, 402, 403].includes(res.status)) { stopped = true; throw new Error(`auth stop ${res.status}`); }
  if (!res.ok) return { ms, err: `${res.status} ${j.error?.message ?? ""}`.slice(0, 160) };
  return { ms, text: (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("") };
}
function parse(t) { try { return JSON.parse(t); } catch { const m = t?.match(/\{[\s\S]*\}/); try { return m && JSON.parse(m[0]); } catch { return null; } } }
function pick(persona, out) {
  const E = out.elements, picks = [];
  const q = E[0];
  if (q.type === "thisthat") picks.push({ ...(persona === "avoider" ? q.b : q.a).rule, from: "thisthat" });
  if (q.type === "slider") picks.push({ kind: "max", key: "hours", value: persona === "avoider" ? 1 : q.v, from: "slider" });
  const it = E.find((e) => e.type === "item");
  if (it) picks.push(persona === "avoider" ? { kind: "avoid", key: it.tags[0], from: `nope on "${it.title}"` } : { kind: "prefer", key: it.tags[0], from: `save "${it.title}"` });
  const f = E[E.length - 1];
  picks.push({ ...f.opts[persona === "avoider" ? 2 : 0].rule, from: `fork "${f.opts[persona === "avoider" ? 2 : 0].label}"` });
  return picks;
}
async function session(goal, persona, policy) {
  let rules = []; const seen = [], steps = [];
  for (let s = 1; s <= STEPS && !stopped; s++) {
    const A = active(rules, policy);
    const user = `GOAL: ${goal}\nACTIVE RULES: ${JSON.stringify(A.map(({ kind, key, value }) => (value != null ? { kind, key, value } : { kind, key })))}\nSEEN: ${JSON.stringify(seen)}\nFill stretch ${s}.`;
    const contents = [{ role: "user", parts: [{ text: user }] }];
    const attempts = []; let out = null;
    for (let a = 1; a <= 3; a++) {
      const r = await call(contents);
      const o = r.text ? parse(r.text) : null;
      const errs = r.err ? [`http: ${r.err}`] : o ? validate(o, A, seen) : ["syntax: not JSON"];
      attempts.push({ ms: r.ms, errs });
      if (!errs.length) { out = o; break; }
      contents.push({ role: "model", parts: [{ text: r.text ?? "" }] }, { role: "user", parts: [{ text: `Rejected by the checker:\n- ${errs.join("\n- ")}\nReturn the corrected JSON only.` }] });
    }
    const step = { s, active: A, attempts, ok: !!out, elements: out?.elements ?? null };
    if (out) {
      out.elements.filter((e) => e.type === "item").forEach((e) => seen.push(e.title));
      step.picks = pick(persona, out);
      for (const p of step.picks) rules = addRule(rules, p, policy);
    }
    steps.push(step);
    if (!out) break;
  }
  return { goal, persona, policy, steps, finalRules: active(rules, policy) };
}
const jobs = [];
for (const g of GOALS) for (const p of PERSONAS) for (const pol of POLICIES) jobs.push([g, p, pol]);
const results = [];
const pool = Array.from({ length: 4 }, async () => { while (jobs.length && !stopped) { const j = jobs.shift(); results.push(await session(...j).catch((e) => ({ goal: j[0], persona: j[1], policy: j[2], error: String(e), steps: [] }))); } });
await Promise.all(pool);
fs.writeFileSync(OUT + "transcripts.json", JSON.stringify(results, null, 1));

const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : 0; };
const all = results.flatMap((r) => r.steps);
const ms = all.flatMap((s) => s.attempts.map((a) => a.ms));
const errCount = {}; all.forEach((s) => s.attempts.forEach((a) => a.errs.forEach((e) => { const k = e.split(":")[0]; errCount[k] = (errCount[k] ?? 0) + 1; })));
let md = `# Live spot-check: Gemini fills designed elements under pick-rules\n\nModel \`${MODEL}\`, JSON output, up to 3 tries per stretch with checker errors fed back. ${results.length} sessions (2 goals x 2 personas x 3 policies), ${STEPS} stretches each. Run ${new Date().toISOString()}.${stopped ? "\n\n**Stopped early on a 401, 402, or 403.**" : ""}\n\n`;
md += `| Policy | Stretches | Valid in 3 tries | Valid first try | Mean tries | Rule breaks caught | Distinct item titles / items | Rules at end (mean) |\n|---|---|---|---|---|---|---|---|\n`;
for (const pol of POLICIES) {
  const R = results.filter((r) => r.policy === pol), S = R.flatMap((r) => r.steps);
  const ok = S.filter((s) => s.ok).length, first = S.filter((s) => !s.attempts[0].errs.length).length;
  const tries = S.reduce((n, s) => n + s.attempts.length, 0) / (S.length || 1);
  const ruleBreaks = S.reduce((n, s) => n + s.attempts.reduce((m, a) => m + a.errs.filter((e) => e.startsWith("rule")).length, 0), 0);
  const titles = S.flatMap((s) => (s.elements ?? []).filter((e) => e.type === "item").map((e) => e.title.toLowerCase()));
  const endRules = R.reduce((n, r) => n + (r.finalRules?.length ?? 0), 0) / (R.length || 1);
  md += `| ${pol} | ${S.length} | ${ok}/${S.length} | ${first}/${S.length} | ${tries.toFixed(2)} | ${ruleBreaks} | ${new Set(titles).size}/${titles.length} | ${endRules.toFixed(1)} |\n`;
}
md += `\nLatency per call over ${ms.length} calls: p50 ${q(ms, 0.5)} ms, p95 ${q(ms, 0.95)} ms, max ${Math.max(...ms)} ms.\n\nRejections by checker rule: ${Object.entries(errCount).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}.\n\n`;
md += `Sessions that failed a stretch after 3 tries: ${results.filter((r) => r.steps.some((s) => !s.ok) || r.error).map((r) => `${r.goal} / ${r.persona} / ${r.policy}${r.error ? ` (${r.error})` : ""}`).join("; ") || "none"}.\n\n## Transcripts\n\n`;
for (const r of results) {
  md += `### ${r.goal} · ${r.persona} · ${r.policy}\n\n`;
  for (const s of r.steps) {
    md += `- Stretch ${s.s}, rules ${JSON.stringify(s.active.map((x) => `${x.kind} ${x.key}${x.value != null ? " " + x.value : ""}`))}, tries ${s.attempts.length} (${s.attempts.map((a) => a.ms + "ms").join(", ")})${s.attempts.some((a) => a.errs.length) ? `, rejected: ${s.attempts.flatMap((a) => a.errs).join("; ")}` : ""}\n`;
    for (const e of s.elements ?? []) {
      if (e.type === "item") md += `  - item: **${e.title}**: ${e.line} [${e.tags.join(", ")}, ${e.hours} h]\n`;
      if (e.type === "thisthat") md += `  - this or that: ${e.prompt} (${e.a.label} / ${e.b.label})\n`;
      if (e.type === "slider") md += `  - slider: ${e.prompt}\n`;
      if (e.type === "fork") md += `  - fork: ${e.opts.map((o) => `${o.label} [${o.rule.kind} ${o.rule.key}]`).join(" | ")}\n`;
    }
    if (s.picks) md += `  - user picked: ${s.picks.map((p) => p.from).join(", ")}\n`;
  }
  md += "\n";
}
fs.writeFileSync(OUT + "results.md", md);
console.log(md.split("## Transcripts")[0]);
