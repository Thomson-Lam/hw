// Reader for the closed road language. Pure data: no eval, no symbols resolve to code.

export type Str = { str: string };
export type Atom = string | number | Str;
export type Form = Atom | Form[];

export const LIMITS = { chars: 4000, depth: 12, tokens: 600 } as const;

export class ReadError extends Error {
  constructor(
    public inv: "syntax" | "size",
    msg: string,
  ) {
    super(msg);
  }
}

export const isStr = (f: Form | undefined): f is Str => typeof f === "object" && f !== null && !Array.isArray(f);
export const isList = (f: Form | undefined): f is Form[] => Array.isArray(f);
export const isSym = (f: Form | undefined): f is string => typeof f === "string";

export function read(src: string): Form[] {
  if (src.length > LIMITS.chars) throw new ReadError("size", `source is ${src.length} chars (max ${LIMITS.chars})`);
  const toks = src.replace(/;[^\n]*/g, "").match(/"(?:[^"\\]|\\.)*"|[()]|[^\s()]+/g) ?? [];
  if (toks.length > LIMITS.tokens) throw new ReadError("size", `source has ${toks.length} tokens (max ${LIMITS.tokens})`);
  let i = 0;
  const form = (depth: number): Form => {
    if (depth > LIMITS.depth) throw new ReadError("size", `nesting deeper than ${LIMITS.depth}`);
    const t = toks[i++];
    if (t === undefined) throw new ReadError("syntax", "unexpected end of input");
    if (t === "(") {
      const list: Form[] = [];
      while (toks[i] !== ")") {
        if (i >= toks.length) throw new ReadError("syntax", "missing )");
        list.push(form(depth + 1));
      }
      i++;
      return list;
    }
    if (t === ")") throw new ReadError("syntax", "unexpected )");
    if (t.startsWith('"')) {
      try {
        return { str: JSON.parse(t) as string };
      } catch {
        throw new ReadError("syntax", `bad string ${t.slice(0, 20)}`);
      }
    }
    if (/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
    if (!/^:?[a-z][a-z0-9-]*$/.test(t)) throw new ReadError("syntax", `bad symbol ${JSON.stringify(t.slice(0, 20))}`);
    return t;
  };
  const out: Form[] = [];
  while (i < toks.length) out.push(form(0));
  return out;
}

/** Keyword arguments and positional arguments of a list form, after its head. */
export function args(list: Form[]): { kw: Record<string, Form>; pos: Form[] } {
  const kw: Record<string, Form> = {};
  const pos: Form[] = [];
  for (let i = 1; i < list.length; i++) {
    const f = list[i];
    if (isSym(f) && f.startsWith(":")) kw[f.slice(1)] = list[++i];
    else pos.push(f);
  }
  return { kw, pos };
}

export function show(f: Form): string {
  if (isList(f)) return `(${f.map(show).join(" ")})`;
  if (isStr(f)) return JSON.stringify(f.str);
  return String(f);
}

/** Every symbol in a form tree (used to find effect words anywhere in LLM text). */
export function symbols(f: Form, out: string[] = []): string[] {
  if (isList(f)) f.forEach((x) => symbols(x, out));
  else if (isSym(f)) out.push(f);
  return out;
}
