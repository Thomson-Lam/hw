import { cn } from "@/lib/utils";
import type { Ticker } from "./types";

const WHO: Record<Ticker["who"], string> = { horse: "horse", paver: "paver", compiler: "compiler", rules: "rules", road: "road" };

/** What the engine just did, newest last. Makes the road's reactions visible. */
export function BrainTicker({ items, now }: { items: Ticker[]; now: number }) {
  const last = items.slice(-4);
  return (
    <ol className="pointer-events-none fixed top-[calc(max(0.5rem,env(safe-area-inset-top))+3.75rem)] left-3 z-20 flex w-[min(78vw,340px)] flex-col gap-1 sm:top-auto sm:bottom-4" aria-live="polite" data-testid="ticker">
      {last.map((e, i) => {
        const age = now - e.t;
        return (
          <li
            key={e.id}
            className={cn(i < last.length - 2 && "hidden sm:block", "rounded-lg bg-background/75 px-2.5 py-1.5 text-xs text-foreground shadow backdrop-blur transition-opacity duration-700", age > 6000 && "opacity-40")}
          >
            <span className={cn("mr-1.5 font-mono font-medium", e.who === "compiler" && "text-destructive", e.who === "rules" && "text-primary")}>{WHO[e.who]}</span>
            {e.text}
          </li>
        );
      })}
    </ol>
  );
}
