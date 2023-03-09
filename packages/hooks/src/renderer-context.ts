import type { Component, ComponentPublicInstance, InjectionKey } from 'vue';
import type { IPublicTypeNodeSchema, IPublicModelNode } from '@alilc/lowcode-types';
import { inject, getCurrentInstance } from 'vue';

export type DesignMode = 'live' | 'design';

export interface RendererContext {
  readonly components: Record<string, Component>;
  readonly designMode: DesignMode;
  getNode(id: string): IPublicModelNode | null;
  triggerCompGetCtx(schema: IPublicTypeNodeSchema, val: ComponentPublicInstance): void;
}

export function getRendererContextKey(): InjectionKey<RendererContext> {
  let key = (window as any).__rendererContext;
  if (!key) {
    key = Symbol('__rendererContext');
    (window as any).__rendererContext = key;
  }
  return key;
}

export function useRendererContext(): RendererContext {
  const key = getRendererContextKey();
  return inject(
    key,
    () => {
      const props = getCurrentInstance()?.props ?? {};
      return {
        components: getPropValue(props, 'components', {}),
        designMode: getPropValue<DesignMode>(props, 'designMode', 'live'),
        getNode: getPropValue(props, 'getNode', () => null),
        triggerCompGetCtx: getPropValue(props, 'triggerCompGetCtx', () => void 0),
      };
    },
    true
  );
}

function getPropValue<T>(
  props: Record<string, unknown>,
  key: string,
  defaultValue: T
): T {
  return (props[key] || props[`__${key}`] || defaultValue) as T;
}
