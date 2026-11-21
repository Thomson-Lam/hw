import { dashes, roadPath } from "./geometry";
import type { Frame } from "./types";

export function Road({ frame, dashCount }: { frame: Frame; dashCount: number }) {
  return (
    <g>
      <path d={roadPath(frame.curve)} className="fill-background stroke-border" strokeWidth={2} />
      {dashes(frame, dashCount).map((d, i) => (
        <rect key={i} x={d.x - d.w / 2} y={d.y - d.h / 2} width={d.w} height={d.h} rx={d.w / 2} className="fill-muted-foreground" />
      ))}
    </g>
  );
}
