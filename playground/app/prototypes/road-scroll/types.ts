import type { ControlValues } from "@/lib/controls";
import type { controlSchema } from "./data";

export type RoadControls = ControlValues<typeof controlSchema>;
export type Point = { x: number; y: number };
export type Dash = { x: number; y: number; w: number; h: number };

/** Everything the stage needs for one frame, derived from scroll progress + controls. */
export type Frame = {
  progress: number; // 0..1 down the page
  distance: number; // dash cycles travelled
  curve: number; // -1..1 current road bend
};
