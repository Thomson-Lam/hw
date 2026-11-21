"use client";

import { useTheme } from "next-themes";
import type { ReactNode } from "react";
import { CANVAS, SKY, VP } from "./data";

const LAYERS = [
  { src: "/road-feel/mountain-4.webp", zoom: 0.03 },
  { src: "/road-feel/mountain-3.webp", zoom: 0.06 },
  { src: "/road-feel/mountain-2.webp", zoom: 0.12 },
  { src: "/road-feel/mountain-1.webp", zoom: 0.3 },
];

/** Hack Western sky + mountain layers. Layers zoom toward the valley as you near Rome. `children` share the canvas box. */
export function Scene({ progress, sway, children }: { progress: number; sway: number; children: ReactNode }) {
  const { resolvedTheme } = useTheme();
  const sky = resolvedTheme === "light" ? SKY.light : SKY.dark;
  const dim = resolvedTheme === "light" ? undefined : "brightness(0.62) saturate(0.85)";
  return (
    <div className="fixed inset-0 overflow-hidden" aria-hidden>
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${sky[0]} 0%, ${sky[1]} 55%, ${sky[2]} 100%)` }} />
      <div className="absolute inset-0 opacity-[0.07] mix-blend-overlay" style={{ backgroundImage: "url(/road-feel/sky-noise.webp)", backgroundSize: "512px" }} />
      <div
        className="absolute bottom-0 left-1/2"
        style={{ width: `max(100vw, ${(CANVAS.w / CANVAS.h) * 100}dvh)`, aspectRatio: `${CANVAS.w} / ${CANVAS.h}`, transform: "translateX(-50%)" }}
      >
        {LAYERS.map((l, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={l.src}
            src={l.src}
            alt=""
            draggable={false}
            className="absolute inset-0 size-full select-none"
            style={{
              transform: `translateX(${(-sway * (i + 1) * 0.004).toFixed(2)}%) scale(${1 + l.zoom * progress})`,
              transformOrigin: `${(VP.x / CANVAS.w) * 100}% ${(VP.y / CANVAS.h) * 100}%`,
              filter: dim,
            }}
          />
        ))}
        {children}
      </div>
    </div>
  );
}
