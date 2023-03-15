import { isArray, isObject } from '@knxcloud/lowcode-utils';
import type { RuntimeScope, SchemaParser } from '../../utils';

export function initEmits(
  parser: SchemaParser,
  schema: unknown,
  scope: RuntimeScope
): void {
  const emitsOptions = parser.parseSchema(schema, false);

  const dataResult = isArray(emitsOptions)
    ? emitsOptions.reduce((res, next) => ((res[next] = null), res), {})
    : isObject(emitsOptions)
    ? emitsOptions
    : null;

  if (!dataResult || Object.keys(dataResult).length === 0) return;

  scope.$.emitsOptions = Object.create(
    scope.$.emitsOptions,
    Object.getOwnPropertyDescriptors(dataResult)
  );
}
