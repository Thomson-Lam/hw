import { Button } from "@/components/ui/button";
import { PACK_IDS, PACKS } from "../packs";
import type { PackId } from "../types";

export function PackPicker({ onPick }: { onPick: (p: PackId) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-medium">Pick a road</h1>
      {PACK_IDS.map((id) => {
        const p = PACKS[id];
        return (
          <Button key={id} variant="outline" className="h-auto min-h-11 flex-col items-start gap-1 px-4 py-3 text-left whitespace-normal" onClick={() => onPick(id)} data-pack={id}>
            <span className="font-medium">{p.title}</span>
            <span className="text-xs text-muted-foreground">Rome: {p.rome}</span>
          </Button>
        );
      })}
    </div>
  );
}
