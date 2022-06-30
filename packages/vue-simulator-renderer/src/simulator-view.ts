import { defineComponent, h, PropType } from 'vue';
import LowCodeRenderer from '@knxcloud/lowcode-vue-renderer';
import { DocumentInstance, VueSimulatorRenderer } from './interface';
import { RouterView } from 'vue-router';

export const Layout = defineComponent({
  props: {
    simulator: {
      type: Object as PropType<VueSimulatorRenderer>,
      required: true,
    },
  },
  render() {
    const { simulator, $slots } = this;
    const { layout, getComponent } = simulator;
    if (layout) {
      const { Component, props, componentName } = layout;
      if (Component) {
        return h(Component, { ...props, key: 'layout', simulator }, $slots);
      }
      const ComputedComponent = componentName && getComponent(componentName);
      if (ComputedComponent) {
        return h(ComputedComponent, { ...props, key: 'layout', simulator }, $slots);
      }
    }
    return $slots.default?.();
  },
});

export const SimulatorRendererView = defineComponent({
  props: {
    simulator: {
      type: Object as PropType<VueSimulatorRenderer>,
      required: true,
    },
  },
  render() {
    const { simulator } = this;
    return h(Layout, { simulator }, { default: () => h(RouterView) });
  },
});

export const Renderer = defineComponent({
  props: {
    simulator: {
      type: Object as PropType<VueSimulatorRenderer>,
      required: true,
    },
    documentInstance: {
      type: Object as PropType<DocumentInstance>,
      required: true,
    },
  },
  render() {
    const { documentInstance, simulator } = this;
    const { schema } = documentInstance;
    const { designMode, device, locale, components } = simulator;

    if (!simulator.autoRender) return null;

    return h(LowCodeRenderer, {
      __schema: schema,
      __components: components,
      __locale: locale,
      __messages: {},
      __designMode: designMode,
      __device: device,
      __simulator: simulator,
      __getNode: (id) => documentInstance.getNode(id),
      __onCompGetCtx: (schema, ref) => documentInstance.mountInstance(schema.id!, ref),
    });
  },
});
