"use client";

import { MapIcon, Undo2Icon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import type { RoadSession, Snapshot } from "../engine/session";

/** Map legend: rules learned from the user's path (erasable) and grown tiles (undoable). */
export function Legend({ session, snap }: { session: RoadSession; snap: Snapshot }) {
  const n = snap.rules.length + snap.grown.length;
  return (
    <Sheet>
      <SheetTrigger render={<Button variant="outline" className="h-11 min-w-11" aria-label={`Legend, ${n} rules and tiles`} data-testid="legend" />}>
        <MapIcon />
        <span className="tabular-nums">{n}</span>
      </SheetTrigger>
      <SheetContent side="bottom" className="max-h-[75dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
        <SheetHeader>
          <SheetTitle>Your rules</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-2 px-4">
          {snap.rules.length === 0 && <p className="text-sm text-muted-foreground">None yet. Roads you skip twice become rules.</p>}
          {snap.rules.map((r) => (
            <div key={r.id} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border px-3" data-testid="rule">
              <code className="text-sm break-words whitespace-pre-wrap">{r.form}</code>
              <Button variant="ghost" className="size-11" aria-label={`Erase ${r.form}`} onClick={() => void session.eraseRule(r.id)} data-testid="erase-rule">
                <XIcon />
              </Button>
            </div>
          ))}
          {snap.grown.length > 0 && <p className="pt-2 text-sm font-medium">Grown tiles</p>}
          {snap.grown.map((g) => (
            <div key={g.id ?? g.name} className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-border px-3">
              <code className="text-xs break-words whitespace-pre-wrap">{g.form}</code>
              {g.id !== undefined && (
                <Button variant="ghost" className="size-11" aria-label={`Undo ${g.name}`} onClick={() => void session.undoGrown(g.id!)}>
                  <Undo2Icon />
                </Button>
              )}
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
