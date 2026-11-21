import { VIEW } from "./data";

export function Fog() {
  return (
    <g>
      <defs>
        <linearGradient id="road-scroll-fog" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopOpacity={0} className="[stop-color:var(--background)]" />
          <stop offset="0.45" stopOpacity={0.85} className="[stop-color:var(--background)]" />
          <stop offset="1" stopOpacity={0} className="[stop-color:var(--background)]" />
        </linearGradient>
      </defs>
      <rect x={-2 * VIEW.w} y={VIEW.horizon - 70} width={VIEW.w * 5} height={150} fill="url(#road-scroll-fog)" />
    </g>
  );
}
