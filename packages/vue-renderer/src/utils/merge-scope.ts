export function mergeScope(...scopes: any[]): any {
  scopes = scopes.filter(Boolean);
  if (scopes.length <= 1) return scopes[0];
  const descriptors = scopes.reduce((result, scope) => {
    return Object.assign(result, Object.getOwnPropertyDescriptors(scope));
  }, {});
  return Object.create({}, descriptors);
}
