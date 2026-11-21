import type { ReactNode } from "react";

export function Panel({ title, children, testid }: { title: string; children: ReactNode; testid?: string }) {
  return (
    <section className="flex min-w-0 flex-col gap-2 rounded-xl border border-border bg-card p-3 text-card-foreground" data-testid={testid}>
      <h2 className="text-sm font-medium">{title}</h2>
      {children}
    </section>
  );
}
