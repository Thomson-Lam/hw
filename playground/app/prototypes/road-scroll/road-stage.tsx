import { Fog } from "./fog";
import { bob, viewBoxFor } from "./geometry";
import { Goal } from "./goal";
import { MountainLayers } from "./mountain-layers";
import { Rider } from "./rider";
import { Road } from "./road";
import type { Frame, RoadControls } from "./types";

export function RoadStage({ frame, controls, reducedMotion, aspect }: { frame: Frame; controls: RoadControls; reducedMotion: boolean; aspect: number }) {
  return (
    <svg viewBox={viewBoxFor(aspect)} preserveAspectRatio="xMidYMax slice" className="size-full" role="img" aria-label="Road toward Rome">
      <Goal curve={frame.curve} progress={frame.progress} />
      <MountainLayers seed={controls.seed} count={controls.layers} curve={frame.curve} parallax={controls.parallax} />
      {controls.fog && <Fog />}
      <Road frame={frame} dashCount={controls.dashes} />
      <Rider lift={reducedMotion ? 0 : bob(frame.distance)} stride={reducedMotion ? 0 : frame.distance} />
    </svg>
  );
}
