"use client";

import { Button } from "@/components/ui/button";
import type { RoadSession, RoadTile, Snapshot } from "../engine/session";
import { rowOf } from "../packs/merch-trail";

export function ForkTile({ session, snap, rt, index }: { session: RoadSession; snap: Snapshot; rt: RoadTile; index: number }) {
  if (rt.tile.kind !== "fork") return null;
  const fork = rt.tile;
  const open = rt.chosen === undefined && index === snap.road.length - 1;
  return (
    <div className="flex flex-col gap-2" data-testid="fork">
      <p className="text-sm text-muted-foreground">{open ? "The road forks. Tap a sign." : "You chose:"}</p>
      {fork.branches.map((b, i) => {
        const label = fork.key === "pick" ? (rowOf(snap.ctx, b.result ?? "")?.title ?? b.result) : b.label;
        const chosen = rt.chosen === i;
        return (
          <Button
            key={i}
            variant={chosen ? "default" : "outline"}
            className="h-auto min-h-11 justify-start px-4 py-2 text-left whitespace-normal"
            disabled={!open && !chosen}
            onClick={() => open && session.choose(index, i)}
            data-testid="branch"
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
}
