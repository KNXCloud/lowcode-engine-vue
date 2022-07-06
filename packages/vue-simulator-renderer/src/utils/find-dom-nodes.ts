import { ComponentInternalInstance } from 'vue';
import { ComponentInstance } from '../interface';
import { isVNodeHTMLElement } from './comp-node';
import { isEmptyNode } from './check-node';

export function findDOMNodes(instance: ComponentInstance) {
  const els: (Element | Text)[] = [];

  const el: Element | Text = instance.$el;

  if (isEmptyNode(el)) {
    appendSiblingElement(els, instance.$, el, (node) => {
      return node.previousSibling;
    });
    appendSiblingElement(els, instance.$, el, (node) => {
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
  next: (el: Node) => Node | null
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

function isChildInstance(
  target: ComponentInternalInstance,
  source: ComponentInternalInstance | null
): boolean {
  if (source == null) return false;
  if (target.uid > source.uid) return false;
  if (target.uid === source.uid) return true;
  return isChildInstance(target, source.parent);
}
