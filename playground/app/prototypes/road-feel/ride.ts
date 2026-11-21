// Pure ride state machine: one step per animation frame. Scroll = travel; horizontal input = steer.
import { CURVE, ITEMS, LINGER_MS, LINGER_V, READ_MS, RUSH_V } from "./data";
import { paceOf, replan } from "./plan";
import type { Pace, Placed, Ticker } from "./types";

export type Action =
  | { type: "steer"; dir: -1 | 1 }
  | { type: "lane"; index: number }
  | { type: "pay"; amount: number }
  | { type: "erase"; topic: string }
  | { type: "mood-after"; mood: string };

export type Ride = {
  d: number;
  v: number;
  t: number;
  still: number;
  pace: Pace;
  amp: number;
  lane: number;
  placed: Placed[];
  choices: Record<string, string>;
  avoid: string[];
  skips: Record<string, number>;
  near: Record<number, number>;
  passed: number[];
  unfolded: number[];
  ticker: Ticker[];
  paving: number;
  paid: { amount: number; account: string } | null;
  moodAfter: string | null;
  uid: number;
  tick: number;
};

export function initialRide(now: number): Ride {
  const r: Ride = { d: 0, v: 0, t: now, still: 0, pace: "steady", amp: CURVE.steady, lane: 0, placed: [], choices: {}, avoid: [], skips: {}, near: {}, passed: [], unfolded: [], ticker: [], paving: now, paid: null, moodAfter: null, uid: 1, tick: 1 };
  return repave(r, now, "paver", "paved the first stretch (fallback, instant)");
}

const say = (r: Ride, now: number, who: Ticker["who"], text: string): Ride => ({ ...r, tick: r.tick + 1, ticker: [...r.ticker, { id: r.tick, t: now, who, text }].slice(-30) });

function repave(r: Ride, now: number, who: Ticker["who"], why: string): Ride {
  let uid = r.uid;
  const fixed = r.placed.filter((p) => p.z <= r.d + 520 || r.passed.includes(p.uid));
  const placed = replan(fixed, { choices: r.choices, avoid: r.avoid, pace: r.pace, paid: !!r.paid, nextUid: () => uid++ });
  const added = placed.length - fixed.length;
  return say({ ...r, placed, uid, paving: now }, now, who, `${why} · ${added} tile${added === 1 ? "" : "s"} ahead`);
}

/** The nearest unchosen fork ahead, if any. */
export function forkAhead(r: Ride): { p: Placed; dist: number } | null {
  for (const p of r.placed) {
    const k = p.item.key;
    if (p.item.kind === "fork" && k && !r.choices[k] && p.z - r.d > -40) return { p, dist: p.z - r.d };
  }
  return null;
}

/** How far the rider may scroll: the toll booth until paid, the campfire after. */
export function limitOf(r: Ride): number {
  const toll = r.placed.find((p) => p.item.id === "toll");
  const fire = r.placed.find((p) => p.item.id === "campfire");
  if (fire) return fire.z - 260;
  if (toll && !r.paid) return toll.z - 260;
  return Infinity;
}

export function step(prev: Ride, scrollY: number, now: number, actions: Action[]): Ride {
  const dt = Math.max(1, now - prev.t);
  const d = Math.max(0, scrollY);
  const inst = (Math.abs(d - prev.d) / dt) * 1000;
  const v = prev.v + (inst - prev.v) * Math.min(1, dt / 220);
  let r: Ride = { ...prev, d, v, t: now, still: v < LINGER_V ? prev.still + dt : 0 };
  r = { ...r, amp: r.amp + (CURVE[r.pace] - r.amp) * Math.min(1, dt / 900) };

  const fork = forkAhead(r);
  for (const a of actions) {
    if (a.type === "steer" && fork) r = { ...r, lane: Math.max(0, Math.min(fork.p.item.branches!.length - 1, r.lane + a.dir)) };
    if (a.type === "lane" && fork) r = { ...r, lane: Math.max(0, Math.min(fork.p.item.branches!.length - 1, a.index)) };
    if (a.type === "pay" && !r.paid) {
      const account = r.choices.account === "fhsa" ? "fhsa" : "tfsa";
      r = { ...r, paid: { amount: a.amount, account } };
      r = say(r, now, "road", `toll booth clicked · contribute $${a.amount}/month into ${account.toUpperCase()} (simulated). Only a click moves money.`);
      r = repave(r, now, "paver", "road opens to the campfire");
    }
    if (a.type === "erase" && r.avoid.includes(a.topic)) {
      r = { ...r, avoid: r.avoid.filter((t) => t !== a.topic), skips: { ...r.skips, [a.topic]: 0 } };
      r = say(r, now, "rules", `erased (avoid ${a.topic})`);
      r = repave(r, now, "paver", `re-paving with ${a.topic} allowed again`);
    }
    if (a.type === "mood-after") r = say({ ...r, moodAfter: a.mood }, now, "road", `mood after: ${a.mood}`);
  }

  const pace = paceOf(r.v, r.still, RUSH_V, LINGER_V, LINGER_MS, r.pace);
  if (pace !== r.pace) {
    r = say({ ...r, pace }, now, "horse", `${pace === "rush" ? "rushing" : pace === "linger" ? "lingering" : "steady"} (${Math.round(r.v)} px/s)`);
    r = repave(r, now, "paver", pace === "rush" ? "straightening the road, dropping vistas" : pace === "linger" ? "adding scenery, opening signs" : "back to a normal road");
  }

  for (const p of r.placed) {
    const dist = p.z - r.d;
    if (dist < 520 && dist > 60 && r.near[p.uid] === undefined) r = { ...r, near: { ...r.near, [p.uid]: now } };
    if (dist < 520 && dist > 60 && r.still > LINGER_MS && !r.unfolded.includes(p.uid) && p.item.detail) {
      r = say({ ...r, unfolded: [...r.unfolded, p.uid] }, now, "horse", `lingering on “${p.item.title}” → unfolding`);
    }
    if (dist < 40 && !r.passed.includes(p.uid)) {
      r = { ...r, passed: [...r.passed, p.uid] };
      const read = now - (r.near[p.uid] ?? now);
      const it = p.item;
      if (it.kind === "fork" && it.key && it.branches) {
        const b = it.branches[Math.min(r.lane, it.branches.length - 1)];
        r = say({ ...r, choices: { ...r.choices, [it.key]: b.value }, lane: 0 }, now, "road", `steered into “${b.label}”`);
        if (it.key === "account") r = say(r, now, "compiler", "rejected 1 paved stretch: toll-booth before risk checkpoint → rewrite accepted");
        r = repave(r, now, "paver", `paving the ${b.label} road`);
      } else if (it.kind === "checkpoint") {
        r = say(r, now, "compiler", `checkpoint seen: ${it.id} (required before the toll booth)`);
      } else if (it.topic && it.kind === "sign" && read < READ_MS) {
        const n = (r.skips[it.topic] ?? 0) + 1;
        r = say({ ...r, skips: { ...r.skips, [it.topic]: n } }, now, "horse", `skipped ${it.topic} (${n}×, ${Math.round(read)} ms)`);
        if (n >= 2 && !r.avoid.includes(it.topic)) {
          r = say({ ...r, avoid: [...r.avoid, it.topic] }, now, "rules", `grew rule (avoid ${it.topic}) from 2 skips`);
          r = repave(r, now, "paver", `re-paving without ${it.topic}`);
        }
      }
    }
  }
  return r;
}

export const roman = (r: Ride) => {
  const toll = r.placed.find((p) => p.item.id === "toll");
  const end = toll ? toll.z : (r.placed.at(-1)?.z ?? 1) + 3000;
  return Math.min(1, 0.08 + 0.92 * (r.d / end));
};

export const itemOf = (id: string) => ITEMS[id];
