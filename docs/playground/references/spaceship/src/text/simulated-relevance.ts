import { delay } from "./completion.ts"
import type { RelevanceSource } from "./keyword-relevance.ts"

const LATENCY_MS = 600

export const simulatedRelevance: RelevanceSource = async function* ({ leads }, signal) {
  await delay(LATENCY_MS, signal)
  for (const index of leads.keys()) yield { index, relevance: Math.random() }
}
