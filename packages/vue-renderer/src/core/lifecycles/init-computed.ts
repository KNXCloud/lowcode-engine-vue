import { isFunction, isPlainObject, noop } from '@knxcloud/lowcode-utils';
import { computed, type ComputedOptions } from 'vue';
import {
  AccessTypes,
  addToScope,
  type RuntimeScope,
  type SchemaParser,
} from '../../utils';

export function initComputed(
  parser: SchemaParser,
  schema: unknown,
  scope: RuntimeScope
): void {
  const options = parser.parseSchema(schema, scope);
  if (!isPlainObject(options)) return;

  const computedValues: object = {};
  for (const key in options) {
    const computedOptions = options[key] as ComputedOptions;
    const get = isFunction(computedOptions)
      ? computedOptions
      : isFunction(computedOptions.get)
      ? computedOptions.get
      : noop;
    const set =
      !isFunction(computedOptions) && isFunction(computedOptions.set)
        ? computedOptions.set
        : noop;
    const computedValue = computed({
      get,
      set,
    });
    Object.defineProperty(computedValues, key, {
      enumerable: true,
      configurable: true,
      get: () => computedValue.value,
      set: (v) => (computedValue.value = v),
    });
  }

  addToScope(scope, AccessTypes.CONTEXT, computedValues, true);
}
