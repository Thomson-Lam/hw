// Reads a real product page: the photo, name and price the store publishes for link previews and search
// engines (Open Graph tags and schema.org Product data). This is how product cards get the actual product's
// photo instead of a stock image. Never throws; returns what it could read.
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const meta = (html, key) => {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
  const tag = html.match(re)?.[0];
  return tag?.match(/content=["']([^"']+)["']/i)?.[1] ?? null;
};
const unescape = (s) => s?.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&#x2F;/g, "/").trim() ?? null;

function jsonLdProduct(html) {
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(m[1].trim()); } catch { continue; }
    const stack = [data];
    while (stack.length) {
      const x = stack.pop();
      if (!x || typeof x !== "object") continue;
      if (Array.isArray(x)) { stack.push(...x); continue; }
      if (x["@graph"]) stack.push(x["@graph"]);
      const type = [].concat(x["@type"] ?? []).join(" ");
      if (/Product/i.test(type)) {
        const offer = [].concat(x.offers ?? [])[0] ?? {};
        const img = [].concat(x.image ?? [])[0];
        return {
          title: x.name ?? null,
          image: typeof img === "string" ? img : img?.url ?? null,
          price: Number(offer.price ?? offer.lowPrice ?? offer.priceSpecification?.price) || null,
          currency: offer.priceCurrency ?? null,
        };
      }
    }
  }
  return null;
}

export async function readProductPage(url, timeoutMs = 5000) {
  if (!/^https?:\/\//i.test(String(url ?? ""))) return null;
  try {
    const res = await fetch(url, { redirect: "follow", headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml", "accept-language": "en-CA,en;q=0.9" }, signal: AbortSignal.timeout(timeoutMs) });
    if (!res.ok || !/html/i.test(res.headers.get("content-type") ?? "")) return { url: res.url || url, ok: false, status: res.status };
    const html = (await res.text()).slice(0, 800_000);
    const ld = jsonLdProduct(html);
    const final = res.url || url;
    const abs = (u) => { try { return u ? new URL(unescape(u), final).href : null; } catch { return null; } };
    const price = ld?.price ?? (Number(meta(html, "product:price:amount") ?? meta(html, "og:price:amount")) || null);
    return {
      ok: true,
      url: final,
      store: new URL(final).hostname.replace(/^www\./, ""),
      title: unescape(ld?.title ?? meta(html, "og:title") ?? html.match(/<title[^>]*>([^<]+)/i)?.[1] ?? null),
      image: abs(ld?.image ?? meta(html, "og:image") ?? meta(html, "og:image:url") ?? meta(html, "twitter:image")),
      price,
      currency: ld?.currency ?? meta(html, "product:price:currency") ?? null,
    };
  } catch (e) {
    return { url, ok: false, error: String(e.message ?? e) };
  }
}
