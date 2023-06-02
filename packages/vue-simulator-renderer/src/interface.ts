import type { Router } from 'vue-router';
import type { Config, I18nMessages } from '@knxcloud/lowcode-vue-renderer';
import type { DesignMode } from '@knxcloud/lowcode-hooks';
import type { Component, ComponentPublicInstance, App } from 'vue';
import type {
  AssetList,
  IPublicModelNode as INode,
  IPublicModelDocumentModel as IDocumentModel,
  IPublicTypeNpmInfo as NpmInfo,
  IPublicTypeRootSchema as RootSchema,
  IPublicTypeComponentSchema as ComponentSchema,
  IPublicTypeNodeInstance as NodeInstance,
} from '@alilc/lowcode-types';
import type { BuiltinSimulatorRenderer } from '@alilc/lowcode-designer';

export type MinxedComponent = NpmInfo | Component | ComponentSchema;

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
  getComponentInstance(id: number): ComponentInstance | null;
  mountInstance(
    id: string,
    instance: ComponentInstance | HTMLElement
  ): (() => void) | void;
  unmountIntance(id: string, instance: ComponentInstance): void;
  rerender(): void;
  getNode(id: string): INode | null;
}

export interface VueSimulatorRenderer extends BuiltinSimulatorRenderer {
  readonly isSimulatorRenderer: true;
  app: App;
  config: Config;
  router: Router;
  layout: SimulatorViewLayout;
  device: string;
  locale: string;
  designMode: DesignMode;
  libraryMap: Record<string, string>;
  thisRequiredInJSE: boolean;
  components: Record<string, Component>;
  autoRender: boolean;
  componentsMap: Record<string, MinxedComponent>;
  disableCompMock: boolean | string[];
  documentInstances: DocumentInstance[];
  requestHandlersMap: Record<string, CallableFunction>;
  load(assets: AssetList): Promise<void>;
  dispose(): void;
  rerender(): void;
  getCurrentDocument(): DocumentInstance | null;
  rerender: () => void;
  getComponent(componentName: string): Component;
  getClosestNodeInstance(
    from: ComponentRecord | Element,
    nodeId?: string
  ): NodeInstance<ComponentRecord> | null;
  findDOMNodes(instance: ComponentRecord): Array<Element | Text> | null;
}
