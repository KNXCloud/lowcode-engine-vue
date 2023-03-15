import { isArray, isFunction, isObject, isString } from '@knxcloud/lowcode-utils';
import { warn, watch } from 'vue';
import {
  AccessTypes,
  getAccessTarget,
  type RuntimeScope,
  type SchemaParser,
} from '../../utils';

function createPathGetter(ctx: any, path: string) {
  const segments = path.split('.');
  return () => {
    let cur = ctx;
    for (let i = 0; i < segments.length && cur; i++) {
      cur = cur[segments[i]];
    }
    return cur;
  };
}

export function createWatcher(
  raw: unknown,
  ctx: Record<string, unknown>,
  scope: RuntimeScope,
  key: string
) {
  const getter = key.includes('.') ? createPathGetter(scope, key) : () => scope[key];
  if (isString(raw)) {
    const handler = ctx[raw];
    if (isFunction(handler)) {
      watch(getter, handler);
    } else {
      warn(`Invalid watch handler specified by key "${raw}"`, handler);
    }
  } else if (isFunction(raw)) {
    watch(getter, raw);
  } else if (isObject(raw)) {
    if (isArray(raw)) {
      raw.forEach((r) => createWatcher(r, ctx, scope, key));
    } else {
      const handler = isFunction(raw.handler)
        ? raw.handler
        : isString(raw.handler)
        ? ctx[raw.handler]
        : null;
      if (isFunction(handler)) {
        watch(getter, handler, raw);
      } else {
        warn(`Invalid watch handler specified by key "${raw.handler}"`, handler);
      }
    }
  } else {
    warn(`Invalid watch option: "${key}"`, raw);
  }
}

export function initWatch(
  parser: SchemaParser,
  schema: unknown,
  scope: RuntimeScope
): void {
  const watchConfigs = parser.parseSchema(schema, scope);
  if (!watchConfigs || !isObject(watchConfigs) || Object.keys(watchConfigs).length === 0)
    return;

  const ctx = getAccessTarget(scope, AccessTypes.CONTEXT);

  for (const key in watchConfigs) {
    createWatcher(watchConfigs[key], ctx, scope, key);
  }
}
