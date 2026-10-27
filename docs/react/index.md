# React 知识库入口

> 这一套文档是给**已经熟悉 Vue 的开发者**准备的 React 迁移地图。不从零教编程，只回答一个问题：你会的那些 Vue 知识，在 React 里对应什么、哪里"手感"完全不同、哪些坑几乎每个 Vue 转 React 的人都踩过。内容已按主题拆成子页，建议按下面的顺序读。

## 先立心智模型：换脑子，再学 API

Vue 和 React 都是"组件化 + 虚拟 DOM"，但底层哲学相反。抓住这张表，后面每个子页都是它的展开：

| 维度 | Vue 3 | React |
| --- | --- | --- |
| 核心机制 | **响应式系统**：`ref`/`reactive` 自动追踪依赖，数据变了视图自己更新 | **重新渲染**：state 一变，整个组件函数**重新执行一遍**，生成新 JSX 交给 diff |
| 模板/逻辑 | 模板是 DSL，编译器做静态提升、依赖收集，"魔法"多 | JSX 就是 JS，没有魔法——你能写出什么代码，就能渲染什么内容 |
| 更新粒度 | 编译器精确标记哪些节点受影响 | 默认组件级整棵子树重渲染，**性能优化要靠你手动控制**（memo 家族） |
| 数据流向 | 双向绑定 `v-model` 是标配语法 | **单向数据流**，"双向"要自己用 value + onChange 拼出来 |
| 状态可变性 | 直接改：`state.count++` | **禁止原地改**：一切 state 更新都要换新对象（不可变数据） |
| 组织方式 | 按"功能选项"分块（template / script / style） | 一切皆函数与调用顺序（hooks） |

一句话：**Vue 帮你做了 80% 的决定，React 把选择权（和责任）都还给你。** 前期会觉得"怎么什么都要我自己来"，换来的是极致的灵活与可推导性。

## 子页导航

| 序号 | 主题 | 你会学到 |
| --- | --- | --- |
| 1 | [JSX 与模板语法](/react/jsx) | `v-if`/`v-for`/<span v-pre>`{{}}`</span>/`@click`/`v-model`/`<slot>` 逐个翻译成 JSX；三个 JSX 细节坑 |
| 2 | [组件与状态](/react/components-state) | 函数组件、props、`useState`、**不可变数据铁律**、没有 nextTick、受控表单 |
| 3 | [Hooks 详解](/react/hooks) | `useEffect`/`useRef`/`useMemo`/`useCallback`/自定义 Hook；**依赖数组与闭包陷阱** |
| 4 | [组件通信](/react/communication) | props/回调、children 代插槽、**Context 与 provide/inject 的差异**、状态提升 |
| 5 | [路由](/react/router) | React Router v6 全解，与 vue-router 逐项对照；守卫怎么写 |
| 6 | [状态管理](/react/state-management) | Zustand/Redux Toolkit/Jotai/MobX 选型；**服务端数据交给 React Query** |
| 7 | [性能与高频踩坑](/react/performance-pitfalls) | 重渲染模型、memo 三件套配合、13 条 Vue 转 React 踩坑清单、调试工具 |

建议路径：**1 → 2 → 3 是地基**（尤其"不可变数据"和"依赖数组"两条，是 React 与 Vue 分歧最大的地方），务必先读；4~6 按需查阅；7 在遇到诡异现象时回来对照。

## 速查总表

| 概念 | Vue 3 | React |
| --- | --- | --- |
| 组件定义 | SFC + `<script setup>` | 函数 + JSX |
| 局部状态 | `ref` / `reactive` | `useState`（不可变更新） |
| 计算派生 | `computed` | 直接算 / `useMemo` |
| 侦听 | `watch` / `watchEffect` | `useEffect(fn, deps)` |
| 生命周期 | `onMounted` 等全家桶 | 主要是 `useEffect` 一家独大 |
| DOM 引用 | template ref | `useRef` + `ref` 属性 |
| 样式隔离 | `<style scoped>` | CSS Modules / CSS-in-JS |
| 插槽 | `<slot>` / `#name` | `children` / JSX props / render prop |
| 跨层通信 | `provide` / `inject` | Context（注意重渲染范围） |
| 路由 | vue-router（实例式 + 守卫） | React Router（组件式 + 包装守卫） |
| 全局状态 | Pinia | Zustand / Redux Toolkit（+ React Query 管服务端数据） |
| 过渡动画 | `<Transition>` / `<KeepAlive>` | 第三方：framer-motion 等 |
| 构建工具 | Vite | Vite（CSR 推荐）/ Next.js（SSR/RSC） |
| 元框架 | Nuxt | Next.js |
| 调试 | Vue DevTools | React DevTools |

## 学习资源

- <a href="https://react.dev" target="_blank" rel="noopener noreferrer">react.dev</a>：官方新文档，"Thinking in React" 一节专治 Vue 肌肉记忆冲突，强烈推荐第一读。
- <a href="https://reactrouter.com" target="_blank" rel="noopener noreferrer">React Router</a>：路由官方文档。
- <a href="https://zustand.docs.pmnd.rs" target="_blank" rel="noopener noreferrer">Zustand</a>：最简 store，十分钟上手。
- <a href="https://tanstack.com/query" target="_blank" rel="noopener noreferrer">TanStack Query</a>：服务端状态管理事实标准（Vue 版同款，你在 Vue 里可能已经用过）。
- <a href="https://legacy.reactjs.org/docs/faq-hooks.html" target="_blank" rel="noopener noreferrer">Hooks FAQ</a>：闭包陷阱等疑难杂症的官方解释。
