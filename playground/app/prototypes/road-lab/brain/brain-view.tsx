"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PACK_IDS, PACKS } from "../packs";
import { UNIVERSAL_INVARIANTS } from "../engine/compiler";
import type { PackId } from "../types";
import { Panel } from "./panel";
import { useTrace, type Ev } from "./use-trace";
import { Verdicts } from "./verdicts";

type Rule = { id: number; form: string };
type GrownRow = { id: number; name: string; form: string };

export function BrainView() {
  const { run, events } = useTrace();
  const pack = run ? PACKS[run.pack as PackId] : null;
  const [rules, setRules] = useState<Rule[]>([]);
  const [grown, setGrown] = useState<GrownRow[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const lastRuleEvent = events.filter((e) => /^(rule|grown)/.test(e.stage)).length;

  useEffect(() => {
    if (!run) return;
    const q = `device=${encodeURIComponent(run.device)}&pack=${run.pack}`;
    let alive = true;
    void Promise.all([fetch(`/api/road-lab/rules?${q}`).then((r) => r.json()), fetch(`/api/road-lab/tiles?${q}`).then((r) => r.json())]).then(([r, t]) => {
      if (!alive) return;
      setRules(r as Rule[]);
      setGrown(t as GrownRow[]);
    });
    return () => {
      alive = false;
    };
  }, [run, lastRuleEvent]);

  const swap = async (p: PackId) => {
    await fetch("/api/road-lab/control", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pack: p }) });
    setMsg(`Swapped to ${p}. The phone restarts on its next poll.`);
  };
  const inject = async (c: string) => {
    const r = (await fetch("/api/road-lab/inject", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ case: c }) }).then((x) => x.json())) as { ok?: boolean; errors?: { inv: string }[] };
    setMsg(r.ok ? "Injected stretch was accepted (unexpected)." : `Compiler rejected the injected stretch: ${(r.errors ?? []).map((e) => e.inv).join(", ")}`);
  };

  const horse = events.filter((e) => e.stage === "horse").slice(-8).reverse();
  const paver = events.filter((e) => e.stage === "compile" && e.source === "llm");
  const llmOk = paver.filter((e) => e.ok).length;
  const ms = paver.map((e) => Number(e.ms)).filter((n) => n > 0).sort((a, b) => a - b);
  const p50 = ms.length ? ms[Math.floor(ms.length / 2)] : 0;
  const tokens = paver.reduce((a, e) => a + Number(e.inTok ?? 0) + Number(e.outTok ?? 0), 0);
  const stage = (s: string) => events.filter((e) => e.stage === s).length;

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-3 px-4 pt-16 pb-10">
      <header className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-medium">Brain view</h1>
        {run && <Badge variant="outline">run {run.id}</Badge>}
        {pack && <Badge variant="secondary">{pack.id}</Badge>}
        {run?.stopped ? <Badge variant="destructive">model stopped</Badge> : null}
        {run?.reached_rome ? <Badge>reached Rome</Badge> : null}
      </header>
      {!run && <p className="text-sm text-muted-foreground">Waiting for a phone to start a road at /prototypes/road-lab.</p>}

      <div className="flex flex-wrap gap-2">
        {PACK_IDS.map((p) => (
          <Button key={p} variant={pack?.id === p ? "default" : "outline"} className="h-11" onClick={() => void swap(p)} data-testid={`swap-${p}`}>
            {PACKS[p].title}
          </Button>
        ))}
        {pack?.injects.map((i) => (
          <Button key={i.id} variant="destructive" className="h-11" onClick={() => void inject(i.id)} data-testid={`inject-${i.id}`}>
            Inject: {i.label}
          </Button>
        ))}
      </div>
      {msg && (
        <p className="text-sm" data-testid="brain-msg">
          {msg}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Panel title="Rome" testid="panel-rome">
          {pack && (
            <>
              <p className="text-sm">{pack.rome}</p>
              <code className="text-xs break-words text-muted-foreground">{pack.romePredicate}</code>
              <p className="text-xs text-muted-foreground">
                Mood: {run?.mood_before ?? "?"} → {run?.mood_after ?? "?"}
              </p>
            </>
          )}
        </Panel>
        <Panel title="Horse" testid="panel-horse">
          <p className="text-sm">
            Pace: <Badge variant="outline">{run?.ctx?.pace ?? "steady"}</Badge>
          </p>
          <ul className="text-xs text-muted-foreground">
            {horse.map((e) => (
              <li key={e.id}>{describeHorse(e)}</li>
            ))}
          </ul>
        </Panel>
        <Panel title="Paver · gemini-3.5-flash-lite" testid="panel-paver">
          <p className="text-sm tabular-nums">
            {paver.length} attempts · {llmOk} accepted · p50 {p50} ms · {tokens} tokens
          </p>
          <p className="text-xs text-muted-foreground tabular-nums">
            replaced {stage("replace")} fallback stretches · late {stage("late")} · fallback stretches {events.filter((e) => e.stage === "compile" && e.source === "fallback").length}
          </p>
        </Panel>
        <Panel title="Rules (erasable on the phone)" testid="panel-rules">
          {rules.length === 0 ? <p className="text-xs text-muted-foreground">none</p> : rules.map((r) => <code key={r.id} className="text-xs">{r.form}</code>)}
          {grown.length > 0 && <p className="pt-1 text-xs font-medium">Grown tiles</p>}
          {grown.map((g) => (
            <code key={g.id} className="text-xs break-words">
              {g.form}
            </code>
          ))}
        </Panel>
        <Panel title="Invariants" testid="panel-invariants">
          <p className="text-xs text-muted-foreground">Universal ({Object.keys(UNIVERSAL_INVARIANTS).length})</p>
          <p className="text-xs break-words">{Object.keys(UNIVERSAL_INVARIANTS).join(" · ")}</p>
          {pack && (
            <>
              <p className="pt-1 text-xs text-muted-foreground">{pack.id} pack</p>
              {pack.invariants.map((i) => (
                <p key={i.id} className="text-xs">
                  <span className="font-medium">{i.id}</span>: {i.doc}
                </p>
              ))}
            </>
          )}
        </Panel>
        <Panel title="Compiler verdicts" testid="panel-verdicts">
          <Verdicts events={events} />
        </Panel>
      </div>
    </main>
  );
}

function describeHorse(e: Ev): string {
  if (e.event === "pace") return `pace → ${String(e.pace)} (dwell ${String(e.dwell)} ms)`;
  if (e.event === "skip") return `skipped ${String(e.topic)} (${String(e.count)}×, ${String(e.dwell)} ms)`;
  if (e.event === "backtrack") return `looked back ${String(e.from)} → ${String(e.to)}`;
  return String(e.event);
}
