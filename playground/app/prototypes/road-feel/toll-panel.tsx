"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import type { Action, Ride } from "./ride";

/** The toll booth: the road stops here. Money moves only on this click. */
export function TollPanel({ ride, dispatch }: { ride: Ride; dispatch: (a: Action) => void }) {
  const [amount, setAmount] = useState(40);
  const account = ride.choices.account === "fhsa" ? "FHSA" : "TFSA";
  return (
    <div className="fixed inset-x-3 bottom-[calc(max(0.5rem,env(safe-area-inset-bottom))+min(36vw,190px))] z-30 mx-auto max-w-sm rounded-2xl border-2 border-primary bg-card/95 p-4 text-card-foreground shadow-xl backdrop-blur" data-testid="toll">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">Toll booth</p>
      <p className="mt-1 text-base font-medium">
        ${amount} a month into your {account}, automatically
      </p>
      <Slider aria-label="Monthly amount" min={10} max={300} step={5} value={[amount]} onValueChange={(v) => setAmount(Array.isArray(v) ? v[0] : v)} className="py-4" />
      <p className="text-xs text-muted-foreground">You at 30: ${(amount * 12 * 9).toLocaleString("en-CA")} put in, before any growth.</p>
      <Button className="mt-3 h-11 w-full" onClick={() => dispatch({ type: "pay", amount })} data-testid="pay">
        Set it up
      </Button>
    </div>
  );
}
