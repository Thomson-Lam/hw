# Road Scroll — How It Works

## What It Does
You scroll down a mountain road toward Rome on the horizon. Scrolling is travelling: layers drift in parallax, lane dashes stream toward you, and the rider bobs only while you move.

## Architecture
```
window scroll ──▶ useScrollProgress (rAF) ──▶ progress 0..1
                                                  │
controls (localStorage pg:road-scroll:controls) ──┤
                                                  ▼
                                   frameAt() ─▶ { progress, distance, curve }
                                                  │
                                                  ▼
                RoadStage (SVG 400×800, xMidYMax slice)
                ├─ Goal        (vanishing point, scale ∝ progress²)
                ├─ MountainLayers (seeded ridges, x-offset ∝ curve × depth × parallax)
                ├─ Fog         (gradient band at horizon, token stop-color)
                ├─ Road        (bezier quad + dashes at t² perspective)
                └─ Rider       (bob from distance, not time)
```

## Frontend
- **State**: scroll progress (derived from the window, no stored state); control values via `useControls` from `lib/controls`, persisted per prototype and loaded on mount.
- **Layout**: a scroll track `roadLength`dvh tall contains a `sticky h-dvh` stage, centered at `max-w-2xl`. Controls sit in a sticky side column on `lg+`, and in a bottom sheet behind a floating button on mobile.
- **Motion**: every movement is scroll-driven. Under `prefers-reduced-motion`, rider bob and stride are off. The "Scroll" hint fades out with an ease-out opacity transition.
- **Theme**: all fills are tokens (`fill-foreground` with opacity for aerial perspective, `fill-background`, `fill-primary`, `fill-muted-foreground`, `stroke-border`), so light and dark both work without `useTheme`.
- **Responsive**: the SVG uses `slice`, so the road stays bottom-anchored from 375px phones up to desktop.
- **Shortcuts**: none.

## API
None.

## AI Usage
None.

## Key Dependencies
- `lib/controls` (schema → panel, persistence, Reset, Randomize)
- shadcn `Sheet`, `Slider`, `Switch`, `Button`

## Component Tree
```
page.tsx
└─ RoadScroll (client)
   └─ PrototypeShell (panel = ControlPanel)
      └─ track div → sticky stage
         ├─ RoadStage → Goal, MountainLayers, Fog?, Road, Rider
         └─ ScrollHint
```

## Error Handling
- localStorage reads and writes are wrapped in try/catch. Persisted values are passed through `sanitize()`, which clamps and drops invalid keys.
- Progress is clamped to 0..1. A zero scroll range gives progress 0.

## File Structure
```
road-scroll/
├─ page.tsx               thin server page
├─ road-scroll.tsx        client root: wires scroll + controls
├─ data.ts                SLUG, VIEW constants, control schema
├─ types.ts               Frame, Dash, Point, RoadControls
├─ geometry.ts            pure math: rng, ridges, road, dashes, bob
├─ use-scroll-progress.ts scroll progress + reduced-motion hooks
├─ road-stage.tsx         SVG composition
├─ goal.tsx  mountain-layers.tsx  fog.tsx  road.tsx  rider.tsx  scroll-hint.tsx
├─ metadata.json
└─ HOW_IT_WORKS.md
```
