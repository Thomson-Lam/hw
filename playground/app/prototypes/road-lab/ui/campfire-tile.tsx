"use client";

import { Button } from "@/components/ui/button";
import type { RoadSession, Snapshot } from "../engine/session";
import { MoodTile } from "./mood-tile";

export function CampfireTile({ session, snap, onRestart }: { session: RoadSession; snap: Snapshot; onRestart: () => void }) {
  const e = snap.effect;
  return (
    <div className="flex flex-col gap-3" data-testid="campfire">
      <p className="text-base font-medium">You reached Rome.</p>
      {e && (
        <p className="text-sm text-muted-foreground" data-testid="effect">
          {e.name === "contribute" && `Automatic contribution set: $${e.params.amount} a month into your ${String(e.params.account).toUpperCase()} (simulated).`}
          {e.name === "book" && `Booked: ${e.params.care}, ${e.params.slot} (simulated).`}
          {e.name === "save-pick" && `Saved to your merch board: ${e.params.title} (${e.params.license}).`}
        </p>
      )}
      {snap.ended === "rome" ? (
        <Button variant="outline" className="h-11" onClick={onRestart}>
          New road
        </Button>
      ) : (
        <MoodTile session={session} when="after" chosen={null} />
      )}
    </div>
  );
}
