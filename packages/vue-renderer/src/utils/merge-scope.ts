import { isObject } from 'lodash-es';
import { isProxy, reactive } from 'vue';

function isRootScope(scope: object): boolean {
  return '$' in scope;
}

function isValidScope(scope: unknown): scope is object {
  // 为 null、undefined，或者不是对象
  if (!scope || !isObject(scope)) return false;

  // root scope
  if (isRootScope(scope)) return true;

  // scope 属性不为空
  if (Object.keys(scope).length > 0) return true;
  return false;
}

export function mergeScope(...scopes: unknown[]): object {
  const normalizedScope: object[] = [];
  scopes.flat().forEach((scope) => {
    isValidScope(scope) && normalizedScope.push(scope);
  });

  if (normalizedScope.length <= 1) return normalizedScope[0];

  const [rootScope, ...resScopes] = normalizedScope;
  return resScopes.reduce((result, scope) => {
    if (isRootScope(scope)) {
      if (!isRootScope(result)) {
        const temp = result;
        result = scope;
        scope = temp;
      } else {
        return scope;
      }
    }

    const descriptors = Object.getOwnPropertyDescriptors(scope);
    result = Object.create(result, descriptors);
    return isProxy(scope) ? reactive(result) : result;
  }, rootScope);
}
