// Terrain road: chunk data, road masks, section layout and the scroll-driven camera.
// Pure functions only; the canvas and the pins both read the same camera output.
import { Segment } from "./contract";

type Pt = { x: number; y: number; w: number };
type Branch = { lane: number; road: Pt[]; window: { x: number; y: number; w: number; h: number }; leadsTo: Kind };
type Chunk = { file: string; road?: Pt[]; trunk?: Pt[]; split?: { x: number; y: number }; zoom?: number; branches?: Branch[] };
export type Kind = "straight-a" | "straight-b" | "straight-c" | "fork-2" | "fork-3";

const DATA = require("../assets/terrain/chunks.json") as { chunk: { width: number; height: number }; chunks: Record<Kind, Chunk> };
export const CHUNKS = DATA.chunks;
export const CW = DATA.chunk.width, CH = DATA.chunk.height; // 390 x 844 pt
export const IMAGES: Record<Kind, number> = {
  "straight-a": require("../assets/terrain/straight-a.jpg"),
  "straight-b": require("../assets/terrain/straight-b.jpg"),
  "straight-c": require("../assets/terrain/straight-c.jpg"),
  "fork-2": require("../assets/terrain/fork-2.jpg"),
  "fork-3": require("../assets/terrain/fork-3.jpg"),
};
const STRAIGHTS: Kind[] = ["straight-a", "straight-b", "straight-c"];

// ---------- Road masks ----------
// One RGBA mask per chunk at 2 pt per pixel. Proximity uses Hack Western's brush: 1 - d²/r², max over path samples.
// Straight: road in R, G and B. Fork: trunk in all channels, lane i in channel i, so the shader can dim lanes.
export const MW = 195, MH = 422;
function stamp(buf: Float32Array[], chans: number[], road: Pt[]) {
  for (let i = 0; i + 1 < road.length; i++) {
    const a = road[i], b = road[i + 1];
    const ax = (a.x * CW) / 2, ay = (a.y * CH) / 2, bx = (b.x * CW) / 2, by = (b.y * CH) / 2;
    const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, by - ay)));
    for (let k = 0; k <= n; k++) {
      const t = k / n, cx = ax + (bx - ax) * t, cy = ay + (by - ay) * t, r = (a.w + (b.w - a.w) * t) / 4;
      const r2 = r * r;
      for (let dy = Math.floor(-r); dy <= Math.ceil(r); dy++) {
        const yy = Math.round(cy) + dy;
        if (yy < 0 || yy >= MH) continue;
        for (let dx = Math.floor(-r); dx <= Math.ceil(r); dx++) {
          const xx = Math.round(cx) + dx;
          if (xx < 0 || xx >= MW) continue;
          const ex = xx - cx, ey = yy - cy, p = 1 - (ex * ex + ey * ey) / r2;
          if (p <= 0) continue;
          const at = yy * MW + xx;
          for (const c of chans) if (p > buf[c][at]) buf[c][at] = p;
        }
      }
    }
  }
}
const maskCache = new Map<Kind, Uint8Array>();
export function maskBytes(kind: Kind): Uint8Array {
  const hit = maskCache.get(kind);
  if (hit) return hit;
  const c = CHUNKS[kind], buf = [0, 1, 2].map(() => new Float32Array(MW * MH));
  if (c.road) stamp(buf, [0, 1, 2], c.road);
  if (c.trunk) stamp(buf, [0, 1, 2], c.trunk);
  for (const b of c.branches ?? []) stamp(buf, [b.lane], b.road);
  const out = new Uint8Array(MW * MH * 4);
  for (let i = 0; i < MW * MH; i++) {
    out[i * 4] = Math.round(buf[0][i] * 255);
    out[i * 4 + 1] = Math.round(buf[1][i] * 255);
    out[i * 4 + 2] = Math.round(buf[2][i] * 255);
    out[i * 4 + 3] = 255;
  }
  maskCache.set(kind, out);
  return out;
}

// Road centre x (fraction) at height y (fraction) along a polyline.
export function roadX(road: Pt[], y: number) {
  for (let i = 0; i + 1 < road.length; i++) {
    const a = road[i], b = road[i + 1];
    if (y >= a.y && y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / Math.max(1e-6, b.y - a.y);
  }
  return road.at(-1)!.x;
}

// ---------- Sections ----------
// One straight chunk per tile, one fork chunk per choice. The picked lane leads to its own straight chunk.
export type Section = { kind: Kind; T: number; seg?: Segment; ghost?: boolean; n?: number; chosen?: number; side: number };
export const isChoice = (s?: Segment) => s?.el.type === "fork" || s?.el.type === "thisthat";
export const choiceOpts = (s: Segment) => (s.el.type === "fork" ? s.el.opts : s.el.type === "thisthat" ? [s.el.a, s.el.b] : []);

export type Layout = { sections: Section[]; maxS: number; Hc: number; Z: number };
export function layout(segs: Segment[], gate: number, paving: boolean, W: number, H: number): Layout {
  const Hc = Math.max(H, (CH * W) / CW), Z = Hc; // one screen of scroll drives one fork zoom
  const out: Section[] = [];
  let T = 0, next: Kind | null = null, k = 0;
  const upto = gate >= 0 ? segs.slice(0, gate + 1) : segs;
  for (const seg of upto) {
    if (isChoice(seg)) {
      const n = Math.min(3, Math.max(2, choiceOpts(seg).length));
      const kind: Kind = n === 3 ? "fork-3" : "fork-2";
      const chosen = seg.answer?.option_index ?? -1;
      out.push({ kind, T, seg, n, chosen, side: 0 });
      if (chosen < 0) { next = null; break; }
      next = CHUNKS[kind].branches![Math.min(chosen, n - 1)].leadsTo;
      T += Z;
    } else {
      out.push({ kind: next ?? STRAIGHTS[k++ % 3], T, seg, side: out.length % 2 ? 1 : -1 });
      next = null;
      T += Hc;
    }
  }
  const last = out.at(-1);
  const open = last && last.chosen !== undefined && last.chosen < 0;
  // A picked fork always gets its lead-in chunk, even while the next tile is still being paved.
  if (!open && (paving || next)) { out.push({ kind: next ?? STRAIGHTS[k % 3], T, ghost: true, side: out.length % 2 ? 1 : -1 }); }
  const end = out.at(-1);
  const maxS = end ? end.T + Math.max(0, Hc - H) : 0;
  return { sections: out, maxS, Hc, Z };
}

// Scroll value at which a picked fork's zoom ends (its lead-in chunk fills the screen).
export const zoomEnd = (L: Layout, sec: Section, H: number) => sec.T + Math.max(0, L.Hc - H) + L.Z;

// ---------- Camera ----------
export type Rect = { x: number; y: number; w: number; h: number };
export type Placed = { sec: Section; i: number; r: Rect; lanes: [number, number, number]; cut?: Rect; zoom: number };

export function camera(L: Layout, s: number, W: number, H: number): Placed[] {
  const { sections, Hc, Z } = L;
  // The active fork is the last picked fork whose zoom has started.
  let f = -1, e = 0;
  sections.forEach((sec, i) => {
    if (sec.chosen === undefined || sec.chosen < 0) return;
    const s0 = sec.T + Math.max(0, Hc - H);
    if (s >= s0) { f = i; e = Math.min(1, (s - s0) / Z); }
  });
  const lanesOf = (sec: Section): [number, number, number] => {
    if (sec.chosen === undefined || sec.chosen < 0) return [1, 1, 1];
    const w = [0.3, 0.3, sec.n === 2 ? 1 : 0.3] as [number, number, number];
    w[sec.chosen] = 1;
    return w;
  };
  const out: Placed[] = [];
  if (f < 0) {
    sections.forEach((sec, i) => out.push({ sec, i, r: { x: 0, y: sec.T - s, w: W, h: Hc }, lanes: lanesOf(sec), zoom: 1 }));
  } else {
    const fs = sections[f], br = CHUNKS[fs.kind].branches![fs.chosen!], win = br.window;
    const zmax = 1 / win.w, z = Math.pow(zmax, e), camW = 1 / z, t = (1 - camW) / (1 - win.w);
    const cx = t * win.x, s1 = fs.T + Math.max(0, Hc - H) + Z;
    const bottom = H - Math.max(0, s - s1);
    const fr: Rect = { w: W * z, h: Hc * z, x: -cx * W * z, y: bottom - Hc * z };
    const lead: Rect = { x: fr.x + win.x * fr.w, y: fr.y + win.y * fr.h, w: win.w * fr.w, h: win.h * fr.h };
    if (f > 0) { const p = sections[f - 1]; out.push({ sec: p, i: f - 1, r: { x: fr.x, y: fr.y - fr.h, w: fr.w, h: fr.h }, lanes: lanesOf(p), zoom: z }); }
    out.push({ sec: fs, i: f, r: fr, lanes: lanesOf(fs), cut: lead, zoom: z });
    for (let i = f + 1; i < sections.length; i++) {
      out.push({ sec: sections[i], i, r: { x: lead.x, y: lead.y + (i - f - 1) * lead.h, w: lead.w, h: lead.h }, lanes: lanesOf(sections[i]), zoom: lead.w / W });
    }
  }
  return out.filter((p) => p.r.y < H && p.r.y + p.r.h > 0 && p.r.x < W && p.r.x + p.r.w > 0);
}

// Where a pin or lane label sits, in screen points, for a placed chunk.
export const at = (p: Placed, fx: number, fy: number) => ({ x: p.r.x + fx * p.r.w, y: p.r.y + fy * p.r.h });
export function lanePoint(kind: Kind, lane: number) {
  const br = CHUNKS[kind].branches![lane], y = kind === "fork-3" ? 0.6 : 0.56;
  return { x: roadX(br.road, y), y };
}
export function straightPoint(kind: Kind, side: number) {
  const road = CHUNKS[kind].road!, y = 0.5, x = roadX(road, y);
  return { x: x + (side * 40) / CW, y, roadX: x };
}

// Swipe at an open fork: left swipe picks the left lane, right swipe the right lane,
// an upward swipe (scrolling down the road) picks the middle lane of a 3-lane fork. -1 means no pick.
export function laneForSwipe(dx: number, dy: number, n: number, min = 40): number {
  if (Math.abs(dx) >= min && Math.abs(dx) > Math.abs(dy)) return dx < 0 ? 0 : n - 1;
  if (n === 3 && dy <= -min && Math.abs(dy) >= Math.abs(dx)) return 1;
  return -1;
}
