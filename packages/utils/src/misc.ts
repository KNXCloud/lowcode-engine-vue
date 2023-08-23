import { isArray, isFunction, isString } from './check';

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
    if (isArray(val) && val.length >= 2) {
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

export const toString = (o: unknown) => Object.prototype.toString.call(o);

export function sleep(ms?: number) {
  return new Promise<void>((resolve) => {
    return setTimeout(resolve, ms);
  });
}

export const createObjectSplitter = (
  specialProps: string | string[] | ((prop: string) => boolean)
) => {
  const propsSet = new Set(
    isString(specialProps)
      ? specialProps.split(',')
      : isArray(specialProps)
      ? specialProps
      : []
  );

  const has = isFunction(specialProps)
    ? specialProps
    : (prop: string) => propsSet.has(prop);

  return <T>(o: Record<string, T>): [Record<string, T>, Record<string, T>, number] => {
    const keys = Object.keys(o);
    if (keys.every((k) => !has(k))) return [{}, o, 0];

    let count = 0;
    const left: Record<string, T> = {};
    const right: Record<string, T> = {};

    for (const key of keys) {
      if (has(key)) {
        left[key] = o[key];
        count++;
      } else {
        right[key] = o[key];
      }
    }

    return [left, right, count];
  };
};

export const cached = <R>(fn: (param: string) => R): ((param: string) => R) => {
  const cacheStore: Record<string, any> = {};
  return function (this: unknown, param: string) {
    return param in cacheStore
      ? cacheStore[param]
      : (cacheStore[param] = fn.call(this, param));
  };
};
