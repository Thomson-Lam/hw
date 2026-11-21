// Perspective projection into the hero canvas. Pure.
import { CANVAS, ROAD, VP } from "./data";

/** 0..1 depth factor: 1 at the rider, → 0 at the horizon. */
export const depth = (r: number) => ROAD.focal / (ROAD.focal + Math.max(0, r));

/** Lateral sway of the road at absolute distance z (amplitude set by pace). */
export const sway = (z: number, amp: number) => amp * Math.sin(z / 1300) + amp * 0.4 * Math.sin(z / 530);

/** Screen point (canvas units) of the road centre `r` ahead, with a lateral offset in road units. */
export function project(r: number, d: number, amp: number, lateral = 0) {
  const t = depth(r);
  const bend = (sway(d + r, amp) - sway(d, amp)) * (1 - t) * 2.2;
  return {
    x: VP.x + (ROAD.bottomX - VP.x) * t + bend + lateral * t,
    y: VP.y + (CANVAS.h - VP.y) * t,
    t,
  };
}

/** Road edges as an SVG polygon from the rider to `rEnd`. */
export function roadPolygon(d: number, amp: number, rEnd: number, lateral: (r: number) => number = () => 0, rStart = 0): string {
  const left: string[] = [];
  const right: string[] = [];
  const steps = 40;
  for (let i = 0; i <= steps; i++) {
    const r = rStart + ((rEnd - rStart) * i) / steps;
    const p = project(r, d, amp, lateral(r));
    const hw = ROAD.halfWidth * p.t;
    left.push(`${(p.x - hw).toFixed(1)},${p.y.toFixed(1)}`);
    right.unshift(`${(p.x + hw).toFixed(1)},${p.y.toFixed(1)}`);
  }
  return [...left, ...right].join(" ");
}

export const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;
