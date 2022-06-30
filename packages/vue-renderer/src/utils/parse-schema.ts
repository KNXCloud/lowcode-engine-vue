import {
  I18nData,
  isI18nData,
  isJSExpression,
  isJSFunction,
  JSExpression,
  JSFunction,
} from '@alilc/lowcode-types';
import { isFunction } from 'lodash-es';

const EXPRESSION_TYPE = {
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

export function parseI18n(i18nInfo: I18nData, scope: any) {
  return parseExpression(
    {
      type: EXPRESSION_TYPE.JSEXPRESSION,
      value: `this.i18n('${i18nInfo.key}')`,
    },
    scope
  );
}

export function parseExpression(str: JSExpression | JSFunction, scope: any): any {
  try {
    const contextArr = ['"use strict";', 'var __self = arguments[0];'];
    contextArr.push('return ');
    let tarStr: string;

    tarStr = (str.value || '').trim();

    tarStr = tarStr.replace(/this(\W|$)/g, (_a: any, b: any) => `__self${b}`);
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

export function parseSchema(schema: unknown, scope: any): any {
  if (isJSExpression(schema) || isJSFunction(schema)) {
    return parseExpression(schema, scope);
  } else if (isI18nData(schema)) {
    return parseI18n(schema, scope);
  } else if (typeof schema === 'string') {
    return schema.trim();
  } else if (Array.isArray(schema)) {
    return schema.map((item) => parseSchema(item, scope));
  } else if (isFunction(schema)) {
    return schema.bind(scope);
  } else if (typeof schema === 'object') {
    if (!schema) return schema;
    const res: any = {};
    Object.entries(schema).forEach(([key, val]: [any, any]) => {
      if (key.startsWith('__')) return;
      res[key] = parseSchema(val, scope);
    });
    return res;
  }
  return schema;
}
