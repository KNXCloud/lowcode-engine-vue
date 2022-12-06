import simulator from './simulator';
import { warn } from './utils';
import './index.less';

const win = window as any;

if (typeof win !== 'undefined') {
  win.SimulatorRenderer = simulator;
}

win.addEventListener('load', () => {
  if (!win.__VUE_HMR_RUNTIME__) {
    warn('检测到您正在使用 vue 运行时的生产环境版本');
    warn('这将导致画布的部分功能异常，请使用非生产环境版本代替');
    warn('https://unpkg.com/vue/dist/vue.runtime.global.js');
  }
});

win.addEventListener('beforeunload', () => {
  win.LCSimulatorHost = null;
  win.SimulatorRenderer = null;
  simulator.dispose();
});

export default simulator;
export * from '@knxcloud/lowcode-vue-renderer';
export {
  config as vueRendererConfig,
  default as VueRenderer,
} from '@knxcloud/lowcode-vue-renderer';
export * from './interface';
