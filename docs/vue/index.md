# Vue 知识库入口

> 这一套文档是 **Vue 3 知识体系**的系统梳理：从模板语法到响应式原理，从组件设计到路由、状态管理，最后是性能与高频踩坑。不追求抄一遍官方 API 列表，而是按"实际开发中你会遇到的问题"来组织——每个子页都带对照、带坑、带选型建议。适合有 JS 基础、正在学 Vue 或想查缺补漏的开发者。

## Vue 的核心心智：先立框架再抠细节

抓住这几条主线，Vue 3 的绝大多数设计都是它们的推论：

| 主线 | 含义 | 带来的结果 |
| --- | --- | --- |
| **模板是 DSL** | `<template>` 里的指令（`v-if`/`v-for`/`v-model`）由编译器翻译成渲染函数 | 静态内容被提升缓存、依赖被精确收集，"魔法"多、样板少 |
| **响应式系统** | `ref`/`reactive` 基于 Proxy 自动追踪依赖 | 改数据 → 视图自己更新，不需要手动通知 |
| **精确更新** | 编译器 + 运行时共同标记"哪个节点依赖哪份数据" | 默认只重渲染受影响的部分，几乎不需要手动优化 |
| **双向语法糖** | `v-model` 本质是 `modelValue` prop + `update:modelValue` 事件 | 表单开发效率极高，但要看穿它底层仍是单向数据流 |
| **渐进式框架** | 路由、状态管理、构建工具都是官方配套的独立库 | 小到一个 `<script>` 标签，大到一个完整技术栈，按需引入 |

一句话：**Vue 替你把 80% 的决定做了**（依赖追踪、更新粒度、模板编译），你负责业务本身；代价是理解"魔法"的边界——哪些写法会破坏依赖追踪，就是那些高频坑。

## 子页导航

| 序号 | 主题 | 你会学到 |
| --- | --- | --- |
| 1 | [模板语法](/vue/template-syntax) | 插值与 `v-bind`/`v-on` 全家族、class/style 绑定、条件与列表渲染、`key` 的意义、事件修饰符 |
| 2 | [计算属性与侦听器](/vue/computed-watch) | `computed` 缓存与 getter/setter、`watch` 三种形态、`watchEffect`、deep/immediate/flush、选型 |
| 3 | [组件系统](/vue/components) | props/emits 完整链路、`defineModel`、插槽三种形态、动态组件、`KeepAlive`、`Teleport`、异步组件 |
| 4 | [响应式与生命周期](/vue/reactivity-lifecycle) | Proxy 原理、`ref` vs `reactive`、失活陷阱、生命周期图谱、`nextTick`、组合式函数 |
| 5 | [表单与组件通信](/vue/forms-communication) | `v-model` 原理与全部修饰符、原生表单控件绑定、校验方案、通信方式全景图 |
| 6 | [路由 vue-router](/vue/router) | 路由配置全语法、嵌套与动态匹配、导航守卫执行顺序、`meta` 鉴权、滚动与懒加载 |
| 7 | [状态管理 Pinia](/vue/state-management) | state/getters/actions、option/store 两种写法、`storeToRefs`、持久化、模块化、Pinia vs 组件状态 |
| 8 | [性能与最佳实践](/vue/performance-best-practices) | 编译优化原理（静态提升/patch flag）、`shallowRef`/`v-memo`、虚拟列表、打包优化、12 条高频踩坑 |

建议路径：**1 → 2 → 3 → 4 是地基**（尤其第 4 页的响应式原理，它解释了前面所有"为什么"）；5~7 是三大官方配套库的实战向梳理；8 在遇到性能问题或诡异现象时回来对照。

## 速查总表：Vue 2 → Vue 3 主要变化

还在维护或迁移 Vue 2 项目时，这张表能省很多查文档的时间：

| 方面 | Vue 2 | Vue 3 |
| --- | --- | --- |
| 组件写法 | Options API（data/methods/computed 分块） | 组合式 API + `<script setup>`（仍兼容 Options） |
| 响应式实现 | `Object.defineProperty`，需 `Vue.set` 处理新增属性 | `Proxy`，新增/删除属性都能感知 |
| 逻辑复用 | mixin（命名冲突、来源不清） | 组合式函数（composable，显式导入导出） |
| 局部状态 | `data() { return {...} }` | `ref()` / `reactive()` |
| 侦听 | `watch` 选项 | `watch` / `watchEffect` 函数 |
| 事件总线 | `new Vue()` + `$on/$emit` | 已移除，用 [mitt](https://github.com/developit/mitt) 等极小库或提升状态 |
| 全局状态 | Vuex（mutations + actions） | Pinia（只有 state/getters/actions） |
| 路由 | vue-router 3 | vue-router 4（`createRouter` + history 模式拆分） |
| 函数式组件 | 需要特殊标记 | 无状态函数组件被移除，用模板即可 |
| `.sync` 修饰符 | `:prop.sync` | `v-model:prop` |
| `$listeners` | 单独存在 | 并入 `$attrs` |
| 过滤器 `\|` 管道 | 模板内置 filter | 已移除，用 computed 或方法代替 |
| 根节点 | 单根限制 | 多根（Fragment），需要显式透传 attribute |
| Teleport | 无（只能手动 appendTo） | 内置 `<Teleport to="body">` |
| 构建工具 | webpack + vue-cli | Vite + `@vitejs/plugin-vue`（事实标准） |
| 类型支持 | TS 支持勉强 | 对 TS 原生友好，`defineProps<T>()` 泛型推导 |

## 学习资源

- <a href="https://cn.vuejs.org" target="_blank" rel="noopener noreferrer">Vue 3 官方文档（中文）</a>：新版交互式文档质量极高，"快速开始"与"深入响应式原理"两篇必读。
- <a href="https://router.vuejs.org/zh/" target="_blank" rel="noopener noreferrer">Vue Router 官方文档</a>：路由守卫执行顺序一节讲得比任何博客都清楚。
- <a href="https://pinia.vuejs.org/zh/" target="_blank" rel="noopener noreferrer">Pinia 官方文档</a>：短小精悍，一小时读完即可上手。
- <a href="https://cn.vitejs.dev" target="_blank" rel="noopener noreferrer">Vite 中文文档</a>：构建与开发服务器配置。
- <a href="https://vuejs.org/style-guide/" target="_blank" rel="noopener noreferrer">Vue 官方风格指南</a>：命名、属性顺序、模板表达式的取舍标准。
