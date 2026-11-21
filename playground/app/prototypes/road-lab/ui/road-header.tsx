"use client";

import { LogOutIcon, PhoneIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { RoadSession, Snapshot } from "../engine/session";
import { Legend } from "./legend";

export function RoadHeader({ session, snap, onRestart }: { session: RoadSession; snap: Snapshot; onRestart: () => void }) {
  const pack = session.pack;
  const steps = pack.requirements(snap.ctx).length;
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
      <div className="mx-auto flex max-w-md items-center gap-2 py-2 pr-2 pl-14">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{pack.title}</p>
          <p className="truncate text-xs text-muted-foreground" data-testid="rome">
            Rome: {pack.rome} · {snap.ended === "rome" ? "arrived" : `${steps} step${steps === 1 ? "" : "s"} left`}
          </p>
        </div>
        <Badge variant="outline" data-testid="pace">
          {snap.pace}
        </Badge>
        <Legend session={session} snap={snap} />
        {pack.crisisExit && (
          <Button variant="outline" className="h-11 min-w-11" aria-label="Crisis help: call or text 9-8-8" onClick={() => session.crisis()} data-testid="crisis-exit">
            <PhoneIcon />
            <span className="hidden sm:inline">9-8-8</span>
          </Button>
        )}
        <Button
          variant="ghost"
          className="h-11 min-w-11"
          aria-label="Leave the road"
          onClick={() => {
            session.exit();
            onRestart();
          }}
          data-testid="exit"
        >
          <LogOutIcon />
          <span className="hidden sm:inline">Exit</span>
        </Button>
      </div>
    </header>
  );
}
