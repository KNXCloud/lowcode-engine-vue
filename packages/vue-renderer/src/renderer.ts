import { NodeSchema, RootSchema } from '@alilc/lowcode-types';
import { Node } from '@alilc/lowcode-designer';
import {
  PropType,
  Component,
  ComponentPublicInstance,
  h,
  computed,
  defineComponent,
} from 'vue';
import config from './config';
import { RENDERER_COMPS } from './renderers';
import { I18nMessages, BlockScope } from './utils';

interface RendererProps {
  scope?: BlockScope;
  schema: RootSchema;
  components: Record<string, Component>;
  designMode?: 'live' | 'design';
  device?: string;
  locale?: string;
  messages?: I18nMessages;
  getNode?: (id: string) => Node<NodeSchema> | null;
  onCompGetCtx?: (schema: NodeSchema, ref: ComponentPublicInstance) => void;
}

const Renderer = defineComponent({
  props: {
    scope: {
      type: Object as PropType<BlockScope>,
      default: undefined,
    },
    schema: {
      type: Object as PropType<RootSchema>,
      required: true,
    },
    components: {
      type: Object as PropType<Record<string, Component>>,
      required: true,
    },
    /** 设计模式，可选值：live、design */
    designMode: {
      type: String as PropType<'live' | 'design'>,
      default: 'live',
    },
    /** 设备信息 */
    device: {
      type: String,
      default: undefined,
    },
    /** 语言 */
    locale: {
      type: String,
      default: undefined,
    },
    messages: {
      type: Object as PropType<I18nMessages>,
      default: () => ({}),
    },
    getNode: {
      type: Function as PropType<(id: string) => Node<NodeSchema> | null>,
      default: undefined,
    },
    /** 组件获取 ref 时触发的钩子 */
    onCompGetCtx: {
      type: Function as PropType<
        (schema: NodeSchema, ref: ComponentPublicInstance) => void
      >,
      default: undefined,
    },
  },
  setup(props: RendererProps) {
    const triggerCompGetCtx = (schema: NodeSchema, val: ComponentPublicInstance) => {
      val && props.onCompGetCtx?.(schema, val);
    };

    const getNode = (id: string) => props.getNode?.(id) ?? null;

    const componentsRef = computed(() => ({
      ...config.getRenderers(),
      ...props.components,
    }));

    const renderContent = () => {
      const { value: components } = componentsRef;
      const { schema, scope, locale, messages, designMode } = props;
      if (!schema) return null;

      const { componentName } = schema!;
      let Comp = components[componentName] || components[`${componentName}Renderer`];
      if (Comp && !(Comp as any).__renderer__) {
        Comp = RENDERER_COMPS[`${componentName}Renderer`];
      }

      return Comp
        ? h(Comp, {
            key: schema.__ctx
              ? `${schema.__ctx.lceKey}_${schema.__ctx.idx || '0'}`
              : schema.id,
            __scope: scope,
            __schema: schema,
            __locale: locale,
            __messages: messages,
            __components: components,
            __designMode: designMode,
            __getNode: getNode,
            __triggerCompGetCtx: triggerCompGetCtx,
          } as any)
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
}) as new (...args: any[]) => { $props: RendererProps };

export { RendererProps, Renderer, I18nMessages, BlockScope };
