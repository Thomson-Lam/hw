import { useMemo } from "react";
import { layerOffset, layerOpacity, ridgePath } from "./geometry";

export function MountainLayers({ seed, count, curve, parallax }: { seed: number; count: number; curve: number; parallax: number }) {
  const paths = useMemo(() => Array.from({ length: count }, (_, i) => ridgePath(seed, i, count)), [seed, count]);
  return (
    <g>
      {paths.map((d, i) => (
        <path
          key={i}
          d={d}
          className="fill-foreground"
          fillOpacity={layerOpacity(i, count)}
          transform={`translate(${layerOffset(curve, i, count, parallax).toFixed(2)} 0)`}
        />
      ))}
    </g>
  );
}
