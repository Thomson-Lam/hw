"use client";

import { useCallback } from "react";
import { BrainTicker } from "./brain-ticker";
import { CampfirePanel } from "./campfire-panel";
import { Horse } from "./horse";
import { Hud } from "./hud";
import { forkAhead, roman } from "./ride";
import { RoadItems } from "./road-items";
import { RoadSvg } from "./road-svg";
import { Scene } from "./scene";
import { TollPanel } from "./toll-panel";
import { useRide, useSteer } from "./use-ride";

export function RoadFeel() {
  const { ride, dispatch } = useRide();
  const steer = useCallback((dir: -1 | 1) => dispatch({ type: "steer", dir }), [dispatch]);
  useSteer(steer);
  if (!ride) return <div className="h-dvh" />;

  const now = ride.t;
  const fork = forkAhead(ride);
  const lanes = fork?.p.item.branches?.length ?? 1;
  const shift = fork && fork.dist < 900 ? (ride.lane - (lanes - 1) / 2) * 60 * (1 - Math.max(0, fork.dist) / 900) : 0;
  const toll = ride.placed.find((p) => p.item.id === "toll");
  const atToll = !!toll && !ride.paid && toll.z - ride.d < 420;
  const fire = ride.placed.find((p) => p.item.id === "campfire");
  const atFire = !!fire && fire.z - ride.d < 420;

  return (
    <div className="touch-pan-y overflow-x-hidden">
      <style>{`@keyframes gait { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4%) } }`}</style>
      <Scene progress={roman(ride)} sway={ride.amp}>
        <RoadSvg ride={ride} now={now} />
        <RoadItems ride={ride} dispatch={dispatch} />
      </Scene>
      <Horse pace={ride.pace} shift={shift} />
      <Hud ride={ride} progress={roman(ride)} dispatch={dispatch} />
      <BrainTicker items={ride.ticker} now={now} />
      {ride.d < 150 && (
        <p className="fixed inset-x-0 top-1/2 z-20 text-center text-sm font-medium text-foreground drop-shadow">
          Scroll to ride. Swipe ← → to steer at forks.
        </p>
      )}
      {atToll && <TollPanel ride={ride} dispatch={dispatch} />}
      {atFire && <CampfirePanel ride={ride} dispatch={dispatch} />}
      {/* the road you scroll down: its length is the journey */}
      <div style={{ height: 40000 }} />
    </div>
  );
}
