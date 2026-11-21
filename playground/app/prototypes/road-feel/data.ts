// Scripted road for the look-and-feel mock. No backend: this stands in for the paver.
import type { Item, Pace } from "./types";

export const SLUG = "road-feel";

/** Hero canvas of the Hack Western mountain layers (all layers share it). */
export const CANVAS = { w: 2880, h: 2550 } as const;
/** Where the valley opens: the road's vanishing point, in canvas units. */
export const VP = { x: 1600, y: 1745 } as const;
export const ROAD = { bottomX: 1440, halfWidth: 470, focal: 380, depth: 2600 } as const;

export const SPACING: Record<Pace, number> = { rush: 520, steady: 760, linger: 1000 };
export const CURVE: Record<Pace, number> = { rush: 20, steady: 90, linger: 160 };
export const RUSH_V = 1100; // px/s of scroll
export const LINGER_V = 60;
export const LINGER_MS = 1200;
export const READ_MS = 700; // passing a sign faster than this is a skip

const it = (i: Item) => i;

export const ITEMS: Record<string, Item> = Object.fromEntries(
  [
    it({ id: "fork-mood", kind: "fork", key: "mood", prompt: "How does money feel right now?", title: "Mood", branches: [
      { value: "stressed", label: "Stressed", then: [] },
      { value: "okay", label: "Okay", then: [] },
    ] }),
    it({ id: "stocks-basics", kind: "sign", topic: "stocks", title: "A stock is a small piece of a company.", detail: "Its price follows how people value that one company.", side: "left" }),
    it({ id: "compounding", kind: "sign", topic: "compounding", title: "Small amounts grow over time.", detail: "Growth earns growth. Starting early matters more than the amount.", side: "right" }),
    it({ id: "you-at-30", kind: "vista", topic: "saving", title: "You at 30", detail: "The amount you pick at the toll booth shows up here.", lingerOnly: true }),
    it({ id: "stocks-swings", kind: "sign", topic: "stocks", title: "Single stocks can swing a lot.", detail: "One company can rise or fall far more than the market.", side: "right" }),
    it({ id: "fork-account", kind: "fork", key: "account", prompt: "Which road?", title: "Account", branches: [
      { value: "tfsa", label: "TFSA", then: ["tfsa-basics"] },
      { value: "fhsa", label: "FHSA", then: ["fhsa-basics"] },
      { value: "unsure", label: "Not sure", then: ["auto-contrib"] },
    ] }),
    it({ id: "tfsa-basics", kind: "sign", topic: "tfsa", title: "TFSA: growth is not taxed.", detail: "Withdrawals are not taxed either. Unused room carries forward.", side: "left" }),
    it({ id: "fhsa-basics", kind: "sign", topic: "fhsa", title: "FHSA: for a first home.", detail: "Contributions are tax-deductible; first-home withdrawals are not taxed.", side: "left" }),
    it({ id: "auto-contrib", kind: "sign", topic: "automation", title: "Automatic means you decide once.", detail: "The same amount moves on a schedule you pick. Pause any time.", side: "left" }),
    it({ id: "market-drops", kind: "bridge", topic: "risk", title: "Markets drop sometimes.", detail: "A plan you set once keeps going through them.", lingerOnly: true }),
    it({ id: "risk", kind: "checkpoint", title: "In a bad year, $1,000 can drop to about $800.", detail: "That is normal. It has recovered before, but it can happen again." }),
    it({ id: "fees", kind: "checkpoint", title: "Fees: $2.50 a year per $1,000.", detail: "0.25% a year. No fee to start or stop." }),
    it({ id: "limits", kind: "checkpoint", title: "Room this year: $7,000.", detail: "Going over has a penalty, so the booth will not let you." }),
    it({ id: "toll", kind: "toll", title: "Toll booth" }),
    it({ id: "campfire", kind: "campfire", title: "Campfire" }),
  ].map((i) => [i.id, i]),
);

export const BEFORE_ACCOUNT = ["fork-mood", "stocks-basics", "compounding", "you-at-30", "stocks-swings", "fork-account"];
export const AFTER_ACCOUNT = ["market-drops", "risk", "fees", "limits", "toll"];

/** Art palette for the scene (imagery, not UI chrome). UI chrome uses design tokens. */
export const SKY = {
  light: ["#6fb6ff", "#b8d9ff", "#dcecff"],
  dark: ["#0b2a3c", "#0f3d55", "#2a6f86"],
};
export const HORSE = { body: "#6c4fc0", dark: "#3d2a80", light: "#9a83e0", mane: "#2a1c5c" };
