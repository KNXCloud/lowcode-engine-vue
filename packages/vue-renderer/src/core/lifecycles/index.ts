import type { IPublicTypeContainerSchema } from '@alilc/lowcode-types';
import type { RuntimeScope, SchemaParser } from '../../utils';
import { initComputed } from './init-computed';
import { initProps } from './init-props';
import { initEmits } from './init-emits';
import { initData } from './init-data';
import { initWatch } from './init-watch';
import { initInject } from './init-inject';
import { initProvide } from './init-provide';
import { setup } from './setup';
import { created } from './created';
import { beforeCreate } from './beforeCreate';

const VUE_LOWCODE_LIFTCYCLES_MAP = {
  setup: setup,
  created: created,
  beforeCreate: beforeCreate,
  initInject: initInject,
  initProvide: initProvide,
  initEmits: initEmits,
  initProps: initProps,
  initData: initData,
  initWatch: initWatch,
  initComputed: initComputed,
};

export type LowCodeHookMap = typeof VUE_LOWCODE_LIFTCYCLES_MAP;
export type LowCodeHook = keyof LowCodeHookMap;

export function createHookCaller(
  schema: IPublicTypeContainerSchema,
  scope: RuntimeScope,
  parser: SchemaParser
) {
  function callHook(hook: 'setup', props: object, ctx: object): void | Promise<void>;
  function callHook<T extends Exclude<LowCodeHook, 'setup'>>(hook: T): void;
  function callHook<T extends LowCodeHook>(
    hook: T,
    param1?: object,
    param2?: object
  ): void | Promise<void> {
    const lifeCycles = schema.lifeCycles ?? {};
    const lifeCycleSchema = lifeCycles[hook];
    const hookFn = VUE_LOWCODE_LIFTCYCLES_MAP[hook];
    if (lifeCycleSchema && hookFn) {
      return hookFn(parser, lifeCycleSchema, scope, [param1!, param2!]);
    }
  }

  return callHook;
}

export { setupLowCodeRouteGuard, LOWCODE_ROUTE_META } from './vue-router';
