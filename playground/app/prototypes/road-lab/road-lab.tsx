"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RoadSession } from "./engine/session";
import { PACKS } from "./packs";
import type { PackId } from "./types";
import { bootRun, deviceId, makeDeps } from "./ui/api";
import { PackPicker } from "./ui/pack-picker";
import { RoadScreen } from "./ui/road-screen";

type Live = { session: RoadSession; runId: number; dispose: () => void };

export function RoadLab() {
  const [live, setLive] = useState<Live | null>(null);
  const [error, setError] = useState<string | null>(null);
  const liveRef = useRef<Live | null>(null);
  const nonce = useRef<number | null>(null);

  const start = useCallback(async (pack: PackId) => {
    setError(null);
    try {
      const device = deviceId();
      const boot = await bootRun(pack, device);
      const { deps, dispose } = makeDeps(boot.runId, device, pack);
      const session = new RoadSession(PACKS[pack], deps, { rules: boot.rules, grown: boot.grown });
      liveRef.current?.dispose();
      liveRef.current?.session.exit();
      const next = { session, runId: boot.runId, dispose };
      liveRef.current = next;
      setLive(next);
      session.start();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // The brain view can swap the pack: poll the control row and restart on a new nonce.
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      try {
        const c = (await fetch("/api/road-lab/control").then((r) => r.json())) as { pack: PackId | null; nonce: number };
        if (!alive) return;
        if (nonce.current === null) nonce.current = c.nonce;
        else if (c.nonce !== nonce.current) {
          nonce.current = c.nonce;
          if (c.pack && PACKS[c.pack] && liveRef.current?.session.pack.id !== c.pack) void start(c.pack);
        }
      } catch {
        /* offline: keep the current road */
      }
    };
    void tick();
    const id = setInterval(tick, 1500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [start]);

  useEffect(() => () => liveRef.current?.dispose(), []);

  if (!live)
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-4 py-16">
        <PackPicker onPick={(p) => void start(p)} />
        {error && <p className="text-sm text-destructive">{error}</p>}
      </main>
    );
  return <RoadScreen key={live.runId} session={live.session} runId={live.runId} onRestart={() => setLive(null)} />;
}
