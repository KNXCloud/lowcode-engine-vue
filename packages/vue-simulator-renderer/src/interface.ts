import type { Router } from 'vue-router';
import type { Config, I18nMessages } from '@knxcloud/lowcode-vue-renderer';
import type { DesignMode } from '@knxcloud/lowcode-hooks';
import type { Component, ComponentPublicInstance, App } from 'vue';
import type {
  IPublicTypeSimulatorRenderer,
  IPublicModelNode as INode,
  IPublicModelDocumentModel as IDocumentModel,
  IPublicTypeNpmInfo as NpmInfo,
  IPublicTypeRootSchema as RootSchema,
  IPublicTypeComponentSchema as ComponentSchema,
  IPublicTypeNodeInstance as NodeInstance,
} from '@alilc/lowcode-types';

export type MixedComponent = NpmInfo | Component | ComponentSchema;

export type ComponentInstance = ComponentPublicInstance;

export interface ComponentRecord {
  did: string;
  nid: string;
  cid: number;
}

export interface SimulatorViewLayout {
  Component?: Component;
  componentName?: string;
  props?: Record<string, unknown>;
}

export interface DocumentInstance {
  readonly id: string;
  readonly key: string;
  readonly path: string;
  readonly scope: Record<string, unknown>;
  readonly document: IDocumentModel;
  readonly instancesMap: Map<string, ComponentInstance[]>;
  readonly schema: RootSchema;
  readonly messages: I18nMessages;
  readonly appHelper: Record<string, unknown>;
  getComponentInstance(id: number): ComponentInstance | null;
  mountInstance(
    id: string,
    instance: ComponentInstance | HTMLElement,
  ): (() => void) | void;
  unmountInstance(id: string, instance: ComponentInstance): void;
  rerender(): void;
  getNode(id: string): INode | null;
}

export interface VueSimulatorRenderer
  extends IPublicTypeSimulatorRenderer<ComponentInstance, ComponentRecord> {
  app: App;
  config: Config;
  router: Router;
  layout: SimulatorViewLayout;
  device: string;
  locale: string;
  designMode: DesignMode;
  libraryMap: Record<string, string>;
  thisRequiredInJSE: boolean;
  autoRender: boolean;
  componentsMap: Record<string, MixedComponent>;
  disableCompMock: boolean | string[];
  documentInstances: DocumentInstance[];
  requestHandlersMap: Record<string, CallableFunction>;
  dispose(): void;
  getCurrentDocument(): DocumentInstance | null;
  getClosestNodeInstance(
    from: ComponentRecord | Element,
    nodeId?: string,
  ): NodeInstance<ComponentRecord> | null;
}
