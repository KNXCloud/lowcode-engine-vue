import { useRendererContext } from '../context';
import { Component, computed, defineComponent, Fragment, h, PropType, ref } from 'vue';
import { rendererProps } from './base';
import { useRenderer } from './use';
import { parseSchema } from '../utils';

export const Live = defineComponent({
  props: {
    ...rendererProps,
    comp: {
      type: Object as PropType<Component>,
      default: undefined,
    },
  },
  setup(props) {
    const { scope, components } = useRendererContext();
    const { buildSchema, buildProps, buildLoop } = useRenderer(props);

    const hidden = ref(!!props.schema.hidden);

    const condition = ref<unknown>(props.schema.condition ?? true);

    const { loop, loopArgs } = buildLoop(props.schema);
    const { props: compProps, slots: compSlots } = buildSchema();

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

    return {
      loop,
      loopArgs,
      compProps,
      compSlots,
      mergedShow,
      mergedComp,
      buildProps,
    };
  },
  render() {
    const { loop, loopArgs, mergedShow, mergedComp, compProps, compSlots, buildProps } =
      this;
    if (!mergedComp || !mergedShow) return null;
    if (!loop) return h(mergedComp, buildProps(compProps), { ...compSlots });
    return h(
      Fragment,
      loop.map((item, index) => {
        return h(
          mergedComp,
          buildProps(compProps, { [loopArgs[0]]: item, [loopArgs[1]]: index }),
          { ...compSlots }
        );
      })
    );
  },
});
