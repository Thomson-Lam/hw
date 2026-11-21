import { cn } from "@/lib/utils";

export function ScrollHint({ visible }: { visible: boolean }) {
  return (
    <p
      aria-hidden
      data-capture-hide
      className={cn(
        "pointer-events-none absolute inset-x-0 top-[max(1rem,env(safe-area-inset-top))] text-center text-xs text-muted-foreground transition-opacity duration-500 ease-out motion-reduce:transition-none",
        visible ? "opacity-100" : "opacity-0",
      )}
    >
      Scroll
    </p>
  );
}
