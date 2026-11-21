"use client";

import { useEffect, useState } from "react";
import { factText } from "../engine/compiler";
import { LINGER_MS } from "../engine/horse";
import type { Ctx, Pace, Pack } from "../types";

/** Pace is applied at render: rushers get one line, lingerers get the whole fact. Linger on a tile and it unfolds. */
export function FactText({ pack, ctx, id, pace, active }: { pack: Pack; ctx: Ctx; id: string; pace: Pace; active: boolean }) {
  const [unfolded, setUnfolded] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setUnfolded(true), LINGER_MS);
    return () => clearTimeout(timer);
  }, [active]);
  const long = pace === "linger" || unfolded;
  const source = pack.facts(ctx)[id]?.source;
  return (
    <div className="flex flex-col gap-1" data-unfolded={long || undefined}>
      <p className="text-base">{factText(pack, ctx, id, false)}</p>
      <div className="grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: long ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <p className="pt-1 text-sm text-muted-foreground">{factText(pack, ctx, id, true)}</p>
          {source && <p className="pt-1 text-xs text-muted-foreground">Source: {source}</p>}
        </div>
      </div>
    </div>
  );
}
