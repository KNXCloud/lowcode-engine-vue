import { Node } from '@alilc/lowcode-designer';
import { NodeSchema } from '@alilc/lowcode-types';
import { inject, InjectionKey } from 'vue';
import { DesignMode } from './renderer-context';

export interface EnvNode {
  mode: DesignMode;
  node: Node<NodeSchema> | null;
  isDesignerEnv: boolean;
}

export interface DesignerEnvNode extends EnvNode {
  mode: 'design';
  node: Node<NodeSchema>;
  isDesignerEnv: true;
}

export interface LiveEnvNode extends EnvNode {
  mode: 'live';
  node: null;
  isDesignerEnv: false;
}

export type CurrentNode = DesignerEnvNode | LiveEnvNode;

export function getCurrentNodeKey(): InjectionKey<CurrentNode> {
  let key = (window as any).__currentNode;
  if (!key) {
    key = Symbol('__currentNode');
    (window as any).__currentNode = key;
  }
  return key;
}

export function useCurrentNode(): CurrentNode {
  const key = getCurrentNodeKey();
  return inject(
    key,
    () => {
      return {
        mode: 'live',
        node: null,
        isDesignerEnv: false,
      } as LiveEnvNode;
    },
    true
  );
}
