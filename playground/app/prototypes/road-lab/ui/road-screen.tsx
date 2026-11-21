"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { RoadSession } from "../engine/session";
import { patchRun, saveCtx } from "./api";
import { RoadHeader } from "./road-header";
import { RoadView } from "./road-view";

export function RoadScreen({ session, runId, onRestart }: { session: RoadSession; runId: number; onRestart: () => void }) {
  const snap = useSyncExternalStore(session.subscribe, session.getSnapshot, session.getSnapshot);

  // The brain view injects against the live ctx, so keep it on the server (debounced).
  useEffect(() => {
    const id = setTimeout(() => saveCtx(runId, snap.ctx), 400);
    return () => clearTimeout(id);
  }, [runId, snap.ctx]);

  const mood = snap.ctx.mood;
  const { moodAfter, ended } = snap;
  useEffect(() => {
    if (mood) patchRun(runId, { mood_before: mood });
  }, [runId, mood]);
  useEffect(() => {
    if (moodAfter) patchRun(runId, { mood_after: moodAfter });
  }, [runId, moodAfter]);
  useEffect(() => {
    if (ended) patchRun(runId, { ended_at: Date.now(), reached_rome: ended === "rome" ? 1 : 0 });
  }, [runId, ended]);

  return (
    <div className="min-h-dvh">
      <RoadHeader session={session} snap={snap} onRestart={onRestart} />
      <RoadView session={session} snap={snap} onRestart={onRestart} />
    </div>
  );
}
