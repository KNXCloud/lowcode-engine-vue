import { defineComponent, h } from 'vue';
import { useRendererContext } from '../context';
import { useRenderer, rendererProps } from '../core';

const Page = defineComponent((props, { slots }) => {
  return () => h('div', { class: 'lce-page', ...props }, slots);
});

export const PageRenderer = defineComponent({
  props: rendererProps,
  __renderer__: true,
  setup(props) {
    const { components } = useRendererContext();
    const { renderComp } = useRenderer(props);
    return () => {
      const { schema } = props;
      return renderComp(schema, null, components.Page || Page);
    };
  },
});
