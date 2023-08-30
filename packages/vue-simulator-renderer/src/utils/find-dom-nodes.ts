import type { ComponentInternalInstance, VNode } from 'vue';
import type { ComponentInstance } from '../interface';
import { isVNode } from 'vue';
import { isVNodeHTMLElement } from './comp-node';
import { isDomNode, isEmptyNode } from './check-node';
import { getClientRects } from './get-client-rects';
import { isArray } from '@knxcloud/lowcode-utils';

export function findDOMNodes(instance: ComponentInstance) {
  const els: (Element | Text)[] = [];

  const el: Element | Text = instance.$el;

  if (isEmptyNode(el)) {
    const internalInstance = instance.$;
    appendSiblingElement(els, internalInstance, el, (node) => {
      return node.previousSibling;
    });
    appendDescendantComponent(els, internalInstance);
    appendSiblingElement(els, internalInstance, el, (node) => {
      return node.nextSibling;
    });
  } else {
    els.push(el);
  }

  return els;
}

function appendSiblingElement(
  target: (Element | Text)[],
  instance: ComponentInternalInstance,
  el: Element | Text,
  next: (el: Node) => Node | null,
) {
  let nextNode = next(el);
  while (nextNode) {
    if (isEmptyNode(nextNode)) {
      nextNode = next(nextNode);
      continue;
    }
    if (isVNodeHTMLElement(nextNode)) {
      const childInstance = nextNode.__vueParentComponent;
      if (isChildInstance(instance, childInstance)) {
        target.unshift(nextNode);
        nextNode = next(nextNode);
        continue;
      }
    }
    break;
  }
}

function appendDescendantComponent(
  target: (Element | Text)[],
  instance: ComponentInternalInstance,
): boolean {
  const subNode = instance.subTree;
  const current = subNode.el as Element | Text;
  if (isValidElement(current)) {
    target.push(current);
    return true;
  }
  if (isArray(subNode.children) && subNode.children.length > 0) {
    return appendDescendantChildren(target, subNode.children as VNode<Element | Text>[]);
  } else if (subNode.component) {
    return appendDescendantComponent(target, subNode.component);
  }
  return false;
}

function appendDescendantChildren(
  target: (Element | Text)[],
  children: VNode[],
): boolean {
  const validElements = children.map(({ el }) => el).filter(isValidElement);
  if (validElements.length > 0) {
    target.push(...validElements);
    return true;
  } else {
    return (
      children.length > 0 &&
      children.some((item) => {
        if (isArray(item.children) && item.children.length > 0) {
          return appendDescendantChildren(
            target,
            item.children.filter((child): child is VNode<Element | Text> =>
              isVNode(child),
            ),
          );
        } else if (item.component) {
          return appendDescendantComponent(target, item.component);
        }
        return false;
      })
    );
  }
}

function isValidElement(el: unknown): el is Element | Text {
  if (el && isDomNode(el) && !isEmptyNode(el)) {
    const rect = getClientRects(el);
    return rect.some((item) => item.width || item.height);
  }
  return false;
}

function isChildInstance(
  target: ComponentInternalInstance,
  source: ComponentInternalInstance | null,
): boolean {
  if (source == null) return false;
  if (target.uid > source.uid) return false;
  if (target.uid === source.uid) return true;
  return isChildInstance(target, source.parent);
}
