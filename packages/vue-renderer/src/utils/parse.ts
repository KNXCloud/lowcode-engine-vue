import {
  I18nData,
  JSFunction,
  JSExpression,
  isI18nData,
  isJSExpression,
  isJSFunction,
} from '@alilc/lowcode-types';
import { isFunction, isString } from 'lodash-es';
import { isPlainObject } from './object';
import { ensureArray } from './array';
import { BlockScope, RuntimeScope } from './scope';

export const EXPRESSION_TYPE = {
  JSEXPRESSION: 'JSExpression',
  JSFUNCTION: 'JSFunction',
  JSSLOT: 'JSSlot',
  JSBLOCK: 'JSBlock',
  I18N: 'i18n',
} as const;

export function inSameDomain() {
  try {
    return (
      window.parent !== window && window.parent.location.host === window.location.host
    );
  } catch (e) {
    return false;
  }
}

export function parseI18n(i18nInfo: I18nData, scope?: RuntimeScope) {
  return parseExpression(
    {
      type: EXPRESSION_TYPE.JSEXPRESSION,
      value: `this.i18n('${i18nInfo.key}')`,
    },
    scope
  ) as string | undefined;
}

export function parseExpression(str: JSFunction, scope?: RuntimeScope): CallableFunction;
export function parseExpression(str: JSExpression, scope?: RuntimeScope): unknown;
export function parseExpression(
  str: JSExpression | JSFunction,
  scope?: RuntimeScope
): CallableFunction | unknown;
export function parseExpression(
  str: JSExpression | JSFunction,
  scope?: RuntimeScope
): CallableFunction | unknown {
  try {
    const contextArr = ['"use strict";', 'var __self = arguments[0];'];
    contextArr.push('return ');
    let tarStr: string;

    tarStr = (str.value || '').trim();

    tarStr = tarStr.replace(/this(\W|$)/g, (_a: string, b: string) => `__self${b}`);
    tarStr = contextArr.join('\n') + tarStr;

    // 默认调用顶层窗口的parseObj, 保障new Function的window对象是顶层的window对象
    if (inSameDomain() && (window.parent as any).__newFunc) {
      return (window.parent as any).__newFunc(tarStr)(self);
    }
    return new Function('$scope', `with($scope || {}) { ${tarStr} }`)(scope);
  } catch (err) {
    console.warn('parseExpression.error', err, str, self);
    return undefined;
  }
}

export function parseSchema(schema: I18nData, scope?: RuntimeScope): string | undefined;
export function parseSchema(schema: JSFunction, scope?: RuntimeScope): CallableFunction;
export function parseSchema(schema: JSExpression, scope?: RuntimeScope): unknown;
export function parseSchema<T extends object>(
  schema: T,
  scope: RuntimeScope
): Record<string, unknown>;
export function parseSchema<T>(schema: T, scope?: RuntimeScope): T;
export function parseSchema(schema: unknown, scope?: RuntimeScope): unknown {
  if (isJSExpression(schema) || isJSFunction(schema)) {
    return parseExpression(schema, scope);
  } else if (isI18nData(schema)) {
    return parseI18n(schema, scope);
  } else if (isString(schema)) {
    return schema.trim();
  } else if (Array.isArray(schema)) {
    return schema.map((item) => parseSchema(item, scope));
  } else if (isFunction(schema)) {
    return schema.bind(scope);
  } else if (isPlainObject(schema)) {
    if (!schema) return schema;
    const res: Record<string, unknown> = {};
    Object.keys(schema).forEach((key) => {
      if (key.startsWith('__')) return;
      res[key] = parseSchema(schema[key], scope);
    });
    return res;
  }
  return schema;
}

export function parseSlotScope(args: unknown[], params: string[]): BlockScope {
  const slotParams: BlockScope = {};
  ensureArray(params).forEach((item, idx) => {
    slotParams[item] = args[idx];
  });
  return slotParams;
}
