import { Badge } from "@/components/ui/badge";
import type { Ev } from "./use-trace";

type Err = { inv: string; msg: string };

/** Every compile verdict: opening, fallback, llm attempts, client re-checks and injected demo stretches. */
export function Verdicts({ events }: { events: Ev[] }) {
  const rows = events.filter((e) => e.stage === "compile").slice(-40).reverse();
  if (!rows.length) return <p className="text-sm text-muted-foreground">No stretches yet.</p>;
  return (
    <ul className="flex flex-col gap-2" data-testid="verdicts">
      {rows.map((e) => {
        const errs = (e.errors as Err[] | undefined) ?? [];
        return (
          <li key={e.id} className="flex flex-col gap-1 border-b border-border pb-2 text-xs last:border-0" data-verdict={e.ok ? "ok" : "reject"} data-source={String(e.source)}>
            <div className="flex flex-wrap items-center gap-1">
              <Badge variant={e.ok ? "outline" : "destructive"}>{e.ok ? "accepted" : "REJECTED"}</Badge>
              <Badge variant="secondary">{String(e.source)}</Badge>
              {e.attempt !== undefined && <span className="text-muted-foreground">attempt {String(e.attempt)}</span>}
              {e.ms !== undefined && <span className="text-muted-foreground">{String(e.ms)} ms</span>}
              {typeof e.label === "string" && <span className="text-muted-foreground">{e.label}</span>}
            </div>
            {errs.map((x, i) => (
              <p key={i} className="break-words text-destructive">
                {x.inv}: {x.msg}
              </p>
            ))}
            {typeof e.src === "string" && e.src && <code className="break-words whitespace-pre-wrap text-muted-foreground">{e.src.slice(0, 300)}</code>}
          </li>
        );
      })}
    </ul>
  );
}
