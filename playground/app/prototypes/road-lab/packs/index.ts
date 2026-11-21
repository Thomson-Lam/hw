import type { Pack, PackId } from "../types";
import { canadaLife } from "./canada-life";
import { merchTrail } from "./merch-trail";
import { sunLife } from "./sun-life";

export const PACKS: Record<PackId, Pack> = {
  "canada-life": canadaLife,
  "sun-life": sunLife,
  "merch-trail": merchTrail,
};

export const PACK_IDS = Object.keys(PACKS) as PackId[];

export function getPack(id: string): Pack | null {
  return (PACKS as Record<string, Pack>)[id] ?? null;
}
