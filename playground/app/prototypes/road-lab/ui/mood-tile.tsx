"use client";

import { Button } from "@/components/ui/button";
import type { RoadSession } from "../engine/session";

export const MOODS = ["stressed", "meh", "okay", "good"];

export function MoodTile({ session, when, chosen, onDone }: { session: RoadSession; when: "before" | "after"; chosen: string | null; onDone?: () => void }) {
  const q = when === "before" ? (session.pack.moodQuestion ?? "How do you feel right now?") : "And now?";
  return (
    <div className="flex flex-col gap-2">
      <p className="text-base">{q}</p>
      <div className="grid grid-cols-2 gap-2">
        {MOODS.map((m) => (
          <Button
            key={m}
            variant={chosen === m ? "default" : "outline"}
            className="h-11"
            onClick={() => {
              session.setMood(when, m);
              onDone?.();
            }}
            data-testid={`mood-${when}`}
          >
            {m}
          </Button>
        ))}
      </div>
    </div>
  );
}
