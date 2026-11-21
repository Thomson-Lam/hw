// The horse: rules that read movement. Pure functions; the session feeds it dwell times.
import type { Ctx, Pace, Pack, Tile } from "../types";

export const RUSH_MS = 700;
export const LINGER_MS = 2200;
export const SKIPS_FOR_RULE = 2;

/** Pace from the mean dwell of the last 3 forward tiles. */
export function paceOf(dwells: number[]): Pace {
  const last = dwells.slice(-3);
  if (last.length === 0) return "steady";
  const mean = last.reduce((a, b) => a + b, 0) / last.length;
  return mean < RUSH_MS ? "rush" : mean > LINGER_MS ? "linger" : "steady";
}

/** The topic a tile is about, if the user can skip it (signposts only). */
export function skipTopic(pack: Pack, ctx: Ctx, tile: Tile): string | null {
  if (tile.kind !== "signpost") return null;
  const topic = tile.fact ? (pack.facts(ctx)[tile.fact]?.topic ?? null) : tile.topic;
  return topic && !pack.protectedTopics.includes(topic) ? topic : null;
}

export const isSkip = (dwellMs: number) => dwellMs < RUSH_MS;
