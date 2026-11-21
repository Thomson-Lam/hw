// Pure road transitions shared by the client session, the server and the lab.
import type { Ctx, Pack, Tile } from "../types";
import { applyTile } from "./compiler";

/** The user taps branch `idx` of a fork. Returns the new ctx (choice recorded) and the lead-in tile to walk. */
export function choose(pack: Pack, ctx: Ctx, fork: Extract<Tile, { kind: "fork" }>, idx: number): { ctx: Ctx; lead: Tile; value: string | null } {
  const b = fork.branches[idx];
  let c: Ctx = { ...ctx, seen: ctx.seen.filter((s) => s !== `fork:${fork.key}`), choices: { ...ctx.choices } };
  const value = fork.key === "pick" ? b.result : b.value;
  if (fork.key && value) {
    c.choices[fork.key] = value;
    c = pack.onChoice(c, fork.key, value);
  }
  c = { ...c, path: [...c.path, `chose ${fork.key ?? "branch"}=${value ?? b.label}`] };
  // The lead-in was already counted when the fork was applied (fork = 2 tiles); record its facts only.
  const after = applyTile({ ...c, used: c.used - 1 }, b.lead);
  return { ctx: after, lead: b.lead, value };
}

/** Decline at the toll booth: the road goes on a little and comes back. */
export function decline(ctx: Ctx): Ctx {
  return { ...ctx, seen: ctx.seen.filter((s) => s !== "toll"), budgetBonus: ctx.budgetBonus + 3 };
}

/** Finance realign: forget the account choice and reopen the account fork. Pending effect is revoked by the caller. */
export function realign(ctx: Ctx, key: string): Ctx {
  const choices = { ...ctx.choices };
  delete choices[key];
  return { ...ctx, choices, seen: ctx.seen.filter((s) => s !== "toll" && s !== `fork:${key}`), budgetBonus: ctx.budgetBonus + 4 };
}

export const endsStretch = (t: Tile | undefined) => !!t && (t.kind === "fork" || t.kind === "search" || t.kind === "toll-booth" || t.kind === "campfire" || t.kind === "help");
