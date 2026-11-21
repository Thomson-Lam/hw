"use client";

import { useEffect, useState } from "react";
import type { Ctx } from "../types";

export type Ev = { id: number; t: number; stage: string; [k: string]: unknown };
export type RunInfo = { id: number; pack: string; device: string; stopped: number; reached_rome: number; mood_before: string | null; mood_after: string | null; ctx: Ctx | null };

/** Polls the latest run's trace every 500 ms. A new run resets the event list. */
export function useTrace(): { run: RunInfo | null; events: Ev[] } {
  const [state, setState] = useState<{ run: RunInfo | null; events: Ev[] }>({ run: null, events: [] });
  useEffect(() => {
    let alive = true;
    let since = 0;
    let runId = -1;
    const tick = async () => {
      try {
        const r = (await fetch(`/api/road-lab/trace?run=latest&since=${since}`).then((x) => x.json())) as { run: RunInfo | null; events: Ev[] };
        if (!alive || !r.run) return;
        const fresh = r.run.id !== runId;
        if (fresh) {
          runId = r.run.id;
          since = 0;
          const all = (await fetch(`/api/road-lab/trace?run=${runId}&since=0`).then((x) => x.json())) as { events: Ev[] };
          since = all.events.at(-1)?.id ?? 0;
          setState({ run: r.run, events: all.events });
          return;
        }
        if (r.events.length) since = r.events.at(-1)!.id;
        setState((s) => ({ run: r.run, events: r.events.length ? [...s.events, ...r.events].slice(-600) : s.events }));
      } catch {
        /* server restarting */
      }
    };
    void tick();
    const id = setInterval(tick, 500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return state;
}
