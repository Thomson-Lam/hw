"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

/** Theme token → THREE.Color. Tokens are oklch(), which THREE cannot parse, so the browser resolves it on a canvas. */
const cssColor = (name: string) => {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx || !value) return new THREE.Color(0.5, 0.5, 0.5);
  ctx.fillStyle = value;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
};

/** Renders a Printables STL through our proxy. Colours come from theme tokens; turns only without reduced motion. */
export function StlViewer({ print, file }: { print: string; file: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    let raf = 0;
    let disposed = false;
    const w = el.clientWidth || 300;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    renderer.setSize(w, w);
    el.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(35, 1, 0.1, 10000);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 2.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.8);
    sun.position.set(1, 2, 3);
    scene.add(sun);
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let mesh: THREE.Mesh | null = null;
    new STLLoader().load(
      `/api/road-lab/stl?print=${print}&file=${file}`,
      (geo) => {
        if (disposed) return;
        geo.computeBoundingBox();
        geo.center();
        const b = geo.boundingBox!;
        const size = Math.max(b.max.x - b.min.x, b.max.y - b.min.y, b.max.z - b.min.z);
        mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cssColor("--foreground"), roughness: 0.7 }));
        mesh.rotation.x = -Math.PI / 2;
        scene.add(mesh);
        cam.position.set(size * 1.1, size * 0.6, size * 1.6);
        cam.lookAt(0, 0, 0);
        setStatus("ok");
        const loop = () => {
          if (mesh && !still) mesh.rotation.z += 0.01;
          renderer.render(scene, cam);
          raf = still ? 0 : requestAnimationFrame(loop);
        };
        loop();
      },
      undefined,
      () => !disposed && setStatus("error"),
    );
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [print, file]);

  return (
    <div ref={box} className="relative size-full" data-testid="stl" data-status={status}>
      {status !== "ok" && <p className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">{status === "error" ? "Model failed to load" : "Loading model…"}</p>}
    </div>
  );
}
