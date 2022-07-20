import { isNil } from 'lodash-es';
import { isJSSlot, TransformStage } from '@alilc/lowcode-types';
import { SlotNode } from '@alilc/lowcode-designer';
import {
  ComponentPublicInstance,
  h,
  Fragment,
  reactive,
  onUnmounted,
  defineComponent,
} from 'vue';
import { leafProps } from './base';
import { useRendererContext } from '@knxcloud/lowcode-hooks';
import { ensureArray } from '../utils';
import { PropSchemaMap, SlotSchemaMap, useLeaf } from './use';

export const Hoc = defineComponent({
  name: 'Hoc',
  props: leafProps,
  setup(props) {
    const { triggerCompGetCtx } = useRendererContext();
    const { node, locked, buildSchema, buildProps, buildSlots, buildLoop, buildShow } =
      useLeaf(props);

    const { show, hidden, condition } = buildShow(props.schema);
    const { loop, updateLoop, updateLoopArg, buildLoopScope } = buildLoop(props.schema);

    const compProps: PropSchemaMap = reactive({});
    const compSlots: SlotSchemaMap = reactive({});
    const result = buildSchema();
    Object.assign(compProps, result.props);
    Object.assign(compSlots, result.slots);

    // hoc
    if (node) {
      const disposeFunctions: Array<CallableFunction | undefined> = [];
      onUnmounted(() => disposeFunctions.forEach((dispose) => dispose?.()));
      disposeFunctions.push(
        node.onChildrenChange(() => {
          const schema = node.export(TransformStage.Render);
          compSlots.default = ensureArray(schema.children);
        })
      );
      disposeFunctions.push(
        node.onPropChange((info) => {
          const { key, prop, newValue, oldValue } = info;

          /**
           * 是否为根属性的修改
           *
           * @remark
           *
           * 对于 props
           *
           * ```js
           * {
           *    color: 'red',
           *    border: {
           *      top: 12,
           *      left: 20,
           *    }
           * }
           * ```
           *
           * 则，对于属性 `color` 的修改为根属性的修改，而对于 `border.top` 的修改为非根属性的修改
           */
          const isRootProp = prop.path.length === 1;

          /** 根属性的 key 值 */
          const rootPropKey: string = prop.path[0];

          if (isRootProp && key) {
            if (key === '___isLocked___') {
              // 设计器控制组件锁定
              locked.value = newValue;
            } else if (key === '___hidden___') {
              // 设计器控制组件渲染
              hidden(newValue);
            } else if (key === '___condition___') {
              // 条件渲染更新 v-if
              condition(newValue);
            } else if (key === '___loop___') {
              // 循环数据更新 v-for
              updateLoop(newValue);
            } else if (key === '___loopArgs___') {
              // 循环参数初始化 (item, index)
              updateLoopArg(newValue);
            } else if (key === 'children') {
              // 默认插槽更新
              if (isJSSlot(newValue)) {
                const slotNode: SlotNode = prop.slotNode;
                const schema = slotNode.export(TransformStage.Render);
                compSlots.default = schema;
              } else if (!isNil(newValue)) {
                compSlots.default = ensureArray(newValue);
              } else {
                delete compSlots.default;
              }
            } else if (isJSSlot(newValue)) {
              // 具名插槽更新
              const slotNode: SlotNode = prop.slotNode;
              const schema = slotNode.export(TransformStage.Render);
              compSlots[key] = schema;
            } else if (isNil(newValue) && isJSSlot(oldValue)) {
              // 具名插槽移除
              delete compSlots[key];
            } else {
              // 普通根属性更新
              compProps[key] = newValue;
            }
          } else if (rootPropKey === '___loopArgs___') {
            // 循环参数更新 (item, index)
            updateLoopArg(newValue, key);
          } else if (rootPropKey) {
            // 普通非根属性更新
            compProps[rootPropKey] = node.getPropValue(rootPropKey);
          }
        })
      );
    }

    const getRef = (inst: ComponentPublicInstance) => {
      triggerCompGetCtx(props.schema, inst);
    };

    return {
      show,
      loop,
      compSlots,
      compProps,
      getRef,
      buildSlots,
      buildProps,
      buildLoopScope,
    };
  },
  render() {
    const {
      comp,
      show,
      loop,
      compProps,
      compSlots,
      getRef,
      buildSlots,
      buildProps,
      buildLoopScope,
    } = this;

    if (!show) return null;
    if (!comp) return h('div', 'component not found');

    if (!loop) {
      const props = buildProps(compProps, null, { ref: getRef });
      const slots = buildSlots(compSlots);
      return h(comp, props, slots);
    }

    if (!Array.isArray(loop)) {
      console.warn('[vue-renderer]: loop must be array', loop);
      return null;
    }

    return h(
      Fragment,
      loop.map((item, index, arr) => {
        const blockScope = buildLoopScope(item, index, arr.length);
        const props = buildProps(compProps, blockScope, { ref: getRef });
        const slots = buildSlots(compSlots, blockScope);
        return h(comp, props, slots);
      })
    );
  },
});
