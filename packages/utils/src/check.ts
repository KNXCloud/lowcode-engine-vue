export type ESModule = {
  __esModule: true;
  default: any;
};

export function isNil<T>(val: T): val is NonNullable<T> {
  return val !== null && val !== undefined;
}

export function isObject(val: unknown): val is Record<string, unknown> {
  return !isNil(val) && typeof val === 'object';
}

export function isFunction(val: unknown): val is (...args: any[]) => any {
  return typeof val === 'function';
}

export function isESModule(obj: unknown): obj is ESModule {
  return isObject(obj) && !!obj.__esModule;
}

export function isCSSUrl(url: string): boolean {
  return /\.css$/.test(url);
}

export function isElement(node: unknown): node is Element {
  return isObject(node) && node.nodeType === Node.ELEMENT_NODE;
}
