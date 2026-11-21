export type NumberControl = { type: "number"; label: string; min: number; max: number; step?: number; default: number };
export type BooleanControl = { type: "boolean"; label: string; default: boolean };
export type SelectControl = { type: "select"; label: string; options: readonly string[]; default: string };
export type Control = NumberControl | BooleanControl | SelectControl;
export type ControlSchema = Record<string, Control>;

export type ControlValues<S extends ControlSchema> = {
  [K in keyof S]: S[K] extends NumberControl ? number : S[K] extends BooleanControl ? boolean : string;
};

/** Helper that keeps literal key types: `defineControls({ speed: { type: "number", ... } })`. */
export function defineControls<S extends ControlSchema>(schema: S): S {
  return schema;
}
