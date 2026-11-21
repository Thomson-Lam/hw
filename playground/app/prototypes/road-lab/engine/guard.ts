// Grounded-text guard for every label the LLM writes. Labels carry no facts.
import type { Ctx, Pack, Verdict } from "../types";

export const MAX_LABEL_WORDS = 6;

export const CLAIM =
  /\b(zero|no fees?|free of|guarantee[ds]?|risk[- ]free|always|never lose|best|cheapest|highest|lowest|safe|safest|most|proven|certain(ly)?)\b|%|\bper ?cent\b/i;

export function guardLabel(label: string, ctx: Ctx, pack: Pack): Verdict[] {
  const errors: Verdict[] = [];
  const words = label.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) errors.push({ inv: "label-length", msg: "empty label" });
  if (words.length > MAX_LABEL_WORDS)
    errors.push({ inv: "label-length", msg: `label has ${words.length} words (max ${MAX_LABEL_WORDS}): "${label.slice(0, 50)}"` });
  for (const n of label.match(/\$?\d[\d,]*(\.\d+)?/g) ?? []) {
    const bare = n.replace(/[$,]/g, "");
    if (!ctx.numbers.includes(bare)) errors.push({ inv: "grounded-text", msg: `ungrounded number "${n}" in "${label.slice(0, 50)}"` });
  }
  const claim = label.match(CLAIM);
  if (claim) errors.push({ inv: "grounded-text", msg: `claim word "${claim[0]}" in "${label.slice(0, 50)}"` });
  const banned = pack.banned ? label.match(pack.banned) : null;
  if (banned) errors.push({ inv: "no-diagnosis", msg: `clinical claim "${banned[0]}" in "${label.slice(0, 50)}"` });
  return errors;
}
