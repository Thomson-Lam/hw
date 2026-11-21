import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, authToken, gateEnabled } from "@/lib/auth";
import { isOpenPath } from "@/lib/public-paths";

export async function proxy(request: NextRequest) {
  if (!gateEnabled()) return NextResponse.next();
  const { pathname, search } = request.nextUrl;
  if (isOpenPath(pathname)) return NextResponse.next();

  const password = process.env.PLAYGROUND_PASSWORD;
  const cookie = request.cookies.get(AUTH_COOKIE)?.value;
  if (password && cookie && cookie === (await authToken(password))) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
