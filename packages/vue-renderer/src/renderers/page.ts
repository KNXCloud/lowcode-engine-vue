import { computed, defineComponent, h } from 'vue';
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
    const comp = computed(() => components.Page || Page);
    return { comp, ...useRenderer(props) };
  },
  render() {
    const { comp, renderComp, schema } = this;
    return renderComp(schema, comp);
  },
});
