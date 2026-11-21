// The custom agent loop: one direct Gemini call per tile, checked, retried with the checker's errors, logged.
import { id, json, now } from "./db.mjs";

export const MODEL = "gemini-3.5-flash-lite";
export const TAGS = ["outdoors", "night", "hands-on", "visual", "history", "math", "social", "reading", "free", "animals", "far", "food", "cheap", "quick", "music", "online", "creative", "active"];
// Spelled-out numbers would dodge the digit check, so they are rejected. "one" stays allowed ("pick one").
const SPELLED = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|dozen|half)\b/i;
const CLAIMS = /\b(guarantee\w*|risk-free|definitely|proven|safest|certainly|will (?:make|earn|grow|double))\b|%/i;

let KEY = "";
const BASE = process.env.UNCHARTED_GEMINI_BASE ?? "https://generativelanguage.googleapis.com";
let stopped = null;
export const setKey = (k) => { KEY = k; };
export const stopState = () => stopped;

const words = (s) => String(s ?? "").trim().split(/\s+/).filter(Boolean).length;
const numbersIn = (s) => (String(s ?? "").match(/\d+(?:[.,]\d+)*/g) ?? []).map((n) => n.replace(/,/g, "").replace(/\.0+$/, ""));

// Grounding uses values only, so a digit in a key name such as "month_60_balance" never counts.
export const valuesText = (v) => (v == null ? "" : typeof v === "object" ? Object.values(v).map(valuesText).join(" ") : String(v));

export function checkMessage(msg, groundText) {
  const errs = [];
  if (typeof msg !== "string" || !msg.trim()) return ["message: missing"];
  if (words(msg) > 20) errs.push(`message: ${words(msg)} words, max 20`);
  const allowed = new Set(numbersIn(groundText));
  for (const n of numbersIn(msg)) if (!allowed.has(n)) errs.push(`message: number ${n} is not in the tile data or the user's words`);
  if (CLAIMS.test(msg)) errs.push(`message: claim word in "${msg}"`);
  const spelled = msg.match(SPELLED);
  if (spelled) errs.push(`message: write numbers as digits, not "${spelled[0]}"`);
  return errs;
}

const okRule = (r) => r && ["prefer", "avoid"].includes(r.kind) && TAGS.includes(r.key);
export function checkExploreTile(t, ctx) {
  const errs = [];
  if (!t || typeof t !== "object") return ["shape: tile missing"];
  if (ctx.sinceFork >= 3 && t.type !== "fork") errs.push(`order: ${ctx.sinceFork} tiles since the last fork, this tile must be a fork`);
  if (t.type === "item") {
    if (words(t.title) > 7 || words(t.line) > 12) errs.push(`length: item "${t.title}"`);
    if (!Array.isArray(t.tags) || !t.tags.length || t.tags.length > 3 || t.tags.some((x) => !TAGS.includes(x))) errs.push(`vocab: item tags ${JSON.stringify(t.tags)}`);
    if (!(t.hours >= 0.25 && t.hours <= 5)) errs.push(`range: hours ${t.hours}`);
    for (const r of ctx.rules) {
      if (r.kind === "avoid" && t.tags?.includes(r.key)) errs.push(`rule: "${t.title}" has avoided tag ${r.key}`);
      if (r.kind === "max" && r.key === "hours" && t.hours > r.value) errs.push(`rule: "${t.title}" ${t.hours}h is over the max ${r.value}h`);
    }
    if (ctx.seen.includes(t.title)) errs.push(`repeat: "${t.title}"`);
    if (/\$|\d+%|\bpercent\b/i.test(`${t.title} ${t.line}`)) errs.push(`grounded: price or claim in "${t.title}"`);
  } else if (t.type === "thisthat") {
    if (words(t.prompt) > 8) errs.push("length: thisthat prompt");
    if (ctx.asked.includes(t.prompt)) errs.push(`repeat: question "${t.prompt}"`);
    for (const o of [t.a, t.b]) { if (!o || words(o.label) > 4 || words(o.sub) > 5) errs.push("length: thisthat side"); if (!okRule(o?.rule)) errs.push(`vocab: thisthat rule ${JSON.stringify(o?.rule)}`); }
  } else if (t.type === "slider") {
    if (ctx.rules.some((r) => r.kind === "max" && r.key === "hours")) errs.push("order: a max hours rule is active, do not ask a slider");
    if (t.key !== "hours" || !(t.v >= 0.5 && t.v <= 5)) errs.push("range: slider");
    if (words(t.prompt) > 8) errs.push("length: slider prompt");
    Object.assign(t, { key: "hours", min: 0.5, max: 5, step: 0.5, unit: "h" });
  } else if (t.type === "fork") {
    if (words(t.prompt) > 6) errs.push("length: fork prompt");
    if (!Array.isArray(t.opts) || t.opts.length !== 3) errs.push("shape: fork needs 3 options");
    else {
      t.opts.forEach((o) => { if (words(o.label) > 6 || words(o.sub) > 5) errs.push(`length: fork option "${o.label}"`); if (!okRule(o.rule)) errs.push(`vocab: fork rule ${JSON.stringify(o.rule)}`); });
      const u = t.opts[2]?.rule?.key; if (ctx.rules.some((r) => r.key === u)) errs.push(`unknown: the third option tag ${u} is already in the rules`);
    }
  } else errs.push(`kind: unknown tile type ${t.type}`);
  return errs;
}

const parseJson = (t) => { try { return JSON.parse(t); } catch { const m = t?.match(/\{[\s\S]*\}/); try { return m && JSON.parse(m[0]); } catch { return null; } } };

async function call(db, nodeId, attempt, system, contents) {
  const t0 = performance.now();
  const prompt = { system, contents };
  if (stopped) return { err: `model calls stopped (${stopped})`, ms: 0 };
  let res, j = {};
  try {
    res = await fetch(`${BASE}/v1beta/models/${MODEL}:generateContent`, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 0.8, maxOutputTokens: 700, responseMimeType: "application/json" } }),
      signal: AbortSignal.timeout(15000),
    });
    j = await res.json().catch(() => ({}));
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    db.prepare("INSERT INTO generations (id,node_id,attempt,model,prompt_json,raw_text,errors_json,status_code,ms,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(id(), nodeId, attempt, MODEL, json(prompt), null, json([`network: ${e.message}`]), null, ms, now());
    return { err: `network: ${e.message}`, ms };
  }
  const ms = Math.round(performance.now() - t0);
  const text = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  // Google answers a bad key with 400 API_KEY_INVALID, so that counts as an auth failure too.
  const badKey = res.status === 400 && (j.error?.details ?? []).some((d) => d.reason === "API_KEY_INVALID");
  if ([401, 402, 403].includes(res.status) || badKey) stopped = badKey ? "HTTP 400 API_KEY_INVALID" : `HTTP ${res.status}`;
  const err = res.ok ? null : `http ${res.status}: ${(j.error?.message ?? "").slice(0, 140)}`;
  return { text, err, ms, status: res.status, log: (errors) => db.prepare("INSERT INTO generations (id,node_id,attempt,model,prompt_json,raw_text,errors_json,status_code,ms,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(id(), nodeId, attempt, MODEL, json(prompt), text || null, json(errors), res.status, ms, now()) };
}

// Up to 3 tries. The checker's errors go back to the model as the next user turn.
async function loop(db, nodeId, system, user, check) {
  const contents = [{ role: "user", parts: [{ text: user }] }];
  let last = ["no attempt ran"];
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await call(db, nodeId, attempt, system, contents);
    if (r.err && !r.log) return { ok: false, errors: [r.err], stopped: !!stopped };
    const out = r.err ? null : parseJson(r.text);
    const errs = r.err ? [r.err] : out ? check(out) : ["syntax: not JSON"];
    r.log(errs);
    last = errs;
    if (!errs.length) return { ok: true, out, attempts: attempt };
    if (stopped) return { ok: false, errors: errs, stopped: true };
    contents.push({ role: "model", parts: [{ text: r.text || "" }] }, { role: "user", parts: [{ text: `Rejected by the checker:\n- ${errs.join("\n- ")}\nReturn the corrected JSON only.` }] });
  }
  return { ok: false, errors: last };
}

const EXPLORE = `You place the next stop on a scrolling road for one user who explores a goal. Each stop is one designed widget and one short message. You never write layout or long text.
Return JSON only: {"tile": TILE, "message": string}.
TILE is exactly one of:
- {"type":"item","title":string<=7 words,"line":string<=12 words,"tags":[1-3 TAG],"hours":number 0.25-5}
- {"type":"thisthat","prompt":string<=8 words,"a":{"label":<=4 words,"sub":<=5 words,"rule":RULE},"b":{same}}
- {"type":"slider","key":"hours","prompt":string<=8 words,"min":0.5,"max":5,"step":0.5,"v":number}
- {"type":"fork","prompt":string<=6 words,"opts":[3 options in order deeper, sideways, unknown; each {"label":<=6 words,"sub":<=5 words,"rule":RULE}]}
RULE = {"kind":"prefer"|"avoid","key":TAG}. TAG is one of: ${TAGS.join(", ")}.
The message is one sentence of at most 20 words. It tells the user why this stop follows from their last pick. Use a number only if it is in the tile or in the user's goal, and always write it as digits (2, not "two"). Make no promises and no claims of fact.
Rules:
- If TILES SINCE LAST FORK is 3 or more, the tile must be a fork.
- Mix the widgets: do not use the same type twice in a row.
- An item must not carry an avoided tag and must respect any max hours rule. Prefer rules guide what you choose.
- Do not ask a slider when a max hours rule is active. Do not repeat a question in ASKED or a title in SEEN.
- The fork's third option points somewhere new: a tag that no active rule mentions.`;

export async function exploreTile(db, nodeId, ctx) {
  const user = `GOAL: ${ctx.goal}
ACTIVE RULES: ${JSON.stringify(ctx.rules)}
ROAD SO FAR (oldest first): ${ctx.path.length ? ctx.path.map((p) => `\n- ${p}`).join("") : "nothing yet"}
${ctx.assumed ? `THE USER JUST PICKED: ${ctx.assumed}\n` : ""}TILES SINCE LAST FORK: ${ctx.sinceFork}
SEEN: ${JSON.stringify(ctx.seen)}
ASKED: ${JSON.stringify(ctx.asked)}
Place the next stop.`;
  const r = await loop(db, nodeId, EXPLORE, user, (o) => [...checkExploreTile(o.tile, ctx), ...checkMessage(o.message, `${valuesText(o.tile)} ${ctx.goal}`)]);
  return r.ok ? { element: r.out.tile, message: r.out.message.trim(), source: "agent" } : { failed: r.errors, stopped: r.stopped };
}

const FINANCE = `You guide one user through simulated five-year money futures for a worry or a dare. The simulator already computed every number. You choose the next stop from CANDIDATES and write one message for it.
Return JSON only: {"next": one candidate id, "message": string}.
The message is one calm sentence of at most 20 words. No alarm, no shame, no advice beyond the candidate. Use a number only if it appears in that candidate's DATA, and always write it as digits (60, not "sixty"; 5-year is not allowed, say "these futures").
Show a few futures before the lever. Show the tally after the lever. Use the assumptions early so the user knows how this was run.`;

export async function financeTile(db, nodeId, ctx) {
  const user = `WORRY OR DARE: ${ctx.goal}
ACTIVE RULES: ${JSON.stringify(ctx.rules)}
ROAD SO FAR (oldest first): ${ctx.path.map((p) => `\n- ${p}`).join("")}
${ctx.assumed ? `THE USER JUST PICKED: ${ctx.assumed}\n` : ""}CANDIDATES: ${JSON.stringify(ctx.candidates.map((c) => ({ id: c.id, DATA: c.data })))}
Choose the next stop.`;
  const r = await loop(db, nodeId, FINANCE, user, (o) => {
    const c = ctx.candidates.find((x) => x.id === o.next);
    if (!c) return [`choice: "${o.next}" is not a candidate id (${ctx.candidates.map((x) => x.id).join(", ")})`];
    return checkMessage(o.message, `${valuesText(c.element)} ${ctx.goal}`);
  });
  if (!r.ok) return { failed: r.errors, stopped: r.stopped };
  const c = ctx.candidates.find((x) => x.id === r.out.next);
  return { element: c.element, message: r.out.message.trim(), source: "agent" };
}

// Fixed tiles for when the model is stopped. They follow the same order rules as the agent.
export function exploreFallback(ctx) {
  const free = TAGS.filter((t) => !ctx.rules.some((r) => r.key === t));
  const msg = "The agent is offline, so this stop is a fixed one.";
  if (ctx.sinceFork >= 2) return { element: { type: "fork", prompt: "Where next?", opts: free.slice(0, 3).map((t, i) => ({ label: ["Go deeper", "Try something near", "Somewhere new"][i], sub: `more ${t}`, rule: { kind: "prefer", key: t } })) }, message: msg, source: "fallback" };
  return { element: { type: "thisthat", prompt: "Inside or outside?", a: { label: "Inside", sub: "at home", rule: { kind: "prefer", key: "hands-on" } }, b: { label: "Outside", sub: "out there", rule: { kind: "prefer", key: "outdoors" } } }, message: msg, source: "fallback" };
}
