import { isFunction } from '@knxcloud/lowcode-utils';
import { type RuntimeScope, type SchemaParser } from '../../utils';

export function created(
  parser: SchemaParser,
  schema: unknown,
  scope: RuntimeScope
): void {
  const createdFn = parser.parseSchema(schema, false);
  isFunction(createdFn) && createdFn.call(scope);
}
