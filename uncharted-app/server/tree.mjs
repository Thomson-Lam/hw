// The decision tree. SQLite is the single source of truth: the road is the chain of taken nodes,
// rules come from the active answers on that chain, and every node's context is rebuilt from its ancestors.
import { conceptTile, exploreFallback, exploreTile, moneyDecision, research, shopFork, stopState } from "./agent.mjs";
import { id, json, now, parse } from "./db.mjs";
import { findImage } from "./images.mjs";
import { goalOdds, moneyPlan, PERSONAS, SCENARIOS } from "./sim.mjs";

const CHOICE = ["fork", "thisthat"];
// Idea cards ("item") are content only: the road continues past them without an answer.
const NEEDS_ANSWER = ["slider", "ask", "action", "deadend", "compare"];
const ENDS = (el) => el.type === "checkin" && el.final;

const sameSlot = (a, b) => a.key === b.key && (a.kind === b.kind || (a.kind !== "max" && b.kind !== "max"));
function newestWins(list) {
  const out = [];
  for (const r of list) { const i = out.findIndex((x) => sameSlot(x, r)); if (i >= 0) out.splice(i, 1); out.push(r); }
  return out;
}

// How a tag reads in a sentence ("Show fewer history ideas"). Same list as src/tags.ts.
export const TAG_PHRASE = {
  outdoors: "outdoor ideas", night: "nighttime ideas", "hands-on": "hands-on projects", visual: "visual art ideas", history: "history ideas",
  math: "math ideas", social: "ideas with other people", reading: "reading ideas", free: "free ideas", animals: "ideas with animals",
  far: "ideas far from home", food: "food ideas", cheap: "low-cost ideas", quick: "quick ideas", music: "music ideas", online: "online ideas",
  creative: "creative ideas", active: "active ideas",
};
const phrase = (t) => TAG_PHRASE[t] ?? `${t} ideas`;

export function ruleText(r) {
  const v = r.value;
  if (r.kind === "prefer") return `more ${phrase(r.key)}`;
  if (r.kind === "avoid") return `fewer ${phrase(r.key)}`;
  if (r.kind === "max") return r.key === "hours" ? `at most ${v} h per idea` : `${r.key} at most ${v}`;
  if (r.key === "persona") return `using ${PERSONAS[v]?.name.split(",")[0] ?? v}'s numbers`;
  if (r.key === "weekly") return v ? `$${v} a week buffer` : "no buffer for now";
  if (r.key === "reminder") return v === "on" ? "remind me to set it up" : "no reminder";
  if (r.key === "kind") return v === "worry" ? "a worry about money" : v === "dare" ? "a dare" : "something I'm curious about";
  if (r.key === "goal") return `goal: ${v}`;
  if (r.key === "concept") return `learning: ${v}`;
  if (r.key === "find") return `${v}`;
  if (r.key === "mode") return v === "make" ? "making it yourself" : "finding the right one";
  if (r.key === "need") return `${v}`;
  if (r.key === "pick") return `chose ${v}`;
  if (r.key === "lever_spend") return v ? `spend $${v} a month less` : "keep spending as is";
  if (r.key === "lever_income") return v ? `add $${v} a month` : "no extra income";
  if (r.key === "lever_weekly") return v ? `$${v} a week set aside` : "no weekly saving";
  if (r.key === "target") return `goal: $${Number(v).toLocaleString("en-CA")}`;
  if (r.key === "focus") return `focus: ${v}`;
  if (r.key === "area") return v === "work" ? "worried about work" : "worried about costs";
  if (r.key === "scenario") return `what-if: ${SCENARIOS[v]?.label ?? v}`;
  return `${r.key}: ${v}`;
}

// What an answer turns into, decided by the server from the tile, never by the client.
function rulesOf(el, payload) {
  if (CHOICE.includes(el.type)) {
    const opts = el.type === "fork" ? el.opts : [el.a, el.b];
    const o = opts[payload.option_index];
    if (!o) throw new Error("option_index out of range");
    return { label: o.label, option_index: payload.option_index, rules: [o.rule] };
  }
  if (el.type === "slider") {
    const v = Math.min(el.max, Math.max(el.min, Number(payload.value)));
    return { label: `${v} ${el.unit}`, rules: [{ kind: "max", key: el.key, value: v }], value: v };
  }
  if (el.type === "item") {
    if (payload.verdict === "save") return { label: "Saved", rules: [{ kind: "prefer", key: el.tags[0] }], value: "save" };
    // A plain skip moves the road on without a rule; a reason ("show fewer …") becomes an avoid rule.
    if (payload.verdict === "skip") return { label: "Skipped", rules: [], value: "skip" };
    if (payload.verdict === "nope" && el.tags.includes(payload.tag)) return { label: `Fewer ${phrase(payload.tag)}`, rules: [{ kind: "avoid", key: payload.tag }], value: payload.tag };
    throw new Error("item answer needs verdict save, skip, or nope with one of its tags");
  }
  if (el.type === "ask") { const g = String(payload.text ?? "").trim().slice(0, 120); if (!g) throw new Error("empty goal"); return { label: g, rules: [{ kind: "set", key: "goal", value: g }], value: g }; }
  if (el.type === "compare") {
    const it = el.items?.[payload.option_index];
    if (!it) throw new Error("option_index out of range");
    return { label: it.name, option_index: payload.option_index, rules: [{ kind: "set", key: "pick", value: it.name }, { kind: "set", key: "target", value: Math.round(it.price_cad) }] };
  }
  if (el.type === "action") { const on = payload.verdict === "remind"; return { label: on ? "remind" : "not now", rules: [{ kind: "set", key: "reminder", value: on ? "on" : "off" }], value: on }; }
  throw new Error(`${el.type} takes no answer`);
}

export function createTree(db, log = () => {}) {
  const q = (sql) => db.prepare(sql);
  const node = (nid) => { const n = q("SELECT * FROM nodes WHERE id=?").get(nid); return n && { ...n, element: parse(n.element_json) }; };
  const kids = (nid) => q("SELECT * FROM nodes WHERE parent_id=? ORDER BY option_index, created_at").all(nid).map((n) => ({ ...n, element: parse(n.element_json) }));
  const activeAnswer = (nid) => q("SELECT * FROM answers WHERE node_id=? AND superseded_at IS NULL").get(nid);
  const answerRules = (aid) => q("SELECT * FROM rules WHERE answer_id=? ORDER BY created_at").all(aid).map((r) => ({ id: r.id, kind: r.kind, key: r.key, ...(r.value_json != null ? { value: parse(r.value_json) } : {}), text: r.text, erased: !!r.erased_at }));

  function ancestors(n) { const out = []; let p = n.parent_id ? node(n.parent_id) : null; while (p) { out.unshift(p); p = p.parent_id ? node(p.parent_id) : null; } return out; }
  function rulesOn(chain) {
    const list = [];
    for (const n of chain) { const a = activeAnswer(n.id); if (a) for (const r of answerRules(a.id)) if (!r.erased) list.push(r); }
    return newestWins(list);
  }
  const wire = (rs) => rs.map(({ kind, key, value }) => (value !== undefined ? { kind, key, value } : { kind, key }));
  const val = (rs, key) => [...rs].reverse().find((r) => r.key === key)?.value;
  function trip(rs) {
    const scenario = val(rs, "scenario") ?? null, concept = val(rs, "concept") ?? null, find = val(rs, "find") ?? null, goal = val(rs, "goal") ?? concept ?? find ?? "";
    return { scenario, goal, kind: val(rs, "kind") ?? null, pipe: scenario ? "finance" : concept ? "concept" : find ? "find" : val(rs, "goal") ? "explore" : "intro" };
  }

  function describe(n) {
    const e = n.element, a = activeAnswer(n.id);
    const picked = a ? ` -> picked "${a.label}"` : "";
    switch (e?.type) {
      case "item": return `idea "${e.title}" [${e.tags.join(", ")}]${picked}`;
      case "thisthat": case "slider": case "ask": return `${e.type} "${e.prompt}"${picked}`;
      case "fork": return `fork "${e.prompt}"${picked}`;
      case "future": { const s = e.lever ?? e.baseline; return `future #${e.future_id}: ${s.outcome}, month 60 balance ${s.end_balance}`; }
      case "story": return `story "${e.title}": ${e.steps.map((x) => x.caption).join(" ")}`;
      case "dial": return `dial "${e.title}" (${e.knob?.label} ${e.knob?.min}-${e.knob?.max})`;
      case "deck": return `flashcards "${e.title}": ${e.cards.join(" ")}`;
      case "compare": return `compared ${e.items.map((x) => `${x.name} $${x.price_cad}`).join(", ")}${picked}`;
      case "kit": return `plan "${e.title}" costing $${e.total}`;
      case "savings": return `savings odds for $${e.target}`;
      case "moneyplan": return `money plan: ${e.after.fine} of ${e.total} futures end fine (was ${e.before.fine})`;
      default: return `${e?.type}${picked}`;
    }
  }

  function introTile(rs) {
    const t = trip(rs);
    // No built-in "worry / dare / curious" fork: a road with no goal yet just asks for one.
    if (!t.kind || t.kind === "curious") return { element: { type: "ask", prompt: "What are you curious about?", placeholder: "e.g. get into astronomy", examples: ["Get into astronomy", "Cook on a student budget", "Find a weekend hobby"] }, message: "Name anything. The agent paves the road from your words.", source: "fixed" };
    // Every fork on the road has 2 or 3 lanes. Worries split into work or costs first, then one of two.
    const area = val(rs, "area");
    if (t.kind === "worry" && !area) return { element: { type: "fork", prompt: "What is the worry about?", opts: [
      { label: "My work", sub: "layoffs or hours", rule: { kind: "set", key: "area", value: "work" } },
      { label: "My costs", sub: "rent or prices", rule: { kind: "set", key: "area", value: "costs" } },
    ] }, message: "Two directions. Pick the closer one.", source: "fixed" };
    const ids = t.kind === "dare" ? ["time_off", "back_to_school"] : area === "work" ? ["layoff", "hours_cut"] : ["rent_spike", "inflation"];
    return { element: { type: "fork", prompt: t.kind === "worry" ? "Which worry?" : "Which dare?", opts: ids.map((sid) => ({ label: SCENARIOS[sid].chip, rule: { kind: "set", key: "scenario", value: sid } })) }, message: "Pick the one closest to what is on your mind.", source: "fixed" };
  }

  // Find / make road: 2 questions, real options from search, whose budget, savings odds from the simulator, one action.
  async function findStep(n, chain, rs) {
    const t = trip(rs);
    const mode = val(rs, "mode") === "make" ? "make" : "find";
    const start = chain.findIndex((x) => { const a = activeAnswer(x.id); return a && answerRules(a.id).some((r) => r.key === "find"); });
    const body = chain.slice(start + 1).filter((x) => x.element);
    const has = (type) => body.some((x) => x.element.type === type);
    const forks = body.filter((x) => x.element.type === "fork" && x.element.opts.some((o) => o.rule.key === "need"));
    const needs = rs.filter((r) => r.key === "need").map((r) => r.value);
    if (forks.length < 2) {
      const g = await shopFork(db, n.id, { goal: t.goal, mode, needs, asked: forks.map((x) => x.element.prompt) });
      if (!g.failed) return g;
      // Never stop the road on a question: fall back to a plain one.
      const opt = (label, sub, value) => ({ label, sub, rule: { kind: "set", key: "need", value } });
      return forks.length === 0
        ? { element: { type: "fork", prompt: "How much do you want to spend?", opts: [opt("Keep it cheap", "the lowest sensible price", "budget, low price"), opt("Middle of the range", "good value for money", "mid-range price"), opt("Best I can get", "quality first", "high quality, premium")] }, message: "", source: "fallback" }
        : { element: { type: "fork", prompt: "How will you use it?", opts: [opt("Now and then", "casual use", "casual beginner use"), opt("Every week", "regular use", "regular use"), opt("Seriously", "I want to get good", "serious use, room to grow")] }, message: "", source: "fallback" };
    }
    if (!has("compare") && !has("kit")) {
      const g = await research(db, n.id, { goal: t.goal, mode, needs });
      return g.failed ? deadEnd(g.failed[0]) : g;
    }
    const target = mode === "make" ? body.find((x) => x.element.type === "kit")?.element.total : Number(val(rs, "target"));
    const persona = val(rs, "persona");
    if (!persona) return { element: { type: "fork", prompt: "Whose budget should we plan with?", opts: Object.entries(PERSONAS).map(([pid, p]) => ({ label: p.name.split(",").slice(0, 2).join(","), sub: `$${p.income}/mo · saves $${p.saving}/mo`, rule: { kind: "set", key: "persona", value: pid } })) }, message: "These are sample people. Pick the one closest to you.", source: "fixed" };
    if (!has("savings")) {
      const odds = goalOdds({ persona: { id: persona }, target, horizon: 24 });
      const pickName = val(rs, "pick") ?? body.find((x) => x.element.type === "kit")?.element.title ?? t.goal;
      return { element: { type: "savings", goal: String(pickName), ...odds }, message: "Same 5,000 futures, different weekly amounts.", source: "sim" };
    }
    if (!has("action")) {
      const s = body.find((x) => x.element.type === "savings").element;
      const rec = s.rows.find((r) => r.weekly > 0 && r.reached >= 0.8 * s.total) ?? s.rows.filter((r) => r.weekly > 0).at(-1) ?? { weekly: 10 };
      return { element: { type: "action", weekly: rec.weekly }, message: "One step makes the plan real.", source: "fixed" };
    }
    return { element: { type: "checkin", final: true }, message: "That is your plan.", source: "fixed" };
  }

  // Lesson road: story, dial and flashcard stops, a fork every few stops, and an end after about 9 stops.
  async function conceptStep(n, chain, rs, assumed) {
    const t = trip(rs);
    const start = chain.findIndex((x) => { const a = activeAnswer(x.id); return a && answerRules(a.id).some((r) => r.key === "concept"); });
    const body = chain.slice(start + 1).filter((x) => x.element);
    const teaching = body.filter((x) => ["story", "dial", "deck"].includes(x.element.type));
    if (teaching.length >= 9) return { element: { type: "checkin", final: true }, message: "That is the whole road for this topic.", source: "fixed" };
    const lastFork = body.map((x) => x.element.type).lastIndexOf("fork");
    const ctx = {
      goal: t.goal, focus: val(rs, "focus") ?? null, assumed,
      path: body.slice(-8).map(describe),
      sinceFork: lastFork < 0 ? body.length : body.length - 1 - lastFork,
      lastType: body.at(-1)?.element.type ?? null,
      covered: body.map((x) => x.element.title ?? x.element.prompt).filter(Boolean),
      teachingStops: teaching.length,
    };
    const g = await conceptTile(db, n.id, ctx);
    if (g.failed) return deadEnd(g.failed[0]);
    return g;
  }

  const deadEnd = (why) => ({ element: { type: "deadend", reason: `The agent could not build a stop that fits your rules after 3 tries (${why}).` }, message: "Try again, change a pick, or erase a rule.", source: "fixed" });

  // Money road: decisions first, the result at the end. Whose numbers, then 3 decisions on closed levers
  // (spending, income, weekly saving), then one plan card from the simulator (same 5,000 futures before and after), then one action.
  const MONEY_ORDER = ["spend", "income", "weekly"];
  const leverOf = (el) => el?.type === "fork" ? el.opts.find((o) => String(o.rule?.key).startsWith("lever_"))?.rule.key.slice(6) : null;
  function leverFallback(lever, p, cap) {
    const o = (label, sub, value) => ({ label, sub, rule: { kind: "set", key: `lever_${lever}`, value } });
    if (lever === "spend") return { type: "fork", prompt: "Trim one monthly cost?", opts: [o("Keep as is", "no change", 0), o("Cook at home more", "about $120 a month less", Math.min(120, Math.round(p.essentials * 0.15))), o("Cheaper phone and apps", "about $50 a month less", 50)] };
    if (lever === "income") return { type: "fork", prompt: "Add a little income?", opts: [o("Not now", "no change", 0), o("A few weekend shifts", "about $200 a month", Math.min(200, Math.round(p.income * 0.15))), o("Sell things you don't use", "about $80 a month", 80)] };
    const ws = [10, 25, 50].filter((w) => w <= cap);
    return { type: "fork", prompt: "Set aside something every week?", opts: [o("Not now", "keep things as they are", 0), ...ws.slice(0, 2).map((w) => o(`$${w} a week`, `$${Math.round((w * 52) / 12)} a month`, w))] };
  }

  async function financeStep(n, chain, rs) {
    const t = trip(rs);
    const start = chain.findIndex((x) => { const a = activeAnswer(x.id); return a && answerRules(a.id).some((r) => r.key === "scenario"); });
    const body = chain.slice(start + 1).filter((x) => x.element);
    const has = (type) => body.some((x) => x.element.type === type);
    const persona = val(rs, "persona");
    if (!persona) return { element: { type: "fork", prompt: "Whose numbers should we run?", opts: Object.entries(PERSONAS).map(([pid, p]) => ({ label: p.name.split(",").slice(0, 2).join(","), sub: `$${p.income}/mo · $${p.savings} saved`, rule: { kind: "set", key: "persona", value: pid } })) }, message: "These are sample people. Pick the one closest to you.", source: "fixed" };
    const p = PERSONAS[persona];
    const asked = body.map((x) => leverOf(x.element)).filter(Boolean);
    const next = MONEY_ORDER.find((l) => !asked.includes(l));
    const plan = { spend: Number(val(rs, "lever_spend") ?? 0), income: Number(val(rs, "lever_income") ?? 0), weekly: Number(val(rs, "lever_weekly") ?? 0) };
    const weeklyCap = Math.floor((Math.max(0, p.income - p.essentials - p.saving) * 12) / 52);
    if (next) {
      const so_far = body.filter((x) => leverOf(x.element) && activeAnswer(x.id)).map((x) => `${x.element.prompt} -> ${activeAnswer(x.id).label}`);
      const worry = SCENARIOS[t.scenario]?.label ?? t.goal;
      const g = stopState() ? { failed: ["offline"] } : await moneyDecision(db, n.id, { lever: next, persona: p, worry, weeklyCap, so_far });
      return g.failed ? { element: leverFallback(next, p, weeklyCap), message: "", source: "fallback" } : g;
    }
    if (!has("moneyplan")) {
      const r = moneyPlan({ persona: { id: persona }, scenario: { id: t.scenario, intensity: "moderate" }, plan });
      const choices = body.filter((x) => leverOf(x.element) && activeAnswer(x.id)).map((x) => activeAnswer(x.id).label);
      return { element: { type: "moneyplan", worry: r.scenario, choices, ...r }, message: "Here is what your choices change, across the same 5,000 futures.", source: "sim" };
    }
    if (plan.weekly > 0 && !has("action")) return { element: { type: "action", weekly: plan.weekly }, message: "One step makes the plan real.", source: "fixed" };
    return { element: { type: "checkin", final: true }, message: "That is your plan.", source: "fixed" };
  }

  async function produce(n) {
    const chain = ancestors(n);
    const parent = chain.at(-1);
    let rs = rulesOn(chain);
    let assumed = null;
    if (parent && CHOICE.includes(parent.element.type) && n.option_index != null && !activeAnswer(parent.id)) {
      const opt = rulesOf(parent.element, { option_index: n.option_index });
      rs = newestWins([...rs, ...opt.rules.map((r) => ({ ...r, text: ruleText(r) }))]);
      assumed = `"${opt.label}" at "${parent.element.prompt}"`;
    }
    const t = trip(rs);
    const context = { pipe: t.pipe, rules: wire(rs), assumed };
    if (t.pipe === "intro") return { ...introTile(rs), context };
    if (t.pipe === "finance") return { ...(await financeStep(n, chain, rs)), context };
    if (t.pipe === "concept") return { ...(await conceptStep(n, chain, rs, assumed)), context };
    if (t.pipe === "find") return { ...(await findStep(n, chain, rs)), context };
    const start = chain.findIndex((x) => { const a = activeAnswer(x.id); return a && answerRules(a.id).some((r) => r.key === "goal"); });
    const body = chain.slice(start + 1);
    const lastFork = body.map((x) => x.element?.type).lastIndexOf("fork");
    const ctx = {
      goal: t.goal, rules: wire(rs), assumed,
      path: body.slice(-8).map(describe),
      sinceFork: lastFork < 0 ? body.length : body.length - 1 - lastFork,
      seen: body.filter((x) => x.element?.type === "item").map((x) => x.element.title),
      asked: body.filter((x) => ["thisthat", "slider"].includes(x.element?.type)).map((x) => x.element.prompt),
    };
    if (stopState()) return { ...exploreFallback(ctx), context };
    const g = await exploreTile(db, n.id, ctx);
    if (g.failed && g.stopped) return { ...exploreFallback(ctx), context };
    if (g.failed) return { ...deadEnd(g.failed[0]), context };
    return { ...g, context };
  }

  // ---- background queue: a handful of generations at a time, idempotent per node ----
  const waiting = [], busy = new Set();
  const LIMIT = 4;
  function enqueue(nid) { if (!busy.has(nid) && !waiting.includes(nid)) waiting.push(nid); pump(); }
  function pump() {
    while (busy.size < LIMIT && waiting.length) {
      const nid = waiting.shift();
      busy.add(nid);
      run(nid).catch((e) => {
        log(`generate ${nid} crashed: ${e.stack ?? e}`);
        const d = deadEnd(`server error: ${String(e.message ?? e).slice(0, 80)}`);
        q("UPDATE nodes SET status='ready', source=?, element_json=?, message=?, ready_at=? WHERE id=? AND status='pending'").run(d.source, json(d.element), d.message, now(), nid);
      }).finally(() => { busy.delete(nid); pump(); });
    }
  }
  async function run(nid) {
    const n = node(nid);
    if (!n || n.status !== "pending" || n.state === "stale") return;
    const t0 = Date.now();
    const out = await produce(n);
    // Idea cards get a photo from Wikipedia (looked up here, never written by the model). No photo is fine.
    if (out.element?.type === "item" && !out.element.image) {
      const goal = (out.context?.rules ?? []).find((r) => r.key === "goal")?.value;
      const img = await findImage(out.element.title, goal);
      if (img) out.element = { ...out.element, image: img };
    }
    const fresh = node(nid);
    if (!fresh || fresh.status !== "pending") return;
    q("UPDATE nodes SET status='ready', source=?, element_json=?, message=?, context_json=?, ready_at=? WHERE id=?").run(out.source, json(out.element), out.message, json(out.context), now(), nid);
    log(`${fresh.state} ${out.element.type} ready in ${Date.now() - t0}ms (${out.source})`);
    if (fresh.state === "taken") onVisible(node(nid));
  }

  function addChild(parent, optionIndex, state) {
    const nid = id();
    q("INSERT INTO nodes (id,session_id,parent_id,option_index,depth,state,status,created_at) VALUES (?,?,?,?,?,?,?,?)").run(nid, parent.session_id, parent.id, optionIndex, parent.depth + 1, state, "pending", now());
    enqueue(nid);
    return nid;
  }

  // A taken, ready node decides what to generate next.
  function onVisible(n) {
    q("UPDATE nodes SET seen_at=? WHERE id=? AND seen_at IS NULL").run(now(), n.id);
    const el = n.element;
    if (!el || ENDS(el) || NEEDS_ANSWER.includes(el.type) || activeAnswer(n.id)) return;
    const live = kids(n.id).filter((k) => k.state !== "stale");
    if (CHOICE.includes(el.type)) {
      const count = el.type === "fork" ? el.opts.length : 2;
      for (let i = 0; i < count; i++) if (!live.some((k) => k.option_index === i)) addChild(n, i, "speculative");
    } else if (!live.some((k) => k.state === "taken")) addChild(n, null, "taken");
  }

  // ---- public operations ----
  function createSession(seed) {
    const sid = id();
    q("INSERT INTO sessions (id,seed_json,created_at) VALUES (?,?,?)").run(sid, json(seed ?? null), now());
    const root = id();
    if (seed) {
      const el = { type: "ask", prompt: "Where do you want to go?", placeholder: "e.g. get into astronomy", examples: ["Get into astronomy", "Cook on a student budget", "Find a weekend hobby"] };
      q("INSERT INTO nodes (id,session_id,parent_id,option_index,depth,state,status,source,element_json,message,context_json,created_at,ready_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").run(root, sid, null, null, 0, "taken", "ready", "fixed", json(el), "Your words from the title screen.", json({ pipe: "intro" }), now(), now());
      writeAnswer(root, { label: seed.label, rules: seed.rules });
      addChild(node(root), null, "taken");
    } else {
      q("INSERT INTO nodes (id,session_id,parent_id,option_index,depth,state,status,created_at) VALUES (?,?,?,?,?,?,?,?)").run(root, sid, null, null, 0, "taken", "pending", now());
      enqueue(root);
    }
    return sid;
  }

  function writeAnswer(nid, a) {
    const aid = id();
    q("INSERT INTO answers (id,node_id,label,option_index,value_json,created_at) VALUES (?,?,?,?,?,?)").run(aid, nid, a.label, a.option_index ?? null, json(a.value ?? null), now());
    for (const r of a.rules) q("INSERT INTO rules (id,answer_id,kind,key,value_json,text,created_at) VALUES (?,?,?,?,?,?,?)").run(id(), aid, r.kind, r.key, r.value !== undefined ? json(r.value) : null, ruleText(r), now());
    return aid;
  }

  function answer(nid, payload) {
    const n = node(nid);
    if (!n || n.state !== "taken" || n.status !== "ready") throw new Error("node is not on the road");
    if (activeAnswer(nid)) throw new Error("already answered; change it first");
    const a = rulesOf(n.element, payload);
    writeAnswer(nid, a);
    if (CHOICE.includes(n.element.type)) {
      const ks = kids(nid);
      let pick = ks.find((k) => k.option_index === a.option_index && k.state !== "stale");
      for (const k of ks) if (k.state === "speculative" && k.id !== pick?.id) q("UPDATE nodes SET state='not_taken' WHERE id=?").run(k.id);
      if (!pick) addChild(n, a.option_index, "taken");
      else { q("UPDATE nodes SET state='taken' WHERE id=?").run(pick.id); if (pick.status === "ready") onVisible(node(pick.id)); }
    } else addChild(n, null, "taken");
  }

  function change(nid) {
    const n = node(nid), a = activeAnswer(nid);
    if (!n || !a) throw new Error("nothing to change");
    q("UPDATE answers SET superseded_at=? WHERE id=?").run(now(), a.id);
    for (const k of kids(nid)) if (k.state === "taken") q("UPDATE nodes SET state='not_taken' WHERE id=?").run(k.id);
  }

  // The frontier choice was speculated under the old rules, so its unseen children are redone.
  function refreshFrontier(sid) {
    const road = takenChain(sid);
    const f = road.at(-1);
    if (!f || f.status !== "ready" || !CHOICE.includes(f.element.type) || activeAnswer(f.id)) return;
    for (const k of kids(f.id)) if (k.state === "speculative") q("UPDATE nodes SET state='stale' WHERE id=?").run(k.id);
    onVisible(f);
  }

  function erase(ruleId) {
    const r = q("SELECT rules.*, nodes.session_id sid FROM rules JOIN answers ON answers.id=rules.answer_id JOIN nodes ON nodes.id=answers.node_id WHERE rules.id=?").get(ruleId);
    if (!r) throw new Error("no such rule");
    q("UPDATE rules SET erased_at=? WHERE id=?").run(now(), ruleId);
    refreshFrontier(r.sid);
  }

  function retry(nid) {
    const n = node(nid);
    if (!n || n.element?.type !== "deadend") throw new Error("only a dead end can retry");
    q("UPDATE nodes SET status='pending', element_json=NULL, message=NULL WHERE id=?").run(nid);
    enqueue(nid);
  }

  function takenChain(sid) {
    const out = [];
    let n = q("SELECT id FROM nodes WHERE session_id=? AND parent_id IS NULL").get(sid);
    while (n) { const full = node(n.id); out.push(full); n = q("SELECT id FROM nodes WHERE parent_id=? AND state='taken'").get(full.id); }
    return out;
  }

  function road(sid) {
    let chain = takenChain(sid);
    // Roads saved while ideas still waited for Save/Skip: continue them now that ideas need no answer.
    const last = chain.at(-1);
    if (last?.status === "ready" && last.element?.type === "item" && !activeAnswer(last.id)) { onVisible(last); chain = takenChain(sid); }
    const shown = chain.filter((n) => n.status === "ready");
    const rs = rulesOn(shown);
    const gen = q("SELECT g.ms, g.attempt, g.errors_json, n.state FROM generations g JOIN nodes n ON n.id=g.node_id WHERE n.session_id=? ORDER BY g.created_at DESC LIMIT 1").get(sid);
    const counts = Object.fromEntries(q("SELECT state, count(*) c FROM nodes WHERE session_id=? GROUP BY state").all(sid).map((x) => [x.state, x.c]));
    return {
      session_id: sid,
      trip: trip(rs),
      paving: chain.some((n) => n.status === "pending"),
      stopped: stopState(),
      rules: rs.map(({ id: rid, text, key }) => ({ id: rid, text, key })),
      // `blocks` is the one place that decides where the road stops for a pick; the client only reads it.
      nodes: shown.map((n) => { const a = activeAnswer(n.id); return { id: n.id, element: n.element, message: n.message, source: n.source, blocks: !a && (CHOICE.includes(n.element.type) || NEEDS_ANSWER.includes(n.element.type)), answer: a ? { label: a.label, option_index: a.option_index, rules: answerRules(a.id).map((r) => ({ id: r.id, text: r.text, key: r.key })) } : null }; }),
      log: gen ? `last model call: ${gen.ms}ms, try ${gen.attempt}${parse(gen.errors_json).length ? `, rejected (${parse(gen.errors_json)[0]})` : ""} · nodes ${JSON.stringify(counts)}` : `nodes ${JSON.stringify(counts)}`,
    };
  }

  function tree(sid) {
    return q("SELECT id,parent_id,option_index,depth,state,status,source,element_json,message,seen_at FROM nodes WHERE session_id=? ORDER BY depth, created_at").all(sid).map((n) => {
      const e = parse(n.element_json);
      const a = activeAnswer(n.id);
      return { id: n.id, parent_id: n.parent_id, option_index: n.option_index, depth: n.depth, state: n.state, status: n.status, source: n.source, type: e?.type ?? null, label: e?.title ?? e?.prompt ?? (e?.type === "future" ? `#${e.future_id}` : null), message: n.message, element: e, answer: a ? { label: a.label, option_index: a.option_index } : null, seen: !!n.seen_at };
    });
  }

  // Prior roads for the home screen, newest first. Only roads started from a goal (the old "just explore" ones have no label).
  function sessions(limit = 30) {
    return q("SELECT id, seed_json, created_at FROM sessions ORDER BY created_at DESC LIMIT ?").all(limit).flatMap((s) => {
      const seed = parse(s.seed_json);
      if (!seed?.label) return [];
      const chain = takenChain(s.id).filter((n) => n.status === "ready");
      const t = trip(rulesOn(chain));
      return [{ id: s.id, label: seed.label, created_at: s.created_at, pipe: t.pipe, stops: Math.max(0, chain.length - 1) }];
    });
  }

  return { createSession, answer, change, erase, retry, road, tree, sessions, idle: () => !busy.size && !waiting.length };
}
