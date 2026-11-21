"use client";

import { Badge } from "@/components/ui/badge";
import type { RoadSession, RoadTile, Snapshot } from "../engine/session";
import { CampfireTile } from "./campfire-tile";
import { FactText } from "./fact-text";
import { ForkTile } from "./fork-tile";
import { HelpTile } from "./help-tile";
import { MoodTile } from "./mood-tile";
import { PickTile } from "./pick-tile";
import { TollBooth } from "./toll-booth";

const NAMES: Record<string, string> = { "toll-booth": "toll booth" };

export function TileCard({ session, snap, rt, index, onRestart }: { session: RoadSession; snap: Snapshot; rt: RoadTile; index: number; onRestart: () => void }) {
  const t = rt.tile;
  const active = index === snap.pos;
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground" data-active={active || undefined}>
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{NAMES[t.kind] ?? t.kind}</Badge>
        <Badge variant="outline" data-testid="source">
          {rt.source}
        </Badge>
      </div>
      {t.kind === "mood" && <MoodTile session={session} when={t.when} chosen={t.when === "before" ? snap.ctx.mood : null} />}
      {t.kind === "signpost" && (t.fact ? <FactText pack={session.pack} ctx={snap.ctx} id={t.fact} pace={snap.pace} active={active} /> : <p className="text-base">{t.label}</p>)}
      {t.kind === "vista" && (t.fact ? <FactText pack={session.pack} ctx={snap.ctx} id={t.fact} pace={snap.pace} active={active} /> : <p className="text-base">{t.label}</p>)}
      {t.kind === "bridge" && <FactText pack={session.pack} ctx={snap.ctx} id={t.fact} pace={snap.pace} active={active} />}
      {t.kind === "fog" && <p className="text-sm text-muted-foreground">Fog. It clears as you move.</p>}
      {t.kind === "checkpoint" && <FactText pack={session.pack} ctx={snap.ctx} id={t.check} pace={snap.pace} active={active} />}
      {t.kind === "fork" && <ForkTile session={session} snap={snap} rt={rt} index={index} />}
      {t.kind === "search" && (
        <p className="text-sm">
          Scouting Printables for “{t.query}”
          {snap.ctx.seen.includes("results:done") ? ` · ${snap.ctx.results.length} usable models` : "…"}
        </p>
      )}
      {t.kind === "pick" && <PickTile ctx={snap.ctx} id={t.result} near={Math.abs(index - snap.pos) <= 1} />}
      {t.kind === "toll-booth" && <TollBooth session={session} snap={snap} rt={rt} index={index} />}
      {t.kind === "campfire" && <CampfireTile session={session} snap={snap} onRestart={onRestart} />}
      {t.kind === "help" && <HelpTile />}
    </div>
  );
}
