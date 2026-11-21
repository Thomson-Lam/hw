import { delay } from "./completion.ts"
import type { Dimension, DimensionSource } from "./dimension.ts"

const MENU_SIZE = 5
const LATENCY_MS = 150

const DIMENSIONS: Dimension[] = [
  { name: "tension", kind: "scale", low: "calm", high: "tense" },
  { name: "turn", kind: "choice", options: ["resolve", "suspend", "twist"] },
  { name: "pace", kind: "scale", low: "lingering", high: "brisk" },
  { name: "voice", kind: "choice", options: ["action", "dialogue", "thought"] },
  { name: "mood", kind: "scale", low: "dark", high: "light" },
  { name: "distance", kind: "scale", low: "intimate", high: "detached" },
]

export const simulatedDimension: DimensionSource = async function* ({ taken }, signal) {
  await delay(LATENCY_MS, signal)
  const takenNames = new Set(taken.map(({ name }) => name))
  const free = DIMENSIONS.filter(({ name }) => !takenNames.has(name))
  yield* (free.length ? free : DIMENSIONS).slice(0, MENU_SIZE)
}
