import { DocumentModel } from '@alilc/lowcode-designer';
import { TransformStage } from '@alilc/lowcode-types';
import {
  Ref,
  Component,
  createApp,
  ref,
  shallowRef,
  reactive,
  computed,
  markRaw,
  onUnmounted,
} from 'vue';
import { config } from '@knxcloud/lowcode-vue-renderer';
import { AssetLoader, buildComponents, getSubComponent } from '@knxcloud/lowcode-utils';
import {
  ComponentInstance,
  DocumentInstance,
  MinxedComponent,
  SimulatorViewLayout,
  VueSimulatorRenderer,
} from './interface';
import { Renderer, SimulatorRendererView } from './simulator-view';
import { Slot, Leaf, Page } from './buildin-components';
import { host } from './host';
import {
  cursor,
  findDOMNodes,
  getClientRects,
  getCompRootData,
  setCompRootData,
  getClosestNodeInstance,
  ComponentRecord,
  isComponentRecord,
  getClosestNodeInstanceByComponent,
  setNativeSelection,
} from './utils';
import { createMemoryHistory, createRouter } from 'vue-router';

const loader = new AssetLoader();

const builtinComponents = { Slot, Leaf, Page };

function createDocumentInstance(document: DocumentModel): DocumentInstance {
  /** 记录单个节点的组件实例列表 */
  const instancesMap = new Map<string, ComponentInstance[]>();
  /** 记录 vue 组件实例和组件 uid 的映射关系 */
  const vueInstanceMap = new Map<number, ComponentInstance>();

  const timestamp = ref(Date.now());

  const checkInstanceMounted = (instance: ComponentInstance): boolean => {
    return instance.$.isMounted;
  };

  const setHostInstance = (
    docId: string,
    nodeId: string,
    instances: ComponentInstance[] | null
  ) => {
    const instanceRecords = !instances
      ? null
      : instances.map((inst) => new ComponentRecord(docId, nodeId, inst.$.uid));
    host.setInstance(docId, nodeId, instanceRecords);
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

    const origId = getCompRootData(el).nodeId;
    if (origId && origId !== id) {
      // 另外一个节点的 instance 在此被复用了，需要从原来地方卸载
      unmountIntance(origId, instance);
    }

    onUnmounted(() => unmountIntance(id, instance), instance.$);

    setCompRootData(el, {
      nodeId: id,
      docId: docId,
      instance: instance,
    });
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
    return id ? document.getNode(id) : null;
  };

  return reactive({
    id: computed(() => document.id),
    path: computed(() => {
      const { fileName } = document;
      return fileName.startsWith('/') ? fileName : `/${fileName}`;
    }),
    key: computed(() => `${document.id}:${timestamp.value}`),
    schema: computed(() => document.export(TransformStage.Render)),
    document: computed(() => document),
    instancesMap: computed(() => instancesMap),
    getNode,
    mountInstance,
    unmountIntance,
    getComponentInstance,
    rerender: () => void (timestamp.value = Date.now()),
  }) as DocumentInstance;
}

function createSimulatorRenderer() {
  const layout: Ref<SimulatorViewLayout> = shallowRef({});
  const device: Ref<string> = shallowRef('default');
  const locale: Ref<string | undefined> = shallowRef();
  const autoRender = shallowRef(host.autoRender);
  const designMode: Ref<string> = shallowRef('design');
  const libraryMap: Ref<Record<string, string>> = shallowRef({});
  const components: Ref<Record<string, Component>> = shallowRef({});
  const componentsMap: Ref<Record<string, MinxedComponent>> = shallowRef({});
  const requestHandlersMap: Ref<Record<string, CallableFunction>> = shallowRef({});
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
    config: markRaw(config),
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

  simulator.getClosestNodeInstance = (el, specId) => {
    if (isComponentRecord(el)) {
      const { cid, did } = el;
      const documentInstance = documentInstanceMap.get(did);
      const instance = documentInstance?.getComponentInstance(cid) ?? null;
      return instance && getClosestNodeInstanceByComponent(instance.$, specId);
    }
    return getClosestNodeInstance(el, specId);
  };

  simulator.findDOMNodes = (instance: ComponentRecord) => {
    if (instance) {
      const { did, cid } = instance;
      const documentInstance = documentInstanceMap.get(did);
      const compInst = documentInstance?.getComponentInstance(cid);
      return compInst ? findDOMNodes(compInst) : null;
    }
    return null;
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
        componentsMap.value = host.designer.componentsMap;
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
          documentInstance = createDocumentInstance(doc);
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

  host.injectionConsumer.consume(() => {
    // TODO: handle designer injection
  });

  return simulator;
}

export default createSimulatorRenderer();
