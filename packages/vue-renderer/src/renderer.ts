import type {
  IPublicTypeNodeSchema as NodeSchema,
  IPublicTypeContainerSchema as ContainerSchema,
} from '@alilc/lowcode-types';
import { getRendererContextKey, type DesignMode, INode } from '@knxcloud/lowcode-hooks';
import {
  type PropType,
  type Component,
  type ComponentPublicInstance,
  h,
  reactive,
  provide,
  computed,
  defineComponent,
  shallowRef,
  watch,
  triggerRef,
  ref,
  watchEffect,
} from 'vue';
import {
  type I18nMessages,
  type BlockScope,
  type ExtractPublicPropTypes,
  SchemaParser,
  type RuntimeScope,
} from './utils';
import config from './config';
import { RENDERER_COMPS } from './renderers';
import {
  createObjectSpliter,
  debounce,
  exportSchema,
  isBoolean,
} from '@knxcloud/lowcode-utils';

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
  getNode: Function as PropType<(id: string) => INode | null>,
  /** 组件获取 ref 时触发的钩子 */
  onCompGetCtx: Function as PropType<
    (schema: NodeSchema, ref: ComponentPublicInstance) => void
  >,
  thisRequiredInJSE: {
    type: Boolean,
    default: true,
  },
  disableCompMock: {
    type: [Array, Boolean] as PropType<string[] | boolean>,
    default: false,
  },
  requestHandlersMap: Object,
} as const;

type VueRendererProps = ExtractPublicPropTypes<typeof vueRendererProps>;

const splitOptions = createObjectSpliter((prop) => !prop.match(/^[a-z]+([A-Z][a-z]+)*$/));

const VueRenderer = defineComponent({
  props: vueRendererProps,
  setup(props, { slots, expose }) {
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

    let needWrapComp: (name: string) => boolean = () => true;

    watchEffect(() => {
      const disableCompMock = props.disableCompMock;
      if (isBoolean(disableCompMock)) {
        needWrapComp = disableCompMock ? () => false : () => true;
      } else if (disableCompMock) {
        needWrapComp = (name) => !disableCompMock.includes(name);
      }
    });

    const wrapCached: Map<object, Map<object, any>> = new Map();

    const rendererContext = reactive({
      designMode: computed(() => props.designMode),
      components: computed(() => ({
        ...config.getRenderers(),
        ...props.components,
      })),
      thisRequiredInJSE: computed(() => props.thisRequiredInJSE),
      requestHandlersMap: computed(() => props.requestHandlersMap ?? {}),
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
      wrapLeafComp: <T extends object, L extends object>(
        name: string,
        comp: T,
        leaf: L
      ): L => {
        let record = wrapCached.get(leaf);
        if (record) {
          if (record.has(comp)) {
            return record.get(comp);
          }
        } else {
          record = new Map();
          wrapCached.set(leaf, record);
        }

        if (needWrapComp(name)) {
          const [privateOptions, _, privateOptionsCount] = splitOptions(comp as any);
          if (privateOptionsCount) {
            leaf = Object.create(leaf, Object.getOwnPropertyDescriptors(privateOptions));
          }
        }
        record.set(comp, leaf);
        return leaf;
      },
    });

    provide(getRendererContextKey(), rendererContext);

    const runtimeScope = ref<RuntimeScope>();

    expose({ runtimeScope });

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
        ? h(
            Comp,
            {
              key: schema.__ctx
                ? `${schema.__ctx.lceKey}_${schema.__ctx.idx || '0'}`
                : schema.id,
              ...passProps,
              ...parser.parseOnlyJsValue(schema.props),
              ref: runtimeScope,
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
            } as any,
            slots
          )
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

export const cleanCachedModules = () => {
  SchemaParser.cleanCachedModules();
};

export { VueRenderer, vueRendererProps };
export type { VueRendererProps, I18nMessages, BlockScope };
