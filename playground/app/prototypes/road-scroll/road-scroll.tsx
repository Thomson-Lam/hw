"use client";

import { useRef } from "react";
import { ControlPanel, PrototypeShell, useControls } from "@/lib/controls";
import { SLUG, controlSchema } from "./data";
import { frameAt } from "./geometry";
import { RoadStage } from "./road-stage";
import { ScrollHint } from "./scroll-hint";
import { useAspect, usePrefersReducedMotion, useScrollProgress } from "./use-scroll-progress";

export function RoadScroll() {
  const controls = useControls(SLUG, controlSchema);
  const track = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(track);
  const aspect = useAspect(stage);
  const reducedMotion = usePrefersReducedMotion();
  const v = controls.values;
  const frame = frameAt(progress, v);

  return (
    <PrototypeShell panel={<ControlPanel controls={controls} />}>
      <div ref={track} style={{ height: `${v.roadLength}dvh` }}>
        <div ref={stage} className="sticky top-0 mx-auto h-dvh max-w-2xl overflow-hidden bg-background">
          <RoadStage frame={frame} controls={v} reducedMotion={reducedMotion} aspect={aspect} />
          <ScrollHint visible={progress < 0.02} />
        </div>
      </div>
    </PrototypeShell>
  );
}
