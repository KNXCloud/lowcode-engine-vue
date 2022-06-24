import { DocumentModel, BuiltinSimulatorHost } from '@alilc/lowcode-designer';
import { TransformStage } from '@alilc/lowcode-types';
import {
  AssetLoader,
  cursor,
  getSubComponent,
  setNativeSelection,
} from '@alilc/lowcode-utils';
import {
  createApp,
  ref,
  Ref,
  Component,
  shallowRef,
  reactive,
  computed,
  markRaw,
  onUnmounted,
} from 'vue';
import { getClientRects } from './utils/get-client-rects';
import { buildComponents } from '@knxcloud/lowcode-utils';
import {
  ComponentInstance,
  DocumentInstance,
  MinxedComponent,
  VueSimulatorRenderer,
} from './interface';
import { Renderer, SimulatorRendererView } from './simulator-view';
import { Slot, Leaf } from './buildin-components';
import { host } from './host';
import './simulator.less';
import { createMemoryHistory, createRouter } from 'vue-router';

const loader = new AssetLoader();

const SYMBOL_VDID = Symbol('_LCDocId');
const SYMBOL_VNID = Symbol('_LCNodeId');
const SYMBOL_VInstance = Symbol('_LCVueInstance');

const builtinComponents = { Slot, Leaf };

interface ComponentHTMLElement extends HTMLElement {
  [SYMBOL_VDID]: string;
  [SYMBOL_VNID]: string;
  [SYMBOL_VInstance]: ComponentInstance;
}

interface SimulatorComponentInstance {
  did: string;
  cid: number;
  nid: string;
}

function isComponentHTMLElement(el: Element): el is ComponentHTMLElement {
  return SYMBOL_VDID in el;
}

function createDocumentInstance(
  document: DocumentModel,
  host: BuiltinSimulatorHost
): DocumentInstance {
  const device: Ref<string> = ref('default');
  const designMode: Ref<'design'> = ref('design');
  const components: Ref<Record<string, Component>> = ref({});
  const componentsMap: Ref<Record<string, MinxedComponent>> = ref({});
  /** 记录单个节点的组件实例列表 */
  const instancesMap = new Map<string, ComponentInstance[]>();
  /** 记录 vue 组件实例和组件 uid 的映射关系 */
  const vueInstanceMap = new Map<number, ComponentInstance>();
  const requestHandlersMap: Ref<any> = ref(null);

  const disposeFunctions: Array<() => void> = [];

  const timestamp = ref(Date.now());

  const checkInstanceMounted = (instance: ComponentInstance): boolean => {
    return instance.$.isMounted;
  };

  const setHostInstance = (
    docId: string,
    nodeId: string,
    instances: ComponentInstance[] | null
  ) => {
    host.setInstance(
      docId,
      nodeId,
      instances?.map((inst) => ({ cid: inst.$.uid, did: docId, nid: nodeId })) as any[]
    );
  };

  const getComponentInstance = (id: number) => {
    return vueInstanceMap.get(id);
  };

  const mountInstance = (id: string, instance: ComponentInstance) => {
    const docId = document.id;
    if (instance == null) {
      let instances = instancesMap.get(id);
      if (instances) {
        instances = instances.filter(checkInstanceMounted);
        if (instances.length > 0) {
          instancesMap.set(id, instances);
          setHostInstance(docId, id, instances);
        } else {
          instancesMap.delete(id);
          setHostInstance(docId, id, null);
        }
      }
      return;
    }

    const el = instance.$el;

    const origId = el[SYMBOL_VNID];
    if (origId && origId !== id) {
      // 另外一个节点的 instance 在此被复用了，需要从原来地方卸载
      unmountIntance(origId, instance);
    }

    onUnmounted(() => unmountIntance(id, instance), instance.$);

    el[SYMBOL_VNID] = id;
    el[SYMBOL_VDID] = docId;
    el[SYMBOL_VInstance] = instance;
    let instances = instancesMap.get(id);
    if (instances) {
      const l = instances.length;
      instances = instances.filter(checkInstanceMounted);
      let updated = instances.length !== l;
      if (!instances.includes(instance)) {
        instances.push(instance);
        updated = true;
      }
      if (!updated) return;
    } else {
      instances = [instance];
    }
    vueInstanceMap.set(instance.$.uid, instance);
    instancesMap.set(id, instances);
    setHostInstance(docId, id, instances);
  };

  const unmountIntance = (id: string, instance: ComponentInstance) => {
    const instances = instancesMap.get(id);
    if (instances) {
      const i = instances.indexOf(instance);
      if (i > -1) {
        const [instance] = instances.splice(i, 1);
        vueInstanceMap.delete(instance.$.uid);
        setHostInstance(document.id, id, instances);
      }
    }
  };

  const getNode: DocumentInstance['getNode'] = (id) => {
    return document.getNode(id);
  };

  return reactive({
    id: computed(() => document.id),
    path: computed(() => {
      const { fileName } = document;
      return fileName.startsWith('/') ? fileName : `/${fileName}`;
    }),
    key: computed(() => `${document.id}:${timestamp.value}`),
    schema: computed(() => document.export(TransformStage.Render)),
    device: computed(() => device.value),
    document: computed(() => document),
    components: computed(() => components.value),
    componentsMap: computed(() => componentsMap.value),
    instancesMap: computed(() => instancesMap),
    designMode: computed(() => designMode.value),
    requestHandlersMap: computed(() => requestHandlersMap.value),
    getComponentInstance,
    mountInstance,
    unmountIntance,
    getNode,
    rerender: () => void (timestamp.value = Date.now()),
    dispose: () => disposeFunctions.forEach((dispose) => dispose()),
  }) as DocumentInstance;
}

function createSimulatorRenderer() {
  const layout: Ref<any> = shallowRef();
  const device: Ref<string> = shallowRef('default');
  const locale: Ref<string | undefined> = shallowRef();
  const autoRender = shallowRef(host.autoRender);
  const designMode: Ref<string> = shallowRef('design');
  const libraryMap: Ref<Record<string, string>> = shallowRef({});
  const components: Ref<Record<string, Component>> = shallowRef({});
  const componentsMap: Ref<Record<string, MinxedComponent>> = shallowRef({});
  const requestHandlersMap: Ref<any> = shallowRef(null);
  const documentInstances: Ref<DocumentInstance[]> = shallowRef([]);

  const disposeFunctions: Array<() => void> = [];

  const documentInstanceMap = new Map<string, DocumentInstance>();

  function _buildComponents() {
    components.value = {
      ...builtinComponents,
      ...buildComponents(
        libraryMap.value,
        componentsMap.value,
        simulator.createComponent
      ),
    };
  }

  const simulator = reactive({
    layout,
    device,
    designMode,
    libraryMap,
    components,
    autoRender,
    componentsMap,
    documentInstances,
    requestHandlersMap,
    isSimulatorRenderer: true,
  }) as VueSimulatorRenderer;

  simulator.app = markRaw(createApp(SimulatorRendererView, { simulator }));
  simulator.router = markRaw(
    createRouter({
      history: createMemoryHistory('/'),
      routes: [],
    })
  );

  simulator.getComponent = (componentName) => {
    const paths = componentName.split('.');
    const subs: string[] = [];
    while (paths.length > 0) {
      const component = components.value[componentName];
      if (component) {
        return getSubComponent(component, subs);
      }
      const sub = paths.pop();
      if (!sub) break;
      subs.unshift(sub);
      componentName = paths.join('.');
    }
    return null!;
  };

  simulator.getClosestNodeInstance = (el: Element, specId) => {
    while (el) {
      if (isComponentHTMLElement(el)) {
        const nodeId = el[SYMBOL_VNID];
        const docId = el[SYMBOL_VDID];
        const instance = el[SYMBOL_VInstance];
        if (!specId || specId === nodeId) {
          return {
            docId,
            nodeId,
            instance: { nid: nodeId, did: docId, cid: instance.$.uid },
          };
        }
      }
      el = el.parentElement as Element;
    }
    return null;
  };

  simulator.findDOMNodes = (instance: SimulatorComponentInstance) => {
    if (!instance) return null;
    const { did, cid } = instance;
    const documentInstance = documentInstanceMap.get(did);
    if (!documentInstance) return null;
    const compInst = documentInstance.getComponentInstance(cid);
    return compInst ? [compInst.$el] : null;
  };

  simulator.getClientRects = (element) => getClientRects(element);
  simulator.setNativeSelection = (enable) => setNativeSelection(enable);
  simulator.setDraggingState = (state) => cursor.setDragging(state);
  simulator.setCopyState = (state) => cursor.setCopy(state);
  simulator.clearState = () => cursor.release();
  simulator.createComponent = () => null;
  simulator.rerender = () => documentInstances.value.forEach((doc) => doc.rerender());
  simulator.dispose = () => {
    simulator.app.unmount();
    disposeFunctions.forEach((fn) => fn());
  };
  simulator.getCurrentDocument = () => {
    const crr = host.project.currentDocument;
    const docs = documentInstances.value;
    return docs.find((doc) => doc.id === crr.id);
  };

  let running = false;
  simulator.run = () => {
    if (running) return;
    running = true;
    const containerId = 'app';
    let container = document.getElementById(containerId);
    if (!container) {
      container = document.createElement('div');
      document.body.appendChild(container);
      container.id = containerId;
    }
    document.documentElement.classList.add('engine-page');
    document.body.classList.add('engine-document');
    simulator.app.use(simulator.router).mount(container);
    host.project.setRendererReady(simulator);
  };

  disposeFunctions.push(
    host.connect(simulator, () => {
      // sync layout config
      layout.value = host.project.get('config').layout;

      // todo: split with others, not all should recompute
      if (
        libraryMap.value !== host.libraryMap ||
        componentsMap.value !== host.designer.componentsMap
      ) {
        libraryMap.value = host.libraryMap || {};
        componentsMap.value = host.designer.componentsMap as any;
        _buildComponents();
      }

      locale.value = host.locale;

      // sync device
      device.value = host.device;

      // sync designMode
      designMode.value = host.designMode;

      // sync requestHandlersMap
      requestHandlersMap.value = host.requestHandlersMap;
    })
  );

  disposeFunctions.push(
    host.autorun(() => {
      const { router } = simulator;
      documentInstances.value = host.project.documents.map((doc) => {
        let documentInstance = documentInstanceMap.get(doc.id);
        if (!documentInstance) {
          documentInstance = createDocumentInstance(doc, host);
          documentInstanceMap.set(doc.id, documentInstance);
          router.addRoute({
            name: documentInstance.id,
            path: documentInstance.path,
            component: Renderer,
            props: () => ({
              key: documentInstance?.key,
              documentInstance,
              simulator,
            }),
          });
        }
        return documentInstance;
      });
      router.getRoutes().forEach((route) => {
        const id = route.name as string;
        const hasDoc = documentInstances.value.some((doc) => doc.id === id);
        if (!hasDoc) {
          router.removeRoute(id);
          documentInstanceMap.delete(id);
        }
      });
      const inst = simulator.getCurrentDocument();
      if (inst && inst.id !== router.currentRoute.value.name) {
        router.replace({ name: inst.id });
      }
    })
  );

  host.componentsConsumer.consume(async (componentsAsset) => {
    if (componentsAsset) {
      await loader.load(componentsAsset);
      _buildComponents();
    }
  });

  host.injectionConsumer.consume((data) => {
    // TODO: handle designer injection
    console.log(data);
  });

  return simulator;
}

export default createSimulatorRenderer();
