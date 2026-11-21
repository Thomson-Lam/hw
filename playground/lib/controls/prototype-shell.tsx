"use client";

import { SlidersHorizontalIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

/**
 * Layout for prototypes with a control panel.
 * Desktop (lg+): panel in a sticky side column, never covering the subject.
 * Mobile: floating button opens the panel as a bottom sheet.
 */
export function PrototypeShell({ panel, children, title = "Controls" }: { panel: ReactNode; children: ReactNode; title?: string }) {
  return (
    <div className="lg:flex">
      <main className="min-w-0 flex-1">{children}</main>
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 self-start overflow-y-auto border-l border-border bg-background p-4 lg:block">
        <h2 className="mb-4 text-sm font-medium">{title}</h2>
        {panel}
      </aside>
      <div data-capture-hide className="fixed right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 lg:hidden">
        <Sheet>
          <SheetTrigger render={<Button variant="secondary" className="h-11 min-w-11 rounded-full shadow-md" aria-label={title} />}>
            <SlidersHorizontalIcon />
            <span className="hidden sm:inline">{title}</span>
          </SheetTrigger>
          <SheetContent side="bottom" className="max-h-[75dvh] overflow-y-auto pb-[max(1rem,env(safe-area-inset-bottom))]">
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <div className="px-4">{panel}</div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
