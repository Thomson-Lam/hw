import { HORSE } from "./data";
import type { Pace } from "./types";

const GAIT: Record<Pace, string> = { rush: "0.28s", steady: "0.6s", linger: "1.6s" };

/** Low-poly horse seen from behind, in the Hack Western purple. Gait speed follows your scroll pace. */
export function Horse({ pace, shift }: { pace: Pace; shift: number }) {
  return (
    <div
      className="pointer-events-none fixed bottom-[max(0.5rem,env(safe-area-inset-bottom))] left-1/2 z-10 w-[min(24vw,130px)] transition-transform duration-300 ease-out"
      style={{ transform: `translateX(calc(-50% + ${shift}px))` }}
      aria-hidden
    >
      <svg viewBox="0 0 200 240" className="w-full motion-safe:animate-[gait_var(--g)_ease-in-out_infinite]" style={{ ["--g" as string]: GAIT[pace] }}>
        <polygon points="62,150 80,236 96,236 92,150" fill={HORSE.dark} />
        <polygon points="138,150 120,236 104,236 108,150" fill={HORSE.dark} />
        <polygon points="40,96 100,70 160,96 168,160 100,184 32,160" fill={HORSE.body} />
        <polygon points="40,96 100,70 100,184 32,160" fill={HORSE.light} opacity={0.55} />
        <polygon points="100,184 86,226 100,232 114,226" fill={HORSE.mane} />
        <polygon points="80,30 120,30 128,96 72,96" fill={HORSE.body} />
        <polygon points="80,30 100,30 100,96 72,96" fill={HORSE.light} opacity={0.5} />
        <polygon points="80,30 74,4 92,26" fill={HORSE.dark} />
        <polygon points="120,30 126,4 108,26" fill={HORSE.dark} />
        <polygon points="92,26 108,26 112,90 88,90" fill={HORSE.mane} />
      </svg>
    </div>
  );
}
