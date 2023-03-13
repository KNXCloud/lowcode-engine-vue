import type {
  IPublicModelNode as Node,
  IPublicTypeNodeSchema as NodeSchema,
  IPublicTypeContainerSchema as ContainerSchema,
} from '@alilc/lowcode-types';
import { getRendererContextKey, type DesignMode } from '@knxcloud/lowcode-hooks';
import {
  type PropType,
  type Component,
  type ComponentPublicInstance,
  h,
  reactive,
  provide,
  computed,
  defineComponent,
  Suspense,
  shallowRef,
  watch,
  triggerRef,
} from 'vue';
import {
  type I18nMessages,
  type BlockScope,
  type ExtractPublicPropTypes,
  SchemaParser,
} from './utils';
import config from './config';
import { RENDERER_COMPS } from './renderers';
import { debounce, exportSchema } from '@knxcloud/lowcode-utils';

const vueRendererProps = {
  scope: Object as PropType<BlockScope>,
  schema: {
    type: Object as PropType<ContainerSchema>,
    required: true,
  },
  passProps: Object as PropType<Record<string, unknown>>,
  components: {
    type: Object as PropType<Record<string, Component>>,
    required: true,
  },
  /** 设计模式，可选值：live、design */
  designMode: {
    type: String as PropType<DesignMode>,
    default: 'live',
  },
  /** 设备信息 */
  device: String,
  /** 语言 */
  locale: String,
  messages: {
    type: Object as PropType<I18nMessages>,
    default: () => ({}),
  },
  getNode: Function as PropType<(id: string) => Node | null>,
  /** 组件获取 ref 时触发的钩子 */
  onCompGetCtx: Function as PropType<
    (schema: NodeSchema, ref: ComponentPublicInstance) => void
  >,
  thisRequiredInJSE: {
    type: Boolean,
    default: true,
  },
} as const;

type VueRendererProps = ExtractPublicPropTypes<typeof vueRendererProps>;

const VueRenderer = defineComponent({
  props: vueRendererProps,
  setup(props, { slots }) {
    const parser = new SchemaParser({
      thisRequired: props.thisRequiredInJSE,
    }).initModule(props.schema);

    const triggerCompGetCtx = (schema: NodeSchema, val: ComponentPublicInstance) => {
      val && props.onCompGetCtx?.(schema, val);
    };
    const getNode = (id: string) => props.getNode?.(id) ?? null;

    const schemaRef = shallowRef(props.schema);
    watch(
      () => props.schema,
      () => (schemaRef.value = props.schema)
    );

    const rendererContext = reactive({
      designMode: computed(() => props.designMode),
      components: computed(() => ({
        ...config.getRenderers(),
        ...props.components,
      })),
      getNode: (id: string) => (props.getNode?.(id) as any) ?? null,
      triggerCompGetCtx: (schema: NodeSchema, inst: ComponentPublicInstance) => {
        props.onCompGetCtx?.(schema, inst);
      },
      rerender: debounce(() => {
        const id = props.schema.id;
        const node = id && getNode(id);
        if (node) {
          const newSchema = exportSchema<ContainerSchema>(node);
          if (newSchema) {
            schemaRef.value = newSchema;
          }
        }
        triggerRef(schemaRef);
      }),
    });

    provide(getRendererContextKey(), rendererContext);

    const renderContent = () => {
      const { components } = rendererContext;
      const { scope, locale, messages, designMode, thisRequiredInJSE, passProps } = props;
      const { value: schema } = schemaRef;

      if (!schema) return null;

      const { componentName } = schema;
      let Comp = components[componentName] || components[`${componentName}Renderer`];
      if (Comp && !(Comp as any).__renderer__) {
        Comp = RENDERER_COMPS[`${componentName}Renderer`];
      }

      return Comp
        ? h(Suspense, null, {
            ...slots,
            default: () =>
              h(Comp, {
                key: schema.__ctx
                  ? `${schema.__ctx.lceKey}_${schema.__ctx.idx || '0'}`
                  : schema.id,
                ...passProps,
                ...parser.parseOnlyJsValue(schema.props),
                __parser: parser,
                __scope: scope,
                __schema: schema,
                __locale: locale,
                __messages: messages,
                __components: components,
                __designMode: designMode,
                __thisRequiredInJSE: thisRequiredInJSE,
                __getNode: getNode,
                __triggerCompGetCtx: triggerCompGetCtx,
              } as any),
          })
        : null;
    };

    return () => {
      const { device, locale } = props;
      const configProvider = config.getConfigProvider();
      return configProvider
        ? h(configProvider, { device, locale }, { default: renderContent })
        : renderContent();
    };
  },
});

export const cleanCacledModules = () => {
  SchemaParser.cacheModules = {};
};

export { VueRenderer, vueRendererProps };
export type { VueRendererProps, I18nMessages, BlockScope };
