import { ComponentPublicInstance } from 'vue';
import { RuntimeScope } from '../../src';

export function sleep(ms?: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function $$(inst: ComponentPublicInstance): RuntimeScope {
  return inst['runtimeScope'];
}
