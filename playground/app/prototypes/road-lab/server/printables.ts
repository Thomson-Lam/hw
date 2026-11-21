// Printables client (no auth). Rows are facts: the LLM only ever sees and writes their ids.
import { licenseAllowed, MAX_STL_BYTES } from "../packs/merch-trail";
import type { Row } from "../types";

const API = "https://api.printables.com/graphql/";

type Item = {
  id: string;
  name: string;
  license: { name: string } | null;
  likesCount: number;
  user: { publicUsername: string } | null;
  image: { filePath: string } | null;
  stls: { id: string; name: string; fileSize: number }[] | null;
};

async function gql<T>(query: string, variables: Record<string, unknown>, signal?: AbortSignal): Promise<T> {
  const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }), signal });
  if (!res.ok) throw new Error(`printables HTTP ${res.status}`);
  const body = (await res.json()) as { data?: T; errors?: { message: string }[] };
  if (!body.data) throw new Error(`printables: ${body.errors?.[0]?.message ?? "no data"}`);
  return body.data;
}

export type SearchResult = { rows: Row[]; dropped: { id: string; reason: string }[]; total: number };

export async function searchPrintables(query: string, signal?: AbortSignal): Promise<SearchResult> {
  const data = await gql<{ searchPrints2: { items: Item[] } }>(
    `query($q: String!) { searchPrints2(query: $q, limit: 30) { items { id name license { name } likesCount user { publicUsername } image { filePath } stls { id name fileSize } } } }`,
    { q: query },
    signal,
  );
  const items = data.searchPrints2.items ?? [];
  const rows: Row[] = [];
  const dropped: { id: string; reason: string }[] = [];
  for (const it of items) {
    const stl = (it.stls ?? []).find((f) => /\.stl$/i.test(f.name));
    const license = it.license?.name ?? "none";
    if (!licenseAllowed(license)) dropped.push({ id: it.id, reason: `license: ${license}` });
    else if (!stl) dropped.push({ id: it.id, reason: "no STL file" });
    else if (stl.fileSize > MAX_STL_BYTES) dropped.push({ id: it.id, reason: `STL ${stl.fileSize} bytes` });
    else
      rows.push({
        id: String(it.id),
        title: it.name.slice(0, 80),
        license: license.replace(/\s+/g, " "),
        likes: it.likesCount,
        stlBytes: stl.fileSize,
        stlFileId: String(stl.id),
        image: it.image ? `https://media.printables.com/${it.image.filePath}` : null,
        author: it.user?.publicUsername ?? null,
      });
  }
  rows.sort((a, b) => b.likes - a.likes);
  return { rows: rows.slice(0, 8), dropped, total: items.length };
}

export async function stlLink(printId: string, fileId: string, signal?: AbortSignal): Promise<string> {
  const data = await gql<{ getDownloadLink: { ok: boolean; output: { link: string } | null } }>(
    `mutation($id: ID!, $printId: ID!) { getDownloadLink(id: $id, printId: $printId, fileType: stl, source: model_detail) { ok output { link } } }`,
    { id: fileId, printId },
    signal,
  );
  const link = data.getDownloadLink.output?.link;
  if (!data.getDownloadLink.ok || !link || !link.startsWith("https://files.printables.com/")) throw new Error("printables: no download link");
  return link;
}
