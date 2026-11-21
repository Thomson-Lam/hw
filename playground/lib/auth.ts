export const AUTH_COOKIE = "pg_auth";

/** Cookie value derived from the password. Changing PLAYGROUND_PASSWORD logs everyone out. */
export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`playground:v1:${password}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}

export function gateEnabled(): boolean {
  return process.env.NODE_ENV === "production";
}
