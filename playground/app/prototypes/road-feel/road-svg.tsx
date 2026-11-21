"use client";

import { CANVAS, ROAD, VP } from "./data";
import { project, roadPolygon } from "./projection";
import { forkAhead, type Ride } from "./ride";

const ASPHALT = "#3f444b";
const EDGE = "#e9e2cf";
const LANE = (i: number, n: number, k: number) => (i - (n - 1) / 2) * 620 * k;

/** The road in canvas units: paved part, centre dashes moving with you, fork lanes, unpaved fog, Rome. */
export function RoadSvg({ ride, now }: { ride: Ride; now: number }) {
  const { d, amp } = ride;
  const fork = forkAhead(ride);
  const last = ride.placed.at(-1);
  const pavedEnd = fork ? Math.max(0, fork.dist) : last ? Math.min(ROAD.depth, last.z - d + 260) : 600;
  const paving = now - ride.paving < 900;
  const dashes = Array.from({ length: 24 }, (_, k) => 140 * k - (d % 140)).filter((r) => r > 0 && r < pavedEnd);
  return (
    <svg viewBox={`0 0 ${CANVAS.w} ${CANVAS.h}`} className="absolute inset-0 size-full" preserveAspectRatio="none">
      {/* Rome on the horizon: always visible, grows as you near it */}
      <g transform={`translate(${VP.x} ${VP.y - 8}) scale(${0.6 + 2.2 * Math.min(1, d / 9000)})`} opacity={0.9}>
        <rect x={-34} y={-10} width={68} height={10} fill={EDGE} />
        {[-26, -13, 0, 13, 26].map((x) => (
          <rect key={x} x={x - 3} y={-34} width={6} height={24} fill={EDGE} />
        ))}
        <rect x={-38} y={-42} width={76} height={8} fill={EDGE} />
        <path d="M-20,-42 A20,16 0 0 1 20,-42 Z" fill={EDGE} />
      </g>
      {/* unpaved: faint track to Rome */}
      <polyline points={Array.from({ length: 20 }, (_, i) => { const r = pavedEnd + ((ROAD.depth - pavedEnd) * i) / 19; const p = project(r, d, amp); return `${p.x},${p.y}`; }).join(" ")} fill="none" stroke={EDGE} strokeOpacity={0.35} strokeWidth={6} strokeDasharray="4 22" />
      <polygon points={roadPolygon(d, amp, pavedEnd)} fill={ASPHALT} stroke={EDGE} strokeWidth={5} strokeOpacity={0.9} />
      {fork &&
        fork.p.item.branches!.map((b, i, all) => (
          <polygon
            key={b.value}
            points={roadPolygon(d, amp, Math.min(ROAD.depth, fork.dist + 1600), (r) => LANE(i, all.length, Math.min(1, Math.max(0, (r - fork.dist) / 700))), Math.max(0, fork.dist))}
            fill={ASPHALT}
            fillOpacity={i === ride.lane ? 1 : 0.45}
            stroke={EDGE}
            strokeOpacity={i === ride.lane ? 1 : 0.35}
            strokeWidth={5}
          />
        ))}
      {dashes.map((r) => {
        const a = project(r, d, amp);
        const b = project(r + 55, d, amp);
        return <line key={r.toFixed(0)} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={EDGE} strokeWidth={Math.max(2, 18 * a.t)} strokeLinecap="round" />;
      })}
      {paving && (
        <polygon points={roadPolygon(d, amp, pavedEnd, () => 0, Math.min(pavedEnd, 520))} fill="none" stroke={EDGE} strokeWidth={10} strokeDasharray="30 30" className="animate-pulse" />
      )}
    </svg>
  );
}

export { LANE };
