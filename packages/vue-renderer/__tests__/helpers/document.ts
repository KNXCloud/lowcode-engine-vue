import { INode } from '@knxcloud/lowcode-hooks';
import {
  IPublicTypeContainerSchema,
  IPublicModelDocumentModel,
  IPublicTypeComponentMetadata,
} from '@alilc/lowcode-types';
import { get } from 'lodash';
import { createNode } from './node';
import { isArray } from '@knxcloud/lowcode-utils';
import { shallowRef } from 'vue';

export function createDocument(
  schema: IPublicTypeContainerSchema,
  metas: Record<string | number, Partial<IPublicTypeComponentMetadata>> = {}
): IPublicModelDocumentModel {
  const nodesMap: Record<string, INode | null> = {};
  const schemaRef = shallowRef(schema);

  function createNodeById(id: string, path?: string): INode | null {
    const node = path ? get(schema, path) : schema;
    if (isArray(node)) {
      for (let idx = 0; idx < node.length; idx++) {
        const createdNode = createNodeById(
          id,
          [path, idx].filter((item) => item != null).join('.')
        );
        if (createdNode) return createdNode;
      }
    }
    if (node.id === id) {
      return createNode(schemaRef, path, metas[id], nodesMap);
    } else if (node.children) {
      if (isArray(node.children)) {
        for (let idx = 0; idx < node.children.length; idx++) {
          const createdNode = createNodeById(
            id,
            [path, 'children', idx].filter((item) => item != null).join('.')
          );
          if (createdNode) return createdNode;
        }
      } else {
        return createNodeById(
          id,
          [path, 'children'].filter((item) => item != null).join('.')
        );
      }
    }
    return null;
  }

  return {
    getNodeById(id: string): INode | null {
      return nodesMap[id] || (nodesMap[id] = createNodeById(id));
    },
  } as IPublicModelDocumentModel;
}
