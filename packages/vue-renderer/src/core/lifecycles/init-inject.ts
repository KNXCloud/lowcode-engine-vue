import { isArray, isObject } from '@knxcloud/lowcode-utils';
import { inject, isRef, type Ref } from 'vue';
import {
  AccessTypes,
  addToScope,
  type RuntimeScope,
  type SchemaParser,
} from '../../utils';

export function initInject(
  parser: SchemaParser,
  schema: unknown,
  scope: RuntimeScope
): void {
  const injectOptions = parser.parseSchema(schema, false);

  let normalizedOptions: Record<string, object | string>;

  if (isArray(injectOptions)) {
    normalizedOptions = injectOptions.reduce((res, next) => {
      return (res[next] = next), res;
    }, {});
  } else if (isObject(injectOptions)) {
    normalizedOptions = injectOptions as Record<string, object | string>;
  } else {
    return;
  }

  const injectedValues: Record<string, unknown> = {};

  for (const key in normalizedOptions) {
    const opt = normalizedOptions[key];
    let injected: unknown;
    if (isObject(opt)) {
      const injectionKey = (opt.from || key) as string;
      if ('default' in opt) {
        injected = inject(
          injectionKey,
          opt.default,
          true /* treat default function as factory */
        );
      } else {
        injected = inject(injectionKey);
      }
    } else {
      injected = inject(opt as string);
    }

    if (isRef(injected)) {
      Object.defineProperty(injectedValues, key, {
        enumerable: true,
        configurable: true,
        get: () => (injected as Ref).value,
        set: (v) => ((injected as Ref).value = v),
      });
    } else {
      injectedValues[key] = injected;
    }
  }

  addToScope(scope, AccessTypes.CONTEXT, injectedValues, true);
}
