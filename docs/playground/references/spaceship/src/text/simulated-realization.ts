import { delay } from "./completion.ts"
import type { RealizationSource } from "./realization.ts"

const LATENCY_MS = 300

export const simulatedRealization: RealizationSource = async function* ({ asked }, signal) {
  await delay(LATENCY_MS, signal)
  for (const index of asked) yield { index, confidence: Math.random() }
}
