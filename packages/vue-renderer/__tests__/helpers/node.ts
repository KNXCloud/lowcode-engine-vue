/* eslint-disable @typescript-eslint/no-unused-vars */
import type {
  IPublicEnumTransformStage,
  IPublicTypeComponentMetadata,
  IPublicTypeContainerSchema,
  IPublicTypeNodeSchema,
  IPublicTypeSlotSchema,
} from '@alilc/lowcode-types';
import * as uuid from 'uuid';
import { INode } from '@knxcloud/lowcode-hooks';
import { set, get, cloneDeep } from 'lodash';
import { isArray, isNodeSchema, isString } from '@knxcloud/lowcode-utils';
import { Ref, shallowRef } from 'vue';

const internalPropsRegexp = /^__(\w+)__$/;

export function createNode(
  rootSchema: Ref<IPublicTypeContainerSchema | IPublicTypeSlotSchema>,
  schemaPath: string | undefined,
  meta: Partial<IPublicTypeComponentMetadata> = {},
  nodeMaps: Record<string | number, INode | null> = {}
): INode {
  const visibleChange: CallableFunction[] = [];
  const propChangeCbs: CallableFunction[] = [];
  const childrenChangeCbs: CallableFunction[] = [];
  return {
    get id() {
      return this.schema.id;
    },
    get schema() {
      return schemaPath == null ? rootSchema.value : get(rootSchema.value, schemaPath);
    },
    get isContainerNode() {
      return Array.isArray(meta.configure)
        ? false
        : !!meta.configure?.component?.isContainer;
    },
    getProp(path: string | number, createIfNode?: boolean) {
      const value = get(this.schema.props ?? {}, path);
      if (value.type === 'JSSlot') {
        let slotNode: INode;
        if (!value.__cached_id || !(slotNode = nodeMaps[value.__cached_id]!)) {
          const slotNodeId = (value.__cached_id = uuid.v4());
          slotNode = nodeMaps[slotNodeId] = createNode(
            shallowRef({
              componentName: 'Slot',
              params: value.params ?? [],
              children: value.value,
            } as const),
            undefined,
            {
              configure: {
                component: {
                  isContainer: true,
                },
              },
            }
          );
        }
        return slotNode;
      }
      return null;
    },
    exportSchema(stage: IPublicEnumTransformStage, options?: any) {
      return this.schema;
    },
    replaceChild(node, data) {
      const { children, ...restSchema } = this.schema;
      if (isArray(children)) {
        const idx = children.findIndex((item) => {
          return isNodeSchema(item) && item.id === node.id;
        });
        if (idx >= 0) {
          const newChildren = children.slice();
          newChildren.splice(idx, 1, data);
          set(rootSchema.value, schemaPath, {
            ...restSchema,
            children: newChildren,
          });
        } else {
          set(rootSchema.value, schemaPath, {
            ...restSchema,
            children: [...children, data],
          });
        }
      } else if (isNodeSchema(children)) {
        if (children.id === node.id) {
          set(rootSchema.value, schemaPath, { ...restSchema, children: data });
        } else {
          set(rootSchema.value, schemaPath, {
            ...restSchema,
            children: [{ ...children, id: uuid.v4(), data }],
          });
        }
      } else {
        set(rootSchema.value, schemaPath, {
          ...restSchema,
          children: [children, data],
        });
      }
      rootSchema.value = cloneDeep(rootSchema.value);
      childrenChangeCbs.forEach((cb) => cb());
    },
    setPropValue(path, value) {
      const schema = this.schema;
      const internalPropMatched = isString(path) ? internalPropsRegexp.exec(path) : null;
      let oldValue: any;
      if (internalPropMatched) {
        const internalPropName = internalPropMatched[1];
        oldValue = schema[internalPropName];
        set(schema, internalPropName, value);
        set(rootSchema.value, schemaPath, { ...schema });
      } else {
        const props = cloneDeep(schema.props ?? {});
        oldValue = get(props, path);
        set(props, path, value);
        set(rootSchema.value, schemaPath, { ...schema, props });
      }
      const parts = path.toString().split('.');
      const info = {
        key: parts[parts.length - 1],
        prop: { path: parts },
        newValue: value,
        oldValue: oldValue,
      };
      rootSchema.value = cloneDeep(rootSchema.value);
      propChangeCbs.forEach((cb) => cb(info));
    },
    onPropChange(func) {
      propChangeCbs.push(func);
      return () => {
        const idx = propChangeCbs.indexOf(func);
        idx >= 0 && propChangeCbs.splice(idx, 1);
      };
    },
    onVisibleChange(func) {
      visibleChange.push(func);
      return () => {
        const idx = visibleChange.indexOf(func);
        idx >= 0 && visibleChange.splice(idx, 1);
      };
    },
    onChildrenChange(func) {
      childrenChangeCbs.push(func);
      return () => {
        const idx = childrenChangeCbs.indexOf(func);
        idx >= 0 && childrenChangeCbs.splice(idx, 1);
      };
    },
  } as INode;
}
