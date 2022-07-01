import { computed, defineComponent, Fragment, h, ref } from 'vue';
import { useLeaf } from './use';
import { leafProps } from './base';
import { parseSchema } from '../utils';

export const Live = defineComponent({
  props: leafProps,
  setup(props) {
    const { buildSchema, buildProps, buildLoop, buildSlost } = useLeaf(props);

    const hidden = ref(!!props.schema.hidden);

    const condition = ref<unknown>(props.schema.condition ?? true);

    const { loop, loopArgs } = buildLoop(props.schema);
    const { props: compProps, slots: compSlots } = buildSchema();

    const show = computed(() => {
      if (hidden.value) return false;
      const { value: showCondition } = condition;
      if (typeof showCondition === 'boolean') return showCondition;
      return parseSchema(showCondition, props.scope);
    });

    return {
      show,
      loop,
      loopArgs,
      compProps,
      compSlots,
      buildSlost,
      buildProps,
    };
  },
  render() {
    const { show, comp, loop, loopArgs, compProps, compSlots, buildProps, buildSlost } =
      this;

    if (!show) return null;
    if (!comp) return h('div', 'component not found');
    if (!loop) {
      return h(comp, buildProps(compProps), buildSlost(compSlots));
    }

    return h(
      Fragment,
      loop.map((item, index) => {
        const blockScope = {
          [loopArgs[0]]: item,
          [loopArgs[1]]: index,
        };
        return h(
          comp,
          buildProps(compProps, blockScope),
          buildSlost(compSlots, blockScope)
        );
      })
    );
  },
});
