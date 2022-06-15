import {
  Component,
  h,
  VNode,
  shallowRef,
  triggerRef,
  createTextVNode,
  computed,
  ref,
  Ref,
  ComputedRef,
} from 'vue';
import {
  CompositeValue,
  isJSExpression,
  isJSSlot,
  NodeData,
  NodeSchema,
  TransformStage,
} from '@alilc/lowcode-types';
import { Node, Prop } from '@alilc/lowcode-designer';
import { isString, isArray, isNil } from 'lodash-es';
import { useRendererContext } from '../context';
import { RendererProps } from './base';
import { Hoc } from './hoc';
import { Live } from './live';
import { mergeScope, parseSchema } from '../utils';

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

  const createSlot = (prop: Prop) => {
    const schema = prop.slotNode.export(TransformStage.Render);
    return () => {
      return h(Hoc, {
        id: schema.id!,
        key: schema.id,
        schema: schema,
      });
    };
  };

  const createChildren = (nodeSchema: undefined | NodeData | NodeData[]) => {
    if (nodeSchema) {
      children.value = Array.isArray(nodeSchema) ? nodeSchema : [nodeSchema];
    }
    return () => {
      if (children.value.length) return children.value.map((item) => renderComp(item));

      if (isDesignMode && node?.isContainer()) return h('div', { class: 'lc-container' });
      return null;
    };
  };

  const insertNode = (node: Node<NodeSchema>) => {
    const { componentName, nextSibling } = node;
    const Comp = components[componentName];
    if (Comp) {
      children.value = children.value.filter((item) => item?.key !== node.id);
      const idx = !nextSibling
        ? children.value.length
        : children.value.findIndex((item) => item?.key === nextSibling.id);
      children.value.splice(idx, 0, node.schema);
      triggerRef(children);
    }
  };

  const removeNode = (node: Node<NodeSchema>) => {
    const { id } = node;
    children.value = children.value.filter((item) => id !== item.id);
    triggerRef(children);
  };

  const buildSchema = () => {
    const { schema } = props;

    const slotProps: any = {};
    const normalProps: any = {};

    slotProps.default = createChildren(schema.children);

    Object.entries(schema.props ?? {}).forEach(([key, val]) => {
      if (isJSSlot(val) && val.value) {
        const children = val.value;
        slotProps[key] = () =>
          Array.isArray(children)
            ? children.map((item) => renderComp(item))
            : renderComp(children);
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
    const mergedScope = mergeScope(scope, blockScope);
    return parseSchema(props, mergedScope);
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
        if (isArray(value)) {
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
      updateLoopArg(value: string, idx?: string): void;
    };
  };

  return {
    insertNode,
    removeNode,
    createSlot,
    createChildren,
    renderComp,
    buildLoop,
    buildProps,
    buildSchema,
  };
}
