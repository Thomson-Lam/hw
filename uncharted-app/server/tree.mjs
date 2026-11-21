// The decision tree. SQLite is the single source of truth: the road is the chain of taken nodes,
// rules come from the active answers on that chain, and every node's context is rebuilt from its ancestors.
import { exploreFallback, exploreTile, financeTile, stopState } from "./agent.mjs";
import { id, json, now, parse } from "./db.mjs";
import { PERSONAS, SCENARIOS, simulate } from "./sim.mjs";

const CHOICE = ["fork", "thisthat"];
const NEEDS_ANSWER = ["slider", "item", "ask", "action", "deadend"];
const ENDS = (el) => el.type === "checkin" && el.final;

const sameSlot = (a, b) => a.key === b.key && (a.kind === b.kind || (a.kind !== "max" && b.kind !== "max"));
function newestWins(list) {
  const out = [];
  for (const r of list) { const i = out.findIndex((x) => sameSlot(x, r)); if (i >= 0) out.splice(i, 1); out.push(r); }
  return out;
}

export function ruleText(r) {
  const v = r.value;
  if (r.kind === "prefer") return `more ${r.key}`;
  if (r.kind === "avoid") return `no ${r.key}`;
  if (r.kind === "max") return r.key === "hours" ? `at most ${v} h per idea` : `${r.key} at most ${v}`;
  if (r.key === "persona") return `using ${PERSONAS[v]?.name.split(",")[0] ?? v}'s numbers`;
  if (r.key === "weekly") return v ? `$${v} a week buffer` : "no buffer for now";
  if (r.key === "reminder") return v === "on" ? "remind me to set it up" : "no reminder";
  if (r.key === "kind") return v === "worry" ? "a worry about money" : v === "dare" ? "a dare" : "something I'm curious about";
  if (r.key === "goal") return `goal: ${v}`;
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
    if (payload.verdict === "save") return { label: "saved", rules: [{ kind: "prefer", key: el.tags[0] }], value: "save" };
    if (payload.verdict === "nope" && el.tags.includes(payload.tag)) return { label: `no ${payload.tag}`, rules: [{ kind: "avoid", key: payload.tag }], value: payload.tag };
    throw new Error("item answer needs verdict save, or nope with one of its tags");
  }
  if (el.type === "ask") { const g = String(payload.text ?? "").trim().slice(0, 120); if (!g) throw new Error("empty goal"); return { label: g, rules: [{ kind: "set", key: "goal", value: g }], value: g }; }
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
  function trip(rs) { const scenario = val(rs, "scenario") ?? null, goal = val(rs, "goal") ?? ""; return { scenario, goal, kind: val(rs, "kind") ?? null, pipe: scenario ? "finance" : goal ? "explore" : "intro" }; }

  function describe(n) {
    const e = n.element, a = activeAnswer(n.id);
    const picked = a ? ` -> picked "${a.label}"` : "";
    switch (e?.type) {
      case "item": return `idea "${e.title}" [${e.tags.join(", ")}]${picked}`;
      case "thisthat": case "slider": case "ask": return `${e.type} "${e.prompt}"${picked}`;
      case "fork": return `fork "${e.prompt}"${picked}`;
      case "future": { const s = e.lever ?? e.baseline; return `future #${e.future_id}: ${s.outcome}, month 60 balance ${s.end_balance}`; }
      default: return `${e?.type}${picked}`;
    }
  }

  // ---- simulator runs, cached per session in sim_runs ----
  function sim(sessionId, params) {
    const key = json(params);
    const row = q("SELECT result_json FROM sim_runs WHERE session_id=? AND params_json=?").get(sessionId, key);
    if (row) return parse(row.result_json);
    const t0 = performance.now();
    const out = simulate(params);
    q("INSERT OR IGNORE INTO sim_runs (id,session_id,params_json,result_json,ms,created_at) VALUES (?,?,?,?,?,?)").run(id(), sessionId, key, json(out), Math.round(performance.now() - t0), now());
    return out;
  }

  function introTile(rs) {
    const t = trip(rs);
    if (!t.kind) return { element: { type: "fork", prompt: "Where do you want to go?", opts: [
      { label: "A worry", sub: "about money", rule: { kind: "set", key: "kind", value: "worry" } },
      { label: "A dare", sub: "something bold", rule: { kind: "set", key: "kind", value: "dare" } },
      { label: "Curious", sub: "anything at all", rule: { kind: "set", key: "kind", value: "curious" } },
    ] }, message: "Pick a direction. The road builds itself from your picks.", source: "fixed" };
    if (t.kind === "curious") return { element: { type: "ask", prompt: "What are you curious about?", placeholder: "e.g. get into astronomy", examples: ["Get into astronomy", "Cook on a student budget", "Find a weekend hobby"] }, message: "Name anything. The agent paves the road from your words.", source: "fixed" };
    // Every fork on the road has 2 or 3 lanes. Worries split into work or costs first, then one of two.
    const area = val(rs, "area");
    if (t.kind === "worry" && !area) return { element: { type: "fork", prompt: "What is the worry about?", opts: [
      { label: "My work", sub: "layoffs or hours", rule: { kind: "set", key: "area", value: "work" } },
      { label: "My costs", sub: "rent or prices", rule: { kind: "set", key: "area", value: "costs" } },
    ] }, message: "Two directions. Pick the closer one.", source: "fixed" };
    const ids = t.kind === "dare" ? ["time_off", "back_to_school"] : area === "work" ? ["layoff", "hours_cut"] : ["rent_spike", "inflation"];
    return { element: { type: "fork", prompt: t.kind === "worry" ? "Which worry?" : "Which dare?", opts: ids.map((sid) => ({ label: SCENARIOS[sid].chip, rule: { kind: "set", key: "scenario", value: sid } })) }, message: "Pick the one closest to what is on your mind.", source: "fixed" };
  }

  const deadEnd = (why) => ({ element: { type: "deadend", reason: `The agent could not build a stop that fits your rules after 3 tries (${why}).` }, message: "Try again, change a pick, or erase a rule.", source: "fixed" });

  async function financeStep(n, chain, rs, assumed) {
    const t = trip(rs);
    const start = chain.findIndex((x) => { const a = activeAnswer(x.id); return a && answerRules(a.id).some((r) => r.key === "scenario"); });
    const body = chain.slice(start + 1);
    const persona = val(rs, "persona");
    if (!persona) return { element: { type: "fork", prompt: "Whose numbers should we run?", opts: Object.entries(PERSONAS).map(([pid, p]) => ({ label: p.name.split(",").slice(0, 2).join(","), sub: `$${p.income}/mo · $${p.savings} saved`, rule: { kind: "set", key: "persona", value: pid } })) }, message: "These are sample people. Pick the one closest to you.", source: "fixed" };
    const levers = body.filter((x) => x.element?.type === "fork" && x.element.opts.some((o) => o.rule.key === "weekly")).length;
    const weekly = Number(val(rs, "weekly") ?? 0);
    const futures = body.filter((x) => x.element?.type === "future").length;
    const has = (type) => body.some((x) => x.element?.type === type);
    const actionDone = body.some((x) => x.element?.type === "action" && activeAnswer(x.id));
    const r = sim(n.session_id, { persona: { id: persona }, scenario: { id: t.scenario, intensity: "moderate" }, weekly_extra: weekly, seed: 42 });
    const cap = levers === 0 ? 5 : weekly > 0 || levers >= 2 ? 20 : 15;
    const cands = [];
    if (!has("assumptions")) cands.push({ id: "assumptions", element: { type: "assumptions", lines: r.assumptions }, data: { lines: r.assumptions } });
    if (futures < Math.min(cap, r.cards.length)) {
      const c = r.cards[futures];
      const s = c.lever ?? c.baseline;
      cands.push({ id: "future", element: { type: "future", future_id: c.future_id, baseline: c.baseline, lever: c.lever, weekly: weekly || undefined, index: futures + 1, of: r.cards.length, months: 60 }, data: { future_id: c.future_id, index: futures + 1, months: 60, outcome: s.outcome, balance_at_end: s.end_balance, story: s.story, ...(c.lever ? { without_buffer: c.baseline.outcome, weekly } : {}) } });
    }
    if ((levers === 0 && futures >= 3) || (levers === 1 && weekly === 0 && futures >= 15)) {
      const opts = [...[10, 25].filter((w) => w <= r.weekly_cap).map((w) => ({ label: `$${w} a week`, sub: `$${Math.round((w * 52) / 12)} a month`, rule: { kind: "set", key: "weekly", value: w } })), { label: "Not now", sub: "keep scrolling as is", rule: { kind: "set", key: "weekly", value: 0 } }];
      if (opts.length >= 2) cands.push({ id: "lever", element: { type: "fork", prompt: "Add a small weekly buffer to these same futures?", opts }, data: { options: opts.map((o) => o.label) } });
    }
    if (levers >= 1 && !has("tally") && futures >= 10) cands.push({ id: "tally", element: { type: "tally", baseline: r.tally.baseline, lever: r.tally.lever, weekly: weekly || undefined, total: 5000 }, data: { total: 5000, baseline: r.tally.baseline, ...(r.tally.lever ? { with_buffer: r.tally.lever, weekly } : {}) } });
    if (has("tally") && weekly > 0 && !has("action")) cands.push({ id: "action", element: { type: "action", weekly }, data: { weekly } });
    if (actionDone || (has("tally") && weekly === 0 && (levers >= 2 || futures >= 20)) || !cands.length) cands.push({ id: "end", element: { type: "checkin", final: true }, data: {} });
    const ctx = { goal: t.goal || SCENARIOS[t.scenario]?.label || "", rules: wire(rs), path: chain.slice(-8).map(describe), assumed, candidates: cands };
    if (stopState()) { const c = cands.find((x) => x.id !== "assumptions") ?? cands[0]; return { element: c.element, message: "The agent is offline, so this stop follows the default order.", source: "fallback" }; }
    const g = await financeTile(db, n.id, ctx);
    if (g.failed && g.stopped) { const c = cands.find((x) => x.id !== "assumptions") ?? cands[0]; return { element: c.element, message: "The agent is offline, so this stop follows the default order.", source: "fallback" }; }
    if (g.failed) return deadEnd(g.failed[0]);
    return g;
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
    if (t.pipe === "finance") return { ...(await financeStep(n, chain, rs, assumed)), context };
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
    const chain = takenChain(sid);
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
    return q("SELECT id,parent_id,option_index,depth,state,status,source,element_json,message FROM nodes WHERE session_id=? ORDER BY depth, created_at").all(sid).map((n) => {
      const e = parse(n.element_json);
      return { id: n.id, parent_id: n.parent_id, option_index: n.option_index, depth: n.depth, state: n.state, status: n.status, source: n.source, type: e?.type ?? null, label: e?.title ?? e?.prompt ?? (e?.type === "future" ? `#${e.future_id}` : null), message: n.message };
    });
  }

  return { createSession, answer, change, erase, retry, road, tree, idle: () => !busy.size && !waiting.length };
}
