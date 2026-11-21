import { appendFileSync, closeSync, existsSync, openSync, readFileSync, writeFileSync, writeSync } from "node:fs"
import { basename, resolve } from "node:path"

const ROOT = resolve(import.meta.dirname, "..")
const USAGE_LOG = resolve(ROOT, "token-usage.log")
const API_URL = "https://api.cerebras.ai/v1/chat/completions"
const MODEL = "gpt-oss-120b"
const COUNT_TITLES = ["prompt", "cached", "completion", "reasoning", "total"]
const COUNT_WIDTH = 12
const HEADER_LENGTH = headerOf([0, 0, 0, 0, 0, 0]).length

/** One chat completion with the dev key from `.env`, for prototyping prompts. Every call appends its token usage to `token-usage.log`. */
export async function chat({ system, user, temperature = 0.3, max = 1000, effort = "low" }) {
  const startedAt = performance.now()
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${devApiKey()}` },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: effort,
      temperature,
      max_completion_tokens: max,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  })
  if (!response.ok) throw new Error(`${response.status} ${(await response.text()).slice(0, 300)}`)

  const { choices, usage } = await response.json()
  logUsage(usage)
  return { text: choices[0].message.content ?? "", ms: Math.round(performance.now() - startedAt), usage }
}

function devApiKey() {
  const key = readFileSync(resolve(ROOT, ".env"), "utf8")
    .match(/^CEREBRAS_DEV_API_KEY=(.+)$/m)?.[1]
    .trim()
  if (!key) throw new Error("CEREBRAS_DEV_API_KEY is missing from .env")
  return key
}

/** Appends the call as a row, then rewrites the accumulated totals at the top of the log in place; the header has a fixed width so the rows below it never move. */
export function logUsage(usage) {
  const counts = [
    usage.prompt_tokens,
    usage.prompt_tokens_details?.cached_tokens ?? 0,
    usage.completion_tokens,
    usage.completion_tokens_details?.reasoning_tokens ?? 0,
    usage.total_tokens,
  ]
  const time = new Date().toISOString().slice(0, 19) + "Z"
  const script = basename(process.argv[1] ?? "repl").replaceAll(" ", "_")

  if (!existsSync(USAGE_LOG)) writeFileSync(USAGE_LOG, headerOf([0, 0, 0, 0, 0, 0]))
  appendFileSync(USAGE_LOG, `${rowOf([time, script], counts)}\n`)

  const rows = readFileSync(USAGE_LOG, "utf8").slice(HEADER_LENGTH).trim().split("\n")
  const totals = rows.reduce((sums, row) => sums.map((sum, i) => sum + Number(row.trim().split(/\s+/)[i + 2])), [0, 0, 0, 0, 0])
  const log = openSync(USAGE_LOG, "r+")
  writeSync(log, headerOf([rows.length, ...totals]), 0)
  closeSync(log)
}

function headerOf([calls, ...totals]) {
  return [rowOf(["accumulated", "calls"], COUNT_TITLES), rowOf(["", calls], totals), "", rowOf(["time", "script"], COUNT_TITLES), ""].join("\n")
}

function rowOf([first, second], counts) {
  return `${String(first).padEnd(22)}${String(second).padEnd(26)}${counts.map((count) => String(count).padStart(COUNT_WIDTH)).join("")}`
}
