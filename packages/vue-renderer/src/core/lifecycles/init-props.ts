import { camelCase, isFunction, isObject } from '@knxcloud/lowcode-utils';
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
  if (Array.isArray(expectedTypes)) {
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
  if (!propsConfig || !isObject(propsConfig) || Object.keys(propsConfig).length === 0)
    return;

  const {
    propsOptions: [propsOptions, needCastKeys],
  } = scope.$;

  for (const key in propsConfig) {
    if (propsOptions[key]) {
      warn('prop ' + key + '声明重复');
      continue;
    }

    const opt = propsConfig[key];
    const normalizedKey = camelCase(key);
    const prop =
      Array.isArray(opt) || isFunction(opt)
        ? { type: opt }
        : (opt as Record<string, any>);

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
}
