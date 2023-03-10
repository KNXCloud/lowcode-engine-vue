import {
  h,
  shallowRef,
  mergeProps,
  type InjectionKey,
  inject,
  provide,
  watch,
} from 'vue';

import { onUnmounted, defineComponent, nextTick } from 'vue';
import { leafProps } from './base';
import { buildSchema, splitLeafProps, useLeaf, type SlotSchemaMap } from './use';
import { useRendererContext } from '@knxcloud/lowcode-hooks';
import type { IPublicTypeNodeSchema } from '@alilc/lowcode-types';
import { exportSchema } from '@knxcloud/lowcode-utils';

const HOC_NODE_KEY: InjectionKey<{ rerenderSlots: () => void }> = Symbol('hocNode');
const useHocNode = (rerenderSlots: () => void) => {
  const parentNode = inject(HOC_NODE_KEY, null);

  let shouldRerender = false;

  const debouncedRerender = () => {
    if (!shouldRerender) {
      shouldRerender = true;
      nextTick(() => {
        rerenderSlots();
        shouldRerender = false;
      });
    }
  };

  provide(HOC_NODE_KEY, {
    rerenderSlots: debouncedRerender,
  });

  if (!parentNode) {
    const { rerender } = useRendererContext();
    return {
      isRootNode: true,
      rerender: debouncedRerender,
      rerenderParent: rerender,
    };
  } else {
    return {
      isRootNode: false,
      rerender: debouncedRerender,
      rerenderParent: parentNode.rerenderSlots,
    };
  }
};

export const Hoc = defineComponent({
  name: 'Hoc',
  inheritAttrs: false,
  props: leafProps,
  setup(props, { slots, attrs }) {
    const showNode = shallowRef(true);
    const nodeSchmea = shallowRef(props.__schema);
    const slotSchema = shallowRef<SlotSchemaMap>();
    const updateSchema = (newSchema: IPublicTypeNodeSchema) => {
      nodeSchmea.value = newSchema;
      slotSchema.value = buildSchema(newSchema, node).slots;
    };
    const { rerenderParent, rerender, isRootNode } = useHocNode(() => {
      const newSchema = node ? exportSchema(node) : null;
      newSchema && updateSchema(newSchema);
    });

    const listenRecord: Record<string, () => void> = {};
    onUnmounted(() =>
      Object.keys(listenRecord).forEach((k) => {
        listenRecord[k]();
        delete listenRecord[k];
      })
    );

    const { locked, node, buildSlots, getNode } = useLeaf(props, (schema, show) => {
      const id = schema.id;
      if (id) {
        if (show && listenRecord[id]) {
          listenRecord[id]();
          delete listenRecord[id];
        } else if (!show && !listenRecord[id]) {
          const childNode = getNode(id);
          if (childNode) {
            listenRecord[id] = childNode.onVisibleChange(() => rerender());
          }
        }
      }
    });

    if (node) {
      onUnmounted(node.onChildrenChange(() => rerender()));
      onUnmounted(
        node.onPropChange((info) => {
          const { key, prop, newValue } = info;
          const isRootProp = prop.path.length === 1;
          if (isRootProp && key === '___isLocked___') {
            locked.value = newValue;
          } else {
            // 当前节点组件参数发生改变，通知父级组件重新渲染子组件
            rerenderParent();
          }
        })
      );
      onUnmounted(
        node.onVisibleChange((visible) => {
          isRootNode
            ? // 当前节点为根节点（Page），直接隐藏
              (showNode.value = visible)
            : // 当前节点显示隐藏发生改变，通知父级组件重新渲染子组件
              rerenderParent();
        })
      );
    }

    watch(
      () => props.__schema,
      (newSchema) => updateSchema(newSchema)
    );

    const { triggerCompGetCtx } = useRendererContext();

    return () => {
      const { __comp: comp, __vnodeProps: vnodeProps } = props;
      const compProps = splitLeafProps(attrs)[1];
      if (isRootNode && !showNode.value) return null;

      return comp
        ? h(
            comp,
            mergeProps(compProps, vnodeProps, {
              onVnodeMounted(vnode) {
                const instance = vnode.component?.proxy;
                instance && triggerCompGetCtx(nodeSchmea.value, instance);
              },
            }),
            slotSchema.value ? buildSlots(slotSchema.value) : slots
          )
        : h('div', 'component not found');
    };
  },
});
