"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Thumbnail } from "@/components/playground/thumbnail";
import { allTags, filterPrototypes } from "@/lib/gallery-filter";
import type { PrototypeMeta } from "@/lib/prototype-types";
import { cn } from "@/lib/utils";

export function Gallery({ prototypes }: { prototypes: PrototypeMeta[] }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState<string | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const tags = useMemo(() => allTags(prototypes), [prototypes]);
  const visible = filterPrototypes(prototypes, { query, tag, showHidden });
  const hiddenCount = prototypes.filter((p) => p.hidden).length;

  return (
    <div className="flex flex-col gap-4">
      <Input
        type="search"
        placeholder="Search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="h-11 text-base sm:text-sm"
      />
      {(tags.length > 0 || hiddenCount > 0) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {tags.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTag(tag === t ? null : t)}
              className="flex min-h-11 items-center"
              aria-pressed={tag === t}
            >
              <Badge variant={tag === t ? "default" : "outline"} className="h-7 px-3">
                {t}
              </Badge>
            </button>
          ))}
          {hiddenCount > 0 && (
            <label className="ml-auto flex min-h-11 items-center gap-2 text-sm text-muted-foreground">
              Hidden
              <Switch checked={showHidden} onCheckedChange={setShowHidden} />
            </label>
          )}
        </div>
      )}
      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">Nothing here.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.map((p) => (
            <li key={p.slug}>
              <Link
                href={`/prototypes/${p.slug}`}
                className={cn(
                  "block overflow-hidden rounded-xl border border-border bg-card text-card-foreground transition-colors hover:bg-muted active:bg-muted",
                  p.hidden && "opacity-60",
                )}
              >
                <Thumbnail proto={p} />
                <div className="flex flex-col gap-1 p-3">
                  <div className="flex items-center gap-2">
                    <h2 className="truncate text-sm font-medium">{p.title}</h2>
                    {p.public && <Badge variant="secondary">public</Badge>}
                  </div>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
