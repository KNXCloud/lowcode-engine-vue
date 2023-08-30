import type { IPublicTypeNodeSchema } from '@alilc/lowcode-types';
import type { Component, ComponentPublicInstance, InjectionKey } from 'vue';
import type { INode } from './current-node';
import { inject, getCurrentInstance } from 'vue';

export type DesignMode = 'live' | 'design';

export interface RendererContext {
  readonly components: Record<string, Component<any, any, any>>;
  readonly designMode: DesignMode;
  readonly thisRequiredInJSE: boolean;
  getNode(id: string): INode | null;
  rerender(): void;
  wrapLeafComp<C extends object, L extends object>(name: string, comp: C, leaf: L): L;
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
        rerender: () => void 0,
        thisRequiredInJSE: true,
        components: getPropValue(props, 'components', {}),
        designMode: getPropValue<DesignMode>(props, 'designMode', 'live'),
        getNode: getPropValue(props, 'getNode', () => null),
        wrapLeafComp: <T extends object, L extends object>(_: string, __: T, leaf: L) =>
          leaf,
        triggerCompGetCtx: getPropValue(props, 'triggerCompGetCtx', () => void 0),
      };
    },
    true,
  );
}

function getPropValue<T>(
  props: Record<string, unknown>,
  key: string,
  defaultValue: T,
): T {
  return (props[key] || props[`__${key}`] || defaultValue) as T;
}
