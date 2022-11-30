# lowcode-engine-vue

Lowcode Engine Vue 渲染器及适配器实现，点击查看[在线演示](https://knxcloud.github.io/lowcode-engine-demo/)

> PS: 该项目仅包含画布实现，不能直接运行，如果需要本地查看效果请访问 [DEMO](https://github.com/KNXCloud/lowcode-engine-demo) 仓库

## 如何自定义组件

我们提供了 `npm init @knxcloud/lowcode@latest` 命令用于初始化一个基础的低代码组件项目，该项目基于 `vue-cli` 构建。项目启动后，会生成一个 `/assets.json` 文件，该文件可直接作为低代码物料的导入入口，部分代码示例如下：

```ts
const editorInit = (ctx: ILowCodePluginContext) => {
  return {
    name: 'editor-init',
    async init() {
      const { material, project } = ctx;
      const assets = await fetch('http://127.0.0.1:9000/assets.json').then((res) =>
        res.json()
      );
      material.setAssets(assets);
    },
  };
};
```

## 和 React 渲染器使用区别

使用变量时：

- `this.props.xxx` -> `this.xxx`
- `this.state.xxx` -> `this.xxx`

现阶段 vue 代码编辑器还未适配，可以直接使用 react 代码编辑器编辑代码，渲染器已做适配：

- state 内容会自动转化为 vue data
- lifecycle 自动适配为 vue lifecycle
  - `componentDidMount` -> `onMounted`
  - `componentDidCatch` -> `onErrorCaptured`
  - `shouldComponentUpdate` -> `onBeforeUpdate`
  - `componentWillUnmount` -> `onBeforeUnmount`
- 其余方法自动转化为 vue methods

支持的 vue 生命周期函数：

- `beforeMount`
- `mounted`
- `beforeUpdate`
- `updated`
- `beforeUnmount`
- `unmounted`
- `errorCaptured`

对于 v-model 的适配：

在 assets 中使用 name 为 v-model 的属性会被作为双向绑定特性编译，编译的逻辑为

```
v-model -> modelValue prop + onUpdate:modelValue event
v-model:value -> value prop + onUpdate:value event
```

并且，渲染器支持 `onUpdate:value` 和 `onUpdateValue` 两种事件处理方式，即在使用事件时，可以使用 `onUpdateXxx` 代替 `onUpdate:xxx`

## 使用示例

### 直接使用 cdn 渲染器及适配器

```ts
import { init, project } from '@alilc/lowcode-engine';
import { setupHostEnvironment } from '@knxcloud/lowcode-utils';

setupHostEnvironment(project);

init(document.getElementById('lce'), {
  // ...
  simulatorUrl: [
    'https://unpkg.com/@knxcloud/lowcode-vue-simulator-renderer/dist/vue-simulator-renderer.js',
    'https://unpkg.com/@knxcloud/lowcode-vue-simulator-renderer/dist/vue-simulator-renderer.css',
  ],
});
```

> 当不指定版本号时，默认使用最新版，推荐在 cdn 链接上添加适配器具体版本号

### 定制渲染器

```bash
npm install @knxcloud/lowcode-vue-simulator-renderer @knxcloud/lowcode-vue-renderer --save-dev
```

> TIPS：仅支持 cdn 方式引入，npm 包用于提供 typings 等代码提示能力

工程化配置：

```json
{
  "externals": {
    "@knxcloud/lowcode-vue-simulator-renderer": "var window.LCVueSimulatorRenderer",
    "vue": "var window.Vue"
  }
}
```

```ts
import { vueRendererConfig } from '@knx/lowcode-vue-simulator-renderer';
import { NConfigProvider, zhCN, dateZhCN } from 'naive-ui';
import { defineComponent, h } from 'vue';

const ConfigProvider = defineComponent((_, { slots }) => {
  return () => h(NConfigProvider, { locale: zhCN, dateLocale: dateZhCN }, slots);
});

vueRendererConfig.setConfigProvider(ConfigProvider);
```

更多详细配置请查看 [DEMO](https://github.com/KNXCloud/lowcode-engine-demo)

## 本地调试

```bash
git clone git@github.com:KNXCloud/lowcode-engine-vue.git
cd lowcode-engine-vue
pnpm install
pnpm start
```

项目启动后，提供了 umd 文件，可以结合 [DEMO](https://github.com/KNXCloud/lowcode-engine-demo) 项目做调试，文件代理推荐[XSwitch](https://chrome.google.com/webstore/detail/xswitch/idkjhjggpffolpidfkikidcokdkdaogg?hl=en-US), 规则参考:

```JSON
{
  "proxy": [
    [
      "(?:.*)unpkg.com/@knxcloud/lowcode-vue-simulator-renderer(?:.*)/dist/(.*)",
      "http://localhost:5559/$1"
    ],
  ]
}
```

## 技术交流

微信搜索: cjf395782896，加好友&备注：低代码引擎，申请入群
