import {
  Component,
  ComponentPublicInstance,
  InjectionKey,
  inject,
  getCurrentInstance,
} from 'vue';
import { Node } from '@alilc/lowcode-designer';
import { NodeSchema } from '@alilc/lowcode-types';

export type DesignMode = 'live' | 'design';

export interface RendererContext {
  readonly components: Record<string, Component>;
  readonly designMode: DesignMode;
  getNode(id: string): Node<NodeSchema> | null;
  triggerCompGetCtx(schema: NodeSchema, val: ComponentPublicInstance): void;
}

export function getRendererContextKey(): InjectionKey<RendererContext> {
  let key = (window as any).__rendererContext;
  if (!key) {
    key = Symbol('__rendererContext');
    (window as any).__rendererContext = key;
  }
  return key;
}

export function useRendererContext() {
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
