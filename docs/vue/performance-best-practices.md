# 性能与最佳实践

> Vue 的默认性能已经很好——编译器 + 精确响应式替你做了大头。这一页分三部分：**为什么 Vue 快**（编译期优化的原理，知道边界才能用对手段）、**还不够快时怎么办**（按需优化清单）、**高频踩坑总表**（12 条，症状+原因+解法）。

## Vue 为什么默认就快：编译期优化原理

模板不是"翻译成 render 函数"就完事，编译器做了四层优化：

| 优化 | 做法 | 你的体感 |
| --- | --- | --- |
| **静态提升** | 纯静态节点（不含插值/指令）整个提到渲染函数外，只创建一次，后续渲染直接复用同一 vnode | 大段静态布局零成本 |
| **Patch Flag** | 给动态节点打标记：文本变了、class 变了、props 变了分别记录 | diff 时只看标记的槽位，不遍历全部属性 |
| **Block Tree** | 把动态节点收集进扁平"block"列表，更新时跳过静态子树 | 深层嵌套的静态内容不参与 diff |
| **事件懒水合** | `@click` 编译成 `withModifiers(onClick, ...)` 缓存包装，DOM 上不挂真实监听直到事件到来 | 大量带事件的静态列表首屏更快 |

运行时侧：响应式以 **effect（组件渲染/计算属性/侦听器）为粒度**收集依赖——`state.a` 变了，只有读过 `a` 的 effect 会重跑；组件内部再靠 patch flag 定位到具体节点。

**结论：Vue 里"性能优化"的第一要义是不破坏这套机制**——把数据写成非响应式的大对象塞进 `reactive`、在模板里写巨型表达式、滥用 `v-if` 切换重组件，都是在给编译器帮倒忙。

## 还不够快时的手段清单

### 1. 大数据摘掉响应式：shallowRef / markRaw

```js
// 几千行只读列表：深层 proxy 是白花的
const rows = shallowRef(await api.getRows());
rows.value = await api.getRows();      // ✓ 整体替换才触发
rows.value[0].status = 'done';         // ✗ 不触发（也不该触发——内部没代理）

// 第三方类实例（ECharts、地图、Monaco）永久排除代理
const chart = markRaw(new Chart(el));
```

需要"只读展示 + 偶尔整体替换"的数据，`shallowRef` 是收益最大的单项优化。

### 2. 长列表虚拟滚动

只渲染可视区 ± 缓冲的几十行。首选 <a href="https://github.com/tangbc/vue-virtual-scroll-viewport" target="_blank" rel="noopener noreferrer">vue-virtual-scroll-viewport</a> 或 TanStack Virtual（Vue 适配器）；Element Plus 的 `el-table-v2`、Ant Design Vue 的 `VirtualTable` 自带虚拟滚动，中后台直接选型它们更省事。

### 3. v-memo / v-once：手动跳过子树更新

```vue
<!-- 大列表里只有"选中行"会变：其余行整棵子树跳过 diff -->
<div v-for="item in list" :key="item.id" v-memo="[item.id === selected]">
  ...
</div>

<!-- 渲染一次永久静态 -->
<header v-once>{{ siteName }}</header>
```

`v-memo` 依赖数组语义同 React `useMemo`；别到处贴，Profiler 指出哪慢再贴哪。

### 4. KeepAlive 换掉重复挂载

tab/列表-详情来回切，组件重建成本高（大表单、重初始化库）就上 `KeepAlive` + `include`；代价是内存换时间，用 `:max` 限制缓存数。

### 5. 路由级代码分割 + 预加载

```ts
{ path: '/about', component: () => import('./About.vue') }   // 每个路由一个 chunk
```

Vite 下可配 `vite-plugin-prefetch` 或 `import()` 空闲预加载（鼠标 hover 链接时提前拉）。

### 6. 组件库按需引入

```ts
// Element Plus：unplugin-vue-components + unplugin-auto-import 自动按需
// 手动版：只引用到的
import { ElButton } from 'element-plus';
```

全量引入 Element Plus ≈ 700KB+ gzip 前，按需能砍到零头。

### 7. 生产构建检查

```bash
# vite.config.ts
build: {
  sourcemap: false,          // 生产别带
  chunkSizeWarningLimit: 800,
  rollupOptions: { manualChunks: { vue: ['vue','vue-router','pinia'] } }  // 拆基础库
}
```

配 `rollup-plugin-visualizer` 看包体构成，重复依赖、意外全量引入一眼可见。

## 高频踩坑总表

::: danger 12 条，对号入座
1. **忘写 `.value`**
   症状：`count++` 视图不动 / `if (someRef)` 永远真。原因：ref 是对象，`someRef` 恒为真；`count++` 写到了包装对象的新属性上。解法：TS + 命名约定（`xxxRef`），或上 ESLint `vue/no-ref-as-operand`。

2. **解构 reactive / store 丢响应式**
   症状：数据变了界面不更。解法：`toRefs()` / `storeToRefs()`，或不解构。见[响应式](/vue/reactivity-lifecycle)、[Pinia](/vue/state-management)。

3. **props 直接改**
   症状：控制台告警 + 父组件重渲染时子组件改动被覆盖。解法：本地复制副本或 emit 请求父改。

4. **v-if 与 v-for 同元素**
   症状：Vue 3 里 `v-if` 拿不到 `v-for` 变量直接报错。解法：computed 先过滤，或 `<template>` 包一层。见[模板语法](/vue/template-syntax)。

5. **key 用 index**
   症状：列表增删后输入框内容串位、动画乱。解法：用数据自带稳定 id。

6. **onMounted 注册的定时器/全局事件没清理**
   症状：路由来回切几次后内存涨、回调报错"组件已销毁"。解法：`onBeforeUnmount` 成对清理。

7. **在 setup 顶层 await 却没包 Suspense**
   症状：组件不渲染、报异步 setup 相关警告。解法：`<Suspense>` 兜底，或老老实实 `onMounted` 里 then。

8. **watch 监听 reactive 属性写成 `watch(state.count, ...)`**
   症状：报"source 必须是 ref/函数"或永远不触发。解法：`watch(() => state.count, ...)` getter 形式。

9. **computed 里做副作用 / onUpdated 里改状态**
   症状：无限重渲染或难以名状的双重更新。解法：副作用挪 watch，派生值用 computed。

10. **模板里写大函数调用**
    症状：每次重渲染都重算，列表越长越卡。解法：computed 缓存。<span v-pre>`{{ format(expensive(item)) }}`</span> 在循环里是隐形炸弹。

11. **深层大对象塞进 ref/reactive**
    症状：首屏卡、内存翻倍（每个嵌套属性都被代理）。解法：`shallowRef` + 整体替换，或 `markRaw`。

12. **KeepAlive 组件名不匹配 include**
    症状：缓存"没生效"。原因：`<script setup>` 组件默认没有 name（需 `defineOptions({ name: 'X' })` 或插件推断）。解法：显式声明 name 或改用组件对象匹配。
:::

## 调试工具

- **Vue DevTools**（浏览器扩展 + 应用内）：组件树、props/state、Pinia 面板（action 回放）、Router 面板、渲染性能图。对应 React DevTools。
- **Performance 面板**：录制交互看长任务归属；Vue 组件的渲染函数在火焰图里有名字。
- **`onRenderTracked` / `onRenderTriggered`**（调试用生命周期）：打印"谁被追踪了 / 谁的变化触发了本次渲染"，定位意外重渲染利器。
- **ESLint 插件 `eslint-plugin-vue`**：`vue/no-mutating-props`、`vue/require-v-for-key` 等规则把上面一半的坑拦在编码期，必装。

## 回到入口

- 复习 Vue 知识地图 → [Vue 知识库入口](/vue/)
- 具体主题深入 → [模板语法](/vue/template-syntax) · [计算与侦听](/vue/computed-watch) · [组件系统](/vue/components) · [响应式与生命周期](/vue/reactivity-lifecycle) · [表单与通信](/vue/forms-communication) · [路由](/vue/router) · [状态管理](/vue/state-management)
