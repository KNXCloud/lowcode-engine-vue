import {
  isFunction,
  isNil,
  isObject,
  isPromise,
  toString,
} from '@knxcloud/lowcode-utils';
import { toRaw } from 'vue';
import {
  AccessTypes,
  addToScope,
  warn,
  type RuntimeScope,
  type SchemaParser,
} from '../../utils';

export function setup(
  parser: SchemaParser,
  schema: unknown,
  scope: RuntimeScope,
  [props, ctx]: [object, object]
): void | Promise<void> {
  const setupFn = parser.parseSchema(schema, false);
  if (!isFunction(setupFn)) return;

  const setupResult = setupFn.apply(undefined, [props, ctx]);
  if (isPromise(setupResult)) {
    return setupResult.then((res) => handleResult(res, scope));
  } else {
    handleResult(setupResult, scope);
  }
}

function handleResult(result: unknown, scope: RuntimeScope) {
  if (isNil(result)) return;
  if (!isObject(result)) {
    warn('不支持的 setup 返回值类型, type: ' + toString(result));
    return;
  }
  addToScope(scope, AccessTypes.SETUP, toRaw(result));
}
