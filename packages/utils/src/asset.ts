/**
 * copy from https://github.com/alibaba/lowcode-engine/blob/main/packages/utils/src/asset.ts
 */
import type { Asset, AssetBundle, AssetItem, AssetList } from '@alilc/lowcode-types';
import { AssetLevel, AssetLevels, AssetType } from '@alilc/lowcode-types/es/assets';
import { isArray, isCSSUrl } from './check';
import { createDefer } from './create-defer';
import { evaluate, load } from './script';

export function isAssetItem(obj: any): obj is AssetItem {
  return obj && !!obj.type;
}

export function isAssetBundle(obj: any): obj is AssetBundle {
  return obj && obj.type === AssetType.Bundle;
}

export function assetItem(
  type: AssetType,
  content?: string | null,
  level?: AssetLevel,
  id?: string
): AssetItem | null {
  return content ? { type, content, level, id } : null;
}

function parseAssetList(
  scripts: any,
  styles: any,
  assets: AssetList,
  level?: AssetLevel
) {
  for (const asset of assets) {
    parseAsset(scripts, styles, asset, level);
  }
}

function parseAsset(
  scripts: any,
  styles: any,
  asset: Asset | undefined | null,
  level?: AssetLevel
) {
  if (!asset) {
    return;
  }
  if (isArray(asset)) {
    return parseAssetList(scripts, styles, asset, level);
  }

  if (isAssetBundle(asset)) {
    if (asset.assets) {
      if (isArray(asset.assets)) {
        parseAssetList(scripts, styles, asset.assets, asset.level || level);
      } else {
        parseAsset(scripts, styles, asset.assets, asset.level || level);
      }
      return;
    }
    return;
  }

  if (!isAssetItem(asset)) {
    asset = assetItem(
      isCSSUrl(asset) ? AssetType.CSSUrl : AssetType.JSUrl,
      asset,
      level
    )!;
  }

  let lv = asset.level || level;

  if (!lv || AssetLevel[lv] == null) {
    lv = AssetLevel.App;
  }

  asset.level = lv;
  if (asset.type === AssetType.CSSUrl || asset.type == AssetType.CSSText) {
    styles[lv].push(asset);
  } else {
    scripts[lv].push(asset);
  }
}

export class StylePoint {
  private lastContent: string | undefined;

  private lastUrl: string | undefined;

  private placeholder: Node;

  constructor(public readonly level: number, public readonly id?: string) {
    let placeholder: Node | null = null;
    if (id) {
      placeholder = document.head.querySelector(`style[data-id="${id}"]`);
    }
    if (!placeholder) {
      placeholder = document.createTextNode('');
      const meta = document.head.querySelector(`meta[level="${level}"]`);
      if (meta) {
        document.head.insertBefore(placeholder, meta);
      } else {
        document.head.appendChild(placeholder);
      }
    }
    this.placeholder = placeholder;
  }

  applyText(content: string) {
    if (this.lastContent === content) {
      return;
    }
    this.lastContent = content;
    this.lastUrl = undefined;
    const element = document.createElement('style');
    element.setAttribute('type', 'text/css');
    if (this.id) {
      element.setAttribute('data-id', this.id);
    }
    element.appendChild(document.createTextNode(content));
    document.head.insertBefore(
      element,
      this.placeholder.parentNode === document.head ? this.placeholder.nextSibling : null
    );
    document.head.removeChild(this.placeholder);
    this.placeholder = element;
  }

  applyUrl(url: string) {
    if (this.lastUrl === url) {
      return;
    }
    this.lastContent = undefined;
    this.lastUrl = url;
    const element = document.createElement('link');
    element.onload = onload;
    element.onerror = onload;

    const i = createDefer();
    function onload(e: any) {
      element.onload = null;
      element.onerror = null;
      if (e.type === 'load') {
        i.resolve();
      } else {
        i.reject();
      }
    }

    element.href = url;
    element.rel = 'stylesheet';
    if (this.id) {
      element.setAttribute('data-id', this.id);
    }
    document.head.insertBefore(
      element,
      this.placeholder.parentNode === document.head ? this.placeholder.nextSibling : null
    );
    document.head.removeChild(this.placeholder);
    this.placeholder = element;
    return i.promise();
  }
}

export class AssetLoader {
  async load(asset: Asset) {
    const styles: any = {};
    const scripts: any = {};
    AssetLevels.forEach((lv) => {
      styles[lv] = [];
      scripts[lv] = [];
    });
    parseAsset(scripts, styles, asset);
    const styleQueue: AssetItem[] = styles[AssetLevel.Environment].concat(
      styles[AssetLevel.Library],
      styles[AssetLevel.Theme],
      styles[AssetLevel.Runtime],
      styles[AssetLevel.App]
    );
    const scriptQueue: AssetItem[] = scripts[AssetLevel.Environment].concat(
      scripts[AssetLevel.Library],
      scripts[AssetLevel.Theme],
      scripts[AssetLevel.Runtime],
      scripts[AssetLevel.App]
    );
    await Promise.all(
      styleQueue.map(({ content, level, type, id }) =>
        this.loadStyle(content, level!, type === AssetType.CSSUrl, id)
      )
    );
    await Promise.all(
      scriptQueue.map(({ content, type }) =>
        this.loadScript(content, type === AssetType.JSUrl)
      )
    );
  }

  private stylePoints = new Map<string, StylePoint>();

  private loadStyle(
    content: string | undefined | null,
    level: AssetLevel,
    isUrl?: boolean,
    id?: string
  ) {
    if (!content) {
      return;
    }
    let point: StylePoint | undefined;
    if (id) {
      point = this.stylePoints.get(id);
      if (!point) {
        point = new StylePoint(level, id);
        this.stylePoints.set(id, point);
      }
    } else {
      point = new StylePoint(level);
    }
    return isUrl ? point.applyUrl(content) : point.applyText(content);
  }

  private loadScript(content: string | undefined | null, isUrl?: boolean) {
    if (!content) {
      return;
    }
    return isUrl ? load(content) : evaluate(content);
  }

  async loadAsyncLibrary(asyncLibraryMap: Record<string, any>) {
    const promiseList: any[] = [];
    const libraryKeyList: any[] = [];
    for (const key in asyncLibraryMap) {
      if (asyncLibraryMap[key].async) {
        promiseList.push(window[asyncLibraryMap[key].library]);
        libraryKeyList.push(asyncLibraryMap[key].library);
      }
    }
    await Promise.all(promiseList).then((mods) => {
      if (mods.length > 0) {
        mods.map((item, index) => {
          window[libraryKeyList[index]] = item;
          return item;
        });
      }
    });
  }
}
