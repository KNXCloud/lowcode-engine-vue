# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

## [1.4.7](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.4.6...v1.4.7) (2022-08-30)


### Bug Fixes

* **vue-renderer:** 修复数据源初始化无法正常设置值到 state 中 ([97f3b08](https://github.com/KNXCloud/lowcode-engine-vue/commit/97f3b08bf5fcb745ccc84bcb537a3170a53b3564))


### Features

* **vue-simulator-renderer:** slot 组件自动撑满父级容器高度 ([87dd933](https://github.com/KNXCloud/lowcode-engine-vue/commit/87dd933f1144481403cff0ecc1b96a470ba0a4de))





## [1.4.6](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.4.5...v1.4.6) (2022-08-10)


### Bug Fixes

* **vue-renderer:** 修复跨层级更新子组件时组件渲染异常 ([44bbabb](https://github.com/KNXCloud/lowcode-engine-vue/commit/44bbabbef9c7b945225a4a60031e479f6faf5b51))
* **vue-simulator-renderer:** 修复移动画布组件位置导致的渲染错误 ([2fc636d](https://github.com/KNXCloud/lowcode-engine-vue/commit/2fc636d8521ecb15bef23c5c3ee2181c3cad42cd))





## [1.4.5](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.4.4...v1.4.5) (2022-07-29)

**Note:** Version bump only for package lowcode-engine-vue





## [1.4.4](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.4.3...v1.4.4) (2022-07-21)

**Note:** Version bump only for package lowcode-engine-vue





## [1.4.3](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.4.2...v1.4.3) (2022-07-21)


### Bug Fixes

* **vue-renderer:** 调整 dataSource options 处理逻辑 ([9b9642a](https://github.com/KNXCloud/lowcode-engine-vue/commit/9b9642ac8bb78bd7f77af9ae99f6596e7aa00106))


### Features

* **hooks:** 提供 hooks 用于自定义组件和画布通讯 ([7af68a9](https://github.com/KNXCloud/lowcode-engine-vue/commit/7af68a985fd1374d3a2d6a17b80e735a30bb54fe))
* **vue-renderer:** 新增 dataSource 对象便于调用数据源接口 ([08c9704](https://github.com/KNXCloud/lowcode-engine-vue/commit/08c970457ba5691df14e8d122ba2192a90a3e529))





## [1.4.2](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.4.1...v1.4.2) (2022-07-14)


### Bug Fixes

* **vue-renderer:** 修复 schema id 为纯数字开头时导致的渲染报错 ([f98faa7](https://github.com/KNXCloud/lowcode-engine-vue/commit/f98faa78758d76a3af65ba87736424442ec6aada))





## [1.4.1](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.4.0...v1.4.1) (2022-07-12)


### Bug Fixes

* **utils:** 修复 __VUE_HMR_RUNTIME__ 值为空报错 ([298091e](https://github.com/KNXCloud/lowcode-engine-vue/commit/298091e0112faea3aa7f55593d9299cc2ec55a5f))
* **vue-renderer:** 修复默认插槽错误渲染导致部分组件渲染异常 ([8c116de](https://github.com/KNXCloud/lowcode-engine-vue/commit/8c116debd7a2db4526b4d8a51aab4569cd419c1e))
* **vue-renderer:** 修复组件非根属性更新导致的组件渲染异常 ([95f950e](https://github.com/KNXCloud/lowcode-engine-vue/commit/95f950eeda727e48f3a5c9426b8c654f12268d9d))





# [1.4.0](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.3.5...v1.4.0) (2022-07-06)


### Bug Fixes

* **vue-renderer:** fix v-model binding failure ([844f4c2](https://github.com/KNXCloud/lowcode-engine-vue/commit/844f4c253c6a4b9e235759cb558852cb4fba390a))
* **vue-renderer:** ignore hidden in live mode ([9977c0a](https://github.com/KNXCloud/lowcode-engine-vue/commit/9977c0ac76f4b6f207a85e4f0cf106c01ce724c5))


### Features

* **vue-simulator-renderer:** 适配模态框组件拖拽及组件元素定位 ([9a4a03a](https://github.com/KNXCloud/lowcode-engine-vue/commit/9a4a03afc0b35f520254529650e94a46d30e89fd))





## [1.3.5](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.3.4...v1.3.5) (2022-07-04)


### Features

* **vue-renderer:** supports locked default slot ([af706b9](https://github.com/KNXCloud/lowcode-engine-vue/commit/af706b94f6557962e36da5d705f921e0bd07a85e))
* **vue-simulator-renderer:** exports renderer content ([f8f2e62](https://github.com/KNXCloud/lowcode-engine-vue/commit/f8f2e629bcda43fe23e30ddae0e1ec633d86c60e))





## [1.3.4](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.3.3...v1.3.4) (2022-07-03)


### Bug Fixes

* **vue-simulator-renderer:** disable vue prod devtools ([531ee0e](https://github.com/KNXCloud/lowcode-engine-vue/commit/531ee0ec1b4aac96dace063f87f8c59cbc21d996))





## [1.3.3](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.3.2...v1.3.3) (2022-07-03)


### Features

* **utils:** remove lodash and @alilc/lowcode-utils dependency ([f7b0a68](https://github.com/KNXCloud/lowcode-engine-vue/commit/f7b0a684a7543c6cf5b0f4cf68b9bbb80ea6c4d7))





## [1.3.2](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.3.1...v1.3.2) (2022-07-03)


### Bug Fixes

* **vue-renderer:** dataSource request error when params is empty ([5ddec10](https://github.com/KNXCloud/lowcode-engine-vue/commit/5ddec107086a3fe53e5e45da144b18c3df83ca68))


### Features

* **utils:** add environment setup util ([07f09de](https://github.com/KNXCloud/lowcode-engine-vue/commit/07f09def639273c3f33b896f06ab31bdbb162792))
* **vue-simulator-renderer:** build vue-router as internal dependency ([91d3d31](https://github.com/KNXCloud/lowcode-engine-vue/commit/91d3d31b302f37cb9cebc12d4b0e61c54d26436c))





## [1.3.1](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.3.0...v1.3.1) (2022-07-02)


### Features

* **vue-renderer:** supports ref prop ([9883532](https://github.com/KNXCloud/lowcode-engine-vue/commit/9883532b717c53a7025dc3cf8f6282de96f7ebf5))
* **vue-simulator-renderer:** add page builtin-component ([79178ff](https://github.com/KNXCloud/lowcode-engine-vue/commit/79178ffb83b02f23ce1505577fe683aab73a2de3))





# [1.3.0](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.2.0...v1.3.0) (2022-07-01)


### Features

* **vue-renderer:** change slot params handle ([0139b3c](https://github.com/KNXCloud/lowcode-engine-vue/commit/0139b3cb62e08a4fc2c29734485b65bef92710c7))





# [1.2.0](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.1.5...v1.2.0) (2022-06-30)


### Features

* **vue-renderer:** enhance slot and optimize scope ([f1454ea](https://github.com/KNXCloud/lowcode-engine-vue/commit/f1454eaae738cf8c0a12e0e34bd5a576f43cc85c))





## [1.1.5](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.1.4...v1.1.5) (2022-06-30)


### Features

* **vue-renderer:** adapter naive private props ([2a36671](https://github.com/KNXCloud/lowcode-engine-vue/commit/2a36671f0ec8b3295e5664e18549a345be64b2a1))





## [1.1.4](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.1.3...v1.1.4) (2022-06-27)


### Bug Fixes

* **vue-renderer:** extra props obtain failed ([a73ddea](https://github.com/KNXCloud/lowcode-engine-vue/commit/a73ddea49688aa56aebebd8bf07db862053bf441))





## [1.1.3](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.1.2...v1.1.3) (2022-06-27)

**Note:** Version bump only for package lowcode-engine-vue





## [1.1.2](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.1.1...v1.1.2) (2022-06-24)


### Bug Fixes

* **vue-simulator-renderer:** failed to get instance uid ([cdb25ca](https://github.com/KNXCloud/lowcode-engine-vue/commit/cdb25ca10fe38eea0000a4ef4889d9e40158c980))





## [1.1.1](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.1.0...v1.1.1) (2022-06-24)


### Features

* update versions ([ed20df8](https://github.com/KNXCloud/lowcode-engine-vue/commit/ed20df8055dd13c75638774a9b12f409fdec8c94))
* **vue-renderer|vue-simulator-renderer:** modify the el access method ([af454ea](https://github.com/KNXCloud/lowcode-engine-vue/commit/af454ea47d44298ef04fd0ead2359403e2c1e77d))





# [1.1.0](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.0.5...v1.1.0) (2022-06-16)


### Features

* **vue-renderer:** supports v-model prop compile ([0ea42ae](https://github.com/KNXCloud/lowcode-engine-vue/commit/0ea42ae71209c01eace47445c33421fef76a9f9e))





## [1.0.5](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.0.4...v1.0.5) (2022-06-15)


### Bug Fixes

* **vue-renderer:** 修复 Hoc 跨层级更新节点导致的渲染异常 ([aa683a0](https://github.com/KNXCloud/lowcode-engine-vue/commit/aa683a0b767f1d80a89dbfeb5a1d480f4f08c6a3))





## [1.0.4](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.0.3...v1.0.4) (2022-06-15)


### Bug Fixes

* **vue-renderer:** 修复 hoc 移除节点功能异常 ([051ef81](https://github.com/KNXCloud/lowcode-engine-vue/commit/051ef8183bd0ee7c7e3b6c8565543e739c987d5e))





## [1.0.3](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.0.2...v1.0.3) (2022-06-15)

**Note:** Version bump only for package lowcode-engine-vue





## [1.0.2](https://github.com/KNXCloud/lowcode-engine-vue/compare/v1.0.1...v1.0.2) (2022-06-15)

**Note:** Version bump only for package lowcode-engine-vue





## 1.0.1 (2022-06-15)

**Note:** Version bump only for package lowcode-engine-vue
