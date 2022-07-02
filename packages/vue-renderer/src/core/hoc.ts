import { isNil, set } from 'lodash-es';
import { isJSSlot, TransformStage } from '@alilc/lowcode-types';
import { SlotNode } from '@alilc/lowcode-designer';
import {
  ComponentPublicInstance,
  h,
  ref,
  Fragment,
  computed,
  reactive,
  onUnmounted,
  defineComponent,
} from 'vue';
import { leafProps } from './base';
import { useRendererContext } from '../context';
import { ensureArray, parseSchema } from '../utils';
import { PropSchemaMap, SlotSchemaMap, useLeaf } from './use';

export const Hoc = defineComponent({
  name: 'Hoc',
  props: leafProps,
  setup(props) {
    const { triggerCompGetCtx } = useRendererContext();
    const { node, buildSchema, buildProps, buildSlost, buildLoop } = useLeaf(props);

    const hidden = ref(!!props.schema.hidden);
    const condition = ref<unknown>(props.schema.condition ?? true);

    const { loop, updateLoop, updateLoopArg, buildLoopScope } = buildLoop(props.schema);
    const compProps: PropSchemaMap = reactive({});
    const compSlots: SlotSchemaMap = reactive({});
    const result = buildSchema();
    Object.assign(compProps, result.props);
    Object.assign(compSlots, result.slots);

    const show = computed(() => {
      if (hidden.value) return false;
      const { value: showCondition } = condition;
      if (typeof showCondition === 'boolean') return showCondition;
      return !!parseSchema(showCondition, props.scope);
    });

    // hoc
    if (node) {
      const disposeFunctions: Array<CallableFunction | undefined> = [];
      onUnmounted(() => disposeFunctions.forEach((dispose) => dispose?.()));
      disposeFunctions.push(
        node.onVisibleChange((visible) => void (hidden.value = !visible))
      );
      disposeFunctions.push(
        node.onChildrenChange(() => {
          const schema = node.export(TransformStage.Render);
          compSlots.default = ensureArray(schema.children);
        })
      );
      disposeFunctions.push(
        node.onPropChange((info) => {
          const { key, prop, newValue, oldValue } = info;
          if (key === '___condition___') {
            // 条件渲染更新 v-if
            condition.value = newValue;
          } else if (key === '___loop___') {
            // 循环数据更新 v-for
            updateLoop(newValue);
          } else if (key === '___loopArgs___') {
            // 循环参数初始化 (item, index)
            updateLoopArg(newValue);
          } else if (prop.path[0] === '___loopArgs___') {
            // 循环参数初始化 (item, index)
            updateLoopArg(newValue, key);
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
          } else if (key && isJSSlot(newValue)) {
            // 具名插槽更新
            const slotNode: SlotNode = prop.slotNode;
            const schema = slotNode.export(TransformStage.Render);
            compSlots[key] = schema;
          } else if (key && isNil(newValue) && isJSSlot(oldValue)) {
            // 具名插槽移除
            delete compSlots[key];
          } else if (prop.path) {
            // 普通属性更新
            set(compProps, prop.path, newValue);
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
      buildSlost,
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
      buildSlost,
      buildProps,
      buildLoopScope,
    } = this;

    if (!show) return null;
    if (!comp) return h('div', 'component not found');

    if (!loop) {
      const props = buildProps(compProps, null, { ref: getRef });
      const slots = buildSlost(compSlots);
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
        const slots = buildSlost(compSlots, blockScope);
        return h(comp, props, slots);
      })
    );
  },
});
