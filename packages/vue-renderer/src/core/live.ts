import { defineComponent, Fragment, h } from 'vue';
import { useLeaf } from './use';
import { leafProps } from './base';

export const Live = defineComponent({
  props: leafProps,
  setup(props) {
    const { buildSchema, buildProps, buildLoop, buildSlots, buildShow } = useLeaf(props);

    const { show } = buildShow(props.schema);
    const { loop, loopArgs, buildLoopScope } = buildLoop(props.schema);
    const { props: compProps, slots: compSlots } = buildSchema();

    return {
      show,
      loop,
      loopArgs,
      compProps,
      compSlots,
      buildSlots,
      buildProps,
      buildLoopScope,
    };
  },
  render() {
    const {
      show,
      comp,
      loop,
      compProps,
      compSlots,
      buildProps,
      buildSlots,
      buildLoopScope,
    } = this;

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
      loop.map((item, index, arr) => {
        const blockScope = buildLoopScope(item, index, arr.length);
        return h(
          comp,
          buildProps(compProps, blockScope),
          buildSlots(compSlots, blockScope)
        );
      })
    );
  },
});
