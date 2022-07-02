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

const VUE_LIFTCYCLES_MAP = {
  beforeMount: onBeforeMount,
  mounted: onMounted,
  beforeUpdate: onBeforeUpdate,
  updated: onUpdated,
  beforeUnmount: onBeforeUnmount,
  unmounted: onUnmounted,
  errorCaptured: onErrorCaptured,
};

// 适配 react lifecycle
const REACT_ADATPOR_LIFTCYCLES_MAP = {
  componentDidMount: onMounted,
  componentDidCatch: onErrorCaptured,
  shouldComponentUpdate: onBeforeUpdate,
  componentWillUnmount: onBeforeUnmount,
};

const LIFTCYCLES_MAP = {
  ...VUE_LIFTCYCLES_MAP,
  ...REACT_ADATPOR_LIFTCYCLES_MAP,
};

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

  /**
   * 渲染节点 vnode
   * @param schema - 节点 schema
   * @param base - 节点 leaf 组件，根据 designMode 的不同而不同
   * @param blockScope - 节点块级作用域
   * @param comp - 节点渲染的组件，若不传入，则根据节点的 componentName 推断
   */
  const render = (
    schema: NodeData,
    base: Component,
    blockScope?: unknown,
    comp?: Component
  ) => {
    const mergedScope = mergeScope(props.scope, blockScope);

    // 若 schema 不为 NodeSchema，则直接渲染
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

    // 若不传入 comp，则根据节点的 componentName 推断
    if (!comp) {
      const { componentName } = schema;
      comp = components[componentName];
    }

    if (!comp) return h('div', 'component not found');

    // 应用节点组件的私有属性，适配 naive-ui 的 grid,popover 等组件
    const privateProperties = pickBy(comp, (_, k) => {
      return !!k.match(/^__[\s\S]+__/);
    });
    if (Object.keys(privateProperties).length > 0) {
      base = Object.create(base, Object.getOwnPropertyDescriptors(privateProperties));
    }

    // 渲染 leaf 组件
    return h(base, {
      key: schema.id,
      comp,
      scope: mergedScope,
      schema: schema,
    } as any);
  };

  /**
   * 渲染节点vnode (design 模式)
   * @param nodeSchema - 节点 schema
   * @param blockScope - 节点块级作用域
   * @param comp - 节点渲染的组件，若不传入，则根据节点的 componentName 推断
   */
  const renderHoc = (
    nodeSchema: NodeData,
    blockScope?: unknown,
    comp?: Component
  ): VNode | null => {
    return render(nodeSchema, Hoc, blockScope, comp);
  };

  /**
   * 渲染节点vnode (live 模式)
   * @param nodeSchema - 节点 schema
   * @param blockScope - 节点块级作用域
   * @param comp - 节点渲染的组件，若不传入，则根据节点的 componentName 推断
   */
  const renderLive = (
    nodeSchema: NodeData,
    blockScope?: unknown,
    comp?: Component
  ): VNode | null => {
    return render(nodeSchema, Live, blockScope, comp);
  };

  /**
   * 渲染组件
   */
  const renderComp = isDesignMode ? renderHoc : renderLive;

  /**
   * 构建当前节点的 schema，获取 schema 的属性及插槽
   *
   * - node 的 children 会被处理成默认插槽
   * - 类型为 JSSlot 的 prop 会被处理为具名插槽
   * - prop 和 node 中同时存在 children 时，prop children 会覆盖 node children
   * - className prop 会被处理为 class prop
   */
  const buildSchema = () => {
    const { schema } = props;

    const slotProps: SlotSchemaMap = {};
    const normalProps: PropSchemaMap = {};

    // 处理节点默认插槽，可能会被属性插槽覆盖
    slotProps.default = ensureArray(schema.children);

    Object.entries(schema.props ?? {}).forEach(([key, val]) => {
      if (isJSSlot(val)) {
        // 处理具名插槽
        const prop = node?.getProp(key);
        if (prop && prop.slotNode) {
          // design 模式，从 prop 对象到处 schema
          const slotSchema = prop.slotNode.export(TransformStage.Render);
          slotProps[key] = slotSchema;
        } else if (val.value) {
          // live 模式，直接获取 schema 值，若值为空则不渲染插槽
          slotProps[key] = {
            componentName: 'Slot',
            params: val.params,
            children: val.value,
          };
        }
      } else if (key === 'className') {
        // 适配 react className
        normalProps.class = val;
      } else if (key === 'children' && isNodeData(val)) {
        // 处理属性中的默认插槽，属性的重默认插槽会覆盖节点 chilren 插槽
        slotProps.default = ensureArray(val);
      } else {
        // 处理普通属性
        normalProps[key] = val;
      }
    });

    return { props: normalProps, slots: slotProps };
  };

  /**
   * 将单个属性 schema 转化成真实值
   *
   * @param schema - 属性 schema
   * @param scope - 父级作用域
   * @param blockScope - 当前块级作用域
   * @param prop - 属性对象，仅在 design 模式下有值
   */
  const buildProp = (
    schema: unknown,
    scope: unknown,
    blockScope: unknown,
    prop?: Prop | null
  ): any => {
    if (isJSExpression(schema) || isJSFunction(schema)) {
      // 处理表达式和函数
      return parseExpression(schema, scope);
    } else if (isJSSlot(schema)) {
      // 处理属性插槽
      let slotParams: string[];
      let slotSchema: NodeData[] | SlotSchema;
      if (prop?.slotNode) {
        // design 模式，从 prop 中导出 schema
        slotSchema = prop.slotNode.export(TransformStage.Render);
        slotParams = slotSchema.params ?? [];
      } else {
        // live 模式，直接获取 schema 值
        slotSchema = ensureArray(schema.value);
        slotParams = schema.params ?? [];
      }

      // 返回 slot 函数
      return (...args: unknown[]) => {
        const slotScope = parseSlotParams(args, slotParams);
        const vnodes: VNode[] = [];
        ensureArray(slotSchema).forEach((item) => {
          const vnode = renderComp(item, [blockScope, slotScope]);
          vnode && vnodes.push(vnode);
        });
        return vnodes;
      };
    } else if (Array.isArray(schema)) {
      // 属性值为 array，递归处理属性的每一项
      return schema.map((item, idx) =>
        buildProp(item, scope, blockScope, prop?.get(idx))
      );
    } else if (schema && typeof schema === 'object') {
      // 属性值为 object，递归处理属性的每一项
      const res: any = {};
      Object.keys(schema).forEach((key) => {
        if (key.startsWith('__')) return;
        const val = Reflect.get(schema, key);
        res[key] = buildProp(val, scope, blockScope, prop?.get(key));
      });
      return res;
    }

    return schema;
  };

  /**
   * 处理属性 schema，主要处理的目标：
   * - 事件绑定逻辑 (重复注册的事件转化为数组)
   * - 双向绑定逻辑 (v-model)
   * - 指令绑定逻辑 TODO
   * @param target - 组件属性目标对象
   * @param key - 属性名
   * @param val - 属性值
   */
  const processProp = (target: any, key: string, val: unknown) => {
    if (key.startsWith('v-model')) {
      // 双向绑定逻辑
      const matched = key.match(/v-model(?::(\w+))?$/);
      if (!matched) return target;

      const valueProp = camelCase(matched[1] ?? 'modelValue');
      const eventProp = `onUpdate:${valueProp}`;

      // 若值为表达式，则自定注册 onUpdate 事件，实现双向绑定
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
  };

  /**
   * 构建属性，将整个属性 schema 转化为真实的属性值
   * @param propsSchema - 属性 schema
   * @param blockScope - 当前块级作用域
   * @param extraProps - 运行时附加属性
   */
  const buildProps = (
    propsSchema: Record<string, unknown>,
    blockScope?: unknown | unknown[],
    extraProps?: Record<string, unknown>
  ): any => {
    // 属性预处理
    const processed: Record<string, unknown> = {};
    Object.keys(propsSchema).forEach((propKey) => {
      processProp(processed, propKey, propsSchema[propKey]);
    });

    // 将属性 schema 转化成真实的属性值
    const parsedProps: Record<string, unknown> = {};
    const mergedScope = blockScope ? mergeScope(props.scope, blockScope) : props.scope;
    Object.keys(propsSchema).forEach((propName) => {
      parsedProps[propName] = buildProp(
        processed[propName],
        mergedScope,
        blockScope,
        node?.getProp(propName)
      );
    });

    // 应用运行时附加的属性值
    if (extraProps) {
      Object.keys(extraProps).forEach((propKey) => {
        processProp(parsedProps, propKey, extraProps[propKey]);
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
      updateLoopArg(value: string | [string, string], idx?: number): void {
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
      /**
       * 更新所有循环参数
       *
       * @example
       *
       * updateLoopArg(['item', 'index'])
       *
       * @param value - 新的参数
       */
      updateLoopArg(value: [string, string]): void;
      /**
       * 更新指定参数
       *
       * @example
       *
       * updateLoopArg('item', 0);
       *
       * @param value - 新的参数
       * @param idx - 参数的位置
       */
      updateLoopArg(value: string, idx?: number | string): void;
    };
  };

  /**
   * 装饰默认插槽，当插槽为空时，渲染插槽占位符，便于拖拽
   *
   * @param slot - 插槽渲染函数
   */
  const decorateDefaultSlot = (slot: Slot): Slot => {
    return (...args: unknown[]) => {
      const vnodes = slot(...args);
      if (!vnodes.length) {
        vnodes.push(h('div', { class: 'lc-container' }));
      }
      return vnodes;
    };
  };

  /**
   * 构建所有插槽 schema，将 schema 构建成 slot 函数
   * @param slots - 插槽 schema
   * @param blockScope - 插槽块级作用域
   */
  const buildSlost = (slots: SlotSchemaMap, blockScope?: unknown | unknown[]): Slots => {
    return Object.keys(slots).reduce((prev, next) => {
      const slotSchema = slots[next];
      if (!slotSchema) return prev;

      const renderSlot = (...args: unknown[]) => {
        const vnodes: VNode[] = [];
        if (Array.isArray(slotSchema)) {
          // 插槽为数组，证明当前插槽不可拖拽编辑，直接渲染插槽内容
          slotSchema.forEach((item) => {
            const vnode = renderComp(item, blockScope);
            vnode && vnodes.push(vnode);
          });
        } else if (slotSchema.id) {
          // 存在 slot id，证明当前插槽可拖拽编辑，渲染 Hoc
          const slotParams = slotSchema.params ?? [];
          const vnode = renderComp(slotSchema, [
            blockScope,
            parseSlotParams(args, slotParams),
          ]);
          vnode && vnodes.push(vnode);
        } else {
          // 不存在 slot id，插槽不可拖拽编辑，直接渲染插槽内容
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
          ? decorateDefaultSlot(renderSlot) // 当节点为容器节点，且为设计模式下，则装饰默认插槽
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
    const hook = LIFTCYCLES_MAP[lifeCycle as keyof typeof LIFTCYCLES_MAP];
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

  /**
   * 添加属性到作用域，若属性为 ref，则添加到 data 中，否则添加到 ctx 中
   *
   * @param source - 作用域属性来源
   */
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
