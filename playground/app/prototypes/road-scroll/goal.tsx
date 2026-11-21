import { VIEW } from "./data";
import { goalScale, vanishingPoint } from "./geometry";

/** Rome on the horizon: always visible, grows as you approach. */
export function Goal({ curve, progress }: { curve: number; progress: number }) {
  const v = vanishingPoint(curve);
  const s = goalScale(progress);
  return (
    <g transform={`translate(${v.x} ${VIEW.horizon}) scale(${s})`} className="fill-primary">
      <rect x={-22} y={-6} width={44} height={6} />
      {[-18, -9, 0, 9, 18].map((x) => (
        <rect key={x} x={x - 1.5} y={-20} width={3} height={14} />
      ))}
      <rect x={-22} y={-24} width={44} height={4} />
      <path d="M-12,-24 A12,10 0 0 1 12,-24 Z" />
    </g>
  );
}
