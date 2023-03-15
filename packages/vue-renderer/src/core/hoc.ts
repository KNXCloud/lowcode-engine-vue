import {
  h,
  shallowRef,
  mergeProps,
  type InjectionKey,
  inject,
  provide,
  watch,
  Fragment,
} from 'vue';

import { onUnmounted, defineComponent } from 'vue';
import { leafProps } from './base';
import {
  buildSchema,
  isFragment,
  splitLeafProps,
  useLeaf,
  type SlotSchemaMap,
} from './use';
import { useRendererContext } from '@knxcloud/lowcode-hooks';
import type { IPublicTypeNodeSchema } from '@alilc/lowcode-types';
import { debounce, exportSchema, isJSSlot } from '@knxcloud/lowcode-utils';

const HOC_NODE_KEY: InjectionKey<{ rerenderSlots: () => void }> = Symbol('hocNode');
const useHocNode = (rerenderSlots: () => void) => {
  const { rerender } = useRendererContext();
  const parentNode = inject(HOC_NODE_KEY, null);

  const debouncedRerender = debounce(rerenderSlots);

  provide(HOC_NODE_KEY, {
    rerenderSlots: debouncedRerender,
  });

  if (!parentNode) {
    return {
      rerender: debouncedRerender,
      rerenderRoot: rerender,
      rerenderParent: rerender,
    };
  } else {
    return {
      rerender: debouncedRerender,
      rerenderRoot: rerender,
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
    const { rerender, rerenderRoot, rerenderParent } = useHocNode(() => {
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

    const { locked, node, buildSlots, getNode, isRootNode } = useLeaf(
      props,
      (schema, show) => {
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
      }
    );

    if (node) {
      const cancel = node.onChildrenChange(() => {
        // 默认插槽内容变更，无法确定变更的层级，所以只能全部更新
        rerenderRoot();
      });
      cancel && onUnmounted(cancel);
      onUnmounted(
        node.onPropChange((info) => {
          const { key, prop, newValue, oldValue } = info;
          const isRootProp = prop.path.length === 1;
          if (isRootProp) {
            if (key === '___isLocked___') {
              locked.value = newValue;
            } else if (isJSSlot(newValue) || isJSSlot(oldValue)) {
              // 插槽内容变更，无法确定变更的层级，所以只能全部更新
              rerenderRoot();
            } else {
              // 普通属性更新，通知父级重新渲染
              rerenderParent();
            }
          } else {
            // 普通属性更新，通知父级重新渲染
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
      updateSchema(exportSchema(node));
    }

    watch(
      () => props.__schema,
      (newSchema) => updateSchema(newSchema)
    );

    return () => {
      const { __comp: comp, __vnodeProps: vnodeProps } = props;
      const compProps = splitLeafProps(attrs)[1];
      if (isRootNode && !showNode.value) return null;

      const builtSlots = slotSchema.value ? buildSlots(slotSchema.value, node) : slots;

      return comp
        ? isFragment(comp)
          ? h(Fragment, builtSlots.default?.())
          : h(comp, mergeProps(compProps, vnodeProps), builtSlots)
        : h('div', 'component not found');
    };
  },
});
