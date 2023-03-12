import { defineComponent, Fragment, h, mergeProps } from 'vue';
import { isFragment, splitLeafProps } from './use';
import { leafProps } from './base';
import { useRendererContext } from '@knxcloud/lowcode-hooks';

export const Live = defineComponent({
  inheritAttrs: false,
  props: leafProps,
  setup: (props, { attrs, slots }) => {
    const { triggerCompGetCtx } = useRendererContext();

    return () => {
      const { __comp: comp, __vnodeProps: vnodeProps, __schema: schema } = props;
      const compProps = splitLeafProps(attrs)[1];
      if (isFragment(comp)) {
        return h(Fragment, slots.default?.());
      }
      return comp
        ? h(
            comp,
            mergeProps(compProps, vnodeProps, {
              onVnodeMounted(vnode) {
                const instance = vnode.component?.proxy;
                instance && triggerCompGetCtx(schema, instance);
              },
            }),
            slots
          )
        : null;
    };
  },
});
