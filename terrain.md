# Terrain chunks: how the background works (draft 2, 2026-11-21)

Generator artifact: https://claude.ai/artifact/E7i7i5SUfuCbL1ULMHH3Vp (seed 1121, trunk road 72 pt)

## Decisions
- Chunk = one screen, 390 × 844 pt, exported at 3× (1170 × 2532 px).
- Kinds: straight A / B / C (different road bends) and fork-2 / fork-3. Max 3 choices.
- Every chunk enters and leaves at x = 0.5 with the trunk width, and all share one noise field, so chunks stack in any order.
- Fork branches are bendy and separated by low green ridges.
- **Seamless zoom:** the bottom of each fork branch is a shrunken copy of the straight chunk it leads to (zoom = n / 0.94: 3.19 for 3 lanes, 2.13 for 2). Zoom the camera to that branch's window and the screen shows exactly that straight chunk; swap in the full-res PNG and keep scrolling.
- Branch road width = trunk ÷ zoom, so after the zoom it is trunk width again.
- Straight chunks also wrap left to right, so neighbouring windows join without seams.

## chunks.json
Per chunk: road centre line (x, y as fractions, w in pt). Forks add trunk, split, zoom, and per branch: road, window {x, y, w, h}, leadsTo.

## Open questions
- Can the user scroll past a fork without picking? (The fork's bottom edge only joins up via the zoom.)
- Real road width and style (draft uses a 72 pt placeholder).
