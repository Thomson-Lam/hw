"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { RoadSession, RoadTile, Snapshot } from "../engine/session";
import { FINANCE_LIMITS } from "../packs/canada-life";
import { rowOf } from "../packs/merch-trail";
import { SLOTS } from "../packs/sun-life";
import type { EffectInput } from "../types";

/** The only place an effect can happen: a click here calls session.confirm() (ROADLAB-1). */
export function TollBooth({ session, snap, rt, index }: { session: RoadSession; snap: Snapshot; rt: RoadTile; index: number }) {
  const [amount, setAmount] = useState(40);
  const [slot, setSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pack = session.pack;
  const ctx = snap.ctx;
  const open = !rt.state && index === snap.road.length - 1;
  if (rt.state) return <p className="text-sm text-muted-foreground" data-testid="toll-state">{rt.state === "confirmed" ? "Done." : rt.state === "declined" ? "Not now. The road loops back." : "Account changed. Limits will show again."}</p>;

  const input: EffectInput = pack.effect.name === "contribute" ? { amount } : pack.effect.name === "book" ? { slot: slot ?? undefined } : {};
  const confirm = () => setError(session.confirm(input));

  return (
    <div className="flex flex-col gap-3" data-testid="toll-booth">
      {pack.effect.name === "contribute" && <ContributeForm account={ctx.choices.account} amount={amount} setAmount={setAmount} />}
      {pack.effect.name === "book" && (
        <div className="flex flex-col gap-2">
          <p className="text-sm">
            {pack.facts(ctx).coverage.short} {pack.facts(ctx).cost.short}
          </p>
          <div className="grid grid-cols-1 gap-2">
            {SLOTS.map((s) => (
              <Button key={s} variant={slot === s ? "default" : "outline"} className="h-11" onClick={() => setSlot(s)} data-testid="slot">
                {s}
              </Button>
            ))}
          </div>
        </div>
      )}
      {pack.effect.name === "save-pick" && <PickSummary snap={snap} />}
      <Button className="h-11" disabled={!open || snap.pos < index} onClick={confirm} data-testid="confirm">
        {pack.effect.label}
      </Button>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" disabled={!open} onClick={() => session.decline()} data-testid="decline">
          Not now
        </Button>
        {pack.id === "canada-life" && (
          <Button variant="outline" className="h-11" disabled={!open} onClick={() => session.realign("account")} data-testid="realign">
            Change account
          </Button>
        )}
      </div>
      {snap.pos < index && <p className="text-xs text-muted-foreground">Scroll to the booth to confirm.</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

function ContributeForm({ account, amount, setAmount }: { account: string | undefined; amount: number; setAmount: (n: number) => void }) {
  const room = account ? FINANCE_LIMITS.ROOM[account] : 0;
  const max = Math.min(FINANCE_LIMITS.SPARE, Math.floor(room / 12));
  const years = 9;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm">
        {account?.toUpperCase()} · ${amount} a month, automatically
      </p>
      <Slider aria-label="Monthly amount" min={10} max={max || 10} step={5} value={[Math.min(amount, max || 10)]} onValueChange={(v) => setAmount(Array.isArray(v) ? v[0] : v)} className="py-3" />
      <p className="text-xs text-muted-foreground" data-testid="vista-30">
        You at 30: ${(amount * 12 * years).toLocaleString("en-CA")} put in over {years} years, before any growth. Max ${max}/month keeps you inside your room.
      </p>
    </div>
  );
}

function PickSummary({ snap }: { snap: Snapshot }) {
  const row = rowOf(snap.ctx, snap.ctx.choices.pick ?? "");
  if (!row) return null;
  return (
    <div className="flex flex-col gap-1 text-sm">
      <p className="font-medium break-words">{row.title}</p>
      <p className="text-muted-foreground">{row.license}</p>
      <p className="text-xs text-muted-foreground break-words">
        Attribution: “{row.title}” by {row.author ?? "the creator"}, printables.com/model/{row.id}, {row.license}.
      </p>
    </div>
  );
}
