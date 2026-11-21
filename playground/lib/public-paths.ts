import { isPublicSlug } from "@/lib/prototypes";

const ALWAYS_OPEN = ["/login", "/api/auth", "/favicon.ico", "/robots.txt"];

/** Paths reachable without the password. Pure function so it is testable. */
export function isOpenPath(pathname: string): boolean {
  if (ALWAYS_OPEN.includes(pathname)) return true;
  // /p/<slug> always passes; the page itself 404s for private or unknown slugs (no login redirect = no name leak).
  if (/^\/p\/[^/]+\/?$/.test(pathname)) return true;
  const asset = pathname.match(/^\/(?:thumbnails\/(.+)-(?:light|dark)\.png|og\/(.+)\.(?:png|mp4))$/);
  if (asset) return isPublicSlug(asset[1] ?? asset[2]);
  const api = pathname.match(/^\/api\/([^/]+)(?:\/|$)/);
  if (api) return isPublicSlug(api[1]);
  return false;
}
