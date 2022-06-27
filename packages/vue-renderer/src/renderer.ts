import {
  Component,
  PropType,
  defineComponent,
  h,
  provide,
  reactive,
  computed,
  onUnmounted,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onMounted,
  onUpdated,
  onErrorCaptured,
  getCurrentInstance,
  ComponentPublicInstance,
  isRef,
} from 'vue';
import { NodeSchema, RootSchema } from '@alilc/lowcode-types';
import { Node } from '@alilc/lowcode-designer';
import { contextFactory } from './context';
import { RENDERER_COMPS } from './renderers';
import { getI18n, parseSchema } from './utils';
import config from './config';
import { createDataSourceManager } from './data-source';

interface RendererProps {
  schema: RootSchema;
  components: Record<string, Component>;
  designMode?: 'live' | 'design';
  device?: string;
  locale?: string;
  messages?: Record<string, any>;
  getNode?: (id: string) => Node<NodeSchema> | null;
  onCompGetCtx?: (schema: NodeSchema, ref: ComponentPublicInstance) => void;
}

const LIFT_CYCLES_MAP = {
  beforeMount: onBeforeMount,
  mounted: onMounted,
  beforeUpdate: onBeforeUpdate,
  updated: onUpdated,
  beforeUnmount: onBeforeUnmount,
  unmounted: onUnmounted,

  // 适配 react lifecycle
  componentDidMount: onMounted,
  componentDidCatch: onErrorCaptured,
  shouldComponentUpdate: onBeforeUpdate,
  componentWillUnmount: onBeforeUnmount,
};

function useI18n(props: RendererProps) {
  const i18n = (key: string, values?: any) => {
    const { locale, messages } = props;
    return getI18n(key, values, locale, messages);
  };

  const currentLocale = computed(() => props.locale);

  return { i18n, currentLocale };
}

function useRootScope(schema?: RootSchema) {
  const {
    state: stateSchema,
    methods: methodsSchema,
    lifeCycles: lifeCyclesSchema,
  } = schema ?? {};

  // 将全局属性配置应用到 scope 中
  const instance = getCurrentInstance()!;
  const scope = instance.proxy!;
  const data = (instance.data = reactive({} as Record<string, unknown>));

  // 处理 state
  const states = parseSchema(stateSchema, undefined) ?? {};
  Object.assign(data, states);

  // 处理 methods
  const methods = parseSchema(methodsSchema, scope) ?? {};
  Object.assign(scope, methods);

  // 处理 lifecycle
  const lifeCycles = parseSchema(lifeCyclesSchema, scope);
  Object.entries(lifeCycles ?? {}).forEach(([lifeCycle, callback]: [any, any]) => {
    const hook = LIFT_CYCLES_MAP[lifeCycle as keyof typeof LIFT_CYCLES_MAP];
    hook?.(callback, instance);
  });

  // 处理 css
  if (schema?.css) {
    let style: HTMLStyleElement | null = document.querySelector(`[data-id=${schema.id}]`);
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('data-id', schema.id!);
      const head = document.head || document.getElementsByTagName('head')[0];
      head.appendChild(style);
    }
    if (style.innerHTML !== schema.css) {
      style.innerHTML = schema.css;
    }
  }

  const addToScope = (source: Record<string, unknown>) => {
    Object.keys(source).forEach((key) => {
      const val = source[key];
      const target = isRef(val) ? data : scope;
      Reflect.set(target, key, val);
    });
  };

  return {
    scope,
    addToScope,
  };
}

const Renderer = defineComponent({
  props: {
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
      type: Object as PropType<Record<string, any>>,
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
    const contextKey = contextFactory();

    const triggerCompGetCtx = (schema: NodeSchema, val: ComponentPublicInstance) => {
      val && props.onCompGetCtx?.(schema, val);
    };

    const { scope, addToScope } = useRootScope(props.schema);

    // append i18n methods
    addToScope(useI18n(props));

    // append dataSource
    const { dataSourceMap, reloadDataSource } = createDataSourceManager(
      props.schema.dataSource ?? { list: [], dataHandler: undefined },
      scope
    );
    addToScope({ dataSourceMap, reloadDataSource });
    reloadDataSource();

    const allComponents = computed(() => ({
      ...config.getRenderers(),
      ...props.components,
    }));

    provide(
      contextKey,
      reactive({
        scope: scope,
        components: allComponents,
        getNode: (id: string) => props.getNode?.(id) ?? null,
        designMode: computed(() => props.designMode),
        triggerCompGetCtx,
      })
    );

    const renderContent = () => {
      const { schema } = props;
      if (!schema) {
        return null;
      }
      const { componentName } = schema!;
      let Comp =
        allComponents.value[componentName] || RENDERER_COMPS[`${componentName}Renderer`];
      if (Comp && !(Comp as any).__renderer__) {
        Comp = RENDERER_COMPS[`${componentName}Renderer`];
      }
      return Comp
        ? h(Comp, {
            id: schema.id,
            key: schema.__ctx && `${schema.__ctx.lceKey}_${schema.__ctx.idx || '0'}`,
            schema,
            scope,
          } as any)
        : null;
    };

    return { renderContent };
  },
  render() {
    const { device, locale, renderContent } = this;
    const configProvider = config.getConfigProvider();
    return configProvider
      ? h(configProvider, { device, locale }, { default: renderContent })
      : renderContent();
  },
}) as new (...args: any[]) => { $props: RendererProps };

export { RendererProps, Renderer };
