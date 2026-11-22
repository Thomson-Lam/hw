// Stand-in for the Uncharted PRD simulator (sections 7.1-7.3, response shape of section 9).
// Same request and response shape, so the FastAPI version can replace it behind /api/simulate.

export const PERSONAS = {
  maya: { name: "Maya, 23, contract analyst, Toronto", income: 3400, essentials: 2600, savings: 1200, saving: 0, ei: false },
  dev: { name: "Dev, 21, student with a part-time job, London ON", income: 1400, essentials: 1150, savings: 400, saving: 0, ei: false },
  sam: { name: "Sam, 26, full-time nurse, Halifax", income: 4300, essentials: 3000, savings: 6500, saving: 150, ei: true },
};

export const SCENARIOS = {
  layoff: { kind: "fear", label: "Layoffs in your field", chip: "Layoffs in my field", match: /layoff|laid off|fired|lose my job|job/i },
  hours_cut: { kind: "fear", label: "Your hours get cut", chip: "My hours get cut", match: /hours/i },
  rent_spike: { kind: "fear", label: "Rent jumps", chip: "My rent jumps", match: /rent/i },
  inflation: { kind: "fear", label: "Prices keep rising", chip: "Prices keep rising", match: /inflation|prices|groceries/i },
  time_off: { kind: "dare", label: "Quit and travel for four months", chip: "Quit and travel for 4 months", match: /quit|travel|time off|sabbatical/i },
  back_to_school: { kind: "dare", label: "Go back to school", chip: "Go back to school", match: /school|tuition|degree/i },
};

const N = 5000, M = 60, CARDS = 20;
const SCALE = { mild: 0.5, moderate: 1, severe: 1.5 };

function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function normal(r) { return Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()); }

function draws(seed) {
  const r = mulberry32(seed);
  const job = new Float64Array(N * M), out = new Float64Array(N * M), shock = new Float64Array(N * M), size = new Float64Array(N * M), ret = new Float64Array(N * M);
  const annual = new Float64Array(N * 5 * 2), start = new Float64Array(N);
  for (let i = 0; i < N * M; i++) { job[i] = r(); out[i] = r(); shock[i] = r(); size[i] = normal(r); ret[i] = normal(r); }
  for (let i = 0; i < annual.length; i++) annual[i] = normal(r);
  for (let i = 0; i < N; i++) start[i] = r();
  return { job, out, shock, size, ret, annual, start };
}

function run(D, p, sc, weekly, dare) {
  const k = SCALE[sc.intensity] ?? 1;
  const hazard = sc.id === "layoff" ? 0.01 + 0.02 * k : 0.01;
  const meanOut = sc.id === "layoff" ? 3 + 2 * k : 3;
  const room = Math.max(0, p.income - p.essentials - p.saving);
  const extra = Math.min(weekly * 52 / 12, room);
  const paths = [];
  for (let n = 0; n < N; n++) {
    let income = p.income, rent = p.essentials * 0.6, other = p.essentials * 0.4, bal = p.savings;
    let employed = true, monthsOut = 0, neg = 0, maxNegRun = 0, run = 0, min = bal;
    const series = [Math.round(bal)], events = [];
    const s1 = Math.floor(D.start[n] * 12);
    for (let m = 0; m < M; m++) {
      const i = n * M + m;
      if (m > 0 && m % 12 === 0) {
        const y = m / 12 - 1;
        income *= 1 + 0.03 + 0.02 * D.annual[(n * 5 + y) * 2];
        const infl = sc.id === "inflation" && m <= 24 ? 0.025 + 0.035 * k : 0.025;
        other *= 1 + infl + 0.01 * D.annual[(n * 5 + y) * 2 + 1];
        rent *= 1.03;
      }
      if (sc.id === "rent_spike" && m === s1) { rent *= 1 + 0.15 * k; events.push({ month: m + 1, type: "rent_spike" }); }
      const essentials = rent + other;
      let pay = income;
      if (sc.id === "hours_cut" && m >= s1 && m < s1 + 9) { pay = income * (1 - 0.3 * k); if (m === s1) events.push({ month: m + 1, type: "hours_cut", months: 9 }); }
      const onDare = dare && m >= dare.start && m < dare.start + dare.months;
      if (dare && m === dare.start) { bal -= dare.cost; events.push({ month: m + 1, type: "dare_start", months: dare.months, cost: dare.cost }); }
      if (!onDare && employed && D.job[i] < hazard) {
        employed = false;
        const q = 1 / meanOut;
        monthsOut = 1 + Math.floor(Math.log(1 - D.out[i]) / Math.log(1 - q));
        events.push({ month: m + 1, type: "job_loss", months: monthsOut });
      }
      if (onDare) bal += (dare.partial ?? 0) * pay - essentials;
      else if (employed) bal += Math.min(pay - essentials, p.saving + extra + (bal < 0 ? 0.5 * room : 0));
      else bal += (p.ei ? 0.5 * pay : 0) - essentials;
      if (D.shock[i] < 0.06) { const s = Math.round(500 * Math.exp(0.6 * D.size[i])); bal -= s; if (s >= 300) events.push({ month: m + 1, type: "shock", amount: s }); }
      bal *= bal > 0 ? 1 + 0.6 * 0.03 / 12 + 0.4 * (0.05 / 12 + 0.1 / Math.sqrt(12) * D.ret[i]) : 1 + 0.2 / 12;
      if (!employed && --monthsOut <= 0) employed = true;
      if (bal < 0) { neg++; run++; maxNegRun = Math.max(maxNegRun, run); } else run = 0;
      min = Math.min(min, bal);
      series.push(Math.round(bal));
    }
    const outcome = bal < 0 || maxNegRun >= 6 ? "hard" : min < 0 ? "rough_recovered" : "fine";
    paths.push({ outcome, end_balance: Math.round(bal), min_balance: Math.round(min), neg, longest: maxNegRun, series, events });
  }
  return paths;
}

const money = (v) => `${v < 0 ? "-" : ""}$${Math.abs(Math.round(v / 100) * 100).toLocaleString("en-CA")}`;
function story(p, other, weekly) {
  const loss = p.events.find((e) => e.type === "job_loss"), dare = p.events.find((e) => e.type === "dare_start");
  const cut = p.events.find((e) => e.type === "hours_cut"), spike = p.events.find((e) => e.type === "rent_spike");
  const shocks = p.events.filter((e) => e.type === "shock");
  const what = dare ? `You left in month ${dare.month} with the cost paid up front.`
    : loss ? `Laid off in month ${loss.month}, ${loss.months} month${loss.months > 1 ? "s" : ""} out.`
    : cut ? `Hours cut in month ${cut.month} for nine months.`
    : spike ? `Rent jumped in month ${spike.month}.`
    : shocks.length ? `${shocks.length} surprise bill${shocks.length > 1 ? "s" : ""}, the biggest ${money(Math.max(...shocks.map((s) => s.amount)))}.`
    : "Nothing dramatic happened.";
  let how;
  if (p.outcome === "fine") how = `You ended with ${money(p.end_balance)} and options.`;
  else if (p.outcome === "rough_recovered") how = `${p.neg} month${p.neg > 1 ? "s" : ""} on credit, back above zero by month 60 with ${money(p.end_balance)}.`;
  // Hard means still in debt at month 60, or 6+ months in a row below zero. Say which, without contradicting the numbers.
  else if (other && weekly) how = `It ended ${money(p.end_balance)}. With $${weekly} a week, this future ends at ${money(other.end_balance)}.`;
  else how = p.end_balance < 0 ? `Still ${money(-p.end_balance)} in debt at month 60.` : `${p.longest} months in a row below zero, then back to ${money(p.end_balance)} by month 60.`;
  return `${what} ${how}`;
}

function tally(paths) { const t = { fine: 0, rough_recovered: 0, hard: 0 }; for (const p of paths) t[p.outcome]++; return t; }

function sample(paths, seed) {
  const r = mulberry32(seed ^ 0x9e3779b9);
  const t = tally(paths), keys = Object.keys(t);
  const raw = keys.map((k) => (t[k] / N) * CARDS), slots = raw.map(Math.floor);
  let left = CARDS - slots.reduce((a, b) => a + b, 0);
  keys.map((k, i) => [i, raw[i] - slots[i]]).sort((a, b) => b[1] - a[1]).forEach(([i]) => { if (left-- > 0) slots[i]++; });
  const ids = [];
  keys.forEach((k, i) => {
    const pool = paths.map((p, id) => (p.outcome === k ? id : -1)).filter((id) => id >= 0);
    for (let j = 0; j < slots[i]; j++) ids.push(pool.splice(Math.floor(r() * pool.length), 1)[0]);
  });
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids;
}

export function simulate({ persona = { id: "maya" }, scenario = { id: "layoff", intensity: "moderate" }, weekly_extra = 0, seed = 42, dare: dareIn }) {
  const p = { ...PERSONAS[persona.id ?? "maya"], ...(persona.overrides ?? {}) };
  const sc = { intensity: "moderate", ...scenario };
  const meta = SCENARIOS[sc.id] ?? { kind: "none", label: "Your futures as they stand" };
  const dare = sc.id === "time_off" ? { start: 6, months: 4, cost: 3000, ...dareIn }
    : sc.id === "back_to_school" ? { start: 8, months: 8, cost: 4000, partial: 0.5, ...dareIn } : null;
  const D = draws(seed);
  const base = run(D, p, sc, 0, dare);
  const lever = weekly_extra > 0 ? run(D, p, sc, weekly_extra, dare) : null;
  const ids = sample(base, seed);
  const side = (paths, id, other, w) => { const x = paths[id]; return { outcome: x.outcome, end_balance: x.end_balance, min_balance: x.min_balance, series: x.series, story: story(x, other, w) }; };
  const room = Math.max(0, p.income - p.essentials - p.saving);
  return {
    sim_id: `${seed}-${sc.id}-${weekly_extra}`,
    scenario: { id: sc.id, kind: meta.kind, label: meta.label },
    persona: p.name,
    weekly_extra,
    weekly_cap: Math.floor((room * 12) / 52),
    assumptions: [
      `${p.name}: $${p.income} net income and $${p.essentials} essentials a month, $${p.savings} saved.`,
      `Job-loss chance ${sc.id === "layoff" ? Math.round((0.01 + 0.02 * (SCALE[sc.intensity] ?? 1)) * 100) : 1}% a month.`,
      p.ei ? "Half of income replaced while out of work (EI stand-in)." : "No EI while out of work (contract or part-time).",
      "6% chance of a surprise bill each month, median $500.",
      "While in debt, half of your spare room goes to paying it down.",
      "Demo defaults, not calibrated. Simulated outcomes for education, not financial advice.",
    ],
    tally: { baseline: tally(base), ...(lever ? { lever: tally(lever) } : {}) },
    cards: ids.map((id) => ({
      future_id: id,
      baseline: side(base, id, lever?.[id], weekly_extra),
      ...(lever ? { lever: side(lever, id) } : {}),
      events: base[id].events,
    })),
  };
}

// Savings odds for a goal (the agent's tool on find/make roads): in how many of 5,000 futures does the
// person put aside `target` dollars on top of today's savings within `horizon` months, at each weekly amount?
// Same random draws for every row, so rows differ only by the weekly amount.
export function goalOdds({ persona = { id: "sam" }, target, horizon = 24, weeklies = [0, 10, 25, 50], seed = 42 }) {
  const p = { ...PERSONAS[persona.id ?? "sam"], ...(persona.overrides ?? {}) };
  const room = Math.max(0, p.income - p.essentials - p.saving);
  const cap = Math.floor((room * 12) / 52);
  const D = draws(seed);
  const sc = { id: "none", intensity: "moderate" };
  const rows = weeklies.filter((w) => w <= cap).map((weekly) => {
    const paths = run(D, p, sc, weekly, null);
    const firsts = [];
    for (const x of paths) { const m = x.series.findIndex((b, i) => i > 0 && i <= horizon && b >= p.savings + target); if (m > 0) firsts.push(m); }
    firsts.sort((a, b) => a - b);
    return { weekly, reached: firsts.length, month: firsts.length ? firsts[Math.floor(firsts.length / 2)] : null };
  });
  return {
    persona: p.name, target: Math.round(target), horizon, total: N, weekly_cap: cap, rows,
    assumptions: [
      `${p.name}: $${p.income} net income and $${p.essentials} essentials a month, $${p.savings} saved, $${p.saving} a month already saved.`,
      "Counts a future when savings grow by the price within the window, after surprise bills and any job loss.",
      "Demo defaults, not calibrated. Simulated outcomes for education, not financial advice.",
    ],
  };
}

// Decision-first money road: the same 5,000 futures before and after the person's plan.
// plan = { weekly: $/week set aside, spend: $/month cut from essentials, income: $/month added, once: $ one-time boost to savings }
export function moneyPlan({ persona = { id: "sam" }, scenario = { id: "layoff", intensity: "moderate" }, plan = {}, seed = 42 }) {
  const p0 = { ...PERSONAS[persona.id ?? "sam"], ...(persona.overrides ?? {}) };
  const sc = { intensity: "moderate", ...scenario };
  const weekly = Math.max(0, Number(plan.weekly) || 0), spend = Math.max(0, Number(plan.spend) || 0), income = Math.max(0, Number(plan.income) || 0), once = Math.max(0, Number(plan.once) || 0);
  const p1 = { ...p0, essentials: Math.max(0, p0.essentials - spend), income: p0.income + income, savings: p0.savings + once };
  const D = draws(seed);
  const before = run(D, p0, sc, 0, null), after = run(D, p1, sc, weekly, null);
  const ids = sample(before, seed);
  const rank = { hard: 0, rough_recovered: 1, fine: 2 };
  const changed = ids.filter((id) => rank[after[id].outcome] > rank[before[id].outcome]);
  const pick = [...changed, ...ids.filter((id) => !changed.includes(id))].slice(0, 3);
  const side = (x) => ({ outcome: x.outcome, end_balance: x.end_balance, story: story(x) });
  const room = Math.max(0, p0.income - p0.essentials - p0.saving);
  return {
    persona: p0.name, scenario: SCENARIOS[sc.id]?.label ?? "Your futures as they stand", total: N,
    plan: { weekly, spend, income, once }, monthly: Math.round((weekly * 52) / 12 + spend + income),
    weekly_cap: Math.floor((room * 12) / 52),
    before: tally(before), after: tally(after),
    examples: pick.map((id) => ({ future_id: id, before: side(before[id]), after: side(after[id]) })),
    assumptions: [
      `${p0.name}: $${p0.income} net income and $${p0.essentials} essentials a month, $${p0.savings} saved.`,
      `Your plan: ${[weekly && `$${weekly} a week set aside`, spend && `$${spend} a month less spending`, income && `$${income} a month more income`, once && `$${once} once into savings`].filter(Boolean).join(", ") || "no changes"}.`,
      `Job-loss chance ${sc.id === "layoff" ? Math.round((0.01 + 0.02 * (SCALE[sc.intensity] ?? 1)) * 100) : 1}% a month; 6% chance of a surprise bill each month.`,
      "Demo defaults, not calibrated. Simulated outcomes for education, not financial advice.",
    ],
  };
}
