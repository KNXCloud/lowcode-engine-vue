import type { Component } from 'vue';
import type { ComponentSchema, NpmInfo } from '@alilc/lowcode-types';
import { defineComponent, h } from 'vue';
import { isESModule, isFunction, isObject } from './check';

export function isVueComponent(val: unknown): val is Component {
  if (isFunction(val)) return true;
  if (isObject(val) && ('render' in val || 'setup' in val || 'template' in val)) {
    return true;
  }
  return false;
}

export function isComponentSchema(val: unknown): val is ComponentSchema {
  return isObject(val) && val.componentName === 'Component';
}

export function accessLibrary(library: string | Record<string, unknown>) {
  if (typeof library !== 'string') {
    return library;
  }

  return (window as any)[library] || generateHtmlComp(library);
}

export function generateHtmlComp(library: string) {
  if (/^[a-z-]+$/.test(library)) {
    return defineComponent((_, { attrs, slots }) => {
      return () => h(library, attrs, slots);
    });
  }
}

export function getSubComponent(library: any, paths: string[]) {
  const l = paths.length;
  if (l < 1 || !library) {
    return library;
  }
  let i = 0;
  let component: any;
  while (i < l) {
    const key = paths[i]!;
    let ex: any;
    try {
      component = library[key];
    } catch (e) {
      ex = e;
      component = null;
    }
    if (i === 0 && component == null && key === 'default') {
      if (ex) {
        return l === 1 ? library : null;
      }
      component = library;
    } else if (component == null) {
      return null;
    }
    library = component;
    i++;
  }
  return component;
}

export function findComponent(
  libraryMap: Record<string, string>,
  componentName: string,
  npm?: NpmInfo
) {
  if (!npm) {
    return accessLibrary(componentName);
  }
  const exportName = npm.exportName || npm.componentName || componentName;
  const libraryName = libraryMap[npm.package] || exportName;
  const library = accessLibrary(libraryName);
  const paths = npm.exportName && npm.subName ? npm.subName.split('.') : [];
  if (npm.destructuring) {
    paths.unshift(exportName);
  } else if (isESModule(library)) {
    paths.unshift('default');
  }
  return getSubComponent(library, paths);
}

export function buildComponents(
  libraryMap: Record<string, string>,
  componentsMap: Record<string, NpmInfo | Component | ComponentSchema>,
  createComponent?: (schema: ComponentSchema) => Component | null
) {
  const components: any = {};
  Object.keys(componentsMap).forEach((componentName) => {
    let component = componentsMap[componentName];
    if (isComponentSchema(component)) {
      if (createComponent) {
        components[componentName] = createComponent(component as ComponentSchema);
      }
    } else if (isVueComponent(component)) {
      components[componentName] = component;
    } else {
      component = findComponent(libraryMap, componentName, component);
      if (component) {
        components[componentName] = component;
      }
    }
  });
  return components;
}
