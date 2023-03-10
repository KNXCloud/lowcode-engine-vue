import {
  IPublicEnumTransformStage,
  type IPublicTypeNodeSchema,
} from '@alilc/lowcode-types';

export function exportSchema<T extends IPublicTypeNodeSchema>(node: {
  export(stage?: IPublicEnumTransformStage, options?: any): unknown;
}): T {
  return node.export(IPublicEnumTransformStage.Render) as T;
}
