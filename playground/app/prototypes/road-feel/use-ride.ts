"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { initialRide, limitOf, step, type Action, type Ride } from "./ride";

/** Runs the ride on requestAnimationFrame. Scroll position is distance travelled; actions queue until the next frame. */
export function useRide(): { ride: Ride | null; dispatch: (a: Action) => void } {
  const [ride, setRide] = useState<Ride | null>(null);
  const queue = useRef<Action[]>([]);
  const dispatch = useCallback((a: Action) => {
    queue.current.push(a);
  }, []);

  useEffect(() => {
    let state = initialRide(performance.now());
    let raf = 0;
    window.scrollTo(0, 0);
    const loop = () => {
      const now = performance.now();
      const actions = queue.current.splice(0);
      state = step(state, window.scrollY, now, actions);
      const limit = limitOf(state);
      if (window.scrollY > limit) window.scrollTo({ top: limit });
      setRide(state);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return { ride, dispatch };
}

/** Horizontal input steers: trackpad/shift-wheel deltaX, touch swipe, arrow keys. Vertical stays native scroll. */
export function useSteer(onSteer: (dir: -1 | 1) => void) {
  useEffect(() => {
    let acc = 0;
    let lastFire = 0;
    const fire = (dir: -1 | 1) => {
      const now = performance.now();
      if (now - lastFire < 250) return;
      lastFire = now;
      onSteer(dir);
    };
    const onWheel = (e: WheelEvent) => {
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      if (Math.abs(dx) <= Math.abs(e.deltaY) && !e.shiftKey) return;
      acc += dx;
      if (Math.abs(acc) > 60) {
        fire(acc > 0 ? 1 : -1);
        acc = 0;
      }
    };
    let sx = 0;
    let sy = 0;
    let swiped = false;
    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
      swiped = false;
    };
    const onMove = (e: TouchEvent) => {
      const dx = e.touches[0].clientX - sx;
      const dy = e.touches[0].clientY - sy;
      if (!swiped && Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.3) {
        swiped = true;
        fire(dx > 0 ? 1 : -1);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") fire(-1);
      if (e.key === "ArrowRight") fire(1);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [onSteer]);
}
