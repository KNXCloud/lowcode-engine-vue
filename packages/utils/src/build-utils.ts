import { isJSFunction, JSFunction, NpmInfo } from '@alilc/lowcode-types';
import { accessLibrary } from './build-components';

export interface UtilsNpmMetadata {
  name: string;
  type: 'npm';
  content: NpmInfo;
}

export interface UtilsFunctionMetadata {
  name: string;
  type: 'function';
  content: JSFunction | CallableFunction;
}

export type UtilsMetadata = UtilsNpmMetadata | UtilsFunctionMetadata;

export function buildUtils(
  libraryMap: Record<string, string>,
  utilsMetadata: UtilsMetadata[]
): Record<string, unknown> {
  return utilsMetadata
    .filter((meta) => meta && meta.name)
    .reduce((utils, meta) => {
      const { name, content, type } = meta;
      if (type === 'npm') {
        const { package: pkg, exportName, destructuring } = content ?? {};
        if (libraryMap[pkg]) {
          const library = accessLibrary(libraryMap[pkg]);
          if (library) {
            utils[name] = destructuring && exportName ? library[exportName] : library;
          }
        }
      } else if (type === 'function') {
        utils[name] = isJSFunction(content)
          ? new Function(`return ${content.value}`)()
          : meta.content;
      }
      return utils;
    }, {} as Record<string, unknown>);
}
