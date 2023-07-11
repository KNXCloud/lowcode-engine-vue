import type { IPublicTypeContainerSchema } from '@alilc/lowcode-types';
import type { INode } from '@knxcloud/lowcode-hooks';
import { mount } from '@vue/test-utils';
import { defineComponent, renderSlot } from 'vue';
import VueRenderer from '../src';
import { flushPromises } from '@vue/test-utils';
import { createDocument, sleep } from './helpers';

describe('test for props update', () => {
  const components = {
    TButton: defineComponent({
      name: 'TButton',
      props: {
        type: {
          type: String,
          default: 'primary',
        },
      },
      emits: ['click'],
      render() {
        const vnode = renderSlot(this.$slots, 'default', this.$props);
        return (
          <button onClick={(e) => this.$emit('click', e)} class={[`t-${this.type}`]}>
            {vnode}
          </button>
        );
      },
    }),
    Container: defineComponent({
      render() {
        const vnode = renderSlot(this.$slots, 'default');
        return <div class="t-container">{vnode}</div>;
      },
    }),
  };

  test('container placeholder', async () => {
    const meta = {
      configure: {
        component: {
          isContainer: true,
        },
      },
    };
    const doc = createDocument(
      {
        id: '0',
        fileName: '/',
        componentName: 'Page',
      },
      { 0: meta }
    );
    const inst = mount(VueRenderer, {
      props: {
        key: 0,
        components,
        designMode: 'design',
        schema: doc.getNodeById('0')!.schema as any,
        getNode: (id: string) => doc.getNodeById(id) as INode,
      },
    });
    expect(inst.find('.lc-container-placeholder').exists()).toBeTruthy();
    meta.configure.component.isContainer = false;
    inst.vm.$forceUpdate();
    await flushPromises();
    expect(inst.find('.lc-container-placeholder').exists()).toBeFalsy();
  });

  test('normal prop update', async () => {
    const doc = createDocument({
      id: '0',
      fileName: '/',
      componentName: 'Page',
      children: [
        {
          id: '1',
          componentName: 'TButton',
          props: {
            type: 'warning',
          },
        },
      ],
    });

    const inst = mount(VueRenderer, {
      props: {
        key: 0,
        components,
        designMode: 'design',
        schema: doc.getNodeById('0')!.schema as IPublicTypeContainerSchema,
        getNode: (id: string) => doc.getNodeById(id) as INode,
      },
    });
    expect(inst.html()).contain('t-warning');
    doc.getNodeById('1')!.setPropValue('type', 'error');
    await sleep();
    expect(inst.html()).contain('t-error');
  });

  test('condition prop update', async () => {
    const doc = createDocument({
      id: '0',
      fileName: '/',
      componentName: 'Page',
      children: [
        {
          id: '1',
          componentName: 'TButton',
          props: {
            type: 'warning',
          },
        },
      ],
    });

    const inst = mount(VueRenderer, {
      props: {
        key: 0,
        components,
        designMode: 'design',
        schema: doc.getNodeById('0')!.schema as IPublicTypeContainerSchema,
        getNode: (id: string) => doc.getNodeById(id) as INode,
      },
    });
    expect(inst.html()).contain('t-warning');
    doc.getNodeById('1')!.setPropValue('__condition__', false);
    await sleep();
    expect(inst.find('button').exists()).toBeFalsy();

    doc.getNodeById('1')!.setPropValue('__condition__', true);
    await sleep();
    expect(inst.find('button').exists()).toBeTruthy();
  });
});

describe('test for slot update', () => {
  const components = {
    TButton: defineComponent({
      name: 'TButton',
      props: {
        type: {
          type: String,
          default: 'primary',
        },
      },
      emits: ['click'],
      render() {
        const { $props, $slots } = this;
        return (
          <button onClick={(e) => this.$emit('click', e)} class={[`t-${this.type}`]}>
            {$slots.icon && (
              <div class="t-button__icon">{renderSlot($slots, 'icon')}</div>
            )}
            <div class="t-button__content">{renderSlot($slots, 'default', $props)}</div>
          </button>
        );
      },
    }),
    Container: defineComponent({
      name: 'Container',
      render() {
        const vnode = renderSlot(this.$slots, 'default');
        return <div class="t-container">{vnode}</div>;
      },
    }),
  };

  test('children prop change', async () => {
    const doc = createDocument({
      id: '0',
      fileName: '/',
      componentName: 'Page',
      children: [
        {
          id: '1',
          componentName: 'Container',
          props: {
            children: 'first',
          },
        },
      ],
    });

    const inst = mount(VueRenderer, {
      props: {
        key: 0,
        components,
        designMode: 'design',
        schema: doc.getNodeById('0')!.schema as IPublicTypeContainerSchema,
        getNode: (id: string) => doc.getNodeById(id) as INode,
      },
    });

    expect(inst.html()).contain('first');

    doc.getNodeById('1')!.setPropValue('children', 'replaced1');
    await sleep();
    expect(inst.html()).contain('replaced1');

    doc.getNodeById('1')!.setPropValue('children', {
      type: 'JSSlot',
      value: {
        id: '3',
        componentName: 'TButton',
        props: {
          type: 'warning',
        },
        children: 'replaced2',
      },
    });
    await sleep();
    expect(inst.html()).contain('replaced');
    expect(inst.html()).contain('t-warning');
  });

  test('children field change', async () => {
    const doc = createDocument({
      id: '0',
      fileName: '/',
      componentName: 'Page',
      children: [
        {
          id: '1',
          componentName: 'Container',
          children: [
            {
              id: '2',
              componentName: 'TButton',
              children: 'first',
            },
          ],
        },
      ],
    });

    const inst = mount(VueRenderer, {
      props: {
        key: 0,
        components,
        designMode: 'design',
        schema: doc.getNodeById('0')!.schema as IPublicTypeContainerSchema,
        getNode: (id: string) => doc.getNodeById(id) as INode,
      },
    });

    expect(inst.html()).contain('first');
    doc.getNodeById('1')!.replaceChild(doc.getNodeById('2')!, {
      id: '3',
      componentName: 'TButton',
      children: 'replaced',
    });
    await sleep();
    expect(inst.html()).contain('replaced');
  });

  test('jsslot prop change', async () => {
    const doc = createDocument({
      id: '0',
      fileName: '/',
      componentName: 'Page',
      children: [
        {
          id: '1',
          componentName: 'TButton',
          props: {
            children: 'first',
            icon: {
              type: 'JSSlot',
              value: 'icon-content',
            },
          },
        },
      ],
    });

    const inst = mount(VueRenderer, {
      props: {
        key: 0,
        components,
        designMode: 'design',
        schema: doc.getNodeById('0')!.schema as IPublicTypeContainerSchema,
        getNode: (id: string) => doc.getNodeById(id) as INode,
      },
    });

    expect(inst.find('.t-button__icon').text()).contain('icon-content');
    expect(inst.find('.t-button__content').text()).contain('first');

    doc.getNodeById('1')!.setPropValue('icon', {
      type: 'JSSlot',
      value: 'icon-replaced',
    });

    await sleep();

    expect(inst.find('.t-button__icon').text()).contain('icon-replaced');

    doc.getNodeById('1')!.setPropValue('icon', {
      type: 'JSSlot',
      value: {
        id: '3',
        componentName: 'Container',
        children: 'icon-replaced2',
      },
    });
    await sleep();

    expect(inst.find('.t-container').text()).contain('icon-replaced2');
  });
});
