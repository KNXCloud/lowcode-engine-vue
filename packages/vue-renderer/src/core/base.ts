import type {
  IPublicModelNode as INode,
  IPublicTypeNodeSchema as NodeSchema,
  IPublicTypeRootSchema as RootSchema,
} from '@alilc/lowcode-types';
import type { Component, ComponentPublicInstance, PropType, VNodeProps } from 'vue';
import type { BlockScope, I18nMessages, RuntimeScope } from '../utils';

export const rendererProps = {
  __scope: {
    type: Object as PropType<BlockScope>,
    default: undefined,
  },
  __schema: {
    type: Object as PropType<RootSchema>,
    required: true,
  },
  __designMode: {
    type: String as PropType<'live' | 'design'>,
    default: 'live',
  },
  __components: {
    type: Object as PropType<Record<string, Component>>,
    required: true,
  },
  __locale: {
    type: String,
    default: undefined,
  },
  __messages: {
    type: Object as PropType<I18nMessages>,
    default: () => ({}),
  },
  __getNode: {
    type: Function as PropType<(id: string) => INode | null>,
    required: true,
  },
  __triggerCompGetCtx: {
    type: Function as PropType<
      (schema: NodeSchema, ref: ComponentPublicInstance) => void
    >,
    required: true,
  },
} as const;

export interface RendererProps {
  __scope?: BlockScope;
  __locale?: string;
  __messages?: I18nMessages;
  __designMode?: 'live' | 'design';
  __schema: RootSchema;
  __components: Record<string, Component>;
  __getNode: (id: string) => INode | null;
  __triggerCompGetCtx: (schema: NodeSchema, ref: ComponentPublicInstance) => void;
}

export const baseRendererPropKeys = Object.keys(rendererProps) as (keyof RendererProps)[];

export type RendererComponent = {
  new (...args: any[]): {
    $props: VNodeProps & RendererProps;
  };
};

export const leafProps = {
  __comp: {
    type: Object as PropType<Component | null>,
    default: undefined,
  },
  __scope: {
    type: Object as PropType<RuntimeScope>,
    default: () => ({}),
  },
  __schema: {
    type: Object as PropType<NodeSchema>,
    default: () => ({}),
  },
  __vnodeProps: {
    type: Object as PropType<Record<string, unknown>>,
    default: () => ({}),
  },
} as const;

export interface LeafProps {
  __comp?: Component | null;
  __scope: RuntimeScope;
  __schema: NodeSchema;
}

export const leafPropKeys = Object.keys(leafProps) as (keyof LeafProps)[];

export type LeafComponent = {
  new (...args: any[]): {
    $props: VNodeProps & LeafProps;
  };
};
