// Pure planner: what is paved ahead, given choices, rules and pace. Stands in for paver + compiler.
import { AFTER_ACCOUNT, BEFORE_ACCOUNT, ITEMS, SPACING } from "./data";
import type { Item, Pace, Placed } from "./types";

export function sequence(choices: Record<string, string>): string[] {
  const acct = ITEMS["fork-account"].branches!.find((b) => b.value === choices.account);
  return [...BEFORE_ACCOUNT, ...(acct ? acct.then : []), ...(acct ? AFTER_ACCOUNT : [])];
}

/** Keep what is fixed (near or passed), re-lay everything after it for the current pace, rules and choices. */
export function replan(
  fixed: Placed[],
  opts: { choices: Record<string, string>; avoid: string[]; pace: Pace; paid: boolean; nextUid: () => number },
): Placed[] {
  const done = new Set(fixed.map((p) => p.item.id));
  let z = fixed.length ? fixed[fixed.length - 1].z : 300;
  const out = [...fixed];
  for (const id of sequence(opts.choices)) {
    if (done.has(id)) continue;
    const item: Item = ITEMS[id];
    if (item.topic && opts.avoid.includes(item.topic) && item.kind !== "checkpoint") continue;
    if (item.lingerOnly && opts.pace === "rush") continue;
    z += item.kind === "fork" || item.kind === "toll" ? SPACING[opts.pace] * 1.25 : SPACING[opts.pace];
    out.push({ item, z, uid: opts.nextUid() });
    // An unchosen fork ends the paved road: nothing exists past it until you steer into a lane.
    if (item.kind === "fork" && item.key && !opts.choices[item.key]) break;
  }
  if (opts.paid && !done.has("campfire")) {
    const toll = out.find((p) => p.item.id === "toll");
    if (toll) out.push({ item: ITEMS.campfire, z: toll.z + 700, uid: opts.nextUid() });
  }
  return out;
}

export const paceOf = (v: number, stillMs: number, rushV: number, lingerV: number, lingerMs: number, prev: Pace): Pace => {
  if (v > rushV) return "rush";
  if (v < lingerV && stillMs > lingerMs) return "linger";
  if (prev === "rush" && v > rushV * 0.6) return "rush"; // hysteresis
  return v > lingerV ? "steady" : prev;
};
