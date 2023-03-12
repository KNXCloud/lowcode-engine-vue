export * from './core';
export { default as config, type Config, type RendererModules } from './config';
export { VueRenderer as default, vueRendererProps } from './renderer';
export type { VueRendererProps, I18nMessages, BlockScope } from './renderer';
export { mergeScope, SchemaParser } from './utils';
export type { RuntimeScope, ExtractPublicPropTypes, MaybeArray } from './utils';
