import { isFunction, isObject } from '@knxcloud/lowcode-utils';
import { provide } from 'vue';
import { type RuntimeScope, type SchemaParser } from '../../utils';

export function initProvide(
  parser: SchemaParser,
  schema: unknown,
  scope: RuntimeScope
): void {
  const provideOptions = parser.parseSchema(schema, scope);

  const provides = isFunction(provideOptions) ? provideOptions() : provideOptions;

  if (isObject(provides)) {
    Reflect.ownKeys(provides).forEach((key) => {
      const value = Reflect.get(provides, key);
      provide(key, value);
    });
  }
}
