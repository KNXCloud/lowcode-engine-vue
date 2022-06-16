import { set } from 'lodash-es';
import { isJSSlot, TransformStage } from '@alilc/lowcode-types';
import {
  Component,
  ComponentPublicInstance,
  computed,
  defineComponent,
  Fragment,
  h,
  onUnmounted,
  PropType,
  reactive,
  ref,
} from 'vue';
import { useRendererContext } from '../context';
import { rendererProps } from './base';
import { useRenderer } from './use';
import { parseSchema } from '../utils';

export const Hoc = defineComponent({
  name: 'Hoc',
  props: {
    ...rendererProps,
    comp: {
      type: Object as PropType<Component>,
      default: undefined,
    },
  },
  setup(props) {
    const { scope, components, getNode, triggerCompGetCtx } = useRendererContext();
    const { buildSchema, buildProps, buildLoop, createSlot, createChildren } =
      useRenderer(props);
    const id = props.id || props.schema.id;

    const disposeFunctions: Array<CallableFunction | undefined> = [];

    const hidden = ref(!!props.schema.hidden);

    const condition = ref<unknown>(props.schema.condition ?? true);

    const { loop, loopArgs, updateLoop, updateLoopArg } = buildLoop(props.schema);
    const compProps: any = reactive({});
    const compSlots: any = reactive({});
    const result = buildSchema();
    Object.assign(compProps, result.props);
    Object.assign(compSlots, result.slots);

    const mergedComp = computed(() => {
      const { comp, schema } = props;
      if (comp) return comp;
      if (schema) {
        const { componentName } = schema;
        if (components[componentName]) {
          return components[componentName];
        }
      }
      return null;
    });

    const mergedShow = computed(() => {
      if (hidden.value) return false;
      const { value: showCondition } = condition;
      if (typeof showCondition === 'boolean') return showCondition;
      return parseSchema(showCondition, scope);
    });

    const node = id && getNode(id);

    if (node) {
      disposeFunctions.push(
        node.onPropChange((info) => {
          const { key = '', prop, newValue, oldValue } = info;
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
            compSlots.default = createChildren(newValue);
          } else if (isJSSlot(newValue)) {
            // 具名插槽更新
            compSlots[key] = createSlot(prop.slotNode);
          } else if (!newValue && isJSSlot(oldValue)) {
            // 具名插槽移除
            delete compSlots[key];
          } else {
            // 普通属性更新
            set(compProps, prop.path, newValue);
          }
        })
      );
      disposeFunctions.push(
        node.onChildrenChange(() => {
          const schema = node.export(TransformStage.Render);
          compSlots.default = createChildren(schema.children);
        })
      );
      disposeFunctions.push(
        node.onVisibleChange((visible) => void (hidden.value = !visible))
      );
    }

    onUnmounted(() => disposeFunctions.forEach((dispose) => dispose?.()));

    const getRef = (inst: ComponentPublicInstance) => {
      triggerCompGetCtx(props.schema, inst);
    };

    return {
      loop,
      loopArgs,
      compSlots,
      compProps,
      mergedComp,
      mergedShow,
      getRef,
      buildProps,
    };
  },
  render() {
    const {
      loop,
      loopArgs,
      compProps,
      compSlots,
      mergedComp,
      mergedShow,
      getRef,
      buildProps,
    } = this;
    if (!mergedComp || !mergedShow) return null;
    if (!loop) {
      return h(mergedComp, { ...buildProps(compProps), ref: getRef }, { ...compSlots });
    }

    return h(
      Fragment,
      loop.map((item, index) => {
        return h(
          mergedComp,
          {
            ...buildProps(compProps, { [loopArgs[0]]: item, [loopArgs[1]]: index }),
            ref: getRef,
          },
          { ...compSlots }
        );
      })
    );
  },
});
