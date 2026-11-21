// Pure geometry for the road scene. No React; safe to unit test.
import { VIEW } from "./data";
import type { Dash, Frame, Point } from "./types";

const { w, h, horizon, roadBottomHalf } = VIEW;
const mid = w / 2;

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const frac = (x: number) => x - Math.floor(x);

export function frameAt(progress: number, c: { roadLength: number; bends: number; curve: number }): Frame {
  const p = Math.min(1, Math.max(0, progress));
  return {
    progress: p,
    distance: (p * c.roadLength) / 25,
    // Bends fade out near the end so the road straightens into the goal.
    curve: Math.sin(p * c.bends * Math.PI * 2) * c.curve * (1 - p * p),
  };
}

/** Closed ridge path for mountain layer i of n (0 = farthest). Extra width allows horizontal drift. */
export function ridgePath(seed: number, i: number, n: number): string {
  const rand = mulberry32(seed * 31 + i * 977);
  const depth = n === 1 ? 1 : i / (n - 1);
  const base = horizon + 10 + depth * 70;
  const amp = 50 + depth * 70;
  const step = 30 + depth * 30;
  const pts: string[] = [];
  for (let x = -2 * w; x <= w * 3; x += step) {
    const y = base - amp * (0.25 + 0.75 * rand()) * (0.6 + 0.4 * Math.sin(x / 90 + i));
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${-2 * w},${h} L${pts.join(" L")} L${w * 3},${h} Z`;
}

/** Horizontal drift of a layer opposite the bend; nearer layers move more. */
export function layerOffset(curve: number, i: number, n: number, parallax: number): number {
  const depth = n === 1 ? 1 : i / (n - 1);
  return -curve * (15 + depth * 110) * parallax;
}

/** Layer opacity: far layers fade into the background (aerial perspective in both themes). */
export function layerOpacity(i: number, n: number): number {
  return n === 1 ? 0.45 : 0.12 + 0.43 * (i / (n - 1));
}

export function vanishingPoint(curve: number): Point {
  return { x: mid + curve * 120, y: horizon };
}

function controlPoint(curve: number): Point {
  return { x: mid + curve * 40, y: lerp(horizon, h, 0.45) };
}

/** Quadratic bezier from vanishing point to bottom-center at parameter u. */
export function centerAt(curve: number, u: number): Point {
  const a = vanishingPoint(curve);
  const c = controlPoint(curve);
  const b = { x: mid, y: h };
  return {
    x: (1 - u) ** 2 * a.x + 2 * (1 - u) * u * c.x + u ** 2 * b.x,
    y: (1 - u) ** 2 * a.y + 2 * (1 - u) * u * c.y + u ** 2 * b.y,
  };
}

export function roadPath(curve: number): string {
  const v = vanishingPoint(curve);
  const c = controlPoint(curve);
  const spread = roadBottomHalf * 0.4;
  return [
    `M${v.x - 2},${v.y}`,
    `Q${c.x - spread},${c.y} ${mid - roadBottomHalf},${h}`,
    `L${mid + roadBottomHalf},${h}`,
    `Q${c.x + spread},${c.y} ${v.x + 2},${v.y}`,
    "Z",
  ].join(" ");
}

/** Lane dashes that stream toward the viewer as distance grows. */
export function dashes(frame: Frame, count: number): Dash[] {
  const out: Dash[] = [];
  for (let i = 0; i < count; i++) {
    const t = frac(i / count + frame.distance);
    const u = t * t; // perspective: compress near the horizon
    const p = centerAt(frame.curve, u);
    out.push({ x: p.x, y: p.y, w: 1 + 7 * u, h: 3 + 34 * u });
  }
  return out;
}

/** The goal grows as you approach it. */
export const goalScale = (progress: number) => 0.5 + 1.5 * progress * progress;

/** Rider bob, driven by distance (scroll), not time. */
export const bob = (distance: number) => Math.abs(Math.sin(distance * Math.PI * 2)) * 5;

/** viewBox that keeps the full height (horizon + road) visible at any container aspect, centred on the road. */
export function viewBoxFor(aspect: number): string {
  const vw = Math.min(h * 2.5, Math.max(w * 0.8, h * (Number.isFinite(aspect) && aspect > 0 ? aspect : w / h)));
  return `${(mid - vw / 2).toFixed(1)} 0 ${vw.toFixed(1)} ${h}`;
}
