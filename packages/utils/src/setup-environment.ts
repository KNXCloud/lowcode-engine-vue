import type { Project } from '@alilc/lowcode-shell';
import { AssetType } from '@alilc/lowcode-types';
import { assetItem } from './asset';

export function setupHostEnvironment(project: Project, vueRuntimeUrl: string): void {
  project.onSimulatorHostReady((host) => {
    host.set('environment', [
      assetItem(
        AssetType.JSText,
        'window.__is_simulator_env__=true;window.__VUE_DEVTOOLS_GLOBAL_HOOK__=window.parent.__VUE_DEVTOOLS_GLOBAL_HOOK__;'
      ),
      assetItem(AssetType.JSUrl, vueRuntimeUrl, undefined, 'vue'),
    ]);
  });
}
