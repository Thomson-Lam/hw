import type { PrototypeMeta } from "@/lib/prototype-types";

/** Static light + dark images, switched by CSS (no JS, no flash). */
export function Thumbnail({ proto }: { proto: PrototypeMeta }) {
  const { light, dark } = proto.thumbnail;
  if (!light && !dark) {
    return (
      <div className="flex aspect-[8/5] items-center justify-center bg-muted text-xs text-muted-foreground">
        No preview yet
      </div>
    );
  }
  return (
    <div className="aspect-[8/5] overflow-hidden bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={light ?? dark!} alt="" loading="lazy" className="block size-full object-cover dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dark ?? light!} alt="" loading="lazy" className="hidden size-full object-cover dark:block" />
    </div>
  );
}
