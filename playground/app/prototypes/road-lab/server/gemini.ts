import { loadRootEnv } from "./env";

// Gemini REST client. Server-only. $GEMINI_API_BASE overrides the host (used by validation to force a 402).
export const PAVER_MODEL = "gemini-3.5-flash-lite";

export type Msg = { role: "user" | "model"; text: string };
export type GenOk = { ok: true; text: string; ms: number; inTok: number; outTok: number };
export type GenErr = { ok: false; status: number; message: string; ms: number; auth: boolean };

/** 401, 402, 403 (and an invalid key reported as 400) stop the session (ROADLAB-5). */
export const isAuthStop = (status: number, message: string) => status === 401 || status === 402 || status === 403 || (status === 400 && /api key/i.test(message));

export async function generate(opts: { model?: string; system: string; messages: Msg[]; signal?: AbortSignal; timeoutMs?: number }): Promise<GenOk | GenErr> {
  const t0 = performance.now();
  loadRootEnv();
  const key = process.env.GEMINI_API_KEY;
  if (!key) return { ok: false, status: 401, message: "GEMINI_API_KEY is not set", ms: 0, auth: true };
  const base = process.env.GEMINI_API_BASE ?? "https://generativelanguage.googleapis.com";
  const signal = AbortSignal.any([AbortSignal.timeout(opts.timeoutMs ?? 8000), ...(opts.signal ? [opts.signal] : [])]);
  try {
    const res = await fetch(`${base}/v1beta/models/${opts.model ?? PAVER_MODEL}:generateContent`, {
      method: "POST",
      signal,
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.messages.map((m) => ({ role: m.role, parts: [{ text: m.text }] })),
        generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
      }),
    });
    const ms = Math.round(performance.now() - t0);
    const j = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
      candidates?: { content?: { parts?: { text?: string }[] } }[];
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    if (!res.ok) {
      const message = j.error?.message ?? `HTTP ${res.status}`;
      return { ok: false, status: res.status, message: message.slice(0, 300), ms, auth: isAuthStop(res.status, message) };
    }
    const text = (j.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
    return { ok: true, text, ms, inTok: j.usageMetadata?.promptTokenCount ?? 0, outTok: j.usageMetadata?.candidatesTokenCount ?? 0 };
  } catch (e) {
    const ms = Math.round(performance.now() - t0);
    return { ok: false, status: 0, message: e instanceof Error ? e.message : String(e), ms, auth: false };
  }
}
