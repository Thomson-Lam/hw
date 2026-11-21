"use client";

import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { rowOf } from "../packs/merch-trail";
import type { Ctx } from "../types";

const StlViewer = dynamic(() => import("./stl-viewer").then((m) => m.StlViewer), { ssr: false });

/** A candidate model standing on the road. All text comes from the search row, never from the paver. */
export function PickTile({ ctx, id, near }: { ctx: Ctx; id: string; near: boolean }) {
  const row = rowOf(ctx, id);
  if (!row) return <p className="text-sm text-muted-foreground">Model {id} is not in the results.</p>;
  return (
    <div className="flex flex-col gap-2" data-testid="pick">
      <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">{near ? <StlViewer print={row.id} file={row.stlFileId} /> : null}</div>
      <p className="text-base font-medium break-words">{row.title}</p>
      <div className="flex flex-wrap gap-1">
        <Badge variant="outline">{row.license.replace("Creative Commons — ", "CC ")}</Badge>
        <Badge variant="outline">{row.likes} likes</Badge>
        <Badge variant="outline">{(row.stlBytes / 1024).toFixed(0)} KB</Badge>
      </div>
      <p className="text-xs text-muted-foreground">by {row.author ?? "unknown"} on Printables</p>
    </div>
  );
}
