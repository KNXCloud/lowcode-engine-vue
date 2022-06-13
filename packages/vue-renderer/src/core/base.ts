import { NodeSchema } from '@alilc/lowcode-types';
import type { DefineComponent, PropType } from 'vue';

export const rendererProps = {
  id: {
    type: String,
    default: '',
  },
  schema: {
    type: Object as PropType<NodeSchema>,
    default: () => ({}),
  },
};

export interface RendererProps {
  id: string;
  schema: NodeSchema;
}

export const baseRendererPropKeys = Object.keys(rendererProps) as (keyof RendererProps)[];

export type RendererComponent = DefineComponent<any, any, any>;
