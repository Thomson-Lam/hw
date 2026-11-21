export type Pace = "rush" | "steady" | "linger";
export type Kind = "sign" | "vista" | "bridge" | "checkpoint" | "fork" | "toll" | "campfire";
export type Branch = { value: string; label: string; then: string[] };
export type Item = {
  id: string;
  kind: Kind;
  title: string;
  detail?: string;
  topic?: string;
  /** Dropped from the road when the rider is rushing. */
  lingerOnly?: boolean;
  /** Fork: the choice key and its 2–3 lanes. */
  key?: string;
  prompt?: string;
  branches?: Branch[];
  side?: "left" | "right";
};
export type Placed = { item: Item; z: number; uid: number };
export type Ticker = { id: number; t: number; who: "horse" | "paver" | "compiler" | "rules" | "road"; text: string };
