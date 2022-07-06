export function isNil<T = unknown>(val: T): val is NonNullable<T> {
  return val !== null && val !== undefined;
}

export function isObject(el: unknown): el is Record<string | number | symbol, unknown> {
  return isNil(el) && typeof el === 'object';
}
