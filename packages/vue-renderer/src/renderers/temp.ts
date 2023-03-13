import { useRendererContext } from '@knxcloud/lowcode-hooks';
import { defineComponent, Fragment, getCurrentInstance, onMounted } from 'vue';
import { useRenderer, rendererProps, useRootScope } from '../core';

export const TempRenderer = defineComponent({
  name: 'TempRenderer',
  props: rendererProps,
  __renderer__: true,
  setup(props, context) {
    const { scope, wrapRender } = useRootScope(props, context);
    const { triggerCompGetCtx } = useRendererContext();
    const { renderComp, schemaRef } = useRenderer(props, scope);

    const instance = getCurrentInstance()!;

    onMounted(() => {
      instance.proxy && triggerCompGetCtx(schemaRef.value, instance.proxy);
    });

    return wrapRender(() => renderComp(schemaRef.value, null, Fragment));
  },
});
