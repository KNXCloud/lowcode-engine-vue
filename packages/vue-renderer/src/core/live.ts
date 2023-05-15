import { defineComponent, h, mergeProps, renderSlot } from 'vue';
import { isFragment, splitLeafProps } from './use';
import { leafProps } from './base';

export const Live = defineComponent({
  inheritAttrs: false,
  props: leafProps,
  setup: (props, { attrs, slots }) => {
    return () => {
      const { __comp: comp, __vnodeProps: vnodeProps } = props;
      const compProps = splitLeafProps(attrs)[1];
      if (isFragment(comp)) {
        return renderSlot(slots, 'default', attrs);
      }
      return comp ? h(comp, mergeProps(compProps, vnodeProps), slots) : null;
    };
  },
});
