import type {
  IPublicTypeI18nData as I18nData,
  IPublicTypeJSFunction as JSFunction,
  IPublicTypeJSExpression as JSExpression,
  IPublicTypeContainerSchema,
} from '@alilc/lowcode-types';
import type { BlockScope, RuntimeScope } from './scope';
import {
  isArray,
  isFunction,
  isI18nData,
  isJSExpression,
  isJSFunction,
  isPlainObject,
  isString,
} from '@knxcloud/lowcode-utils';
import { ensureArray } from './array';

export const EXPRESSION_TYPE = {
  JSEXPRESSION: 'JSExpression',
  JSFUNCTION: 'JSFunction',
  JSSLOT: 'JSSlot',
  JSBLOCK: 'JSBlock',
  I18N: 'i18n',
} as const;

export interface SchemaParserOptions {
  thisRequired?: boolean;
}

export class SchemaParser {
  static cacheModules: Record<string, object> = {};
  static cleanCacheModules() {
    this.cacheModules = {};
  }
  private createFunction: (code: string) => CallableFunction;
  private exports = {};

  constructor(options?: SchemaParserOptions) {
    this.createFunction =
      options && !options.thisRequired
        ? (code) =>
            new Function(
              '__exports__',
              '__scope__',
              `with(__exports__) { with(__scope__) { ${code} } }`
            )
        : (code) => new Function('__exports__', `with(__exports__) { ${code} }`);
  }

  initModule(schema: IPublicTypeContainerSchema) {
    const initModuleSchema = schema.lifeCycles?.initModule;
    const res = initModuleSchema
      ? this.parseSchema(initModuleSchema, false)
      : initModuleSchema;
    this.exports = isFunction(res) ? res(SchemaParser.cacheModules, window) : {};
    return this;
  }

  parseSlotScope(args: unknown[], params: string[]): BlockScope {
    const slotParams: BlockScope = {};
    ensureArray(params).forEach((item, idx) => {
      slotParams[item] = args[idx];
    });
    return slotParams;
  }
  parseI18n(i18nInfo: I18nData, scope?: RuntimeScope | boolean) {
    return this.parseExpression(
      {
        type: EXPRESSION_TYPE.JSEXPRESSION,
        value: `this.$t(${JSON.stringify(i18nInfo.key)})`,
      },
      scope
    ) as string | undefined;
  }

  parseSchema(schema: I18nData, scope?: RuntimeScope | boolean): string | undefined;
  parseSchema(schema: JSFunction, scope?: RuntimeScope | boolean): CallableFunction;
  parseSchema(schema: JSExpression, scope?: RuntimeScope | boolean): unknown;
  parseSchema<T extends object>(
    schema: T,
    scope: RuntimeScope | boolean
  ): {
    [K in keyof T]: T[K] extends I18nData
      ? string
      : T[K] extends JSFunction
      ? CallableFunction
      : T[K] extends JSExpression
      ? unknown
      : T[K] extends JSExpression | JSFunction
      ? CallableFunction | unknown
      : T[K];
  };
  parseSchema<T>(schema: T, scope?: RuntimeScope | boolean): T;
  parseSchema(schema: unknown, scope?: RuntimeScope | boolean): unknown {
    if (isJSExpression(schema) || isJSFunction(schema)) {
      return this.parseExpression(schema, scope);
    } else if (isI18nData(schema)) {
      return this.parseI18n(schema, scope);
    } else if (isString(schema)) {
      return schema.trim();
    } else if (isArray(schema)) {
      return schema.map((item) => this.parseSchema(item, scope));
    } else if (isFunction(schema)) {
      return schema.bind(scope);
    } else if (isPlainObject(schema)) {
      if (!schema) return schema;
      const res: Record<string, unknown> = {};
      Object.keys(schema).forEach((key) => {
        if (key.startsWith('__')) return;
        res[key] = this.parseSchema(schema[key], scope);
      });
      return res;
    }
    return schema;
  }

  parseOnlyJsValue<T>(schema: unknown): T;
  parseOnlyJsValue(schema: unknown): unknown;
  parseOnlyJsValue(schema: unknown): unknown {
    if (isJSExpression(schema) || isJSExpression(schema) || isI18nData(schema)) {
      return undefined;
    } else if (isArray(schema)) {
      return schema.map((item) => this.parseOnlyJsValue(item));
    } else if (isPlainObject(schema)) {
      const res: Record<string, unknown> = {};
      Object.keys(schema).forEach((key) => {
        if (key.startsWith('__')) return;
        res[key] = this.parseOnlyJsValue(schema[key]);
      });
      return res;
    }
    return schema;
  }

  parseExpression(str: JSFunction, scope?: RuntimeScope | boolean): CallableFunction;
  parseExpression(str: JSExpression, scope?: RuntimeScope | boolean): unknown;
  parseExpression(
    str: JSExpression | JSFunction,
    scope?: RuntimeScope | boolean
  ): CallableFunction | unknown;
  parseExpression(
    str: JSExpression | JSFunction,
    scope?: RuntimeScope | boolean
  ): CallableFunction | unknown {
    try {
      const contextArr = ['"use strict";', 'var __self = arguments[1];'];
      contextArr.push('return ');
      let tarStr: string;

      tarStr = (str.value || '').trim();

      if (scope !== false && !tarStr.match(/^\([^)]*\)\s*=>/)) {
        tarStr = tarStr.replace(/this(\W|$)/g, (_a: string, b: string) => `__self${b}`);
      }
      tarStr = contextArr.join('\n') + tarStr;
      const fn = this.createFunction(tarStr);
      return fn(this.exports, scope || {});
    } catch (err) {
      console.warn('parseExpression.error', err, str, self);
      return undefined;
    }
  }
}
