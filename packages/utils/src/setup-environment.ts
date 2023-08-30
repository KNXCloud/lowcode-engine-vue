import type { IPublicApiProject } from '@alilc/lowcode-types';
import { assetItem, AssetType } from './asset';

export function setupHostEnvironment(
  project: IPublicApiProject,
  vueRuntimeUrl: string,
): void {
  project.onSimulatorHostReady((host) => {
    host.set('environment', [
      assetItem(
        AssetType.JSText,
        'window.__is_simulator_env__=true;window.__VUE_DEVTOOLS_GLOBAL_HOOK__=window.parent.__VUE_DEVTOOLS_GLOBAL_HOOK__;',
      ),
      assetItem(AssetType.JSUrl, vueRuntimeUrl, undefined, 'vue'),
    ]);
  });
}
