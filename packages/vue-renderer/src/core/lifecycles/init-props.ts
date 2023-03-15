import {
  camelCase,
  isArray,
  isFunction,
  isObject,
  isString,
} from '@knxcloud/lowcode-utils';
import type { Prop, PropType } from 'vue';
import { warn, type RuntimeScope, type SchemaParser } from '../../utils';

function getType(ctor: Prop<any>): string {
  const match = ctor && ctor.toString().match(/^\s*function (\w+)/);
  return match ? match[1] : ctor === null ? 'null' : '';
}

function isSameType(a: Prop<any>, b: Prop<any>): boolean {
  return getType(a) === getType(b);
}

function getTypeIndex(
  type: Prop<any>,
  expectedTypes: PropType<any> | void | null | true
): number {
  if (isArray(expectedTypes)) {
    return expectedTypes.findIndex((t) => isSameType(t, type));
  } else if (isFunction(expectedTypes)) {
    return isSameType(expectedTypes, type) ? 0 : -1;
  }
  return -1;
}

export function initProps(
  parser: SchemaParser,
  schema: unknown,
  scope: RuntimeScope
): void {
  const propsConfig = parser.parseSchema(schema, false);
  if (
    !propsConfig ||
    (!isObject(propsConfig) && !isArray(propsConfig)) ||
    (isObject(propsConfig) && Object.keys(propsConfig).length === 0) ||
    (isArray(propsConfig) && propsConfig.length === 0)
  )
    return;

  const {
    propsOptions: [rawPropsOptions, rawNeedCastKeys],
  } = scope.$;

  const propsOptions: Record<string, object> = {};
  const needCastKeys: string[] = [];

  for (const key in propsConfig) {
    const opt = propsConfig[key];
    let normalizedKey: string;
    let prop: Record<string, any>;

    if (isString(opt)) {
      normalizedKey = camelCase(opt);
      prop = {};
    } else {
      normalizedKey = camelCase(key);
      prop =
        isArray(opt) || isFunction(opt) ? { type: opt } : (opt as Record<string, any>);
    }

    if (rawPropsOptions[normalizedKey]) {
      warn('prop ' + normalizedKey + '声明重复');
      continue;
    }

    const booleanIndex = getTypeIndex(Boolean, prop.type);
    const stringIndex = getTypeIndex(String, prop.type);

    propsOptions[normalizedKey] = {
      0: booleanIndex > -1,
      1: stringIndex < 0 || booleanIndex < stringIndex,
      ...prop,
    };

    if (booleanIndex > -1 || 'default' in prop) {
      needCastKeys.push(normalizedKey);
    }
  }

  if (Object.keys(propsOptions).length > 0) {
    scope.$.propsOptions = [
      { ...rawPropsOptions, ...propsOptions },
      [...rawNeedCastKeys, ...needCastKeys],
    ];
  }
}
