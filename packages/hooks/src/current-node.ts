import type { IPublicModelNode } from '@alilc/lowcode-types';
import type { InjectionKey } from 'vue';
import type { DesignMode } from './renderer-context';
import { inject } from 'vue';

export interface EnvNode {
  mode: DesignMode;
  node: IPublicModelNode | null;
  isDesignerEnv: boolean;
}

export interface DesignerEnvNode extends EnvNode {
  mode: 'design';
  node: IPublicModelNode;
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
