import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { logUsage } from "../cerebras-dev.mjs"

const ROOT = resolve(import.meta.dirname, "../..")
/** What the page stores as its keys; the real ones are added here, so they never reach the browser. */
export const PLACEHOLDER_KEY = "added-by-capture-proxy"
const PREFLIGHT = { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "POST" }

/**
 * Serves the page's model calls from Node: each request is forwarded with the dev keys from `.env`, and every Cerebras call's usage is logged to `token-usage.log`.
 * Playwright fulfills a response whole, so a streamed completion arrives at once rather than token by token.
 */
export async function routeModelCalls(context) {
  const keys = devKeys()
  await context.route("https://api.cerebras.ai/**", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: PREFLIGHT })
    const response = await forward(route, { Authorization: `Bearer ${keys.cerebras}` })
    const body = await response.text()
    const usage = usageOf(body)
    if (usage) logUsage(usage)
    await route.fulfill({
      status: response.status,
      headers: { "content-type": response.headers.get("content-type") ?? "text/plain", "access-control-allow-origin": "*" },
      body,
    })
  })
  await context.route("https://generativelanguage.googleapis.com/**", async (route) => {
    if (route.request().method() === "OPTIONS") return route.fulfill({ status: 204, headers: PREFLIGHT })
    const response = await forward(route, { "x-goog-api-key": keys.gemini })
    await route.fulfill({
      status: response.status,
      headers: { "content-type": "application/json", "access-control-allow-origin": "*" },
      body: await response.text(),
    })
  })
}

async function forward(route, auth) {
  const request = route.request()
  const headers = { ...request.headers(), ...auth }
  delete headers.authorization
  delete headers["x-goog-api-key"]
  Object.assign(headers, auth)
  return fetch(request.url(), { method: request.method(), headers, body: request.postData() })
}

function devKeys() {
  const env = readFileSync(resolve(ROOT, ".env"), "utf8")
  const valueOf = (name) => env.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1].trim()
  const keys = { cerebras: valueOf("CEREBRAS_DEV_API_KEY"), gemini: valueOf("GEMINI_API") }
  if (!keys.cerebras || !keys.gemini) throw new Error("CEREBRAS_DEV_API_KEY and GEMINI_API must be set in .env")
  return keys
}

/** The usage of a completion, plain or streamed, where it comes with the last event. */
function usageOf(body) {
  if (body.trimStart().startsWith("{")) return JSON.parse(body).usage
  return body
    .split("\n")
    .filter((line) => line.startsWith("data:") && !line.includes("[DONE]"))
    .map((line) => JSON.parse(line.slice(5)).usage)
    .findLast(Boolean)
}
