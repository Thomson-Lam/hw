import { NextResponse } from "next/server";
import { AUTH_COOKIE, authToken } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const expected = process.env.PLAYGROUND_PASSWORD;
    if (!expected) return NextResponse.json({ error: "PLAYGROUND_PASSWORD is not set" }, { status: 500 });
    const body = (await request.json().catch(() => ({}))) as { password?: unknown };
    if (typeof body.password !== "string" || body.password !== expected) {
      return NextResponse.json({ error: "Wrong password" }, { status: 401 });
    }
    const res = NextResponse.json({ ok: true });
    res.cookies.set(AUTH_COOKIE, await authToken(expected), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && !request.url.startsWith("http://localhost"),
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 90,
    });
    return res;
  } catch {
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
