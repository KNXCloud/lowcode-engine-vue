import { Prop } from '@alilc/lowcode-designer';
import {
  Component,
  VNode,
  Ref,
  ComputedRef,
  Slot,
  Slots,
  h,
  createTextVNode,
  computed,
  ref,
  reactive,
  getCurrentInstance,
  isRef,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onErrorCaptured,
  onMounted,
  onUnmounted,
  onUpdated,
  provide,
} from 'vue';
import {
  NodeData,
  SlotSchema,
  NodeSchema,
  JSFunction,
  CompositeValue,
  isJSSlot,
  isJSFunction,
  isDOMText,
  isNodeSchema,
  isJSExpression,
  TransformStage,
} from '@alilc/lowcode-types';
import { isNil, isString, camelCase, pickBy, isObject, isFunction } from 'lodash-es';
import { contextFactory, useRendererContext } from '../context';
import { LeafProps, RendererProps } from './base';
import { Hoc } from './hoc';
import { Live } from './live';
import {
  ensureArray,
  getI18n,
  mergeScope,
  parseSchema,
  parseExpression,
  parseSlotParams,
} from '../utils';
import { createDataSourceManager } from '../data-source';

export type SlotSchemaMap = {
  [x: string]: SlotSchema | NodeData[] | undefined;
};

export type PropSchemaMap = {
  [x: string]: unknown;
};

export function isNodeData(val: unknown): val is NodeData | NodeData[] {
  if (Array.isArray(val)) {
    return val.every((item) => isNodeData(item));
  }
  return isDOMText(val) || isNodeSchema(val) || isJSExpression(val);
}

export function isVueComponent(val: unknown): val is Component {
  if (isFunction(val)) return true;
  if (isObject(val) && ('render' in val || 'setup' in val)) {
    return true;
  }
  return false;
}

export function useLeaf(props: LeafProps) {
  const { components, getNode, designMode } = useRendererContext();

  const node = props.schema.id ? getNode(props.schema.id) : null;

  const isDesignMode = designMode === 'design';

  const render = (
    schema: NodeData,
    base: Component,
    blockScope?: unknown,
    comp?: Component
  ) => {
    const mergedScope = mergeScope(props.scope, blockScope);
    if (isString(schema)) {
      return createTextVNode(schema);
    } else if (isJSExpression(schema)) {
      const result = parseExpression(schema, mergedScope);
      if (result == null) {
        return null;
      } else if (isVueComponent(result)) {
        return h(result);
      } else {
        return createTextVNode(result);
      }
    }
    if (!comp) {
      const { componentName } = schema;
      comp = components[componentName];
    }

    if (!comp) return h('div', 'component not found');

    const privateProperties = pickBy(comp, (_, k) => {
      return !!k.match(/^__[\s\S]+__/);
    });
    if (Object.keys(privateProperties).length > 0) {
      base = Object.create(base, Object.getOwnPropertyDescriptors(privateProperties));
    }

    return h(base, {
      key: schema.id,
      comp,
      scope: mergedScope,
      schema: schema,
    } as any);
  };

  const renderHoc = (
    nodeSchema: NodeData,
    blockScope?: unknown,
    comp?: Component
  ): VNode | null => {
    return render(nodeSchema, Hoc, blockScope, comp);
  };

  const renderLive = (
    nodeSchema: NodeData,
    blockScope?: unknown,
    comp?: Component
  ): VNode | null => {
    return render(nodeSchema, Live, blockScope, comp);
  };

  const renderComp = isDesignMode ? renderHoc : renderLive;

  const buildSchema = () => {
    const { schema } = props;

    const slotProps: SlotSchemaMap = {};
    const normalProps: PropSchemaMap = {};

    slotProps.default = ensureArray(schema.children);

    Object.entries(schema.props ?? {}).forEach(([key, val]) => {
      if (isJSSlot(val)) {
        const prop = node?.getProp(key);
        if (prop && prop.slotNode) {
          const slotSchema = prop.slotNode.export(TransformStage.Render);
          slotProps[key] = slotSchema;
        } else if (val.value) {
          slotProps[key] = {
            componentName: 'Slot',
            params: val.params,
            children: val.value,
          };
        }
      } else if (key === 'className') {
        normalProps.class = val;
      } else if (key === 'children' && isNodeData(val)) {
        slotProps.default = ensureArray(val);
      } else {
        normalProps[key] = val;
      }
    });

    return { props: normalProps, slots: slotProps };
  };

  const parseProp = (
    schema: unknown,
    scope: unknown,
    blockScope: unknown,
    prop?: Prop | null
  ): any => {
    if (isJSExpression(schema) || isJSFunction(schema)) {
      return parseExpression(schema, scope);
    } else if (isJSSlot(schema)) {
      let slotParams: string[];
      let slotSchema: NodeData[] | SlotSchema;
      if (prop?.slotNode) {
        slotSchema = prop.slotNode.export(TransformStage.Render);
        slotParams = slotSchema.params ?? [];
      } else {
        slotSchema = ensureArray(schema.value);
        slotParams = schema.params ?? [];
      }
      return (...args: unknown[]) => {
        const vnodes: VNode[] = [];
        ensureArray(slotSchema).forEach((item) => {
          const vnode = renderComp(item, [blockScope, parseSlotParams(args, slotParams)]);
          vnode && vnodes.push(vnode);
        });
        return vnodes;
      };
    } else if (Array.isArray(schema)) {
      return schema.map((item, idx) =>
        parseProp(item, scope, blockScope, prop?.get(idx))
      );
    } else if (schema && typeof schema === 'object') {
      const res: any = {};
      Object.keys(schema).forEach((key) => {
        if (key.startsWith('__')) return;
        const val = Reflect.get(schema, key);
        res[key] = parseProp(val, scope, blockScope, prop?.get(key));
      });
      return res;
    }

    return schema;
  };

  const buildProp = (target: any, key: string, val: unknown) => {
    if (key.startsWith('v-model')) {
      // 双向绑定逻辑
      const matched = key.match(/v-model(?::(\w+))?$/);
      if (!matched) return target;

      const valueProp = camelCase(matched[1] ?? 'modelValue');
      const eventProp = `onUpdate:${valueProp}`;
      if (isJSExpression(val)) {
        const updateEventFn: JSFunction = {
          type: 'JSFunction',
          value: `function ($event) {${val.value} = $event}`,
        };
        target[eventProp] =
          eventProp in target
            ? ensureArray(target[eventProp]).concat(updateEventFn)
            : updateEventFn;
      }
      target[valueProp] = val;
    } else if (key.startsWith('v-') && isJSExpression(val)) {
      // TODO: 指令绑定逻辑
    } else if (key.match(/^on[A-Z]/) && isJSFunction(val)) {
      // 事件绑定逻辑

      // normalize: onUpdateXxx => onUpdate:xxx
      const matched = key.match(/onUpdate(?::?(\w+))$/);
      if (matched) {
        key = `onUpdate:${camelCase(matched[1])}`;
      }

      // 若事件名称重复，则自动转化为数组
      target[key] = key in target ? ensureArray(target[key]).concat(val) : val;
    } else {
      target[key] = val;
    }
    return target;
  };

  const buildProps = (
    propsSchema: Record<string, unknown>,
    blockScope?: unknown | unknown[],
    extraProps?: Record<string, unknown>
  ): any => {
    // 属性预处理
    const processed: Record<string, unknown> = {};

    Object.keys(propsSchema).forEach((propKey) => {
      buildProp(processed, propKey, propsSchema[propKey]);
    });

    const parsedProps: Record<string, unknown> = {};
    const mergedScope = blockScope ? mergeScope(props.scope, blockScope) : props.scope;

    Object.keys(propsSchema).forEach((propName) => {
      const propValue = processed[propName];
      parsedProps[propName] = parseProp(
        propValue,
        mergedScope,
        blockScope,
        node?.getProp(propName)
      );
    });

    if (extraProps) {
      Object.keys(extraProps).forEach((propKey) => {
        buildProp(parsedProps, propKey, extraProps[propKey]);
      });
    }

    return parsedProps;
  };

  const buildLoop = (schema: NodeSchema) => {
    const loop = ref() as Ref<CompositeValue>;
    const loopArgs = ref(['item', 'index']) as Ref<[string, string]>;

    if (schema.loop) loop.value = schema.loop;
    if (schema.loopArgs) {
      schema.loopArgs.forEach((v, i) => {
        loopArgs.value[i] = v;
      });
    }

    return {
      loop: computed<unknown[] | null>(() => {
        if (!loop.value) return null;
        return parseSchema(loop.value, props.scope);
      }),
      loopArgs,
      updateLoop(value: CompositeValue) {
        loop.value = value;
      },
      updateLoopArg(value: string, idx?: number): void {
        if (Array.isArray(value)) {
          value.forEach((v, i) => {
            loopArgs.value[i] = v;
          });
        } else if (!isNil(idx)) {
          loopArgs.value[idx] = value;
        }
      },
    } as {
      loop: ComputedRef<unknown[] | null>;
      loopArgs: Ref<[string, string]>;
      updateLoop(value: CompositeValue): void;
      updateLoopArg(value: [string, string]): void;
      updateLoopArg(value: string, idx?: number | string): void;
    };
  };

  const decorateDefaultSlot = (slot: Slot): Slot => {
    return (...args: unknown[]) => {
      const vnodes = slot(...args);
      if (!vnodes.length) {
        vnodes.push(h('div', { class: 'lc-container' }));
      }
      return vnodes;
    };
  };

  const buildSlost = (slots: SlotSchemaMap, blockScope?: unknown | unknown[]): Slots => {
    return Object.keys(slots).reduce((prev, next) => {
      const slotSchema = slots[next];
      if (!slotSchema) return prev;
      const renderSlot = (...args: unknown[]) => {
        const vnodes: VNode[] = [];
        if (Array.isArray(slotSchema)) {
          slotSchema.forEach((item) => {
            const vnode = renderComp(item, blockScope);
            vnode && vnodes.push(vnode);
          });
        } else if (slotSchema.id) {
          const slotParams = slotSchema.params ?? [];
          const vnode = renderComp(slotSchema, [
            blockScope,
            parseSlotParams(args, slotParams),
          ]);
          vnode && vnodes.push(vnode);
        } else {
          const slotParams = slotSchema.params ?? [];
          ensureArray(slotSchema.children).forEach((item) => {
            const vnode = renderComp(item, [
              blockScope,
              parseSlotParams(args, slotParams),
            ]);
            vnode && vnodes.push(vnode);
          });
        }
        return vnodes;
      };
      prev[next] =
        next === 'default' && isDesignMode && node?.isContainer()
          ? decorateDefaultSlot(renderSlot)
          : renderSlot;
      return prev;
    }, {} as Record<string, Slot>);
  };

  return {
    node,
    renderComp,
    buildLoop,
    buildProps,
    buildSlost,
    buildSchema,
  };
}

export function useRenderer(props: RendererProps) {
  const { scope } = useRootScope(props);

  const leafProps: LeafProps = reactive({
    comp: null,
    scope: scope,
    schema: computed(() => props.__schema),
  });

  const contextKey = contextFactory();

  const designModeRef = computed(() => props.__designMode);
  const componentsRef = computed(() => props.__components);

  provide(
    contextKey,
    reactive({
      designMode: designModeRef,
      components: componentsRef,
      getNode: (id: string) => props.__getNode?.(id) ?? null,
      triggerCompGetCtx: computed(() => props.__triggerCompGetCtx),
    })
  );

  return { scope, designModeRef, componentsRef, ...useLeaf(leafProps) };
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

export function useRootScope(rendererProps: RendererProps) {
  const { __schema: schema, __scope: extraScope } = rendererProps;

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
  Object.assign(instance.props, props);

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
  let style: HTMLStyleElement | null = document.querySelector(`[data-id=${schema.id}]`);
  if (schema.css) {
    if (!style) {
      style = document.createElement('style');
      style.setAttribute('data-id', schema.id!);
      const head = document.head || document.getElementsByTagName('head')[0];
      head.appendChild(style);
    }
    if (style.innerHTML !== schema.css) {
      style.innerHTML = schema.css;
    }
  } else if (style) {
    style.parentElement?.removeChild(style);
  }

  const addToScope = (source: Record<string, unknown>) => {
    Object.keys(source).forEach((key) => {
      const val = source[key];
      const target = isRef(val) ? data : scope;
      Reflect.set(target, key, val);
    });
  };

  // 处理 renderer 额外传入的 scope
  extraScope && addToScope(extraScope);

  // 处理 i18n
  const i18n = (key: string, values?: any) => {
    const { __locale: locale, __messages: messages } = rendererProps;
    return getI18n(key, values, locale, messages);
  };

  const currentLocale = computed(() => rendererProps.__locale);
  addToScope({ i18n, currentLocale });

  // 处理 dataSource
  const { dataSourceMap, reloadDataSource } = createDataSourceManager(
    schema.dataSource ?? { list: [], dataHandler: undefined },
    scope
  );
  addToScope({ dataSourceMap, reloadDataSource });
  reloadDataSource();

  return {
    scope,
    addToScope,
  };
}
