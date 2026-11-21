import { delay } from "./completion.ts"
import type { InfluenceSource } from "./influence.ts"

const LATENCY_MS = 300

export const simulatedInfluence: InfluenceSource = async function* (sentences, _focus, signal) {
  await delay(LATENCY_MS, signal)
  for (const index of sentences.keys()) yield { index, strength: Math.random() }
}
