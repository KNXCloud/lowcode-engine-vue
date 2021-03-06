import type { Project } from '@alilc/lowcode-shell';
import { AssetType } from '@alilc/lowcode-types';
import { assetItem } from './asset';

export function setupHostEnvironment(project: Project): void {
  project.onSimulatorHostReady((host) => {
    host.set('environment', [
      assetItem(
        AssetType.JSText,
        'window.Vue=window.parent.Vue;window.__is_simulator_env__=true;',
        undefined,
        'vue'
      ),
      assetItem(
        AssetType.JSText,
        'window.__VUE_DEVTOOLS_GLOBAL_HOOK__=window.parent.__VUE_DEVTOOLS_GLOBAL_HOOK__;window.__VUE_HMR_RUNTIME__=window.parent.__VUE_HMR_RUNTIME__;'
      ),
    ]);
  });
}
