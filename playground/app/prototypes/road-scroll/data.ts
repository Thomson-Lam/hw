import { defineControls } from "@/lib/controls";

export const SLUG = "road-scroll";

/** SVG stage coordinates (portrait, phone-first). */
export const VIEW = { w: 400, h: 800, horizon: 330, roadBottomHalf: 190 } as const;

export const controlSchema = defineControls({
  roadLength: { type: "number", label: "Road length", min: 200, max: 1500, step: 50, default: 600 },
  bends: { type: "number", label: "Bends", min: 0, max: 4, step: 0.5, default: 1.5 },
  curve: { type: "number", label: "Curve", min: 0, max: 1, step: 0.05, default: 0.6 },
  parallax: { type: "number", label: "Parallax", min: 0, max: 2, step: 0.1, default: 1 },
  layers: { type: "number", label: "Mountain layers", min: 1, max: 5, step: 1, default: 4 },
  seed: { type: "number", label: "Terrain seed", min: 1, max: 999, step: 1, default: 13 },
  dashes: { type: "number", label: "Lane dashes", min: 4, max: 24, step: 1, default: 10 },
  fog: { type: "boolean", label: "Fog", default: true },
});
