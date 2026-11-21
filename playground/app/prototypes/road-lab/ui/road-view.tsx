"use client";

import { useEffect, useRef } from "react";
import type { RoadSession, Snapshot } from "../engine/session";
import { TileCard } from "./tile-card";

/** The road: one tile per screen-ish. A tile crossing the middle of the viewport is where the horse is. */
export function RoadView({ session, snap, onRestart }: { session: RoadSession; snap: Snapshot; onRestart: () => void }) {
  const list = useRef<HTMLOListElement>(null);
  // Re-observe whenever any tile changes identity (LLM replacements keep the count but swap the elements).
  const ids = snap.road.map((r) => r.id).join(",");

  useEffect(() => {
    const root = list.current;
    if (!root) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) session.visit(Number((e.target as HTMLElement).dataset.index));
      },
      { rootMargin: "-45% 0px -45% 0px" },
    );
    root.querySelectorAll("[data-index]").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [session, ids]);

  return (
    <ol ref={list} className="mx-auto max-w-md px-4 pb-[40dvh]">
      {snap.road.map((rt, i) => (
        <li key={rt.id} data-index={i} data-kind={rt.tile.kind} data-source={rt.source} className="flex min-h-[55dvh] flex-col justify-center border-l-2 border-dashed border-border py-6 pl-4">
          <TileCard session={session} snap={snap} rt={rt} index={i} onRestart={onRestart} />
        </li>
      ))}
      {snap.waiting === "search" && <li className="py-6 pl-4 text-sm text-muted-foreground">Scouting the trail…</li>}
    </ol>
  );
}
