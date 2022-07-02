export function ensureArray<T>(val: T | T[] | undefined | null): T[] {
  return val ? (Array.isArray(val) ? val : [val]) : [];
}

export type MaybeArray<T> = T | T[];
