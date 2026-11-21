import type { PrototypeMeta } from "@/lib/prototype-types";

export type GalleryFilter = { query: string; tag: string | null; showHidden: boolean };

export function filterPrototypes(list: PrototypeMeta[], f: GalleryFilter): PrototypeMeta[] {
  const q = f.query.trim().toLowerCase();
  return list.filter((p) => {
    if (p.hidden && !f.showHidden) return false;
    if (f.tag && !p.tags.includes(f.tag)) return false;
    if (!q) return true;
    return [p.title, p.description, p.slug, ...p.tags].some((s) => s.toLowerCase().includes(q));
  });
}

export function allTags(list: PrototypeMeta[]): string[] {
  return [...new Set(list.flatMap((p) => p.tags))].sort();
}
