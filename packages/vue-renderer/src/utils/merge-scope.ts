import { isProxy, reactive } from 'vue';

export function mergeScope(...scopes: any[]): any {
  scopes = scopes.filter(Boolean);
  if (scopes.length <= 1) return scopes[0];
  const [rootScope, ...resScopes] = scopes;
  return resScopes.reduce((result, scope) => {
    result = Object.create(result, Object.getOwnPropertyDescriptors(scope));
    return isProxy(scope) ? reactive(result) : result;
  }, rootScope);
}
