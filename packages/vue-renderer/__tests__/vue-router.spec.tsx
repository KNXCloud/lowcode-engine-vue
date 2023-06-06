import { Suspense, createApp } from 'vue';
import { createRouter, createMemoryHistory, RouterView } from 'vue-router';
import { VueRenderer } from '../src/renderer';
import { LOWCODE_ROUTE_META, setupLowCodeRouteGuard } from '../src';
import { IPublicTypePageSchema } from '@alilc/lowcode-types';
import { sleep } from '@knxcloud/lowcode-utils';
import { flushPromises } from '@vue/test-utils';

describe('vue-router lifecycles', () => {
  test('beforeRouteEnter', async () => {
    const schema: IPublicTypePageSchema = {
      fileName: '/',
      componentName: 'Page',
      lifeCycles: {
        beforeRouteEnter: {
          type: 'JSFunction',
          value: `async function (to) {
            to.meta.testValue = 5;
            await new Promise((resolve) => {
              setTimeout(resolve, 300);
            });
            return true;
          }`,
        },
      },
      children: 'rendered',
    };

    const app = createApp(RouterView);
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        {
          path: '/',
          component: VueRenderer,
          props: {
            schema,
            components: {},
          },
          meta: {
            [LOWCODE_ROUTE_META]: schema,
          },
        },
      ],
    });
    setupLowCodeRouteGuard(router);
    app.use(router);
    const el = document.createElement('div');
    const inst = app.mount(el);

    expect(inst.$el.innerHTML).toBeUndefined();

    await flushPromises();

    expect(inst.$el.innerHTML).toBeUndefined();

    await sleep(500);

    expect(inst.$el.innerHTML).eq('rendered');
  });

  test('beforeRouteUpdate', async () => {
    const schema: IPublicTypePageSchema = {
      fileName: '/',
      componentName: 'Page',
      lifeCycles: {
        beforeRouteUpdate: {
          type: 'JSFunction',
          value: `function (to) {
            return to.query.name === 'Tom'
              ? { path: to.path, query: { name: 'Sandy' } }
              : true;
          }`,
        },
      },
      children: {
        type: 'JSExpression',
        value: `this.$route.query.name || 'rendered'`,
      },
    };

    const app = createApp(RouterView);
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        {
          path: '/',
          component: VueRenderer,
          props: {
            schema: schema,
            components: {},
          },
          meta: {
            [LOWCODE_ROUTE_META]: schema,
          },
        },
      ],
    });

    setupLowCodeRouteGuard(router);
    app.use(router);
    const el = document.createElement('div');
    const inst = app.mount(el);

    await flushPromises();

    expect(inst.$el.innerHTML).eq('rendered');

    await router.push({
      path: '/',
      query: {
        name: 'Tom',
      },
    });

    expect(inst.$el.innerHTML).eq('Sandy');
  });

  test('beforeRouteLeave', async () => {
    const schema: IPublicTypePageSchema = {
      fileName: '/',
      componentName: 'Page',
      children: 'rendered',
      lifeCycles: {
        beforeRouteLeave: {
          type: 'JSExpression',
          value: `() => false`,
        },
      },
    };

    const schema2: IPublicTypePageSchema = {
      fileName: '/two',
      componentName: 'Page',
      children: 'page two',
    };

    const app = createApp(RouterView);
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        {
          path: '/',
          component: VueRenderer,
          props: {
            schema: schema,
            components: {},
          },
          meta: {
            [LOWCODE_ROUTE_META]: schema,
          },
        },
        {
          path: '/two',
          component: VueRenderer,
          props: {
            schema: schema2,
            components: {},
          },
          meta: {
            [LOWCODE_ROUTE_META]: schema2,
          },
        },
      ],
    });

    setupLowCodeRouteGuard(router);
    app.use(router);
    const el = document.createElement('div');
    const inst = app.mount(el);

    expect(inst.$el.innerHTML).toBeUndefined();

    await flushPromises();

    expect(inst.$el.innerHTML).eq('rendered');

    await router.push({ path: '/two' });

    expect(inst.$el.innerHTML).eq('rendered');
  });
});

describe('vue-router async components', async () => {
  test('async setup', async () => {
    const schema: IPublicTypePageSchema = {
      fileName: '/',
      componentName: 'Page',
      state: {
        name: 'Sandy',
      },
      lifeCycles: {
        setup: {
          type: 'JSFunction',
          value: `async function() {
            await new Promise(resolve => {
              setTimeout(resolve, 300);
            });
          }`,
        },
        beforeRouteEnter: {
          type: 'JSFunction',
          value: `function () {
            return (vm) => void (vm.name = 'Tom');
          }`,
        },
      },
      children: {
        type: 'JSExpression',
        value: 'this.name',
      },
    };

    const app = createApp(() => (
      <RouterView>{({ Component }) => <Suspense>{Component}</Suspense>}</RouterView>
    ));
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        {
          path: '/',
          component: VueRenderer,
          props: {
            schema,
            components: {},
          },
          meta: {
            [LOWCODE_ROUTE_META]: schema,
          },
        },
      ],
    });
    setupLowCodeRouteGuard(router);
    app.use(router);
    const el = document.createElement('div');
    app.mount(el);

    await flushPromises();

    expect(el.querySelector('.lc-page')).toBeNull();

    await sleep(300);

    expect(el.querySelector('.lc-page')).toBeDefined();
    expect(el.querySelector('.lc-page')!.innerHTML).eq('Tom');
  });

  test('async component', async () => {
    const schema: IPublicTypePageSchema = {
      fileName: '/',
      componentName: 'Page',
      state: {
        name: 'Sandy',
      },
      lifeCycles: {
        beforeRouteEnter: {
          type: 'JSFunction',
          value: `function () {
            return (vm) => void (vm.name = 'Tom');
          }`,
        },
      },
      children: {
        type: 'JSExpression',
        value: 'this.name',
      },
    };

    const app = createApp(RouterView);
    const router = createRouter({
      history: createMemoryHistory('/'),
      routes: [
        {
          path: '/',
          component: async () => {
            await sleep(200);
            return VueRenderer;
          },
          props: {
            schema,
            components: {},
          },
          meta: {
            [LOWCODE_ROUTE_META]: schema,
          },
        },
      ],
    });
    setupLowCodeRouteGuard(router);
    app.use(router);
    const el = document.createElement('div');
    app.mount(el);

    await flushPromises();

    expect(el.querySelector('.lc-page')).toBeNull();

    await sleep(300);

    expect(el.querySelector('.lc-page')).toBeDefined();
    expect(el.querySelector('.lc-page')!.innerHTML).eq('Tom');
  });
});
