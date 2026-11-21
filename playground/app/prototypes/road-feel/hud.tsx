"use client";

import { MapIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { Action, Ride } from "./ride";

const GAIT = { rush: "gallop", steady: "trot", linger: "walk" } as const;

/** Rome progress, the horse's gait, and the map legend of rules you grew (erasable). */
export function Hud({ ride, progress, dispatch }: { ride: Ride; progress: number; dispatch: (a: Action) => void }) {
  return (
    <header className="fixed inset-x-0 top-0 z-30 px-3 pt-[max(0.5rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex max-w-2xl items-center gap-2 rounded-2xl bg-background/70 py-1.5 pr-1.5 pl-14 shadow backdrop-blur">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs text-muted-foreground">Rome · an automatic contribution</p>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
        <Badge variant="outline" className="h-7" data-testid="gait">
          {GAIT[ride.pace]}
        </Badge>
        <Sheet>
          <SheetTrigger render={<Button variant="ghost" className="h-11 min-w-11" aria-label="Map legend" data-testid="legend" />}>
            <MapIcon />
            <span className="tabular-nums">{ride.avoid.length}</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SheetHeader>
              <SheetTitle>Map legend</SheetTitle>
            </SheetHeader>
            <div className="flex flex-col gap-2 px-4">
              {ride.avoid.length === 0 && <p className="text-sm text-muted-foreground">Roads you skip twice become rules here.</p>}
              {ride.avoid.map((t) => (
                <div key={t} className="flex min-h-11 items-center justify-between rounded-lg border border-border px-3">
                  <code className="text-sm">(avoid {t})</code>
                  <Button variant="ghost" className="size-11" aria-label={`Erase avoid ${t}`} onClick={() => dispatch({ type: "erase", topic: t })}>
                    <XIcon />
                  </Button>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
