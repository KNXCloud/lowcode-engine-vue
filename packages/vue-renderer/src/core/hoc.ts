import { set } from 'lodash-es';
import { isJSSlot } from '@alilc/lowcode-types';
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
    const {
      buildSchema,
      buildProps,
      buildLoop,
      insertNode,
      removeNode,
      createSlot,
      createChildren,
    } = useRenderer(props);
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
            condition.value = newValue;
            return;
          } else if (key === '___loop___') {
            updateLoop(newValue);
            return;
          } else if (key === '___loopArgs___') {
            updateLoopArg(newValue);
            return;
          } else if (prop.path[0] === '___loopArgs___') {
            updateLoopArg(newValue, key as string);
            return;
          } else if (key === 'children') {
            compSlots.default = createChildren(newValue);
            return;
          } else if (isJSSlot(newValue)) {
            compSlots[key] = createSlot(prop);
            return;
          } else if (!newValue && isJSSlot(oldValue)) {
            delete compSlots[key];
            return;
          }
          set(compProps, prop.path, newValue);
        })
      );
      disposeFunctions.push(
        node.onChildrenChange((param) => {
          if (!param) return;
          const { type, node } = param;
          if (type === 'insert') {
            insertNode(node);
          } else if (type === 'delete' || type === 'unlink') {
            removeNode(node);
          }
        })
      );
      disposeFunctions.push(
        node.onVisibleChange((visible) => void (hidden.value = !visible))
      );
    }

    onUnmounted(() => {
      disposeFunctions.forEach((dispose) => dispose?.());
    });

    const getRef = (inst: ComponentPublicInstance) => {
      triggerCompGetCtx(props.schema, inst);
    };

    return {
      mergedShow,
      mergedComp,
      compSlots,
      compProps,
      loop,
      loopArgs,
      getRef,
      buildProps,
    };
  },
  render() {
    const {
      loop,
      loopArgs,
      mergedShow,
      mergedComp,
      compProps,
      compSlots,
      buildProps,
      getRef,
    } = this;
    if (!mergedComp || !mergedShow) {
      return null;
    }
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
