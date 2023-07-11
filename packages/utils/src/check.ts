import type {
  IPublicTypeJSExpression,
  IPublicTypeJSFunction,
  IPublicTypeJSSlot,
  IPublicTypeI18nData,
  IPublicTypeNodeSchema,
  IPublicTypeSlotSchema,
  IPublicTypeComponentSchema,
  IPublicTypeContainerSchema,
} from '@alilc/lowcode-types';
import { toString } from './misc';

export type ESModule = {
  __esModule: true;
  default: any;
};

export function isNil<T>(val: T | null | undefined): val is null | undefined {
  return val === null || val === undefined;
}

export function isUndefined(val: unknown): val is undefined {
  return val === undefined;
}

export function isString(val: unknown): val is string {
  return typeof val === 'string';
}

export function isObject(val: unknown): val is Record<string, unknown> {
  return !isNil(val) && typeof val === 'object';
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray(val: any): val is any[] {
  return Array.isArray(val);
}

export function isFunction(val: unknown): val is (...args: any[]) => any {
  return typeof val === 'function';
}

export function isPromise(val: unknown): val is Promise<unknown> {
  return isObject(val) && isFunction(val.then) && isFunction(val.catch);
}

export function isPlainObject(val: unknown): val is Record<string, unknown> {
  return !isNil(val) && toString(val) === '[object Object]';
}

export function isESModule<T>(obj: T | { default: T }): obj is ESModule {
  return (
    obj &&
    (Reflect.get(obj, '__esModule') || Reflect.get(obj, Symbol.toStringTag) === 'Module')
  );
}

export function isCSSUrl(url: string): boolean {
  return /\.css$/.test(url);
}

export function isElement(node: unknown): node is Element {
  return isObject(node) && node.nodeType === Node.ELEMENT_NODE;
}

export function isJSFunction(val: unknown): val is IPublicTypeJSFunction {
  return val
    ? isObject(val) && (val.type === 'JSFunction' || val.extType === 'function')
    : false;
}

export function isJSSlot(val: unknown): val is IPublicTypeJSSlot {
  return isObject(val) && val.type === 'JSSlot';
}

export function isJSExpression(val: unknown): val is IPublicTypeJSExpression {
  return isObject(val) && val.type === 'JSExpression' && val.extType !== 'function';
}

export function isI18nData(val: unknown): val is IPublicTypeI18nData {
  return isObject(val) && val.type === 'i18n';
}

export function isDOMText(val: unknown): val is string {
  return isString(val);
}

export function isNodeSchema(data: any): data is IPublicTypeNodeSchema {
  return data && data.componentName;
}

export function isSlotSchema(data: any): data is IPublicTypeSlotSchema {
  return isNodeSchema(data) && data.componentName === 'Slot';
}

export function isComponentSchema(val: unknown): val is IPublicTypeComponentSchema {
  return isObject(val) && val.componentName === 'Component';
}

export function isContainerSchema(val: unknown): val is IPublicTypeContainerSchema {
  return (
    isNodeSchema(val) &&
    (val.componentName === 'Block' ||
      val.componentName === 'Page' ||
      val.componentName === 'Component')
  );
}
