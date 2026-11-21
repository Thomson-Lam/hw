"use client";

import { cn } from "@/lib/utils";
import { CANVAS, ROAD } from "./data";
import { pct, project } from "./projection";
import { forkAhead, type Action, type Ride } from "./ride";
import type { Placed } from "./types";

const KIND_LABEL: Record<string, string> = { sign: "signpost", vista: "vista", bridge: "bridge", checkpoint: "checkpoint", fork: "fork", toll: "toll booth", campfire: "campfire" };

/** Signs stand beside the road and grow as you approach. Rush: one line. Linger: they unfold. */
export function RoadItems({ ride, dispatch }: { ride: Ride; dispatch: (a: Action) => void }) {
  const fork = forkAhead(ride);
  const visible = ride.placed.filter((p) => {
    const r = p.z - ride.d;
    return r > 30 && r < ROAD.depth && p.item.kind !== "toll" && p.item.kind !== "campfire";
  });
  return (
    <>
      {visible.map((p) => (
        <Card key={p.uid} p={p} ride={ride} />
      ))}
      {fork && fork.dist < 1500 && <ForkSigns ride={ride} p={fork.p} dist={fork.dist} dispatch={dispatch} />}
    </>
  );
}

function place(r: number, ride: Ride, lateral: number) {
  const pt = project(r, ride.d, ride.amp, lateral);
  const s = Math.min(1.05, Math.max(0.16, pt.t * 1.45));
  return { left: pct(pt.x, CANVAS.w), top: pct(pt.y, CANVAS.h), s, t: pt.t };
}

function Card({ p, ride }: { p: Placed; ride: Ride }) {
  const r = p.z - ride.d;
  const it = p.item;
  if (it.kind === "fork") return null;
  const lateral = it.kind === "checkpoint" || it.kind === "bridge" ? 0 : (it.side === "left" || it.kind === "vista" ? -1 : 1) * (ROAD.halfWidth + 170);
  const { left, top, s, t } = place(r, ride, lateral);
  const open = ride.pace === "linger" || ride.unfolded.includes(p.uid);
  const rush = ride.pace === "rush";
  const fade = Math.min(1, (r - 30) / 140) * Math.min(1, t * 4);
  return (
    <div
      className="absolute w-[260px] origin-bottom"
      style={{ left, top, transform: `translate(-50%, ${it.kind === "checkpoint" ? "-160%" : "-100%"}) scale(${s})`, opacity: fade, zIndex: Math.round(t * 100) }}
    >
      <div
        className={cn(
          "rounded-xl border bg-card/90 p-3 text-card-foreground shadow-lg backdrop-blur",
          it.kind === "checkpoint" ? "border-primary border-2" : "border-border",
          it.kind === "vista" && "bg-muted/80",
        )}
      >
        <p className="mb-1 text-[11px] tracking-wide text-muted-foreground uppercase">{KIND_LABEL[it.kind]}</p>
        <p className={cn("text-sm leading-snug", rush && "line-clamp-1")}>{it.title}</p>
        {it.detail && (
          <div className="grid transition-[grid-template-rows] duration-500 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: open && !rush ? "1fr" : "0fr" }}>
            <p className="overflow-hidden pt-1 text-xs text-muted-foreground">{it.detail}</p>
          </div>
        )}
      </div>
      {it.kind !== "checkpoint" && <div className="mx-auto h-10 w-1.5 bg-muted-foreground/60" />}
    </div>
  );
}

function ForkSigns({ ride, p, dist, dispatch }: { ride: Ride; p: Placed; dist: number; dispatch: (a: Action) => void }) {
  const branches = p.item.branches!;
  const head = place(Math.max(40, dist), ride, 0);
  // One signpost with an arm per lane, at the split. Swipe or tap to pick; riding past the split commits.
  return (
    <div className="absolute flex w-[340px] flex-col items-center gap-2" style={{ left: head.left, top: head.top, transform: `translate(-50%, -110%) scale(${Math.max(0.6, head.s)})`, transformOrigin: "bottom center", zIndex: 120 }} data-testid="fork">
      <p className="rounded-full bg-background/85 px-4 py-1.5 text-center text-sm font-medium text-foreground shadow backdrop-blur">{p.item.prompt}</p>
      <div className="flex gap-2">
        {branches.map((b, i) => {
          const on = i === ride.lane;
          return (
            <button
              key={b.value}
              type="button"
              onClick={() => dispatch({ type: "lane", index: i })}
              className={cn(
                "min-h-11 rounded-lg border-2 px-3 py-2 text-sm font-medium shadow-lg transition-[transform,background-color] duration-200 ease-out",
                on ? "-translate-y-1 border-primary bg-primary text-primary-foreground" : "border-border bg-card/90 text-card-foreground",
              )}
              data-testid="lane"
              aria-pressed={on}
            >
              {i < ride.lane ? "← " : ""}
              {b.label}
              {i > ride.lane ? " →" : ""}
            </button>
          );
        })}
      </div>
      <div className="h-8 w-1.5 bg-muted-foreground/60" />
    </div>
  );
}
