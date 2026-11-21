/** localStorage wrapped in try/catch (private mode, quota, SSR). Keys are namespaced per prototype. */
export const storage = {
  get(key: string): unknown {
    try {
      const raw = window.localStorage.getItem(key);
      return raw == null ? null : JSON.parse(raw);
    } catch {
      return null;
    }
  },
  set(key: string, value: unknown): void {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
};

export const storageKey = (slug: string, name: string) => `pg:${slug}:${name}`;
