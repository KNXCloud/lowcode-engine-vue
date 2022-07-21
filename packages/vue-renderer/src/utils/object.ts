import { isNil } from 'lodash-es';

export function isObject(val: unknown): val is Record<string, unknown> {
  return !isNil(val) && typeof val === 'object';
}

export function isPlainObject(val: unknown): val is Record<string, unknown> {
  return !isNil(val) && Object.prototype.toString.call(val) === '[object Object]';
}
