// The custom agent loop: one direct Gemini call per tile, checked, retried with the checker's errors, logged.
import { id, json, now } from "./db.mjs";
import { readProductPage } from "./pages.mjs";

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

// Money road messages: "$12,350", never a bare 12350, and no "future 4910" ids.
export function checkMoneyWording(msg) {
  const errs = [];
  const s = String(msg ?? "");
  // Counts of futures ("5,000 futures", "4,345 of 5,000") are not money; everything else 4+ digits is.
  const noCounts = s.replace(/\$-?[\d,]+/g, "").replace(/\b[\d,]+\s+(?:of\s+[\d,]+\s+)?(?:simulated\s+)?futures?\b/gi, "").replace(/\b[\d,]+\s+of\s+[\d,]+\b/gi, "");
  if (/(^|[^$\d,.])-?\d{4,}\b/.test(noCounts.replace(/(\d),(\d{3})/g, "$1$2"))) errs.push(`message: write money as $12,350, not a bare number, in "${s}"`);
  if (/\$\s?5,?000\b/.test(s) && /tally|futures/i.test(s)) errs.push(`message: 5,000 is the number of futures, not dollars, in "${s}"`);
  if (/\bfuture\s*#?\s*\d/i.test(s)) errs.push(`message: do not mention a future's id in "${s}"`);
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

async function call(db, nodeId, attempt, system, contents, opts = {}) {
  const model = opts.model ?? MODEL;
  const t0 = performance.now();
  const prompt = { system, contents };
  if (stopped) return { err: `model calls stopped (${stopped})`, ms: 0 };
  let res, j = {};
  try {
    res = await fetch(`${BASE}/v1beta/models/${model}:generateContent`, {
      method: "POST", headers: { "content-type": "application/json", "x-goog-api-key": KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] }, contents,
        ...(opts.tools ? { tools: opts.tools } : {}),
        // Search-grounded calls return text (JSON is asked for in the prompt and parsed leniently).
        generationConfig: { temperature: opts.temperature ?? 0.8, maxOutputTokens: opts.maxTokens ?? 700, ...(opts.tools ? {} : { responseMimeType: "application/json" }) },
      }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? 15000),
    });
    j = await res.json().catch(() => ({}));
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    db.prepare("INSERT INTO generations (id,node_id,attempt,model,prompt_json,raw_text,errors_json,status_code,ms,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(id(), nodeId, attempt, model, json(prompt), null, json([`network: ${e.message}`]), null, ms, now());
    return { err: `network: ${e.message}`, ms };
  }
  const ms = Math.round(performance.now() - t0);
  const text = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("");
  // Google answers a bad key with 400 API_KEY_INVALID, so that counts as an auth failure too.
  const badKey = res.status === 400 && (j.error?.details ?? []).some((d) => d.reason === "API_KEY_INVALID");
  if ([401, 402, 403].includes(res.status) || badKey) stopped = badKey ? "HTTP 400 API_KEY_INVALID" : `HTTP ${res.status}`;
  const err = res.ok ? null : `http ${res.status}: ${(j.error?.message ?? "").slice(0, 140)}`;
  return { text, err, ms, status: res.status, grounding: j.candidates?.[0]?.groundingMetadata ?? null, log: (errors) => db.prepare("INSERT INTO generations (id,node_id,attempt,model,prompt_json,raw_text,errors_json,status_code,ms,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)").run(id(), nodeId, attempt, model, json(prompt), text || null, json(errors), res.status, ms, now()) };
}

// Up to 3 tries. The checker's errors go back to the model as the next user turn.
async function loop(db, nodeId, system, user, check, opts = {}) {
  const contents = [{ role: "user", parts: [{ text: user }] }];
  let last = ["no attempt ran"];
  for (let attempt = 1; attempt <= 3; attempt++) {
    const r = await call(db, nodeId, attempt, system, contents, opts);
    if (r.err && !r.log) return { ok: false, errors: [r.err], stopped: !!stopped };
    const out = r.err ? null : parseJson(r.text);
    const errs = r.err ? [r.err] : out ? check(out) : ["syntax: not JSON"];
    r.log(errs);
    last = errs;
    if (!errs.length) return { ok: true, out, attempts: attempt, grounding: r.grounding };
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
Write money with a dollar sign and commas ($12,350, never 12350). Never mention a future's id or number ("future 4910"); say "this future".
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
    return [...checkMessage(o.message, `${valuesText(c.element)} ${ctx.goal}`), ...checkMoneyWording(o.message)];
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

// ---------- concept road: teach, don't suggest ----------
// A slightly stronger model writes lessons; override with UNCHARTED_CONCEPT_MODEL.
export const CONCEPT_MODEL = process.env.UNCHARTED_CONCEPT_MODEL ?? "gemini-3.5-flash";

const CONCEPT = `You are a patient teacher building a short, visual lesson as a scrolling road, one stop at a time, for one person who wants to understand a topic.
Every stop must TEACH real content about the topic: how it works, concrete examples, real numbers. Never suggest activities, courses, books, videos, websites or "explore X". Never write "learn about"; explain it instead.
Return JSON only: {"tile": TILE, "message": string}.
TILE is exactly one of:
- {"type":"story","title":string<=8 words,"steps":[3-5 steps, each {"caption":1-2 plain sentences <=30 words,"viz":VIZ}]}
  Walks through a process or idea step by step. Give most steps a viz.
- {"type":"dial","title":string<=9 words,"prompt":string<=14 words saying what to drag and what to watch,"knob":{"label":string<=3 words,"min":number,"max":number,"step":number,"unit":string<=6 chars or ""},"frames":[3-5 frames sorted by at, each {"at":number from min to max,"caption":<=24 words on what happens at that setting,"viz":VIZ}]}
  A cause-and-effect toy: one quantity the person controls and what it changes. Use it whenever the topic has a real variable (temperature, speed, size, dose, rate, angle). All frames use the same viz kind; for bars, the same labels in every frame.
  Dial visuals must show REAL quantities: probabilities or shares, or a measured result such as {"kind":"number","value":"9 km","label":"event horizon radius"}. Never invent scores or ratings ("Reasoning 85", "Spread risk 40"). If no real number exists, use chips or flow instead of bars.
- {"type":"deck","title":string<=4 words,"cards":[4-6 strings, each one complete sentence <=18 words stating a key fact from this road]}
  Flashcards that recap what the road has taught so far.
- {"type":"fork","prompt":string<=8 words,"opts":[2 or 3 options, each {"label":string<=5 words,"sub":string<=8 words,"rule":{"kind":"set","key":"focus","value":subtopic <=4 words}}]}
  Lets the person choose what to learn next: first option goes deeper on what they just saw, second moves to the next big part of the topic, an optional third is a surprising related angle.
VIZ is one of:
- {"kind":"chips","items":[2-8 short strings],"highlight":[indexes of the important ones]}  parts, tokens, stages
- {"kind":"bars","items":[2-5 {"label":string<=2 words,"value":number 0-100}],"unit":"%" or ""}  comparisons, probabilities, shares
- {"kind":"flow","items":[2-5 short strings]}  a sequence A -> B -> C
- {"kind":"number","value":short string such as "175 billion" or "0.3 s","label":string<=8 words}  one striking figure
The message is one sentence of at most 20 words saying why this stop comes next. Use a number in it only if it appears in the tile.
Rules:
- Stop 1 is a story that gives the big picture of the whole topic.
- After a fork, teach the person's FOCUS.
- Never use the same tile type twice in a row. Prefer story and dial. Use a deck only after 3 or more teaching stops, as a recap.
- If TILES SINCE LAST FORK is 3 or more, the tile must be a fork. Never place a fork as stop 1 or right after a fork.
- Be accurate: use well-established facts and widely cited, rounded numbers; leave a number out if unsure. Never present movie or fiction examples as fact. Use simple words and explain any term you introduce.
- Never reuse a title in COVERED.`;

const VIZ_KINDS = ["chips", "bars", "flow", "number"];
function checkViz(v, where) {
  if (v == null) return [];
  if (typeof v !== "object" || !VIZ_KINDS.includes(v.kind)) return [`viz: ${where} has unknown kind ${JSON.stringify(v?.kind)}`];
  if (v.kind === "chips" || v.kind === "flow") {
    if (!Array.isArray(v.items) || v.items.length < 2 || v.items.length > 8 || v.items.some((x) => typeof x !== "string" || words(x) > 5)) return [`viz: ${where} ${v.kind} needs 2-8 short strings`];
  }
  if (v.kind === "bars") {
    if (!Array.isArray(v.items) || v.items.length < 2 || v.items.length > 5) return [`viz: ${where} bars needs 2-5 items`];
    if (v.items.some((b) => typeof b?.label !== "string" || typeof b?.value !== "number" || b.value < 0 || b.value > 100)) return [`viz: ${where} bars need {label, value 0-100}`];
  }
  if (v.kind === "number" && (typeof v.value !== "string" || typeof v.label !== "string" || words(v.label) > 10)) return [`viz: ${where} number needs value and label`];
  return [];
}

export function checkConceptTile(t, ctx) {
  const errs = [];
  if (!t || typeof t !== "object") return ["shape: tile missing"];
  const first = ctx.path.length === 0;
  if (first && t.type !== "story") errs.push("order: stop 1 must be a story with the big picture");
  if (ctx.sinceFork >= 3 && t.type !== "fork") errs.push(`order: ${ctx.sinceFork} tiles since the last fork, this tile must be a fork`);
  if (t.type === ctx.lastType) errs.push(`order: the last stop was also a ${t.type}`);
  if (t.title && ctx.covered.includes(t.title)) errs.push(`repeat: title "${t.title}"`);
  if (t.type === "story") {
    if (words(t.title) > 10) errs.push("length: story title");
    if (!Array.isArray(t.steps) || t.steps.length < 3 || t.steps.length > 5) errs.push("shape: story needs 3-5 steps");
    else t.steps.forEach((st, i) => { if (typeof st?.caption !== "string" || words(st.caption) > 36) errs.push(`length: story step ${i + 1} caption`); errs.push(...checkViz(st.viz, `story step ${i + 1}`)); });
  } else if (t.type === "dial") {
    const k = t.knob;
    if (words(t.title) > 11 || words(t.prompt) > 18) errs.push("length: dial title or prompt");
    if (!k || typeof k.min !== "number" || typeof k.max !== "number" || !(k.max > k.min) || !(k.step > 0)) errs.push("shape: dial knob needs numbers min < max and step > 0");
    if (!Array.isArray(t.frames) || t.frames.length < 3 || t.frames.length > 5) errs.push("shape: dial needs 3-5 frames");
    else {
      t.frames.sort((a, b) => a.at - b.at);
      t.frames.forEach((f, i) => {
        if (typeof f?.at !== "number" || (k && (f.at < k.min || f.at > k.max))) errs.push(`range: dial frame ${i + 1} at ${f?.at}`);
        if (typeof f?.caption !== "string" || words(f.caption) > 30) errs.push(`length: dial frame ${i + 1} caption`);
        errs.push(...checkViz(f?.viz, `dial frame ${i + 1}`));
      });
      const kinds = new Set(t.frames.map((f) => f?.viz?.kind ?? "none"));
      if (kinds.size > 1) errs.push("shape: dial frames must all use the same viz kind");
      if (kinds.has("bars")) {
        const labels = t.frames.map((f) => (f.viz?.items ?? []).map((b) => b.label).join("|"));
        if (new Set(labels).size > 1) errs.push("shape: dial bars need the same labels in every frame");
        // Bars that are equal within every frame (Mass 40, Radius 40) say nothing; usually a sign of invented values.
        if (t.frames.every((f) => new Set((f.viz?.items ?? []).map((b) => b.value)).size <= 1)) errs.push("honest: dial bars repeat the same value for every label; show a real measured result (number viz) instead");
      }
    }
    if (k) k.unit = typeof k.unit === "string" ? k.unit.slice(0, 8) : "";
  } else if (t.type === "deck") {
    if (ctx.teachingStops < 3) errs.push("order: a deck recaps; teach at least 3 stops first");
    if (!Array.isArray(t.cards) || t.cards.length < 4 || t.cards.length > 6 || t.cards.some((c) => typeof c !== "string" || words(c) > 22)) errs.push("shape: deck needs 4-6 one-sentence cards");
  } else if (t.type === "fork") {
    if (first || ctx.lastType === "fork") errs.push("order: no fork here");
    if (words(t.prompt) > 10) errs.push("length: fork prompt");
    if (!Array.isArray(t.opts) || t.opts.length < 2 || t.opts.length > 3) errs.push("shape: fork needs 2 or 3 options");
    else t.opts.forEach((o, i) => {
      if (!o || words(o.label) > 6 || words(o.sub) > 10) errs.push(`length: fork option ${i + 1}`);
      if (!(o?.rule?.kind === "set" && o.rule.key === "focus" && typeof o.rule.value === "string" && o.rule.value.trim())) errs.push(`vocab: fork option ${i + 1} rule must be {"kind":"set","key":"focus","value":subtopic}`);
    });
  } else errs.push(`kind: unknown tile type ${t.type}`);
  return errs;
}

export async function conceptTile(db, nodeId, ctx) {
  const user = `TOPIC: ${ctx.goal}
FOCUS: ${ctx.focus ?? "the big picture"}
ROAD SO FAR (oldest first): ${ctx.path.length ? ctx.path.map((p) => `\n- ${p}`).join("") : "nothing yet"}
${ctx.assumed ? `THE PERSON JUST PICKED: ${ctx.assumed}\n` : ""}TILES SINCE LAST FORK: ${ctx.sinceFork}
COVERED: ${JSON.stringify(ctx.covered)}
Place the next stop.`;
  const check = (o) => [...checkConceptTile(o.tile, ctx), ...checkMessage(o.message, `${valuesText(o.tile)} ${ctx.goal}`)];
  // The model thinks before answering and that counts toward the output limit, so leave plenty of room.
  let r = await loop(db, nodeId, CONCEPT, user, check, { model: CONCEPT_MODEL, maxTokens: 8192, temperature: 0.6, timeoutMs: 30000 });
  if (!r.ok && !r.stopped) {
    // One simpler ask before giving up: the shape this stop most needs, kept small.
    const want = ctx.sinceFork >= 3 && ctx.lastType !== "fork" ? "a fork with 2 options" : ctx.lastType === "story" ? "a dial with 3 frames" : "a story with 3 short steps";
    r = await loop(db, nodeId, CONCEPT, `${user}\nKeep it small: return ${want}, short captions, JSON only.`, check, { model: CONCEPT_MODEL, maxTokens: 8192, temperature: 0.4, timeoutMs: 30000 });
  }
  return r.ok ? { element: r.out.tile, message: r.out.message.trim(), source: "agent" } : { failed: r.errors, stopped: r.stopped };
}

// ---------- find / make road: real options, then a savings plan ----------

const SHOP_FORK = `You help one person find or make something. Ask ONE question that most changes what they should buy or how they should make it.
Return JSON only: {"tile":{"type":"fork","prompt":string<=8 words,"opts":[2 or 3 options, each {"label":string<=5 words,"sub":string<=8 words,"rule":{"kind":"set","key":"need","value":short phrase <=6 words that a shopper could search with}}]},"message":string}.
The message is one sentence of at most 16 words saying why this question matters for their goal.
Rules: if budget is not decided yet, ask about budget first and give price bands in Canadian dollars. Otherwise ask about how they will use it, their level, or size. Never repeat a question in ASKED. Options must be concrete and mutually exclusive.`;

export async function shopFork(db, nodeId, ctx) {
  const user = `GOAL: ${ctx.goal}\nMODE: ${ctx.mode}\nPICKS SO FAR: ${JSON.stringify(ctx.needs)}\nASKED: ${JSON.stringify(ctx.asked)}\nAsk the next question.`;
  const check = (o) => {
    const t = o.tile, errs = [];
    if (t?.type !== "fork" || !Array.isArray(t.opts) || t.opts.length < 2 || t.opts.length > 3) return ["shape: a fork with 2 or 3 options"];
    if (words(t.prompt) > 10) errs.push("length: prompt");
    if (ctx.asked.includes(t.prompt)) errs.push(`repeat: "${t.prompt}"`);
    t.opts.forEach((x, i) => {
      if (typeof x?.label !== "string" || words(x.label) > 6 || words(x?.sub) > 10) errs.push(`length: option ${i + 1}`);
      // The server owns the rule shape: keep the model's search phrase if it gave one, else use the label.
      if (x && typeof x.label === "string") x.rule = { kind: "set", key: "need", value: String(typeof x.rule?.value === "string" || typeof x.rule?.value === "number" ? x.rule.value : x.label).slice(0, 60) };
    });
    if (typeof o.message !== "string" || words(o.message) > 20) errs.push("message: one sentence, at most 20 words");
    return errs;
  };
  const r = await loop(db, nodeId, SHOP_FORK, user, check, { temperature: 0.5 });
  return r.ok ? { element: r.out.tile, message: r.out.message.trim(), source: "agent" } : { failed: r.errors, stopped: r.stopped };
}

const FIND = `You are a careful shopping researcher for one person in Canada. Use Google Search to find real, currently sold products.
Find exactly 3 products that best fit their goal and picks, ideally from different brands, from Canadian stores where possible.
Return JSON only (no markdown): {"items":[3 x {"name":brand and model,"price_cad":number,"store":store name,"url":the product page URL you found,"why":<=14 words on why it fits their picks,"specs":[2-3 short facts that matter, each <=6 words]}],"note":<=18 words of honest buying advice}.
Prices are the current listed price in Canadian dollars as a number. Only list products you actually found in search results.
For each url, prefer the manufacturer's own product page or a specialty retailer's page. Avoid Amazon, eBay and other marketplaces: their pages cannot be read, so the person would see no photo.`;

const MAKE = `You are a practical maker-coach for one beginner in Canada. Use Google Search to find real things to buy.
Plan how they can make their goal with their picks.
Return JSON only (no markdown): {"title":<=7 words,"steps":[4-6 steps, each <=16 words, in order],"items":[3-6 x {"name":specific product,"price_cad":number,"store":store name,"url":the product page URL you found,"why":<=10 words on what it is for}],"note":<=18 words of honest advice}.
Only list products you actually found in search results; prices are current listed prices in Canadian dollars.
If they need more than one of something (two hosts need two microphones), list it once with the quantity in the name ("2 x …") and the price for all of them.
For each url, prefer the manufacturer's own product page or a specialty retailer's page. Avoid Amazon, eBay and other marketplaces: their pages cannot be read, so the person would see no photo.`;

// Grounding returns the pages it read; match an item to one of them when the model's URL fails.
const chunkPages = (g) => (g?.groundingChunks ?? []).map((c) => c.web).filter(Boolean);
async function attachPage(item, pages) {
  const tries = [item.url, ...pages.filter((p) => item.store && (p.title ?? "").toLowerCase().includes(String(item.store).toLowerCase().split(" ")[0])).map((p) => p.uri)].filter(Boolean);
  for (const u of tries.slice(0, 3)) {
    const pg = await readProductPage(u);
    if (!pg?.ok || !pg.image) console.log(`${new Date().toISOString().slice(11, 19)} photo: ${pg?.ok ? "page read, no image tag" : `could not read (${pg?.status ?? pg?.error ?? "?"})`} ${String(u).slice(0, 90)}`);
    if (pg?.ok) return { ...item, url: pg.url, store: item.store || pg.store, image: pg.image ?? undefined, price_cad: item.price_cad || (pg.currency === "CAD" ? pg.price : null) || item.price_cad };
  }
  return { ...item, url: /^https?:/.test(item.url ?? "") ? item.url : undefined };
}

// The top of the budget the person picked ("under $800", "$800 to $1,500"), if any.
export function budgetCap(needs) {
  for (const n of needs ?? []) {
    const t = String(n).toLowerCase().replace(/,/g, "");
    const nums = (t.match(/\d+(?:\.\d+)?/g) ?? []).map(Number).filter((x) => x >= 20);
    if (!nums.length) continue;
    if (/under|below|less than|up to|max|or less/.test(t) || /\d\s*(?:to|-|–)\s*\$?\d/.test(t)) return Math.max(...nums);
  }
  return null;
}

export async function research(db, nodeId, ctx) {
  const make = ctx.mode === "make";
  const cap = budgetCap(ctx.needs);
  const user = `GOAL: ${ctx.goal}\nTHEIR PICKS: ${JSON.stringify(ctx.needs)}\n${cap ? `BUDGET: ${make ? "the total" : "each product"} must be at most $${cap} CAD.\n` : ""}${make ? "Plan it and list what to buy." : "Find the 3 best products for them."}`;
  const check = (o) => {
    const errs = [];
    const items = o?.items;
    if (!Array.isArray(items) || items.length < (make ? 3 : 2) || items.length > 6) return [`shape: ${make ? "3-6 items" : "3 items"} needed`];
    items.forEach((x, i) => { if (typeof x?.name !== "string" || !(Number(x.price_cad) > 0)) errs.push(`item ${i + 1}: needs name and a positive price_cad number`); });
    if (make && (!Array.isArray(o.steps) || o.steps.length < 3)) errs.push("shape: 4-6 steps needed");
    if (cap && !errs.length) {
      if (make) { const total = items.reduce((a, b) => a + Number(b.price_cad), 0); if (total > cap * 1.15) errs.push(`budget: the total is $${Math.round(total)}, over their $${cap} budget; choose cheaper items`); }
      else items.forEach((x, i) => { if (Number(x.price_cad) > cap * 1.1) errs.push(`budget: item ${i + 1} costs $${x.price_cad}, over their $${cap} budget`); });
    }
    return errs;
  };
  const r = await loop(db, nodeId, make ? MAKE : FIND, user, check, { model: CONCEPT_MODEL, tools: [{ google_search: {} }], maxTokens: 8192, temperature: 0.3, timeoutMs: 45000 });
  if (!r.ok) return { failed: r.errors, stopped: r.stopped };
  const pages = chunkPages(r.grounding);
  const items = await Promise.all(r.out.items.slice(0, make ? 6 : 3).map((x) => attachPage({
    name: String(x.name).slice(0, 80), price_cad: Math.round(Number(x.price_cad) * 100) / 100, store: x.store ? String(x.store).slice(0, 40) : undefined,
    url: x.url, why: String(x.why ?? "").slice(0, 120), specs: Array.isArray(x.specs) ? x.specs.slice(0, 3).map((t) => String(t).slice(0, 40)) : [],
  }, pages)));
  const sources = pages.slice(0, 6).map((p) => ({ title: p.title, uri: p.uri }));
  if (make) {
    const total = Math.round(items.reduce((a, b) => a + (b.price_cad || 0), 0));
    return { element: { type: "kit", title: String(r.out.title ?? ctx.goal).slice(0, 60), steps: r.out.steps.slice(0, 6).map((t) => String(t).slice(0, 140)), items, total, note: r.out.note, sources }, message: "Here is a plan and what it costs, from real listings.", source: "agent" };
  }
  return { element: { type: "compare", title: "Picks that fit your answers", items, note: r.out.note, sources }, message: "Real listings that fit your picks. Choose one to plan for.", source: "agent" };
}

// ---------- money road: decisions first, the result at the end ----------
// The agent turns each money lever into one concrete decision for this person and worry.
// Every option maps to a number on a fixed lever, so the simulator can run the result; the model never invents outcomes.
const LEVERS = {
  weekly: { key: "lever_weekly", ask: "how much to set aside each week", unit: "$ per week", hint: "0 plus 2-3 amounts up to the weekly cap" },
  spend: { key: "lever_spend", ask: "one monthly cost to trim", unit: "$ per month cut", hint: "0 (keep as is) plus 2 concrete cuts this person could make, each 3-15% of essentials" },
  income: { key: "lever_income", ask: "a way to add income or a one-time boost", unit: "$ per month added", hint: "0 (no) plus 2 realistic options, each at most 15% of income a month" },
};
const MONEY_DECISION = `You help one young person make money decisions about a worry, while they scroll. Ask ONE concrete decision on the given LEVER.
Return JSON only: {"tile":{"type":"fork","prompt":string<=9 words,"opts":[3 options, each {"label":string<=3 words,"sub":string<=4 words,"amount":number}]},"message":string}.
amount is the option's number on the lever (see UNIT). The first option must be the "keep as is" choice with amount 0.
Options must be specific to this person's life (their job, city, income) and realistic. No investment products, no advice beyond the decision.
The message is one calm sentence of at most 18 words saying why this decision matters for their worry. Write money as $150, never bare numbers.`;

export async function moneyDecision(db, nodeId, ctx) {
  const L = LEVERS[ctx.lever];
  const p = ctx.persona;
  const cap = ctx.lever === "weekly" ? ctx.weeklyCap : ctx.lever === "spend" ? Math.round(p.essentials * 0.15) : Math.round(p.income * 0.15);
  const user = `WORRY: ${ctx.worry}\nPERSON: ${p.name}; net income $${p.income}/month; essentials $${p.essentials}/month; savings $${p.savings}; saves $${p.saving}/month now.\nLEVER: ${L.ask}\nUNIT: ${L.unit}\nAMOUNTS: ${L.hint}; never above ${cap}.\nDECISIONS SO FAR: ${JSON.stringify(ctx.so_far)}\nAsk the decision.`;
  const check = (o) => {
    const t = o.tile, errs = [];
    if (t?.type !== "fork" || !Array.isArray(t.opts) || t.opts.length < 2 || t.opts.length > 3) return ["shape: a fork with 3 options"];
    if (words(t.prompt) > 11) errs.push("length: prompt");
    t.opts.forEach((x, i) => {
      if (typeof x?.label !== "string" || words(x.label) > 4 || words(x?.sub) > 6) errs.push(`length: option ${i + 1}`);
      const a = Number(x?.amount);
      if (!(a >= 0 && a <= cap)) errs.push(`range: option ${i + 1} amount ${x?.amount} must be 0 to ${cap}`);
    });
    if (Number(t.opts[0]?.amount) !== 0) errs.push("order: the first option is keep-as-is with amount 0");
    if (!errs.length) t.opts.forEach((x) => { x.rule = { kind: "set", key: L.key, value: Math.round(Number(x.amount)) }; delete x.amount; });
    if (typeof o.message !== "string" || words(o.message) > 20) errs.push("message: one sentence, at most 20 words");
    errs.push(...checkMoneyWording(o.message));
    return errs;
  };
  const r = await loop(db, nodeId, MONEY_DECISION, user, check, { temperature: 0.5 });
  return r.ok ? { element: r.out.tile, message: r.out.message.trim(), source: "agent" } : { failed: r.errors, stopped: r.stopped };
}
