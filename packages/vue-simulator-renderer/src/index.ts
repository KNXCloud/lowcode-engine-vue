import simulator from './simulator';

const win = window as any;

if (typeof win !== 'undefined') {
  win.SimulatorRenderer = simulator;
}

win.addEventListener('beforeunload', () => {
  win.LCSimulatorHost = null;
  win.SimulatorRenderer = null;
  simulator.dispose();
});

export default simulator;
export * from '@knxcloud/lowcode-vue-renderer';
export {
  useLeaf,
  useRenderer,
  useRootScope,
  useRendererContext,
  config as vueRendererConfig,
  default as VueRenderer,
} from '@knxcloud/lowcode-vue-renderer';
export * from './interface';
