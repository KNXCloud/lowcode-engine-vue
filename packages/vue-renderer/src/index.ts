export * from './core';
export { default as config, type Config, type RendererModules } from './config';
export { Renderer as default } from './renderer';
export type { RendererProps, I18nMessages, BlockScope } from './renderer';
export { mergeScope, parseSchema } from './utils';
