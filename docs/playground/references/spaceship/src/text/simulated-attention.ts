import type { AttentionSource } from "./attention.ts"
import { delay } from "./completion.ts"
import { wordSpans } from "./segments.ts"

const LATENCY_MS = 100
const INTERVAL_MS = 50
const MIN_TARGETS = 3
const MAX_TARGETS = 5
const CONTEXT_WORDS = 3

export const simulatedAttention: AttentionSource = async function* (text, signal) {
  const wordIndices = shuffledIndices(wordSpans(text).length).slice(0, randomInt(MIN_TARGETS, MAX_TARGETS))
  for (const [i, wordIndex] of wordIndices.entries()) {
    await delay(i === 0 ? LATENCY_MS : INTERVAL_MS, signal)
    yield { keyword: wordIndex, before: CONTEXT_WORDS, after: CONTEXT_WORDS }
  }
}

function shuffledIndices(length: number) {
  const indices = Array.from({ length }, (_, i) => i)
  for (let i = length - 1; i > 0; i--) {
    const j = randomInt(0, i)
    ;[indices[i], indices[j]] = [indices[j], indices[i]]
  }
  return indices
}

function randomInt(min: number, max: number) {
  return min + Math.floor(Math.random() * (max - min + 1))
}
