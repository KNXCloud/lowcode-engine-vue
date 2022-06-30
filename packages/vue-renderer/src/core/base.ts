import { NodeSchema } from '@alilc/lowcode-types';
import type { DefineComponent, PropType } from 'vue';

export const rendererProps = {
  scope: {
    type: Object,
    default: () => ({}),
  },
  schema: {
    type: Object as PropType<NodeSchema>,
    default: () => ({}),
  },
};

export interface RendererProps {
  scope: any;
  schema: NodeSchema;
}

export const baseRendererPropKeys = Object.keys(rendererProps) as (keyof RendererProps)[];

export type RendererComponent = DefineComponent<any, any, any>;
