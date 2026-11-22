// Finds a photo for an idea card from Wikipedia (free, no key). The model never writes image URLs.
// Returns { url, page, credit, alt } or null. Never throws, never waits longer than TIMEOUT.
const BASE = process.env.UNCHARTED_WIKI_BASE ?? "https://en.wikipedia.org";
const TIMEOUT = 2500;
const cache = new Map();

const STOP = new Set("a an and the of to for in on at by with your you my from into about how what try make get go do start learn read find".split(" "));
const keywords = (s) => String(s ?? "").toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));

async function search(query) {
  const u = `${BASE}/w/api.php?action=query&format=json&formatversion=2&origin=*&generator=search&gsrlimit=3&gsrsearch=${encodeURIComponent(query)}&prop=pageimages|info&inprop=url&piprop=thumbnail&pithumbsize=800`;
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), TIMEOUT);
  try {
    const res = await fetch(u, { signal: ctl.signal, headers: { "user-agent": "uncharted-hackathon/1.0 (Hack Western prototype)" } });
    if (!res.ok) return null;
    const pages = (await res.json())?.query?.pages ?? [];
    const hit = pages.sort((a, b) => (a.index ?? 0) - (b.index ?? 0)).find((p) => p.thumbnail?.source);
    return hit ? { url: hit.thumbnail.source, page: hit.fullurl, credit: hit.title, alt: hit.title } : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Tries the idea title, then its key words, then the goal behind the road.
export async function findImage(title, goal) {
  const tries = [title, keywords(title).join(" "), goal].map((x) => String(x ?? "").trim()).filter(Boolean);
  const key = tries.join("|");
  if (cache.has(key)) return cache.get(key);
  let out = null;
  for (const q of [...new Set(tries)]) { out = await search(q); if (out) break; }
  cache.set(key, out);
  return out;
}
