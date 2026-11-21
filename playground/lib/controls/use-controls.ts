"use client";

import { useCallback, useEffect, useState } from "react";
import { defaults, randomize, sanitize } from "./logic";
import { storage, storageKey } from "./storage";
import type { ControlSchema, ControlValues } from "./types";

export type ControlsApi<S extends ControlSchema> = {
  schema: S;
  values: ControlValues<S>;
  set: <K extends keyof S>(key: K, value: ControlValues<S>[K]) => void;
  reset: () => void;
  randomize: () => void;
};

/** Values persist to localStorage under `pg:<slug>:controls`, loaded on mount (never during SSR). */
export function useControls<S extends ControlSchema>(slug: string, schema: S): ControlsApi<S> {
  const key = storageKey(slug, "controls");
  const [values, setValues] = useState<ControlValues<S>>(() => defaults(schema));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = storage.get(key);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load persisted state after mount, by design
    if (saved) setValues(sanitize(schema, saved));
    setLoaded(true);
  }, [key, schema]);

  useEffect(() => {
    if (loaded) storage.set(key, values);
  }, [key, values, loaded]);

  const set = useCallback(<K extends keyof S>(k: K, v: ControlValues<S>[K]) => setValues((prev) => ({ ...prev, [k]: v })), []);
  return {
    schema,
    values,
    set,
    reset: useCallback(() => setValues(defaults(schema)), [schema]),
    randomize: useCallback(() => setValues(randomize(schema)), [schema]),
  };
}
