import {
  Component,
  h,
  VNode,
  shallowRef,
  createTextVNode,
  computed,
  ref,
  Ref,
  ComputedRef,
} from 'vue';
import {
  isJSExpression,
  CompositeValue,
  isJSSlot,
  NodeData,
  NodeSchema,
  TransformStage,
  JSFunction,
  isJSFunction,
} from '@alilc/lowcode-types';
import { isString, isNil, camelCase } from 'lodash-es';
import { useRendererContext } from '../context';
import { RendererProps } from './base';
import { Hoc } from './hoc';
import { Live } from './live';
import { ensureArray, mergeScope, parseSchema } from '../utils';
import { SlotNode } from '@alilc/lowcode-designer';

export function useRenderer(props: RendererProps) {
  const { components, scope, getNode, designMode } = useRendererContext();

  const node = getNode(props.schema.id!);

  const isDesignMode = designMode === 'design';

  const children = shallowRef<any[]>([]);

  const render = (schema: NodeData, Base: Component, Comp?: Component) => {
    if (isString(schema)) {
      return createTextVNode(schema);
    } else if (isJSExpression(schema)) {
      const result = parseSchema(schema, scope);
      if (result == null) {
        return null;
      } else if (isString(result)) {
        return createTextVNode(result);
      } else {
        return h(result);
      }
    }
    if (!Comp) {
      const { componentName } = schema;
      Comp = components[componentName];
    }
    return h(Base, {
      comp: Comp,
      id: schema.id!,
      key: schema.id,
      schema: schema,
    } as any);
  };

  const renderHoc = (nodeSchema: NodeData, Comp?: Component): VNode | null => {
    return render(nodeSchema, Hoc, Comp);
  };

  const renderLive = (nodeSchema: NodeData, Comp?: Component): VNode | null => {
    return render(nodeSchema, Live, Comp);
  };

  const renderComp = isDesignMode ? renderHoc : renderLive;

  const createSlot = (slotNode: SlotNode) => {
    const schema = slotNode.export(TransformStage.Render);
    return () => renderComp(schema);
  };

  const createChildren = (nodeSchema: undefined | NodeData | NodeData[]) => {
    children.value = ensureArray(nodeSchema);

    return () => {
      if (children.value.length) return children.value.map((item) => renderComp(item));
      if (isDesignMode && node?.isContainer()) return h('div', { class: 'lc-container' });
      return null;
    };
  };

  const buildSchema = () => {
    const { schema } = props;

    const slotProps: any = {};
    const normalProps: any = {};

    slotProps.default = createChildren(schema.children);

    Object.entries(schema.props ?? {}).forEach(([key, val]) => {
      if (isJSSlot(val) && val.value) {
        const children = val.value;
        slotProps[key] = () => ensureArray(children).map((item) => renderComp(item));
      } else if (key === 'className') {
        normalProps.class = val;
      } else if (key === 'children') {
        slotProps.default = createChildren(val as NodeData);
      } else {
        normalProps[key] = val;
      }
    });

    return { props: normalProps, slots: slotProps };
  };

  const buildProps = (props: any, blockScope?: Record<string, any>) => {
    // 属性预处理
    const processed = Object.keys(props).reduce((prev, next) => {
      const val = props[next];
      if (next.startsWith('v-model')) {
        // 双向绑定逻辑
        const matched = next.match(/v-model(?::(\w+))?$/);
        if (!matched) return prev;

        const valueProp = camelCase(matched[1] ?? 'modelValue');
        const eventProp = `onUpdate:${valueProp}`;
        if (isJSExpression(val)) {
          const updateEventFn: JSFunction = {
            type: 'JSFunction',
            value: `function ($event) {${val.value} = $event}`,
          };
          prev[eventProp] =
            eventProp in prev
              ? ensureArray(prev[eventProp]).concat(updateEventFn)
              : updateEventFn;
        }
        prev[valueProp] = val;
      } else if (next.startsWith('v-') && isJSExpression(val)) {
        // TODO: 指令绑定逻辑
      } else if (next.match(/^on[A-Z]/) && isJSFunction(val)) {
        // 事件绑定逻辑

        // normalize: onUpdateXxx => onUpdate:xxx
        const matched = next.match(/onUpdate(?::?(\w+))$/);
        if (matched) {
          next = `onUpdate:${camelCase(matched[1])}`;
        }

        // 若事件名称重复，则自动转化为数组
        prev[next] = next in prev ? ensureArray(prev[next]).concat(val) : val;
      } else {
        prev[next] = val;
      }
      return prev;
    }, {} as Record<string, any>);

    return parseSchema(processed, mergeScope(scope, blockScope));
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
        return parseSchema(loop.value, scope);
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

  return {
    renderComp,
    createSlot,
    createChildren,
    buildLoop,
    buildProps,
    buildSchema,
  };
}
