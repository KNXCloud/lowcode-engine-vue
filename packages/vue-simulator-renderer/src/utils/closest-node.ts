import { NodeInstance } from '@alilc/lowcode-designer';
import { ComponentInternalInstance } from 'vue';
import { isCommentNode } from './check-node';
import {
  ComponentRecord,
  getCompRootData,
  isVNodeHTMLElement,
  isCompRootHTMLElement,
} from './comp-node';
import { warn } from './logger';

export function getClosestNodeInstance(
  el: Element,
  specId: string | undefined
): NodeInstance<ComponentRecord> | null {
  if (!document.contains(el)) {
    return null;
  }
  if (isVNodeHTMLElement(el)) {
    const component = el.__vueParentComponent;
    return getClosestNodeInstanceByComponent(component, specId);
  }

  if (!isCommentNode(el) && !('__vue_app__' in el)) {
    warn('__vnode 没有找到，请使用 vue 非生产环境版本');
    warn('https://unpkg.com/vue/dist/vue.runtime.global.js');
  }
  return getClosestNodeInstanceByElement(el, specId);
}

export function getClosestNodeInstanceByComponent(
  instance: ComponentInternalInstance | null,
  specId: string | undefined
): NodeInstance<ComponentRecord> | null {
  while (instance) {
    const el = instance.vnode.el as Element;
    if (el && isCompRootHTMLElement(el)) {
      const { nodeId, docId, instance } = getCompRootData(el);
      if (!specId || specId === nodeId) {
        return {
          docId,
          nodeId,
          instance: new ComponentRecord(docId, nodeId, instance.$.uid),
        };
      }
    }
    instance = instance.parent;
  }
  return null;
}

export function getClosestNodeInstanceByElement(
  el: Element,
  specId: string | undefined
): NodeInstance<ComponentRecord> | null {
  while (el) {
    if (isCompRootHTMLElement(el)) {
      const { nodeId, docId, instance } = getCompRootData(el);
      if (!specId || specId === nodeId) {
        return {
          docId,
          nodeId,
          instance: new ComponentRecord(docId, nodeId, instance.$.uid),
        };
      }
    }
    el = el.parentElement as Element;
  }
  return null;
}
