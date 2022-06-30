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
  __schema: RootSchema;
  __components: Record<string, Component>;
  __designMode?: 'live' | 'design';
  __device?: string;
  __locale?: string;
  __messages?: Record<string, any>;
  __getNode?: (id: string) => Node<NodeSchema> | null;
  __onCompGetCtx?: (schema: NodeSchema, ref: ComponentPublicInstance) => void;
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
    const { __locale: locale, __messages: messages } = props;
    return getI18n(key, values, locale, messages);
  };

  const currentLocale = computed(() => props.__locale);

  return { i18n, currentLocale };
}

function useRootScope(schema?: RootSchema) {
  const {
    props: propsSchema,
    state: stateSchema,
    methods: methodsSchema,
    lifeCycles: lifeCyclesSchema,
  } = schema ?? {};

  // 将全局属性配置应用到 scope 中
  const instance = getCurrentInstance()!;
  const scope = instance.proxy!;
  const data = (instance.data = reactive({} as Record<string, unknown>));

  // 处理 props
  const props = parseSchema(propsSchema, undefined) ?? {};
  Object.assign(scope.$.props, props);

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
    __schema: {
      type: Object as PropType<RootSchema>,
      required: true,
    },
    __components: {
      type: Object as PropType<Record<string, Component>>,
      required: true,
    },
    /** 设计模式，可选值：live、design */
    __designMode: {
      type: String as PropType<'live' | 'design'>,
      default: 'live',
    },
    /** 设备信息 */
    __device: {
      type: String,
      default: undefined,
    },
    /** 语言 */
    __locale: {
      type: String,
      default: undefined,
    },
    __messages: {
      type: Object as PropType<Record<string, any>>,
      default: () => ({}),
    },
    __getNode: {
      type: Function as PropType<(id: string) => Node<NodeSchema> | null>,
      default: undefined,
    },
    /** 组件获取 ref 时触发的钩子 */
    __onCompGetCtx: {
      type: Function as PropType<
        (schema: NodeSchema, ref: ComponentPublicInstance) => void
      >,
      default: undefined,
    },
  },
  setup(props: RendererProps) {
    const contextKey = contextFactory();

    const triggerCompGetCtx = (schema: NodeSchema, val: ComponentPublicInstance) => {
      val && props.__onCompGetCtx?.(schema, val);
    };

    const { scope, addToScope } = useRootScope(props.__schema);

    // append i18n methods
    addToScope(useI18n(props));

    // append dataSource
    const { dataSourceMap, reloadDataSource } = createDataSourceManager(
      props.__schema.dataSource ?? { list: [], dataHandler: undefined },
      scope
    );
    addToScope({ dataSourceMap, reloadDataSource });
    reloadDataSource();

    const allComponents = computed(() => ({
      ...config.getRenderers(),
      ...props.__components,
    }));

    provide(
      contextKey,
      reactive({
        scope: scope,
        components: allComponents,
        getNode: (id: string) => props.__getNode?.(id) ?? null,
        designMode: computed(() => props.__designMode),
        triggerCompGetCtx,
      })
    );

    const renderContent = () => {
      const { __schema: schema } = props;
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

    return () => {
      const { __device: device, __locale: locale } = props;
      const configProvider = config.getConfigProvider();
      return configProvider
        ? h(configProvider, { device, locale }, { default: renderContent })
        : renderContent();
    };
  },
}) as new (...args: any[]) => { $props: RendererProps };

export { RendererProps, Renderer };
