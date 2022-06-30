import { isObject } from 'lodash-es';
import { isProxy, reactive } from 'vue';

export function mergeScope(...scopes: unknown[]): any {
  const normalizedScope: object[] = [];
  scopes.flat().forEach((scope) => {
    if (scope && isObject(scope) && ('$' in scope || Object.keys(scope).length)) {
      normalizedScope.push(scope);
    }
  });

  if (normalizedScope.length <= 1) return normalizedScope[0];

  const [rootScope, ...resScopes] = normalizedScope;
  return resScopes.reduce((result, scope) => {
    result = Object.create(result, Object.getOwnPropertyDescriptors(scope));
    return isProxy(scope) ? reactive(result) : result;
  }, rootScope);
}
