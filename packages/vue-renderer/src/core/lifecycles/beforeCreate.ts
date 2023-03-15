import { isFunction } from '@knxcloud/lowcode-utils';
import { type RuntimeScope, type SchemaParser } from '../../utils';

export function beforeCreate(
  parser: SchemaParser,
  schema: unknown,
  scope: RuntimeScope
): void {
  const beforeCreateFn = parser.parseSchema(schema, false);
  isFunction(beforeCreateFn) && beforeCreateFn.call(scope);
}
