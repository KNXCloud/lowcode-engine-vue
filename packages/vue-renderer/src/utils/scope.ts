import { isReactive, proxyRefs, type ComponentPublicInstance } from 'vue';
import type { MaybeArray } from './array';
import type { DataSourceItem } from '../data-source';
import { isProxy, reactive } from 'vue';
import { isObject } from '@knxcloud/lowcode-utils';

export interface BlockScope {
  [x: string]: unknown;
}

declare module 'vue' {
  export interface ComponentInternalInstance {
    ctx: Record<string, unknown>;
    setupState: Record<string, unknown>;
    propsOptions: [Record<string, object>, string[]];
    accessCache: Record<string, AccessTypes>;
  }
}

export interface RuntimeScope extends BlockScope, ComponentPublicInstance {
  i18n(key: string, values: any): string;
  currentLocale: string;
  dataSourceMap: Record<string, DataSourceItem>;
  reloadDataSource(): Promise<any[]>;
  __thisRequired: boolean;
  __loopScope?: boolean;
  __loopRefIndex?: number;
  __loopRefOffset?: number;
}

export const enum AccessTypes {
  OTHER,
  SETUP,
  DATA,
  PROPS,
  CONTEXT,
}

export function getAccessTarget(
  scope: RuntimeScope,
  accessType: AccessTypes
): Record<string, unknown> {
  switch (accessType) {
    case AccessTypes.SETUP:
      return scope.$.setupState.__lcSetup
        ? scope.$.setupState
        : (scope.$.setupState = proxyRefs(
            Object.create(null, {
              __lcSetup: {
                get: () => true,
                enumerable: false,
                configurable: false,
              },
            })
          ));
    case AccessTypes.DATA:
      return isReactive(scope.$.data) ? scope.$.data : (scope.$.data = reactive({}));
    case AccessTypes.PROPS:
      return scope.$.props;
    default:
      return scope.$.ctx;
  }
}

export function isRuntimeScope(scope: object): scope is RuntimeScope {
  return '$' in scope;
}

export function isValidScope(scope: unknown): scope is BlockScope | RuntimeScope {
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
