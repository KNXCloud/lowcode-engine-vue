import { defineComponent, Fragment, h } from 'vue';
import { useLeaf } from './use';
import { leafProps } from './base';

export const Live = defineComponent({
  props: leafProps,
  setup(props) {
    const { buildSchema, buildProps, buildLoop, buildSlots, buildShow } = useLeaf(props);

    const { show } = buildShow(props.schema);
    const { loop, loopArgs } = buildLoop(props.schema);
    const { props: compProps, slots: compSlots } = buildSchema();

    return {
      show,
      loop,
      loopArgs,
      compProps,
      compSlots,
      buildSlots,
      buildProps,
    };
  },
  render() {
    const { show, comp, loop, loopArgs, compProps, compSlots, buildProps, buildSlots } =
      this;

    if (!show) return null;
    if (!comp) return h('div', 'component not found');
    if (!loop) {
      return h(comp, buildProps(compProps), buildSlots(compSlots));
    }

    if (!Array.isArray(loop)) {
      console.warn('[vue-renderer]: loop must be array', loop);
      return null;
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
          buildSlots(compSlots, blockScope)
        );
      })
    );
  },
});
