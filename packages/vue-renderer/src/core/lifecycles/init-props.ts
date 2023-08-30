import {
  camelCase,
  isArray,
  isFunction,
  isObject,
  isString,
} from '@knxcloud/lowcode-utils';
import { ComponentInternalInstance, Prop, PropType, withCtx } from 'vue';
import {
  warn,
  type RuntimeScope,
  type SchemaParser,
  addToScope,
  AccessTypes,
} from '../../utils';

function getType(ctor: Prop<any>): string {
  const match = ctor && ctor.toString().match(/^\s*function (\w+)/);
  return match ? match[1] : ctor === null ? 'null' : '';
}

function isSameType(a: Prop<any>, b: Prop<any>): boolean {
  return getType(a) === getType(b);
}

function getTypeIndex(
  type: Prop<any>,
  expectedTypes: PropType<any> | void | null | true,
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
  scope: RuntimeScope,
): void {
  const propsConfig = parser.parseSchema(schema, false);
  if (
    !propsConfig ||
    (!isObject(propsConfig) && !isArray(propsConfig)) ||
    (isObject(propsConfig) && Object.keys(propsConfig).length === 0) ||
    (isArray(propsConfig) && propsConfig.length === 0)
  )
    return;

  const instance = scope.$;

  const {
    propsOptions: [rawPropsOptions, rawNeedCastKeys],
  } = instance;

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
    instance.propsOptions = [
      { ...rawPropsOptions, ...propsOptions },
      [...rawNeedCastKeys, ...needCastKeys],
    ];

    const { props, attrs } = instance;
    const propValues = Object.keys(propsOptions).reduce(
      (res, key) => {
        res[key] = resolvePropValue(
          propsOptions,
          { ...props, ...res },
          key,
          attrs[key],
          instance,
          needCastKeys.includes(key),
        );
        return res;
      },
      {} as Record<string, unknown>,
    );

    if (Object.keys(propValues).length > 0) {
      addToScope(scope, AccessTypes.PROPS, propValues, false, false);
    }
  }
}

function resolvePropValue(
  options: object,
  props: Record<string, unknown>,
  key: string,
  value: unknown,
  instance: ComponentInternalInstance,
  isAbsent: boolean,
) {
  const opt = options[key];
  if (opt != null) {
    const hasDefault = Reflect.has(opt, 'default');
    if (hasDefault && value === undefined) {
      const defaultValue = opt.default;
      if (opt.type !== Function && !opt.skipFactory && isFunction(defaultValue)) {
        const { propsDefaults } = instance;
        if (key in propsDefaults) {
          value = propsDefaults[key];
        } else {
          value = propsDefaults[key] = withCtx(
            () => defaultValue.call(null, props),
            instance,
          )();
        }
      } else {
        value = defaultValue;
      }
    }
    // boolean casting
    if (opt[0]) {
      if (isAbsent && !hasDefault) {
        value = false;
      } else if (opt[1] && (value === '' || value === hyphenate(key))) {
        value = true;
      }
    }
  }
  return value;
}

const cacheStringFunction = <T extends (str: string) => string>(fn: T): T => {
  const cache: Record<string, string> = Object.create(null);
  return ((str: string) => {
    const hit = cache[str];
    return hit || (cache[str] = fn(str));
  }) as T;
};

const hyphenateRE = /\B([A-Z])/g;

const hyphenate = cacheStringFunction((str: string) =>
  str.replace(hyphenateRE, '-$1').toLowerCase(),
);
