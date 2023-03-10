import { defineComponent, h } from 'vue';
import { useRenderer, rendererProps } from '../core';

const Page = defineComponent((props, { slots }) => {
  return () => h('div', { class: 'lc-page', ...props }, slots);
});

export const PageRenderer = defineComponent({
  props: rendererProps,
  __renderer__: true,
  setup(props) {
    const { renderComp, componentsRef, schema } = useRenderer(props);
    return () => renderComp(schema.value, null, componentsRef.value.Page || Page);
  },
});
