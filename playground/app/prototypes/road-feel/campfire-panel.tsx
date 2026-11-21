"use client";

import { Button } from "@/components/ui/button";
import type { Action, Ride } from "./ride";

const MOODS = ["stressed", "meh", "okay", "good"];

export function CampfirePanel({ ride, dispatch }: { ride: Ride; dispatch: (a: Action) => void }) {
  return (
    <div className="fixed inset-x-3 top-1/3 z-30 mx-auto max-w-sm rounded-2xl bg-card/95 p-4 text-card-foreground shadow-xl backdrop-blur" data-testid="campfire">
      <p className="text-base font-medium">You reached Rome.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        ${ride.paid?.amount} a month, automatically, into your {ride.paid?.account.toUpperCase()}. The road ends here. Nothing left to scroll.
      </p>
      {ride.moodAfter ? (
        <p className="mt-3 text-sm">Thanks. Mood after: {ride.moodAfter}.</p>
      ) : (
        <>
          <p className="mt-3 text-sm">And now, how does money feel?</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {MOODS.map((m) => (
              <Button key={m} variant="outline" className="h-11" onClick={() => dispatch({ type: "mood-after", mood: m })}>
                {m}
              </Button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
