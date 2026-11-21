import { VIEW } from "./data";

/** Horse and rider seen from behind. Bob comes from scroll distance, so it stops when you stop. */
export function Rider({ lift, stride }: { lift: number; stride: number }) {
  const leg = Math.sin(stride * Math.PI * 2) * 5;
  return (
    <g transform={`translate(${VIEW.w / 2} ${VIEW.h - 48 - lift}) scale(0.8)`}>
      <g className="fill-foreground">
        <rect x={-19} y={-4} width={10} height={44 + leg} rx={5} />
        <rect x={9} y={-4} width={10} height={44 - leg} rx={5} />
        <path d="M-30,-8 C-32,-34 -18,-44 0,-44 C18,-44 32,-34 30,-8 C28,6 14,10 0,10 C-14,10 -28,6 -30,-8 Z" />
        <path d="M-3,0 C-5,14 -2,30 0,36 C2,30 5,14 3,0 Z" className="fill-background" fillOpacity={0.35} />
        <path d="M-8,-40 L8,-40 L6,-74 L-6,-74 Z" />
        <path d="M-7,-74 L-9,-86 L-3,-80 Z M7,-74 L9,-86 L3,-80 Z" />
      </g>
      <g className="fill-primary">
        <path d="M-16,-46 C-12,-56 12,-56 16,-46 L11,-84 C6,-90 -6,-90 -11,-84 Z" />
        <circle cx={0} cy={-98} r={10} />
      </g>
    </g>
  );
}
