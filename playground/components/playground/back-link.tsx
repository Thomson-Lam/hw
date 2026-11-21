import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

/** Small floating link back to the gallery. Only on private /prototypes routes. */
export function BackLink() {
  return (
    <Link
      href="/"
      aria-label="Back to playground"
      data-capture-hide
      className="fixed top-[max(0.5rem,env(safe-area-inset-top))] left-2 z-40 flex size-11 items-center justify-center rounded-full bg-background/70 text-foreground backdrop-blur transition-colors hover:bg-muted active:bg-muted"
    >
      <ArrowLeftIcon className="size-4" />
    </Link>
  );
}
