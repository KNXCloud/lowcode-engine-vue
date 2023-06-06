import {
  type Component,
  type VNode,
  type Ref,
  type Slot,
  type Slots,
  type InjectionKey,
  type ComponentPublicInstance,
  type VNodeChild,
  Comment,
  Fragment,
  createCommentVNode,
  h,
  createTextVNode,
  computed,
  ref,
  getCurrentInstance,
  onBeforeMount,
  onBeforeUnmount,
  onBeforeUpdate,
  onErrorCaptured,
  onMounted,
  onUnmounted,
  onUpdated,
  provide,
  toRaw,
  toDisplayString,
  inject,
  isVNode,
  mergeProps,
  onActivated,
  onDeactivated,
  onRenderTracked,
  onRenderTriggered,
  onServerPrefetch,
} from 'vue';
import type {
  IPublicTypeNodeData as NodeData,
  IPublicTypeSlotSchema as SlotSchema,
  IPublicTypeNodeSchema as NodeSchema,
  IPublicTypeJSFunction as JSFunction,
  IPublicTypeCompositeValue as CompositeValue,
} from '@alilc/lowcode-types';
import { leafPropKeys, type LeafProps, type RendererProps } from './base';
import {
  type BlockScope,
  type RuntimeScope,
  SchemaParser,
  warnOnce,
  warn,
} from '../utils';
import { INode, getCurrentNodeKey, useRendererContext } from '@knxcloud/lowcode-hooks';
import {
  camelCase,
  isNil,
  isString,
  isFunction,
  isJSExpression,
  isNodeSchema,
  isObject,
  isJSSlot,
  isJSFunction,
  isSlotSchema,
  fromPairs,
  isPromise,
  toString,
  createObjectSpliter,
  isArray,
  isI18nData,
} from '@knxcloud/lowcode-utils';
import { Hoc } from './leaf/hoc';
import { Live } from './leaf/live';
import { ensureArray, getI18n, mergeScope, AccessTypes, addToScope } from '../utils';
import { create as createDataSourceEngine } from '../data-source';
import { createHookCaller } from './lifecycles';

const currentNodeKey = getCurrentNodeKey();

const VUE_LIFTCYCLES_MAP = {
  beforeMount: onBeforeMount,
  mounted: onMounted,
  beforeUpdate: onBeforeUpdate,
  updated: onUpdated,
  activated: onActivated,
  deactivated: onDeactivated,
  beforeUnmount: onBeforeUnmount,
  renderTracked: onRenderTracked,
  renderTriggered: onRenderTriggered,
  unmounted: onUnmounted,
  errorCaptured: onErrorCaptured,
  serverPrefetch: onServerPrefetch,
};

// 适配 react lifecycle
const REACT_ADATPOR_LIFTCYCLES_MAP = {
  componentDidMount: onMounted,
  componentDidCatch: onErrorCaptured,
  shouldComponentUpdate: onBeforeUpdate,
  componentWillUnmount: onBeforeUnmount,
} as const;

const LIFTCYCLES_MAP = {
  ...VUE_LIFTCYCLES_MAP,
  ...REACT_ADATPOR_LIFTCYCLES_MAP,
};

export function isFragment(val: unknown): val is typeof Fragment {
  return val === Fragment;
}

export function isLifecycleKey(key: string): key is keyof typeof LIFTCYCLES_MAP {
  return key in LIFTCYCLES_MAP;
}

export function isVueLifecycleKey(key: string): key is keyof typeof VUE_LIFTCYCLES_MAP {
  return key in VUE_LIFTCYCLES_MAP;
}

export function isReactLifecycleKey(
  key: string
): key is keyof typeof REACT_ADATPOR_LIFTCYCLES_MAP {
  return key in REACT_ADATPOR_LIFTCYCLES_MAP;
}

export function pickLifeCycles(lifeCycles: unknown) {
  const res: Record<string, unknown> = {};
  if (isObject(lifeCycles)) {
    for (const key in lifeCycles) {
      if (key in LIFTCYCLES_MAP) {
        res[key] = lifeCycles[key];
      }
    }
  }
  return res;
}

export type RenderComponent = (
  nodeSchema: NodeData,
  scope: RuntimeScope,
  comp?: Component | typeof Fragment
) => VNode | VNode[] | null;

export type SlotSchemaMap = {
  [x: string]: unknown;
};

export type PropSchemaMap = {
  [x: string]: unknown;
};

export function isVueComponent(val: unknown): val is Component {
  if (isFunction(val)) return true;
  if (isObject(val) && ('render' in val || 'setup' in val)) {
    return true;
  }
  return false;
}

const IS_LOCKED: InjectionKey<Ref<boolean>> = Symbol('IS_LOCKED');
const IS_ROOT_NODE: InjectionKey<boolean> = Symbol('IS_ROOT_NODE');

export function useLocked(defaultValue: boolean) {
  const selfLocked = ref(defaultValue);
  const parentLocked = inject(IS_LOCKED, null);

  const locked = computed({
    get: () => parentLocked?.value || selfLocked.value,
    set: (val) => (selfLocked.value = val),
  });

  provide(IS_LOCKED, locked);

  return locked;
}

export function useIsRootNode(isRootNode: boolean | null) {
  if (isRootNode) {
    provide(IS_ROOT_NODE, true);
  } else {
    isRootNode = inject(IS_ROOT_NODE, null);
    if (isRootNode == null) {
      provide(IS_ROOT_NODE, (isRootNode = true));
    } else if (isRootNode) {
      provide(IS_ROOT_NODE, false);
    }
  }

  return isRootNode;
}

export function useLeaf(
  leafProps: LeafProps,
  onChildShowChange: (schema: NodeSchema, show: boolean) => void = () => void 0
) {
  const renderContext = useRendererContext();
  const { getNode, wrapLeafComp, designMode, thisRequiredInJSE } = renderContext;
  const parser = new SchemaParser({
    thisRequired: thisRequiredInJSE,
  });

  const node = leafProps.__schema.id ? getNode(leafProps.__schema.id) : null;
  // 仅在设计模式下生效
  const locked = node ? useLocked(node.isLocked) : ref(false);

  const isDesignMode = designMode === 'design';

  provide(currentNodeKey, {
    mode: designMode,
    node: node,
    isDesignerEnv: isDesignMode,
  });

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
    scope: RuntimeScope,
    comp?: Component | typeof Fragment
  ): VNode | VNode[] | null => {
    // 若 schema 不为 NodeSchema，则直接渲染
    if (isString(schema)) {
      return createTextVNode(schema);
    } else if (isNil(schema)) {
      return null;
    } else if (!isNodeSchema(schema)) {
      const result = parser.parseSchema(schema, scope);
      return createTextVNode(toDisplayString(result));
    }

    const { show, scence } = buildShow(schema, scope, isDesignMode);
    if (!show) {
      return createCommentVNode(`${scence} ${show}`);
    }

    const node = schema.id ? getNode(schema.id) : null;

    // 若不传入 comp，则根据节点的 componentName 推断
    const { componentName } = schema;
    if (!comp) {
      comp = renderContext.components[componentName];

      if (!comp) {
        if (componentName === 'Slot') {
          return ensureArray(schema.children)
            .flatMap((item) => render(item, base, scope))
            .filter((item): item is VNode => !isNil(item));
        }

        if (isDesignMode) {
          return h('div', `component[${componentName}] not found`);
        }

        comp = {
          setup(props, { slots }) {
            warnOnce('组件未找到, 组件名：' + componentName);
            return h(
              'div',
              mergeProps(props, { class: 'lc-component-not-found' }),
              slots
            );
          },
        };
      }
    }

    // 应用节点组件的私有属性，适配 naive-ui 的 grid,popover 等组件
    base = wrapLeafComp(componentName, comp, base);

    const ref = (inst: ComponentPublicInstance) => {
      renderContext.triggerCompGetCtx(schema, inst);
    };

    const { props: rawProps, slots: rawSlots } = buildSchema(schema);
    const { loop, buildLoopScope } = buildLoop(schema, scope);
    if (!loop) {
      const props = buildProps(rawProps, scope, node, null, { ref });
      const [vnodeProps, compProps] = splitProps(props);
      return h(
        base,
        {
          key: vnodeProps.key ?? schema.id,
          __comp: comp,
          __scope: scope,
          __schema: schema,
          __vnodeProps: vnodeProps,
          ...compProps,
        },
        buildSlots(rawSlots, scope, node)
      );
    }

    if (!isArray(loop)) {
      warn('循环对象必须是数组, type: ' + toString(loop));
      return null;
    }

    return loop.map((item, index, arr) => {
      const blockScope = buildLoopScope(item, index, arr.length);
      const props = buildProps(rawProps, scope, node, blockScope, { ref });
      const [vnodeProps, compProps] = splitProps(props);
      const mergedScope = mergeScope(scope, blockScope);
      return h(
        base,
        {
          key: vnodeProps.key ?? `${schema.id}--${index}`,
          __comp: comp,
          __scope: mergedScope,
          __schema: schema,
          __vnodeProps: vnodeProps,
          ...compProps,
        },
        buildSlots(rawSlots, mergedScope, node)
      );
    });
  };

  /**
   * 渲染节点vnode (design 模式)
   * @param nodeSchema - 节点 schema
   * @param blockScope - 节点块级作用域
   * @param comp - 节点渲染的组件，若不传入，则根据节点的 componentName 推断
   */
  const renderHoc: RenderComponent = (nodeSchema, blockScope, comp) => {
    const vnode = render(nodeSchema, Hoc, blockScope, comp);

    if (isNodeSchema(nodeSchema) && isVNode(vnode)) {
      if (vnode.type === Comment) {
        onChildShowChange(nodeSchema, false);
      } else {
        onChildShowChange(nodeSchema, true);
      }
    }

    return vnode;
  };

  /**
   * 渲染节点vnode (live 模式)
   * @param nodeSchema - 节点 schema
   * @param blockScope - 节点块级作用域
   * @param comp - 节点渲染的组件，若不传入，则根据节点的 componentName 推断
   */
  const renderLive: RenderComponent = (nodeSchema, blockScope, comp) => {
    return render(nodeSchema, Live, blockScope, comp);
  };

  /**
   * 渲染组件
   */
  const renderComp: RenderComponent = isDesignMode ? renderHoc : renderLive;

  /**
   * 构建所有插槽 schema，将 schema 构建成 slot 函数
   * @param slots - 插槽 schema
   * @param blockScope - 插槽块级作用域
   */
  const buildSlots = (
    slots: SlotSchemaMap,
    scope: RuntimeScope,
    node?: INode | null
  ): Slots => {
    return Object.keys(slots).reduce((prev, next) => {
      let slotSchema = slots[next];
      const isDefaultSlot = next === 'default';

      // 插槽数据为 null 或 undefined 时不渲染插槽
      if (isNil(slotSchema) && !isDefaultSlot) return prev;

      // 默认插槽内容为空，且当前节点不是容器节点时，不渲染默认插槽
      if (
        isDefaultSlot &&
        !node?.isContainerNode &&
        ((isArray(slotSchema) && slotSchema.length === 0) || isNil(slotSchema))
      )
        return prev;

      let renderSlot: Slot;

      if (isArray(slotSchema) && slotSchema.length === 0) {
        slotSchema = slotSchema[0];
      }

      if (isArray(slotSchema)) {
        // 插槽为数组，则当前插槽不可拖拽编辑，直接渲染插槽内容
        renderSlot = keepParam(slotSchema, (schema) => () => {
          return schema
            .map((item) => renderComp(item, scope))
            .filter((vnode): vnode is VNode => !isNil(vnode));
        });
      } else if (isSlotSchema(slotSchema)) {
        renderSlot = keepParam(slotSchema, (schema) => (...args: unknown[]) => {
          const vnode = renderComp(
            schema,
            mergeScope(scope, parser.parseSlotScope(args, schema.params ?? []))
          );
          return ensureArray(vnode);
        });
      } else {
        renderSlot = keepParam(
          slotSchema as NodeData,
          (schema) => () => ensureArray(renderComp(schema, scope))
        );
      }

      prev[next] =
        isDefaultSlot && isDesignMode && node?.isContainerNode
          ? decorateDefaultSlot(renderSlot, locked) // 当节点为容器节点，且为设计模式下，则装饰默认插槽
          : renderSlot;

      return prev;
    }, {} as Record<string, Slot>);
  };

  /**
   * 将单个属性 schema 转化成真实值
   *
   * @param schema - 属性 schema
   * @param scope - 当前作用域
   * @param blockScope - 当前块级作用域
   * @param prop - 属性对象，仅在 design 模式下有值
   */
  const buildNormalProp = (
    schema: unknown,
    scope: RuntimeScope,
    blockScope?: BlockScope | null,
    path?: string | null,
    node?: INode | null
  ): any => {
    const prop = path ? node?.getProp(path, false) : null;
    if (isJSExpression(schema) || isJSFunction(schema)) {
      // 处理表达式和函数
      return parser.parseExpression(schema, scope);
    } else if (isI18nData(schema)) {
      return parser.parseI18n(schema, scope);
    } else if (isJSSlot(schema)) {
      // 处理属性插槽
      let slotParams: string[];
      let slotSchema: NodeData[] | NodeSchema | SlotSchema;
      if (prop?.slotNode) {
        // design 模式，从 prop 中导出 schema
        slotSchema = prop.slotNode.schema;
        slotParams = isSlotSchema(slotSchema) ? slotSchema.params ?? [] : [];
      } else {
        // live 模式，直接获取 schema 值
        slotSchema = ensureArray(schema.value);
        slotParams = schema.params ?? [];
      }

      // 返回 slot 函数
      return (...args: unknown[]) => {
        const slotScope = parser.parseSlotScope(args, slotParams);
        const vnodes: VNode[] = [];
        ensureArray(slotSchema).forEach((item) => {
          const vnode = renderComp(item, mergeScope(scope, blockScope, slotScope));
          ensureArray(vnode).forEach((item) => vnodes.push(item));
        });
        return vnodes;
      };
    } else if (isArray(schema)) {
      // 属性值为 array，递归处理属性的每一项
      return schema.map((item, idx) =>
        buildNormalProp(item, scope, blockScope, `${path}.${idx}`, node)
      );
    } else if (schema && isObject(schema)) {
      // 属性值为 object，递归处理属性的每一项
      const res: Record<string, unknown> = {};
      Object.keys(schema).forEach((key) => {
        if (key.startsWith('__')) return;
        const val = schema[key];
        res[key] = buildNormalProp(val, scope, blockScope, `${path}.${key}`, node);
      });
      return res;
    }
    return schema;
  };

  /**
   * 构建 ref prop，将 string ref 其转化为 function
   *
   * @param schema - prop schema
   * @param scope - 当前作用域
   * @param blockScope - 当前块级作用域
   * @param prop - 属性对象，仅在 design 模式下有值
   */
  const buildRefProp = (
    schema: unknown,
    scope: RuntimeScope,
    blockScope?: BlockScope | null,
    path?: string | null,
    node?: INode | null
  ): any => {
    if (isString(schema)) {
      const field = schema;
      let lastInst: unknown = null;
      return (inst: unknown): void => {
        let refs = scope.$.refs;
        if (Object.keys(refs).length === 0) {
          refs = scope.$.refs = {};
        }
        if (isNil(scope.__loopRefIndex)) {
          refs[field] = inst;
          if (field in scope) {
            scope[field] = inst;
          }
        } else {
          let target = refs[field] as unknown[];
          if (!isArray(target)) {
            target = refs[field] = [];
            if (field in scope) {
              target = scope[field] = target;
            }
          } else if (field in scope) {
            const scopeTarget = scope[field];
            if (!isArray(scopeTarget) || toRaw(scopeTarget) !== target) {
              target = scope[field] = target;
            } else {
              target = scopeTarget;
            }
          }
          if (isNil(inst)) {
            const idx = target.indexOf(lastInst);
            idx >= 0 && target.splice(idx, 1);
          } else {
            target[scope.__loopRefIndex] = inst;
          }
        }
        lastInst = inst;
      };
    } else {
      const propValue = buildNormalProp(schema, scope, blockScope, path, node);
      return isString(propValue)
        ? buildRefProp(propValue, scope, blockScope, path, node)
        : propValue;
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
    scope: RuntimeScope,
    node?: INode | null,
    blockScope?: BlockScope | null,
    extraProps?: Record<string, unknown>
  ): any => {
    // 属性预处理
    const processed: Record<string, unknown> = {};
    Object.keys(propsSchema).forEach((propKey) => {
      processProp(processed, propKey, propsSchema[propKey]);
    });

    // 将属性 schema 转化成真实的属性值
    const parsedProps: Record<string, unknown> = {};
    const mergedScope = blockScope ? mergeScope(scope, blockScope) : scope;
    Object.keys(processed).forEach((propName) => {
      const schema = processed[propName];
      parsedProps[propName] =
        propName === 'ref'
          ? buildRefProp(schema, mergedScope, blockScope, propName, node)
          : buildNormalProp(schema, mergedScope, blockScope, propName, node);
    });

    // 应用运行时附加的属性值
    if (extraProps) {
      Object.keys(extraProps).forEach((propKey) => {
        processProp(parsedProps, propKey, extraProps[propKey]);
      });
    }

    return parsedProps;
  };

  const buildLoop = (schema: NodeSchema, scope: RuntimeScope) => {
    let loop: CompositeValue | null = null;
    const loopArgs = ['item', 'index'];

    if (schema.loop) loop = schema.loop;
    if (schema.loopArgs) {
      schema.loopArgs.forEach((v, i) => {
        loopArgs[i] = v;
      });
    }

    return {
      loop: loop ? parser.parseSchema(loop, scope) : null,
      loopArgs,
      buildLoopScope(item, index, len): BlockScope {
        const offset = scope.__loopRefOffset ?? 0;
        const [itemKey, indexKey] = loopArgs;
        return {
          [itemKey]: item,
          [indexKey]: index,
          __loopScope: true,
          __loopRefIndex: offset + index,
          __loopRefOffset: len * index,
        };
      },
    } as {
      loop: unknown;
      loopArgs: [string, string];
      buildLoopScope(item: unknown, index: number, len: number): BlockScope;
    };
  };

  const buildShow = (schema: NodeSchema, scope: RuntimeScope, isDesignMode: boolean) => {
    const hidden = isDesignMode ? schema.hidden ?? false : false;
    const condition = schema.condition ?? true;

    if (hidden) return { scence: 'hidden', show: false };
    return {
      scence: 'condition',
      show:
        typeof condition === 'boolean'
          ? condition
          : !!parser.parseSchema(condition, scope),
    };
  };

  return {
    node,
    locked,
    isRootNode: useIsRootNode(leafProps.__isRootNode),
    getNode,
    renderComp,
    buildProps,
    buildSlots,
  };
}

export function useRenderer(rendererProps: RendererProps, scope: RuntimeScope) {
  const schemaRef = computed(() => rendererProps.__schema);

  const leafProps: LeafProps = {
    __comp: null,
    __scope: scope,
    __isRootNode: true,
    __vnodeProps: {},
    __schema: rendererProps.__schema,
  };

  const designModeRef = computed(() => rendererProps.__designMode ?? 'live');
  const componentsRef = computed(() => rendererProps.__components);

  return { scope, schemaRef, designModeRef, componentsRef, ...useLeaf(leafProps) };
}

export function useRootScope(rendererProps: RendererProps, setupConext: object) {
  const { __schema: schema, __scope: extraScope, __parser: parser } = rendererProps;

  const {
    props: propsSchema,
    state: stateSchema,
    methods: methodsSchema,
    lifeCycles: lifeCyclesSchema,
  } = schema ?? {};

  // 将全局属性配置应用到 scope 中
  const instance = getCurrentInstance()!;
  const scope = instance.proxy as RuntimeScope;

  const callHook = createHookCaller(schema, scope, parser);

  callHook('initEmits');
  callHook('beforeCreate');

  // 处理 props
  callHook('initProps');
  if (propsSchema) {
    const props = parser.parseOnlyJsValue<object>(propsSchema);
    addToScope(scope, AccessTypes.PROPS, props);
  }

  const setupResult = callHook('setup', instance.props, setupConext);

  callHook('initInject');

  // 处理 methods
  if (methodsSchema) {
    const methods = parser.parseSchema(methodsSchema, scope);
    methods && addToScope(scope, AccessTypes.CONTEXT, methods);
  }

  // 处理 state
  callHook('initData');
  if (stateSchema) {
    const states = parser.parseSchema<object>(stateSchema);
    states && addToScope(scope, AccessTypes.DATA, states);
  }

  callHook('initComputed');
  callHook('initWatch');
  callHook('initProvide');

  // 处理 lifecycle
  const lifeCycles = parser.parseSchema(pickLifeCycles(lifeCyclesSchema), scope);
  if (Object.keys(lifeCycles).length > 0) {
    Object.keys(lifeCycles).forEach((lifeCycle) => {
      if (isLifecycleKey(lifeCycle)) {
        const callback = lifeCycles[lifeCycle];
        if (isFunction(callback)) {
          LIFTCYCLES_MAP[lifeCycle](callback, instance);
        }
      }
    });
  }

  // 处理 css
  handleStyle(schema.css, schema.id);

  // 处理 i18n
  const i18n = (key: string, values?: any) => {
    const { __locale: locale, __messages: messages } = rendererProps;
    return getI18n(key, values, locale, messages);
  };

  const currentLocale = computed(() => rendererProps.__locale);
  addToScope(scope, AccessTypes.CONTEXT, { i18n, $t: i18n });
  addToScope(scope, AccessTypes.DATA, { currentLocale });

  // 处理 dataSource
  const { dataSource, dataSourceMap, reloadDataSource, shouldInit } =
    createDataSourceEngine(
      schema.dataSource ?? { list: [], dataHandler: undefined },
      scope
    );
  const dataSourceData = Object.keys(dataSourceMap)
    .filter((key) => !(key in scope))
    .map((key) => [key, ref()]);
  addToScope(scope, AccessTypes.CONTEXT, { dataSource, dataSourceMap, reloadDataSource });
  addToScope(scope, AccessTypes.SETUP, fromPairs(dataSourceData));

  // 处理 renderer 额外传入的 scope
  if (extraScope) {
    addToScope(scope, AccessTypes.SETUP, extraScope);
  }

  callHook('created');

  const wrapRender = (render: () => VNodeChild | null) => {
    const promises: Promise<unknown>[] = [];
    isPromise(setupResult) && promises.push(setupResult);
    shouldInit() && promises.push(reloadDataSource());
    return promises.length > 0 ? Promise.all(promises).then(() => render) : render;
  };

  // 初始化 loop ref states
  addToScope(scope, AccessTypes.CONTEXT, {
    __loopScope: false,
    __loopRefIndex: null,
    __loopRefOffset: 0,
  });

  return {
    scope: new Proxy({} as RuntimeScope, {
      get(_, p) {
        if (p === Symbol.toStringTag) {
          return '[object RuntimeScope]';
        }
        return Reflect.get(scope, p, scope);
      },
      set(_, p, newValue) {
        return Reflect.set(scope, p, newValue, scope);
      },
      has(_, p) {
        return Reflect.has(scope, p);
      },
      defineProperty(_, property, attributes) {
        return Reflect.defineProperty(scope, property, attributes);
      },
      ownKeys: () => {
        return Array.from(
          new Set([
            ...Reflect.ownKeys(scope.$.props),
            ...Reflect.ownKeys(scope.$.data),
            ...Reflect.ownKeys(scope.$.setupState),
            ...Reflect.ownKeys(scope.$.ctx),
          ])
        );
      },
    }),
    wrapRender,
  };
}

export function handleStyle(css: string | undefined, id: string | undefined) {
  // 处理 css
  let style: HTMLStyleElement | null = null;
  if (id) {
    style = document.querySelector(`style[data-id="${id}"]`);
  }
  if (css) {
    if (!style) {
      style = document.createElement('style');
      if (id) {
        style.setAttribute('data-id', id);
      }
      const head = document.head || document.getElementsByTagName('head')[0];
      head.appendChild(style);
    }
    if (style.innerHTML !== css) {
      style.innerHTML = css;
    }
  } else if (style) {
    style.parentElement?.removeChild(style);
  }
}

/**
 * 构建当前节点的 schema，获取 schema 的属性及插槽
 *
 * - node 的 children 会被处理成默认插槽
 * - 类型为 JSSlot 的 prop 会被处理为具名插槽
 * - prop 和 node 中同时存在 children 时，prop children 会覆盖 node children
 * - className prop 会被处理为 class prop
 */
export const buildSchema = (schema: NodeSchema, node?: INode | null) => {
  const slotProps: SlotSchemaMap = {};
  const normalProps: PropSchemaMap = {};

  // 处理节点默认插槽，可能会被属性插槽覆盖
  slotProps.default =
    isArray(schema.children) && schema.children.length === 1
      ? schema.children[0]
      : schema.children;

  const normalizeSlotKey = (key: string) => {
    return key === 'children' ? 'default' : key;
  };

  Object.entries(schema.props ?? {}).forEach(([key, val]) => {
    if (isJSSlot(val)) {
      // 处理具名插槽
      const prop = node?.getProp(key, false);
      if (prop && prop.slotNode) {
        // design 模式，从 prop 对象到处 schema
        const slotSchema = prop.slotNode.schema;
        if (isSlotSchema(slotSchema)) {
          slotProps[normalizeSlotKey(key)] = slotSchema;
        }
      } else if (val.value) {
        // live 模式，直接获取 schema 值，若值为空则不渲染插槽
        slotProps[normalizeSlotKey(key)] = {
          componentName: 'Slot',
          params: val.params,
          children: val.value,
        };
      }
    } else if (key === 'className') {
      // 适配 react className
      normalProps.class = val;
    } else if (key === 'children') {
      // 处理属性中的默认插槽，属性的重默认插槽会覆盖节点 chilren 插槽
      slotProps.default = val;
    } else {
      // 处理普通属性
      normalProps[key] = val;
    }
  });

  return { props: normalProps, slots: slotProps };
};

const keepParam = <T, R>(param: T, cb: (param: T) => R) => {
  return cb(param);
};

/**
 * 处理属性 schema，主要处理的目标：
 * - ref 逻辑 (合并 ref function)
 * - 事件绑定逻辑 (重复注册的事件转化为数组)
 * - 双向绑定逻辑 (v-model)
 * - 指令绑定逻辑 TODO
 * @param target - 组件属性目标对象
 * @param key - 属性名
 * @param val - 属性值
 */
const processProp = (target: Record<string, unknown>, key: string, val: unknown) => {
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
  } else if (key.startsWith('v-')) {
    // TODO: 指令绑定逻辑
  } else if (key.match(/^on[A-Z]/)) {
    // 事件绑定逻辑

    // normalize: onUpdateXxx => onUpdate:xxx
    const matched = key.match(/onUpdate(?::?(\w+))$/);
    if (matched) {
      key = `onUpdate:${camelCase(matched[1])}`;
    }

    // 若事件名称重复，则自动转化为数组
    target[key] = key in target ? ensureArray(target[key]).concat(val) : val;
  } else if (key === 'ref' && 'ref' in target) {
    // ref 合并逻辑
    const sourceRef = val;
    const targetRef = target.ref;
    if (isFunction(targetRef) && isFunction(sourceRef)) {
      target.ref = (...args: unknown[]) => {
        sourceRef(...args);
        targetRef(...args);
      };
    } else {
      target.ref = [targetRef, sourceRef].filter(isFunction).pop();
    }
  } else {
    target[key] = val;
  }
};

/**
 * 装饰默认插槽，当插槽为空时，渲染插槽占位符，便于拖拽
 *
 * @param slot - 插槽渲染函数
 */
const decorateDefaultSlot = (slot: Slot, locked: Ref<boolean>): Slot => {
  return (...args: unknown[]) => {
    const vnodes = slot(...args).filter(Boolean);
    if (!vnodes.length) {
      const isLocked = locked.value;
      const className = {
        'lc-container-locked': isLocked,
        'lc-container-placeholder': true,
      };
      const placeholder = isLocked ? '锁定元素及子元素无法编辑' : '拖拽组件或模板到这里';
      vnodes.push(h('div', { class: className }, placeholder));
    }
    return vnodes;
  };
};

const splitProps = createObjectSpliter(
  'key,ref,ref_for,ref_key,' +
    'onVnodeBeforeMount,onVnodeMounted,' +
    'onVnodeBeforeUpdate,onVnodeUpdated,' +
    'onVnodeBeforeUnmount,onVnodeUnmounted'
);

export const splitLeafProps = createObjectSpliter(leafPropKeys);
