import type {
  IPublicModelNode as INode,
  IPublicTypeNodeSchema as NodeSchema,
  IPublicTypeContainerSchema as ContainerSchema,
} from '@alilc/lowcode-types';
import type {
  Component,
  ComponentPublicInstance,
  DefineComponent,
  ExtractPropTypes,
  PropType,
} from 'vue';
import type { BlockScope, I18nMessages, RuntimeScope, SchemaParser } from '../utils';

export const rendererProps = {
  __scope: {
    type: Object as PropType<BlockScope>,
    default: undefined,
  },
  __schema: {
    type: Object as PropType<ContainerSchema>,
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
  __thisRequiredInJSE: {
    type: Boolean,
    default: true,
  },
  __props: {
    type: Object,
    default: () => ({}),
  },
  __parser: {
    type: Object as PropType<SchemaParser>,
    required: true,
  },
} as const;

export type RendererProps = ExtractPropTypes<typeof rendererProps>;

export const baseRendererPropKeys = Object.keys(rendererProps) as (keyof RendererProps)[];

export type RendererComponent = DefineComponent<RendererProps, any, any>;

export const leafProps = {
  __comp: {
    type: Object as PropType<Component | null>,
    required: true,
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
  __isRootNode: Boolean,
} as const;

export type LeafProps = ExtractPropTypes<typeof leafProps>;

export const leafPropKeys = Object.keys(leafProps) as (keyof LeafProps)[];

export type LeafComponent = DefineComponent<LeafProps, any, any>;
