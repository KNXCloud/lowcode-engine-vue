import { ComponentPublicInstance, isProxy, reactive } from 'vue';
import { isObject } from './object';
import { MaybeArray } from './array';
import { DataSourceItem } from '../data-source';

export interface BlockScope {
  [x: string]: unknown;
}

export interface RuntimeScope extends BlockScope, ComponentPublicInstance {
  i18n(key: string, values: any): string;
  currentLocale: string;
  dataSourceMap: Record<string, DataSourceItem>;
  reloadDataSource(): Promise<any[]>;
  __loopScope?: boolean;
  __loopRefIndex?: number;
  __loopRefOffset?: number;
}

function isRuntimeScope(scope: object): scope is RuntimeScope {
  return '$' in scope;
}

function isValidScope(scope: unknown): scope is BlockScope | RuntimeScope {
  // 为 null、undefined，或者不是对象
  if (!scope || !isObject(scope)) return false;

  // runtime scope
  if (isRuntimeScope(scope)) return true;

  // scope 属性不为空
  if (Object.keys(scope).length > 0) return true;
  return false;
}

export function mergeScope(
  scope: RuntimeScope,
  ...blockScope: MaybeArray<BlockScope | undefined | null>[]
): RuntimeScope;
export function mergeScope(
  ...blockScope: MaybeArray<BlockScope | undefined | null>[]
): BlockScope;
export function mergeScope(
  ...scopes: MaybeArray<RuntimeScope | BlockScope | undefined | null>[]
): RuntimeScope | BlockScope {
  const normalizedScope: (RuntimeScope | BlockScope)[] = [];
  scopes.flat().forEach((scope) => {
    isValidScope(scope) && normalizedScope.push(scope);
  });

  if (normalizedScope.length <= 1) return normalizedScope[0];

  const [rootScope, ...resScopes] = normalizedScope;
  return resScopes.reduce((result, scope) => {
    if (isRuntimeScope(scope)) {
      if (!isRuntimeScope(result)) {
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
