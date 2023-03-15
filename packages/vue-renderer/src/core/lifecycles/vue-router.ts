import {
  isFunction,
  isObject,
  isContainerSchema,
  isESModule,
  isPromise,
  sleep,
} from '@knxcloud/lowcode-utils';
import type { ComponentPublicInstance } from 'vue';
import type {
  Router,
  RouteComponent,
  NavigationGuardWithThis,
  RouteRecordNormalized,
} from 'vue-router';
import { SchemaParser, type SchemaParserOptions } from '../../utils';

const ADDED_SYMBOL = Symbol();

const markAdded = (target: any) => void (target[ADDED_SYMBOL] = true);

const isAdded = (o: object) => ADDED_SYMBOL in o;

const isLazyComponent = <T>(o: T | (() => Promise<T>)): o is () => Promise<T> => {
  return isFunction(o);
};

const routeLifeCycles = ['beforeRouteEnter', 'beforeRouteUpdate', 'beforeRouteLeave'];

export interface SetupLowCodeRouteGuardOptions extends SchemaParserOptions {
  /**
   * @default 'runtimeScope'
   */
  scopePath?: string;
  /**
   * 等待异步 setup 以及 init dataSource 的超时时间，默认为 1 分钟
   * @default 60000 ms
   */
  timeout?: number;
}

export const LOWCODE_ROUTE_META = Symbol('LOWCODE_ROUTE_META');

function createPathGetter(path: string) {
  const segments = path.split('.');
  return (ctx: any) => {
    let cur = ctx;
    for (let i = 0; i < segments.length && cur; i++) {
      cur = cur[segments[i]];
    }
    return cur;
  };
}

export function setupLowCodeRouteGuard(
  router: Router,
  options?: SetupLowCodeRouteGuardOptions
) {
  if (isAdded(router)) return;
  markAdded(router);

  const timeout = options?.timeout ?? 60000;
  const parser = new SchemaParser(options);
  const get = createPathGetter(options?.scopePath ?? 'runtimeScope');

  function wrapRouteComponentGuard(
    route: RouteRecordNormalized,
    component: RouteComponent,
    schema: unknown,
    parser: SchemaParser
  ): RouteComponent {
    if (!isObject(schema) || !isObject(schema.lifeCycles)) return component;

    const lifeCycles: Record<string, NavigationGuardWithThis<unknown>> = {};

    for (const name of routeLifeCycles) {
      const guardSchema = schema.lifeCycles[name];
      const guardFn = parser.parseSchema(guardSchema, false);
      if (isFunction(guardFn)) {
        lifeCycles[name] = wrapGuardFn(route, guardFn);
      }
    }

    return Object.keys(lifeCycles).length > 0
      ? Object.create(component, Object.getOwnPropertyDescriptors(lifeCycles))
      : component;
  }

  function wrapGuardFn(
    route: RouteRecordNormalized,
    guardFn: (...args: unknown[]) => unknown
  ): NavigationGuardWithThis<unknown> {
    if (guardFn.length < 3) {
      return function (from, to) {
        const scope = get(this);
        return handleRes(guardFn.call(scope, from, to));
      } as NavigationGuardWithThis<unknown>;
    } else {
      return function (from, to, next) {
        const scope = get(this);
        return handleRes(guardFn.call(scope, from, to, next));
      } as NavigationGuardWithThis<unknown>;
    }
  }

  const handleRes = (result: unknown): unknown => {
    return isFunction(result)
      ? async (vm: ComponentPublicInstance) => {
          let scope: unknown;
          const now = Date.now();
          while (!(scope = get(vm))) {
            if (Date.now() - now >= timeout) {
              throw new Error('lowcode guard wait timeout');
            }
            await sleep();
          }
          return result(scope);
        }
      : isPromise(result)
      ? result.then(handleRes)
      : result;
  };

  return router.beforeEach((to, _, next) => {
    if (to.matched.every((route) => isAdded(route))) {
      return next();
    }
    Promise.all(
      to.matched.map(async (route) => {
        if (isAdded(route)) return;

        const components = route.components ?? {};
        const defaultView = components.default;
        const schema = route.meta[LOWCODE_ROUTE_META];
        if (defaultView && isContainerSchema(schema)) {
          let addedView: RouteComponent;
          if (isLazyComponent(defaultView)) {
            addedView = await defaultView();
            if (isESModule(addedView)) {
              addedView = addedView.default;
            }
          } else {
            addedView = defaultView;
          }
          components.default = wrapRouteComponentGuard(
            route,
            addedView,
            schema,
            parser.initModule(schema)
          );
        }

        markAdded(route);
      })
    ).then(() => next());
  });
}
