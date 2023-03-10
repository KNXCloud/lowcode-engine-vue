import type { Node } from '@alilc/lowcode-designer';
import type { InjectionKey } from 'vue';
import type { DesignMode } from './renderer-context';
import { inject } from 'vue';

export interface EnvNode {
  mode: DesignMode;
  node: Node | null;
  isDesignerEnv: boolean;
}

export interface DesignerEnvNode extends EnvNode {
  mode: 'design';
  node: Node;
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
