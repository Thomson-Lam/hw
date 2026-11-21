"use client";

import { DicesIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { ControlsApi } from "./use-controls";
import type { Control, ControlSchema } from "./types";

export function ControlPanel<S extends ControlSchema>({ controls }: { controls: ControlsApi<S> }) {
  const { schema, values, set } = controls;
  const update = (k: keyof S, v: unknown) => set(k, v as never);
  return (
    <div className="flex flex-col gap-5">
      {(Object.entries(schema) as [keyof S & string, Control][]).map(([k, c]) => (
        <Field key={k} control={c} value={values[k]} onChange={(v) => update(k, v)} id={`ctl-${k}`} />
      ))}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" className="h-11" onClick={controls.reset}>
          <RotateCcwIcon />
          Reset
        </Button>
        <Button variant="outline" className="h-11" onClick={controls.randomize}>
          <DicesIcon />
          Randomize
        </Button>
      </div>
    </div>
  );
}

function Field({ control: c, value, onChange, id }: { control: Control; value: unknown; onChange: (v: unknown) => void; id: string }) {
  if (c.type === "boolean") {
    return (
      <label htmlFor={id} className="flex min-h-11 items-center justify-between gap-3 text-sm">
        {c.label}
        <Switch id={id} checked={value as boolean} onCheckedChange={(v) => onChange(v)} />
      </label>
    );
  }
  if (c.type === "select") {
    return (
      <label htmlFor={id} className="flex flex-col gap-2 text-sm">
        {c.label}
        <NativeSelect id={id} value={value as string} onChange={(e) => onChange(e.target.value)} className="h-11 w-full">
          {c.options.map((o) => (
            <NativeSelectOption key={o} value={o}>
              {o}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      </label>
    );
  }
  return (
    <div className="flex flex-col gap-3 text-sm">
      <div className="flex justify-between">
        <span id={`${id}-label`}>{c.label}</span>
        <span className="text-muted-foreground tabular-nums">{value as number}</span>
      </div>
      <Slider
        aria-labelledby={`${id}-label`}
        min={c.min}
        max={c.max}
        step={c.step ?? (c.max - c.min) / 100}
        value={[value as number]}
        onValueChange={(v) => onChange(Array.isArray(v) ? v[0] : v)}
        className="py-3"
      />
    </div>
  );
}
