import { noop } from 'lodash-es';
import { Node } from '@alilc/lowcode-designer';
import { NodeSchema } from '@alilc/lowcode-types';
import {
  inject,
  Component,
  ComponentPublicInstance,
  InjectionKey,
  getCurrentInstance,
} from 'vue';

export type DesignMode = 'live' | 'design';

export interface RendererContext {
  readonly components: Record<string, Component>;
  readonly designMode: DesignMode;
  getNode(id: string): Node<NodeSchema> | null;
  triggerCompGetCtx(schema: NodeSchema, val: ComponentPublicInstance): void;
}

export function contextFactory(): InjectionKey<RendererContext> {
  let context = (window as any).__appContext;
  if (!context) {
    context = Symbol('__appContext');
    (window as any).__appContext = context;
  }
  return context;
}

export function useRendererContext() {
  const key = contextFactory();
  return inject(
    key,
    () => {
      const props = getCurrentInstance()?.props ?? {};
      return {
        components: getPropValue(props, 'components', {}),
        designMode: getPropValue<DesignMode>(props, 'designMode', 'live'),
        getNode: getPropValue(props, 'getNode', () => null),
        triggerCompGetCtx: getPropValue(props, 'triggerCompGetCtx', noop),
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
