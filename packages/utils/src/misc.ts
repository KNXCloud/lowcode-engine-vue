export const noop: (...args: any[]) => any = () => void 0;

export function fromPairs<E extends Iterable<unknown>>(
  entries: E
): E extends Iterable<infer T>
  ? T extends [infer K, infer V]
    ? K extends string
      ? Record<K, V>
      : Record<string, unknown>
    : Record<string, unknown>
  : Record<string, unknown> {
  const result: any = {};
  for (const val of entries) {
    if (Array.isArray(val) && val.length >= 2) {
      result[val[0]] = val[1];
    }
  }
  return result;
}

export function debounce<T extends () => unknown>(fn: T, ms?: number): () => void {
  let timerId: any = null;

  if (!ms) {
    return function (this: unknown) {
      if (!timerId) {
        timerId = setTimeout(() => {
          timerId = null;
          fn.apply(this);
        });
      }
    };
  } else {
    return function (this: unknown) {
      if (timerId) {
        clearTimeout(timerId);
      }
      timerId = setTimeout(() => {
        timerId = null;
        fn.apply(this);
      }, ms);
    };
  }
}
