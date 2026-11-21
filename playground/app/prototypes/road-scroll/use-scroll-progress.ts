"use client";

import { useEffect, useState, type RefObject } from "react";

/** 0..1 progress of the window scrolling through `track`. rAF-throttled. */
export function useScrollProgress(track: RefObject<HTMLElement | null>): number {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let raf = 0;
    const measure = () => {
      raf = 0;
      const el = track.current;
      if (!el) return;
      const range = el.offsetHeight - window.innerHeight;
      const top = el.getBoundingClientRect().top;
      setProgress(range > 0 ? Math.min(1, Math.max(0, -top / range)) : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [track]);
  return progress;
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** width / height of an element, tracked with ResizeObserver. */
export function useAspect(el: RefObject<HTMLElement | null>): number {
  const [aspect, setAspect] = useState(0.5);
  useEffect(() => {
    const node = el.current;
    if (!node) return;
    const ro = new ResizeObserver(([e]) => setAspect(e.contentRect.width / Math.max(1, e.contentRect.height)));
    ro.observe(node);
    return () => ro.disconnect();
  }, [el]);
  return aspect;
}
