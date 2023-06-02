import { isFunction, isObject } from '@knxcloud/lowcode-utils';
import {
  AccessTypes,
  addToScope,
  type RuntimeScope,
  type SchemaParser,
} from '../../utils';

export function initData(
  parser: SchemaParser,
  schema: unknown,
  scope: RuntimeScope
): void {
  const dataOptions = parser.parseSchema(schema, false);

  const dataResult = isFunction(dataOptions)
    ? dataOptions.call(scope)
    : isObject(dataOptions)
    ? dataOptions
    : null;
  if (!dataResult || Object.keys(dataResult).length === 0) return;

  addToScope(scope, AccessTypes.DATA, dataResult);
}
