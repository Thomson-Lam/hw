# Uncharted app

Expo (SDK 58) phone app: a title screen, then a road over terrain chunks where each fork is a choice. The road server in `server/` owns the decision tree (SQLite, Gemini).

## Run

```bash
node server/server.mjs        # road server on :8787 (reads GEMINI_API_KEY from ../.env)
npx expo start --lan          # Metro on :8081: Expo Go on the phone, web build on the laptop
./phone.sh                    # when the Mac is on the iPhone hotspot: restart Expo on that address and show the QR
./sim.sh                      # phone-sized Chrome window (390 x 844) on the web build
```

## React Grab: find the source of anything on screen

[React Grab](https://github.com/aidenybai/react-grab) maps a UI element to the component and file that render it. It loads only in the **web development build** (`App.tsx`: `__DEV__ && Platform.OS === "web"`). Expo Go and production builds never load it.

### For people

1. Start the road server and Expo (see Run), then run `./sim.sh`.
2. In the phone window, hover an element and press **Cmd+C**.
3. Paste into the agent chat. The paste names the component and its file, for example `in Pill (at …/src/hw.tsx)` inside `Title (at …/src/Title.tsx)`.

### For agents

Do not guess which file renders an element. Ask React Grab:

```bash
node scripts/grab.mjs <testID|css-selector> [--explore] [--url http://localhost:8081]
```

- A bare word is a `testID` (`data-testid` on web). Anything else is a CSS selector.
- `--explore` starts a road with "Layoffs in my field" first, so road elements exist: `lane-0`, `fork-sign`, `card-*`, `rules-toggle`, `paths`, `profile`.
- Output line 1 is `getSource` as JSON (`filePath`, `lineNumber`, `componentName`). The lines after it are the component stack.
- Exit code 1 means the element did not appear within 30 s. Check the testID, or add `--explore`.

Example (checked):

```text
$ node scripts/grab.mjs lane-0 --explore
{"filePath":".../src/Road.tsx","lineNumber":150,"columnNumber":11,"componentName":null}
in .../src/Road.tsx
  in Pressable (react-native-web)
  in Road (at .../src/Road.tsx)
```

In your own Playwright script, call the API on the page directly:

```js
const out = await page.evaluate(async (sel) => {
  const el = document.querySelector(sel), g = window.__REACT_GRAB__;
  return { source: await g.getSource(el), stack: await g.getStackContext(el) };
}, '[data-testid="lane-0"]');
```

### Limits

- **Canvas content has no components.** The terrain and the dither road are drawn by Skia into one `<canvas>` (`src/TerrainCanvas.tsx`). React Grab can only point at that canvas. For the road look, read `src/TerrainCanvas.tsx` (shader) and `src/terrain.ts` (masks, layout, camera).
- **Web only.** Native rendering (Expo Go) can differ from react-native-web in fonts, shadows, sliders, and touch. Check feel on a phone.
- `componentName` is `null` for inline JSX inside a component (such as the lane pins in `Road.tsx`). Use `filePath` and `lineNumber`.
- Playwright is resolved from `../playground/node_modules`. Run `npm install` in `playground/` if `scripts/grab.mjs` cannot find it.
