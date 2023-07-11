import { Component, Suspense, ref } from 'vue';
import type { IPublicTypePageSchema, IPublicTypeRootSchema } from '@alilc/lowcode-types';
import { mount, flushPromises } from '@vue/test-utils';
import { defineComponent, renderSlot, computed } from 'vue';
import VueRenderer from '../src';
import { $$, sleep } from './helpers';

describe('renderer type', () => {
  test('normal page renderer', () => {
    const wrapper = mount(VueRenderer, {
      props: {
        schema: {
          componentName: 'Page',
        } as IPublicTypeRootSchema,
        components: {},
      },
    });
    expect(wrapper.find('.lc-page')).toBeDefined();
  });

  test('normal block renderer', () => {
    const wrapper = mount(VueRenderer, {
      props: {
        schema: {
          componentName: 'Block',
          children: 'block content',
        } as IPublicTypeRootSchema,
        components: {},
      },
    });
    expect(wrapper.text()).toContain('block content');
  });

  test('normal component renderer', () => {
    const inst1 = mount(VueRenderer, {
      props: {
        schema: {
          componentName: 'Component',
          children: 'component content',
        } as IPublicTypeRootSchema,
        components: {},
      },
    });
    expect(inst1.text()).toContain('component content');

    const inst2 = mount(VueRenderer, {
      props: {
        schema: {
          componentName: 'Component',
          children: 'component content',
        } as IPublicTypeRootSchema,
        components: {
          Component: defineComponent({
            render() {
              const defaultSlot = renderSlot(this.$slots, 'default', this.$props);
              return <div class="lc-component">{defaultSlot}</div>;
            },
          }),
        },
      },
    });
    expect(inst2.find('.lc-component')).toBeDefined();
    expect(inst2.find('.lc-component').text()).toContain('component content');
  });
});

describe('props', () => {
  const TButton = defineComponent({
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
  });
  const TText = defineComponent({
    name: 'TText',
    render() {
      const vnode = renderSlot(this.$slots, 'default', this.$props);
      return <span class="t-text">{vnode}</span>;
    },
  });
  const TInput = defineComponent({
    name: 'TInput',
    props: {
      modelValue: {
        type: String,
        default: '',
      },
    } as const,
    emits: ['update:modelValue'],
    setup(props, { emit }) {
      const value = computed({
        get: () => props.modelValue,
        set: (val) => emit('update:modelValue', val),
      });
      return { value };
    },
    render() {
      return (
        <input
          onInput={(e) => {
            this.value = (e.target as HTMLInputElement).value;
          }}
          value={this.value}
        />
      );
    },
  });
  const components: Record<string, Component<any, any, any>> = {
    TButton,
    TText,
    TInput,
  };

  test('normal pass props', () => {
    const inst = mount(VueRenderer, {
      props: {
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'TButton',
            props: {
              type: 'error',
              children: 'button content',
            },
          },
        },
        components,
      },
    });

    expect(inst.find('button').exists()).toBeTruthy();
    expect(inst.find('button').classes().includes('t-error')).toBeTruthy();
  });

  test('js expression props', () => {
    const schema = {
      fileName: '/',
      state: {
        btnType: 'warn',
        message: 'hello lowcode',
      },
      componentName: 'Page',
      children: [
        {
          componentName: 'TButton',
          props: {
            type: {
              type: 'JSExpression',
              value: 'this.btnType',
            },
            children: {
              type: 'JSExpression',
              value: 'this.message',
            },
          },
        },
      ],
    } as IPublicTypePageSchema;
    const inst = mount(VueRenderer, {
      props: {
        schema: schema,
        components,
      },
    });
    expect(inst.find('button').exists()).toBeTruthy();
    expect(inst.find('button').classes().includes('t-warn')).toBeTruthy();
  });

  test('v-model props', async () => {
    const schema = {
      fileName: '/',
      state: {
        btnType: 'warn',
        message: 'hello lowcode',
      },
      componentName: 'Page',
      children: [
        {
          componentName: 'TInput',
          props: {
            'v-model': {
              type: 'JSExpression',
              value: 'this.message',
            },
          },
        },
        {
          componentName: 'TButton',
          props: {
            children: {
              type: 'JSExpression',
              value: 'this.message',
            },
          },
        },
      ],
    } as IPublicTypePageSchema;
    const inst = mount(VueRenderer, {
      props: {
        schema: schema,
        components,
      },
    });
    expect(inst.find('button').exists()).toBeDefined();

    const input = inst.find('input');
    expect(input.exists()).toBeTruthy();
    expect(input.element.value).toContain('hello lowcode');

    input.element.value += 'A';
    await input.trigger('input');

    await flushPromises();

    expect(inst.find('button').text()).toContain('hello lowcodeA');
  });

  test('ref props', () => {
    const inst1 = mount(VueRenderer, {
      props: {
        schema: {
          fileName: '/',
          state: {
            btnInst: null,
          },
          componentName: 'Page',
          children: [
            {
              componentName: 'TButton',
              props: {
                ref: 'btnInst',
              },
              children: 'button',
            },
          ],
        },
        components,
      },
    });
    expect($$(inst1.vm).btnInst).toBeDefined();
    expect($$(inst1.vm).$refs['btnInst']).toBe($$(inst1.vm).btnInst);

    const inst2 = mount(VueRenderer, {
      props: {
        schema: {
          fileName: '/',
          state: {
            btnInst: null,
          },
          componentName: 'Page',
          children: [
            {
              componentName: 'TButton',
              props: {
                ref: {
                  type: 'JSExpression',
                  value: 'function (inst) { this.btnInst = inst; }',
                },
              },
              children: 'button',
            },
          ],
        },
        components,
      },
    });

    const scope = $$(inst2.vm);
    expect(scope.btnInst).toBeDefined();
    expect(scope.$refs.btnInst).toBeUndefined();
  });

  test('js function', async () => {
    const schema = {
      fileName: '/',
      state: {
        message: 'hello lowcode',
      },
      methods: {
        onClick: {
          type: 'JSFunction',
          value: 'function ($event) { this.message += "A" }',
        },
      },
      componentName: 'Page',
      children: [
        {
          componentName: 'TButton',
          props: {
            onClick: {
              type: 'JSExpression',
              value: 'this.onClick',
            },
            children: {
              type: 'JSExpression',
              value: 'this.message',
            },
          },
        },
      ],
    } as IPublicTypePageSchema;
    const inst = mount(VueRenderer, {
      props: {
        schema: schema,
        components,
      },
    });

    expect(inst.find('button').text()).toContain('hello lowcode');
    inst.find('button').trigger('click');
    await flushPromises();
    expect(inst.find('button').text()).toContain('A');
  });

  test('schema update', async () => {
    const inst = mount(VueRenderer, {
      props: {
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'TButton',
            children: 'content',
          },
        },
        components,
      },
    });

    expect(inst.find('button').text()).toContain('content');

    await inst.setProps({
      schema: {
        fileName: '/',
        componentName: 'Page',
        children: {
          componentName: 'TText',
          children: 'content',
        },
      },
    });

    expect(inst.find('span').text()).toContain('content');
  });
});

describe('slots', () => {
  const TButton = defineComponent({
    props: {
      iconSize: {
        type: Number,
        default: 18,
      },
      content: {
        type: String,
        default: 'default content',
      },
    },
    setup(props, { slots }) {
      const renderIcon = () => {
        return renderSlot(slots, 'icon', { size: props.iconSize }, () => {
          return [<i style={{ fontSize: props.iconSize + 'px' }}>+</i>];
        });
      };
      const renderContent = () => {
        return renderSlot(slots, 'default', { content: props.content }, () => {
          return [<>{props.content}</>];
        });
      };
      return () => {
        return (
          <div class="t-button">
            {slots.icon && <div class="t-button__icon">{renderIcon()}</div>}
            {renderContent()}
          </div>
        );
      };
    },
  });

  const TText = defineComponent({
    name: 'TText',
    render() {
      const vnode = renderSlot(this.$slots, 'default');
      return <span class="t-text">{vnode}</span>;
    },
  });

  const components = { TButton, TText };

  test('default slot', () => {
    const inst = mount(VueRenderer, {
      props: {
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: [
            {
              componentName: 'TButton',
              props: {
                content: 'custom content 1',
              },
            },
            {
              componentName: 'TButton',
              children: 'custom content 2',
            },
          ],
        },
        components,
      },
    });
    expect(inst.find('.t-button:nth-child(1)').text()).toContain('custom content 1');
    expect(inst.find('.t-button:nth-child(2)').text()).toContain('custom content 2');
  });

  test('default slot with args', () => {
    const schema = {
      fileName: '/',
      componentName: 'Page',
      children: {
        componentName: 'TButton',
        props: {
          content: 'custom content',
        },
        children: {
          componentName: 'Slot',
          params: ['data'],
          children: {
            componentName: 'TText',
            children: {
              type: 'JSExpression',
              value: 'this.data.content + " A"',
            },
          },
        },
      },
    } as IPublicTypePageSchema;
    const inst = mount(VueRenderer, {
      props: {
        schema,
        components,
      },
    });

    expect(inst.find('.t-text').text()).toContain('custom content A');
  });

  test('named slot with args', () => {
    const inst = mount(VueRenderer, {
      props: {
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'TButton',
            props: {
              iconSize: 20,
              icon: {
                type: 'JSSlot',
                params: ['data'],
                value: {
                  componentName: 'TText',
                  children: {
                    type: 'JSExpression',
                    value: 'this.data.size + "px"',
                  },
                },
              },
            },
          },
        },
        components,
      },
    });

    expect(inst.find('.t-text').text()).toContain('20px');
  });

  test('named and default slot with args', () => {
    const schema = {
      fileName: '/',
      componentName: 'Page',
      children: {
        componentName: 'TButton',
        props: {
          iconSize: 20,
          content: 'custom content',
          icon: {
            type: 'JSSlot',
            params: ['data'],
            value: {
              componentName: 'TText',
              children: {
                type: 'JSExpression',
                value: 'this.data.size + "px"',
              },
            },
          },
        },
        children: {
          componentName: 'Slot',
          params: ['data'],
          children: {
            componentName: 'TText',
            props: {
              class: 'custom-content',
            },
            children: {
              type: 'JSExpression',
              value: 'this.data.content + " A"',
            },
          },
        },
      },
    } as IPublicTypePageSchema;
    const inst = mount(VueRenderer, {
      props: {
        schema: schema,
        components,
      },
    });

    expect(inst.find('.t-text').text()).toContain('20px');
    expect(inst.find('.custom-content').text()).toContain('custom content A');
  });
});

describe('loop and condition', () => {
  const components = {
    TText: defineComponent({
      name: 'TText',
      render() {
        const vnode = renderSlot(this.$slots, 'default', this.$props);
        return <span class="t-text">{vnode}</span>;
      },
    }),
    TButton: defineComponent({
      props: {
        content: {
          type: String,
          default: 'default content',
        },
      },
      emits: ['click'],
      setup(props, { slots, emit }) {
        const renderContent = () => {
          return renderSlot(slots, 'default', { content: props.content }, () => {
            return [<>{props.content}</>];
          });
        };
        return () => {
          return (
            <button onClick={(e) => emit('click', e)} class="t-button">
              {renderContent()}
            </button>
          );
        };
      },
    }),
  };

  test('normal loop', () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'Slot',
            children: {
              componentName: 'TText',
              loop: {
                type: 'JSExpression',
                value: `['aaa', 'bbb', 'ccc']`,
              },
              children: {
                type: 'JSExpression',
                value: 'this.item',
              },
            },
          },
        } as IPublicTypePageSchema,
      },
    });

    const textList = inst.findAll('.t-text');
    expect(textList.length).toBe(3);
    expect(textList[0].text()).toContain('aaa');
    expect(textList[1].text()).toContain('bbb');
    expect(textList[2].text()).toContain('ccc');
  });

  test('custom loop arg name', () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'Slot',
            children: {
              componentName: 'TText',
              loop: {
                type: 'JSExpression',
                value: `['aaa', 'bbb', 'ccc']`,
              },
              loopArgs: ['content', 'idx'],
              children: {
                type: 'JSExpression',
                value: 'this.content + this.idx',
              },
            },
          },
        } as IPublicTypePageSchema,
      },
    });

    const textList = inst.findAll('.t-text');
    expect(textList.length).toBe(3);
    expect(textList[0].text()).toContain('aaa0');
    expect(textList[1].text()).toContain('bbb1');
    expect(textList[2].text()).toContain('ccc2');
  });

  test('custom loop arg name with named slot', () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'TButton',
            props: {
              content: 'custom content',
            },
            children: {
              componentName: 'Slot' as const,
              params: ['data'],
              children: {
                componentName: 'TText',
                loop: {
                  type: 'JSExpression' as const,
                  value: `['aaa', 'bbb', 'ccc']`,
                },
                loopArgs: ['content', 'idx'] as [string, string],
                children: {
                  type: 'JSExpression' as const,
                  value: 'this.data.content + this.content + this.idx',
                },
              },
            },
          },
        },
      },
    });

    expect(inst.find('button').exists()).toBeTruthy();

    const textList = inst.findAll('.t-text');
    expect(textList.length).toBe(3);
    expect(textList[0].text()).toContain('custom contentaaa0');
    expect(textList[1].text()).toContain('custom contentbbb1');
    expect(textList[2].text()).toContain('custom contentccc2');
  });

  test('dynamic loop content', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          state: {
            arr: {
              type: 'JSExpression',
              value: `['aaa', 'bbb']`,
            },
          },
          methods: {
            onClick: {
              type: 'JSFunction',
              value: `function () { this.arr.push('ccc') }`,
            },
          },
          children: {
            componentName: 'TButton',
            props: {
              content: 'custom content',
              onClick: {
                type: 'JSExpression',
                value: 'this.onClick',
              },
            },
            children: {
              componentName: 'Slot',
              params: ['data'],
              children: {
                componentName: 'TText',
                loop: {
                  type: 'JSExpression',
                  value: `this.arr`,
                },
                loopArgs: ['content', 'idx'] as [string, string],
                children: {
                  type: 'JSExpression' as const,
                  value: 'this.data.content + this.content + this.idx',
                },
              },
            },
          },
        },
      },
    });

    expect(inst.find('button').exists()).toBeTruthy();

    let textList = inst.findAll('.t-text');
    expect(textList.length).toBe(2);
    expect(textList[0].text()).toContain('custom contentaaa0');
    expect(textList[1].text()).toContain('custom contentbbb1');

    await inst.find('button').trigger('click');
    await flushPromises();

    textList = inst.findAll('.t-text');
    expect(textList.length).toBe(3);
    expect(textList[2].text()).toContain('custom contentccc2');
  });

  test('normal condition', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          state: {
            hiddenIndex: 1,
          },
          methods: {
            onClick: {
              type: 'JSFunction',
              value: `function () { this.hiddenIndex++ }`,
            },
          },
          children: {
            componentName: 'TButton',
            props: {
              onClick: {
                type: 'JSExpression',
                value: 'this.onClick',
              },
            },
            children: {
              componentName: 'Slot',
              params: ['data'],
              children: {
                componentName: 'TText',
                loop: {
                  type: 'JSExpression',
                  value: `['aaa', 'bbb', 'ccc']`,
                },
                children: {
                  componentName: 'Slot',
                  condition: {
                    type: 'JSExpression',
                    value: 'this.hiddenIndex !== this.index',
                  },
                  children: {
                    type: 'JSExpression' as const,
                    value: 'this.item',
                  },
                },
              },
            },
          },
        },
      },
    });

    const btn = inst.find('button');

    expect(btn.exists()).toBeTruthy();

    let textList = inst.findAll('.t-text');
    expect(textList[0].text()).toContain('aaa');
    expect(textList[1].text()).toBe('');
    expect(textList[2].text()).toContain('ccc');

    await btn.trigger('click');
    await flushPromises();

    textList = inst.findAll('.t-text');
    expect(textList[0].text()).toContain('aaa');
    expect(textList[1].text()).toContain('bbb');
    expect(textList[2].text()).toBe('');
  });
});

describe('i18n', () => {
  const messages = {
    'zh-CN': {
      'user.message': '你好',
    },
    'en-US': {
      'user.message': 'hello',
    },
  };
  const components = {
    TText: defineComponent({
      name: 'TText',
      render() {
        const vnode = renderSlot(this.$slots, 'default', this.$props);
        return <span class="t-text">{vnode}</span>;
      },
    }),
  };

  test('normal render', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'TText',
            children: {
              type: 'i18n',
              key: 'user.message',
            },
          },
        },
        locale: 'zh-CN',
        messages: messages,
      },
    });

    expect(inst.find('.t-text').text()).toContain('你好');
    await inst.setProps({ locale: 'en-US' });
    expect(inst.find('.t-text').text()).toContain('hello');
  });

  test('i18n key not exists', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'TText',
            children: {
              type: 'i18n',
              key: 'user.message1',
            },
          },
        },
        locale: 'zh-CN',
        messages: messages,
      },
    });
    expect(inst.find('.t-text').text()).toBe('');
  });

  test('default locale', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'TText',
            children: {
              type: 'i18n',
              key: 'user.message',
            },
          },
        },
        messages: messages,
      },
    });
    expect(inst.find('.t-text').text()).toBe('你好');
  });

  test('default messages', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'TText',
            children: {
              type: 'i18n',
              key: 'user.message',
            },
          },
        },
      },
    });
    expect(inst.find('.t-text').text()).toBe('');
  });
});

describe('lifecycles', () => {
  const components = {
    TText: defineComponent({
      name: 'TText',
      inject: ['message'],
      render() {
        const vnode = renderSlot(this.$slots, 'default', this.$props, () => {
          return [<>{this.message}</>];
        });
        return <span class="t-text">{vnode}</span>;
      },
    }),
    TButton: defineComponent({
      props: {
        content: {
          type: String,
          default: 'default content',
        },
      },
      emits: ['click'],
      setup(props, { emit }) {
        return () => {
          return (
            <button onClick={(e) => emit('click', e)} class="t-button">
              {props.content}
            </button>
          );
        };
      },
    }),
  };

  test('beforeCreate', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          state: {
            message: 'first',
          },
          lifeCycles: {
            beforeCreate: {
              type: 'JSFunction',
              value: `function () { this.onClick = () => { this.message = 'replaced' } }`,
            },
          },
          children: {
            componentName: 'TButton',
            props: {
              onClick: {
                type: 'JSExpression',
                value: 'this.onClick',
              },
              content: {
                type: 'JSExpression',
                value: 'this.message',
              },
            },
          },
        },
      },
    });

    expect(inst.find('button').text()).contain('first');
    await inst.find('button').trigger('click');
    expect(inst.find('button').text()).contain('replaced');
  });

  test('created', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          state: {
            message: 'first',
          },
          lifeCycles: {
            created: {
              type: 'JSFunction',
              value: `function () { this.message = 'replaced' }`,
            },
          },
          children: {
            componentName: 'TButton',
            props: {
              content: {
                type: 'JSExpression',
                value: 'this.message',
              },
            },
          },
        },
      },
    });

    expect(inst.find('button').text()).contain('replaced');
  });

  test('computed', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          state: {
            message: 'first',
          },
          lifeCycles: {
            initComputed: {
              type: 'JSExpression',
              value: `
                {
                  helloMessage() {
                    return 'hello ' + this.message
                  },
                  writableMessage: {
                    get() { return 'hello ' + this.message },
                    set(val) { this.message = val }
                  }
                }`,
            },
          },
          methods: {
            onClick: {
              type: 'JSFunction',
              value: `function () { this.writableMessage = 'replaced' }`,
            },
          },
          children: {
            componentName: 'TButton',
            props: {
              onClick: {
                type: 'JSExpression',
                value: 'this.onClick',
              },
              content: {
                type: 'JSExpression',
                value: 'this.helloMessage',
              },
            },
          },
        },
      },
    });

    expect(inst.find('button').text()).contain('hello first');

    await inst.find('button').trigger('click');

    expect(inst.find('button').text()).contain('hello replaced');
  });

  test('watch', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          state: {
            user: {
              name: 'Tom',
            },
            changeCount1: 0,
            changeCount2: 0,
            changeCount3: 0,
          },
          lifeCycles: {
            initWatch: {
              type: 'JSExpression',
              value: `
                {
                  'user.name'() {
                    this.changeCount1++;
                  },
                  changeCount1: 'watchChangeCount',
                  changeCount2: {
                    handler() {
                      this.changeCount3++;
                    }
                  },
                }`,
            },
          },
          methods: {
            onClick: {
              type: 'JSFunction',
              value: `function () { this.user.name += 'a'; }`,
            },
            watchChangeCount: {
              type: 'JSFunction',
              value: `function () { this.changeCount2++; }`,
            },
          },
          children: {
            componentName: 'TButton',
            props: {
              onClick: {
                type: 'JSExpression',
                value: 'this.onClick',
              },
              content: {
                type: 'JSExpression',
                value: 'this.user.name',
              },
            },
          },
        },
      },
    });

    await inst.find('button').trigger('click');

    const scope = $$(inst.vm);
    expect(scope.changeCount1).eq(1);
    expect(scope.changeCount2).eq(1);
    expect(scope.changeCount3).eq(1);
  });

  test('data', async () => {
    const inst1 = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initData: {
              type: 'JSFunction',
              value: `function () { return { message: 'first' } }`,
            },
          },
          children: {
            componentName: 'TButton',
            props: {
              content: {
                type: 'JSExpression',
                value: 'this.message',
              },
            },
          },
        },
      },
    });

    expect(inst1.find('button').text()).contain('first');

    const inst2 = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initData: {
              type: 'JSExpression',
              value: `{ message: 'first' }`,
            },
          },
          children: {
            componentName: 'TButton',
            props: {
              content: {
                type: 'JSExpression',
                value: 'this.message',
              },
            },
          },
        },
      },
    });

    expect(inst2.find('button').text()).contain('first');

    const inst3 = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initData: {
              type: 'JSExpression',
              value: `1`,
            },
          },
        },
      },
    });

    expect($$(inst3.vm)).toBeDefined();
  });

  test('emits', async () => {
    let current = 0;
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initEmits: {
              type: 'JSExpression',
              value: `['trigger']`,
            },
          },
          children: {
            componentName: 'TButton',
            props: {
              onClick: {
                type: 'JSFunction',
                value: `function () { this.$emit('trigger') }`,
              },
            },
          },
        },
        passProps: {
          onTrigger: () => {
            current++;
          },
        },
      },
    });

    await inst.find('button').trigger('click');
    expect(current).eq(1);
  });

  test('props', async () => {
    const inst1 = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initProps: {
              type: 'JSExpression',
              value: `['name']`,
            },
          },
        },
        passProps: {
          name: 'Tom',
        },
      },
    });

    expect($$(inst1.vm).name).eq('Tom');

    const inst2 = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initProps: {
              type: 'JSExpression',
              value: `{ boolValue: Boolean }`,
            },
          },
        },
      },
    });

    expect($$(inst2.vm).boolValue).eq(false);

    const inst3 = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initProps: {
              type: 'JSExpression',
              value: `{ boolValue: { type: Boolean, default: true } }`,
            },
          },
        },
      },
    });

    expect($$(inst3.vm).boolValue).eq(true);

    const inst4 = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initProps: {
              type: 'JSExpression',
              value: `{ strValue: String }`,
            },
          },
        },
      },
    });

    expect($$(inst4.vm).strValue).toBeUndefined();

    const inst5 = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initProps: {
              type: 'JSExpression',
              value: `{ objValue: { type: Object, default: () => ({ a:5 }) } }`,
            },
          },
        },
      },
    });

    expect($$(inst5.vm).objValue).toMatchObject({ a: 5 });
  });

  test('inject', async () => {
    const inst1 = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initInject: {
              type: 'JSExpression',
              value: `['name', 'noExist']`,
            },
          },
        },
      },
      global: {
        provide: {
          name: 'Tom',
        },
      },
    });

    expect($$(inst1.vm).name).eq('Tom');
    expect($$(inst1.vm).noExist).toBeUndefined();

    const inst2 = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initInject: {
              type: 'JSExpression',
              value: `{
                replaced: 'name',
                onExist: {
                  from: 'onExist',
                  default: 0
                },
                noExist2: {
                  from: 'onExist',
                  default: () => ({ a: 5 })
                },
                refValue: {},
              }`,
            },
          },
        },
      },
      global: {
        provide: {
          name: 'Tom',
          refValue: ref(0),
        },
      },
    });

    expect($$(inst2.vm).replaced).eq('Tom');
    expect($$(inst2.vm).refValue).eq(0);
    expect($$(inst2.vm).onExist).eq(0);
    expect($$(inst2.vm).noExist2).toMatchObject({ a: 5 });
  });

  test('provide', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            initProvide: {
              type: 'JSExpression',
              value: `{ message: 'hello' }`,
            },
          },
          children: {
            componentName: 'TText',
          },
        },
      },
    });

    expect(inst.find('.t-text').text()).contain('hello');
  });

  test('setup', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            setup: {
              type: 'JSFunction',
              value: `function() { return { name: 'Tom' } }`,
            },
          },
          children: {
            componentName: 'TButton',
            props: {
              content: {
                type: 'JSExpression',
                value: 'this.name',
              },
            },
          },
        },
      },
    });

    expect($$(inst.vm).name).contain('Tom');
    expect(inst.find('.t-button').text()).contain('Tom');

    const inst2 = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          lifeCycles: {
            setup: {
              type: 'JSFunction',
              value: `function() { return 1 }`,
            },
          },
        },
      },
    });

    expect($$(inst2.vm).name).toBeUndefined();

    const inst3 = mount(
      (_, { attrs }) => {
        return (
          <Suspense>
            {/* @ts-ignore */}
            <VueRenderer {...attrs} />
          </Suspense>
        );
      },
      {
        props: {
          components,
          schema: {
            fileName: '/',
            componentName: 'Page',
            lifeCycles: {
              setup: {
                type: 'JSFunction',
                value: `async function() {
                await Promise.resolve();
                return { name: 'Tom' }
              }`,
              },
            },
            children: {
              componentName: 'TButton',
              props: {
                content: {
                  type: 'JSExpression',
                  value: 'this.name',
                },
              },
            },
          },
        },
      }
    );

    await sleep(500);

    expect(inst3.find('button').text()).contain('Tom');
  });
});

describe('appHelper', () => {
  const components = {
    TText: defineComponent({
      name: 'TText',
      inject: ['message'],
      render() {
        const vnode = renderSlot(this.$slots, 'default', this.$props, () => {
          return [<>{this.message}</>];
        });
        return <span class="t-text">{vnode}</span>;
      },
    }),
    TButton: defineComponent({
      props: {
        content: {
          type: String,
          default: 'default content',
        },
      },
      emits: ['click'],
      setup(props, { emit }) {
        return () => {
          return (
            <button onClick={(e) => emit('click', e)} class="t-button">
              {props.content}
            </button>
          );
        };
      },
    }),
  };

  test('utils', async () => {
    const testFn = vi.fn();
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'TButton',
            props: {
              onClick: {
                type: 'JSFunction',
                value: 'function () { this.$utils.test(1); }',
              },
            },
          },
        },
        appHelper: {
          utils: {
            test: testFn,
          },
        },
      },
    });

    await inst.find('button').trigger('click');
    expect(testFn).toHaveBeenCalledWith(1);
  });

  test('constants', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'TButton',
            props: {
              content: {
                type: 'JSExpression',
                value: 'this.$constants.A',
              },
            },
          },
        },
        appHelper: {
          constants: {
            A: '1',
          },
        },
      },
    });

    expect(inst.find('button').text()).eq('1');
  });
});

describe('this do not require', () => {
  const components = {
    TText: defineComponent({
      name: 'TText',
      render() {
        const vnode = renderSlot(this.$slots, 'default', this.$props);
        return <span class="t-text">{vnode}</span>;
      },
    }),
    TButton: defineComponent({
      name: 'TButton',
      props: {
        content: {
          type: String,
          default: 'TButton',
        },
      },
      render() {
        return <button class="t-button">{this.content}</button>;
      },
    }),
  };

  test('normal state without this', async () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          state: {
            message: 'hello',
          },
          children: {
            componentName: 'TButton',
            props: {
              content: {
                type: 'JSExpression',
                value: 'message',
              },
            },
          },
        },
        thisRequiredInJSE: false,
      },
    });

    expect(inst.find('button').text()).eq('hello');
  });

  test('custom loop arg name without this', () => {
    const inst = mount(VueRenderer, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          children: {
            componentName: 'Slot',
            children: {
              componentName: 'TText',
              loop: {
                type: 'JSExpression',
                value: `['aaa', 'bbb', 'ccc']`,
              },
              loopArgs: ['content', 'idx'],
              children: {
                type: 'JSExpression',
                value: 'content + idx',
              },
            },
          },
        } as IPublicTypePageSchema,
        thisRequiredInJSE: false,
      },
    });

    const textList = inst.findAll('.t-text');
    expect(textList.length).toBe(3);
    expect(textList[0].text()).toContain('aaa0');
    expect(textList[1].text()).toContain('bbb1');
    expect(textList[2].text()).toContain('ccc2');
  });
});

describe('request handler maps', async () => {
  const components = {
    TText: defineComponent({
      name: 'TText',
      render() {
        const vnode = renderSlot(this.$slots, 'default', this.$props);
        return <span class="t-text">{vnode}</span>;
      },
    }),
    TButton: defineComponent({
      name: 'TButton',
      props: {
        content: {
          type: String,
          default: 'TButton',
        },
      },
      render() {
        return <button class="t-button">{this.content}</button>;
      },
    }),
  };

  test('fetch', async () => {
    const mockedFetch = vi.fn();
    const fetch = window.fetch;
    mockedFetch.mockResolvedValueOnce({
      json: () => Promise.resolve(1),
      status: 200,
      statusText: 'OK',
    });
    window.fetch = mockedFetch;

    const WrappedSuspense = defineComponent({
      props: VueRenderer.props,
      render() {
        return (
          <Suspense>
            {/* @ts-ignore */}
            <VueRenderer {...this.$props}></VueRenderer>
          </Suspense>
        );
      },
    });

    const inst = mount(WrappedSuspense, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          state: {
            message: 'hello',
          },
          children: {
            componentName: 'TButton',
            props: {
              content: {
                type: 'JSExpression',
                value: 'this.info',
              },
            },
          },
          dataSource: {
            list: [
              {
                id: 'info',
                isInit: true,
                options: {
                  uri: 'http://test.uri/path/to/xxx',
                  params: {
                    a: 1,
                  },
                },
              },
            ],
          },
        },
      },
    });

    await sleep(100);

    expect(inst.find('button').text()).toBe('1');

    expect(mockedFetch).toHaveBeenCalledOnce();

    window.fetch = fetch;
  });

  test('requestHandlersMap', async () => {
    const customFetch = vi.fn();
    customFetch.mockResolvedValueOnce({
      code: 200,
      data: 1,
    });
    const WrappedSuspense = defineComponent({
      props: VueRenderer.props,
      render() {
        return (
          <Suspense>
            {/* @ts-ignore */}
            <VueRenderer {...this.$props}></VueRenderer>
          </Suspense>
        );
      },
    });

    const inst = mount(WrappedSuspense, {
      props: {
        components,
        schema: {
          fileName: '/',
          componentName: 'Page',
          state: {
            message: 'hello',
          },
          children: {
            componentName: 'TButton',
            props: {
              content: {
                type: 'JSExpression',
                value: 'this.info',
              },
            },
          },
          dataSource: {
            list: [
              {
                id: 'info',
                type: 'custom',
                isInit: true,
                options: {
                  uri: 'http://test.uri/path/to/xxx',
                  params: {
                    a: 1,
                  },
                },
              },
            ],
          },
        },
        requestHandlersMap: {
          custom: customFetch,
        },
      },
    });

    await sleep(100);

    expect(inst.find('button').text()).toBe('1');

    expect(customFetch).toHaveBeenCalledWith(
      {
        uri: 'http://test.uri/path/to/xxx',
        params: {
          a: 1,
        },
        headers: {},
      },
      expect.any(Object)
    );
  });
});
