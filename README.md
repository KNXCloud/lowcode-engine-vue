# lowcode-engine-vue

Lowcode Engine Vue 渲染器及适配器实现

## 和 React 渲染器使用区别

使用变量时：

- `this.props.xxx` -> `this.xxx`
- `this.state.xxx` -> `this.xxx`

现阶段 vue 代码编辑器还未适配，可以直接使用 react 代码编辑器编辑代码，渲染器已做适配

- state 内容会自动转化为 vue data
- lifecycle 自动适配为 vue lifecycle
  - `componentDidMount` -> `onMounted`
  - `componentDidCatch` -> `onErrorCaptured`
  - `shouldComponentUpdate` -> `onBeforeUpdate`
  - `componentWillUnmount` -> `onBeforeUnmount`
- 其余方法自动转化为 vue methods

## 使用示例

### 直接使用 cdn 渲染器及适配器

```ts
import { init } from '@alilc/lowcode-engine';

init(document.getElementById('lce'), {
  // ...
  simulatorUrl: [
    'https://unpkg.com/vue@3.2.37/dist/vue.runtime.global.prod.js',
    'https://unpkg.com/vue-router@4.0.16/dist/vue-router.global.prod.js',
    'https://unpkg.com/@knxcloud/lowcode-vue-simulator-renderer@1.0.0/dist/vue-simulator-renderer.js',
    'https://unpkg.com/@knxcloud/lowcode-vue-simulator-renderer@1.0.0/dist/vue-simulator-renderer.css',
  ],
});
```

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
import { vueRendererConfig } '@knx/lowcode-vue-simulator-renderer';
import { NConfigProvider, zhCN, dateZhCN } from 'naive-ui';
import { FunctionalComponent, h } from 'vue';

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
      "https://unpkg.com/@knxcloud/lowcode-vue-simulator-renderer@1.0.0/dist/(.*)",
      "http://localhost:5559/$1"
    ],
  ]
}
```
