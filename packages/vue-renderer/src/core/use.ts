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
  toRaw,
  toDisplayString,
  inject,
  InjectionKey,
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
import { isNil, isString, camelCase, pickBy, isFunction } from 'lodash-es';
import {
  getCurrentNodeKey,
  getRendererContextKey,
  useRendererContext,
} from '@knxcloud/lowcode-hooks';
import { LeafProps, RendererProps } from './base';
import { Hoc } from './hoc';
import { Live } from './live';
import {
  isObject,
  ensureArray,
  getI18n,
  mergeScope,
  parseSchema,
  parseSlotScope,
  parseExpression,
} from '../utils';
import { createDataSourceManager } from '../data-source';
import { MaybeArray, BlockScope, RuntimeScope } from '../utils';

const currentNodeKey = getCurrentNodeKey();

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

export function isLifecycleKey(key: string): key is keyof typeof LIFTCYCLES_MAP {
  return key in LIFTCYCLES_MAP;
}

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

const IS_LOCKED: InjectionKey<Ref<boolean>> = Symbol('IS_LOCKED');

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

export function useLeaf(props: LeafProps) {
  const { components, getNode, designMode } = useRendererContext();

  const node = props.schema.id ? getNode(props.schema.id) : null;
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
    blockScope?: MaybeArray<BlockScope | undefined | null>,
    comp?: Component
  ) => {
    const mergedScope = mergeScope(props.scope, blockScope);

    // 若 schema 不为 NodeSchema，则直接渲染
    if (isString(schema)) {
      return createTextVNode(schema);
    } else if (isJSExpression(schema)) {
      const result = parseExpression(schema, mergedScope);
      return createTextVNode(toDisplayString(result));
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
    blockScope?: MaybeArray<BlockScope | undefined | null>,
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
    blockScope?: MaybeArray<BlockScope | undefined | null>,
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
   * @param scope - 当前作用域
   * @param blockScope - 当前块级作用域
   * @param prop - 属性对象，仅在 design 模式下有值
   */
  const buildProp = (
    schema: unknown,
    scope: RuntimeScope,
    blockScope?: BlockScope | null,
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
        const slotScope = parseSlotScope(args, slotParams);
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
    } else if (schema && isObject(schema)) {
      // 属性值为 object，递归处理属性的每一项
      const res: Record<string, unknown> = {};
      Object.keys(schema).forEach((key) => {
        if (key.startsWith('__')) return;
        const val = schema[key];
        const childProp = prop?.get(key);
        res[key] = buildProp(val, scope, blockScope, childProp);
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
    prop?: Prop | null
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
          if (!Array.isArray(target)) {
            target = refs[field] = [];
            if (field in scope) {
              target = scope[field] = target;
            }
          } else if (field in scope) {
            const scopeTarget = scope[field];
            if (!Array.isArray(scopeTarget) || toRaw(scopeTarget) !== target) {
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
      const propValue = buildProp(schema, scope, blockScope, prop);
      return isString(propValue)
        ? buildRefProp(propValue, scope, blockScope, prop)
        : propValue;
    }
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
   * 构建属性，将整个属性 schema 转化为真实的属性值
   * @param propsSchema - 属性 schema
   * @param blockScope - 当前块级作用域
   * @param extraProps - 运行时附加属性
   */
  const buildProps = (
    propsSchema: Record<string, unknown>,
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
    const mergedScope = blockScope ? mergeScope(props.scope, blockScope) : props.scope;
    Object.keys(processed).forEach((propName) => {
      const schema = processed[propName];
      parsedProps[propName] =
        propName === 'ref'
          ? buildRefProp(schema, mergedScope, blockScope, node?.getProp(propName))
          : buildProp(schema, mergedScope, blockScope, node?.getProp(propName));
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
      loop: computed(() => {
        if (!loop.value) return null;
        return parseSchema(loop.value, props.scope);
      }),
      loopArgs,
      updateLoop(value: CompositeValue): void {
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
      buildLoopScope(item, index, len): BlockScope {
        const scope = props.scope;
        const offset = scope.__loopRefOffset ?? 0;
        const [itemKey, indexKey] = loopArgs.value;
        return {
          [itemKey]: item,
          [indexKey]: index,
          __loopScope: true,
          __loopRefIndex: offset + index,
          __loopRefOffset: len * index,
        };
      },
    } as {
      loop: ComputedRef<unknown>;
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
      /**
       * 构建循环局部作用域
       *
       * @param item - 循环项
       * @param index - 循环索引
       * @param len - 循环目标数组长度
       */
      buildLoopScope(item: unknown, index: number, len: number): BlockScope;
    };
  };

  const buildShow = (schema: NodeSchema) => {
    const hidden = isDesignMode ? ref(schema.hidden ?? false) : ref(false);
    const condition = ref<unknown>(schema.condition ?? true);

    const show = computed(() => {
      if (hidden.value) return false;
      const { value: showCondition } = condition;
      if (typeof showCondition === 'boolean') return showCondition;
      return !!parseSchema(showCondition, props.scope);
    });

    return {
      show,
      hidden: (val: boolean) => {
        hidden.value = val;
      },
      condition: (val: unknown) => {
        condition.value = val;
      },
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
        const isLocked = locked.value;
        const className = {
          'lc-container-locked': isLocked,
          'lc-container-placeholder': true,
        };
        const placeholder = isLocked
          ? '锁定元素及子元素无法编辑'
          : '拖拽组件或模板到这里';
        vnodes.push(h('div', { class: className }, placeholder));
      }
      return vnodes;
    };
  };

  /**
   * 构建所有插槽 schema，将 schema 构建成 slot 函数
   * @param slots - 插槽 schema
   * @param blockScope - 插槽块级作用域
   */
  const buildSlots = (slots: SlotSchemaMap, blockScope?: BlockScope | null): Slots => {
    return Object.keys(slots).reduce((prev, next) => {
      const slotSchema = slots[next];
      const isDefaultSlot = next === 'default';

      // 插槽数据为 null 或 undefined 时不渲染插槽
      if (isNil(slotSchema)) return prev;

      // 默认插槽内容为空，且当前节点不是容器节点时，不渲染默认插槽
      if (
        isDefaultSlot &&
        !node?.isContainer() &&
        Array.isArray(slotSchema) &&
        slotSchema.length === 0
      )
        return prev;

      let renderSlot: Slot;

      if (Array.isArray(slotSchema)) {
        // 插槽为数组，则当前插槽不可拖拽编辑，直接渲染插槽内容
        renderSlot = () => {
          return slotSchema
            .map((item) => renderComp(item, blockScope))
            .filter((vnode): vnode is VNode => !isNil(vnode));
        };
      } else if (slotSchema.id) {
        // 存在 slot id，则当前插槽可拖拽编辑，渲染 Hoc
        renderSlot = (...args: unknown[]) => {
          const vnode = renderComp(slotSchema, [
            blockScope,
            parseSlotScope(args, slotSchema.params ?? []),
          ]);
          return isNil(vnode) ? [] : [vnode];
        };
      } else {
        // 不存在 slot id，插槽不可拖拽编辑，直接渲染插槽内容
        renderSlot = (...args: unknown[]) => {
          const slotScope = parseSlotScope(args, slotSchema.params ?? []);
          return ensureArray(slotSchema.children)
            .map((item) => renderComp(item, [blockScope, slotScope]))
            .filter((vnode): vnode is VNode => !isNil(vnode));
        };
      }

      prev[next] =
        isDefaultSlot && isDesignMode && node?.isContainer()
          ? decorateDefaultSlot(renderSlot) // 当节点为容器节点，且为设计模式下，则装饰默认插槽
          : renderSlot;

      return prev;
    }, {} as Record<string, Slot>);
  };

  return {
    node,
    locked,
    buildShow,
    renderComp,
    buildLoop,
    buildProps,
    buildSlots,
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

  const contextKey = getRendererContextKey();

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
  const scope = instance.proxy! as RuntimeScope;
  const data = (instance.data = reactive({} as Record<string, unknown>));

  // 处理 props
  const props = parseSchema(propsSchema) ?? {};
  Object.assign(instance.props, props);

  // 处理 state
  const states = parseSchema(stateSchema) ?? {};
  Object.assign(data, states);

  // 处理 methods
  const methods = parseSchema(methodsSchema, scope) ?? {};
  Object.assign(scope, methods);

  // 处理 lifecycle
  const lifeCycles = parseSchema(lifeCyclesSchema, scope);
  if (isObject(lifeCycles)) {
    Object.keys(lifeCycles).forEach((lifeCycle) => {
      if (isLifecycleKey(lifeCycle)) {
        const callback = lifeCycles[lifeCycle];
        const hook = LIFTCYCLES_MAP[lifeCycle];
        isFunction(callback) && hook(callback, instance);
      }
    });
  }

  // 处理 css
  let style: HTMLStyleElement | null = null;
  if (schema.id) {
    style = document.querySelector(`style[data-id="${schema.id}"]`);
  }
  if (schema.css) {
    if (!style) {
      style = document.createElement('style');
      if (schema.id) {
        style.setAttribute('data-id', schema.id);
      }
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
  const addToScope = (source: BlockScope) => {
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
