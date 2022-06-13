import { Component } from 'vue';
import { isFunction, isObject, get } from 'lodash-es';
import { accessLibrary, getSubComponent, isESModule } from '@alilc/lowcode-utils';
import { ComponentSchema, NpmInfo } from '@alilc/lowcode-types';

export function isVueComponent(val: unknown): val is Component {
  if (isFunction(val)) return true;
  if (isObject(val) && ('render' in val || 'setup' in val)) {
    return true;
  }
  return false;
}

export function isComponentSchema(val: unknown): val is ComponentSchema {
  return isObject(val) && get(val, 'componentName') === 'Component';
}

export function findComponent(
  libraryMap: Record<string, string>,
  componentName: string,
  npm?: NpmInfo
) {
  if (!npm) {
    return accessLibrary(componentName);
  }
  // libraryName the key access to global
  // export { exportName } from xxx exportName === global.libraryName.exportName
  // export exportName from xxx   exportName === global.libraryName.default || global.libraryName
  // export { exportName as componentName } from package
  // if exportName == null exportName === componentName;
  // const componentName = exportName.subName, if exportName empty subName donot use
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
