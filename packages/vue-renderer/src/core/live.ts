import { defineComponent, h, mergeProps, renderSlot, toRaw } from 'vue';
import { isFragment, splitLeafProps } from './use';
import { leafProps } from './base';

export const Live = defineComponent({
  inheritAttrs: false,
  props: leafProps,
  setup: (props, { attrs, slots }) => {
    return () => {
      const comp = toRaw(props.__comp);
      const vnodeProps = { ...props.__vnodeProps };
      const compProps = splitLeafProps(attrs)[1];
      if (isFragment(comp)) {
        return renderSlot(slots, 'default', attrs);
      }
      return comp ? h(comp, mergeProps(compProps, vnodeProps), slots) : null;
    };
  },
});
