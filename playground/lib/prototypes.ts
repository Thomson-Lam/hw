import { prototypes } from "@/lib/generated/prototypes";
import type { PrototypeMeta } from "@/lib/prototype-types";

export type { PrototypeMeta };

/** Every prototype, most recently updated first. */
export function getPrototypes(): PrototypeMeta[] {
  return [...prototypes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export function getPrototype(slug: string): PrototypeMeta | undefined {
  return prototypes.find((p) => p.slug === slug);
}

export function getPublicPrototype(slug: string): PrototypeMeta | undefined {
  const p = getPrototype(slug);
  return p?.public ? p : undefined;
}

export function isPublicSlug(slug: string): boolean {
  return Boolean(getPublicPrototype(slug));
}
