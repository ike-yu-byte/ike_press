# 水合 Hydration：静态 HTML 如何变成 Vue 应用

> 第 3 站：服务端返回的 HTML 只是"能看"，没有事件、没有响应式、没有 Vue 实例。**水合（Hydration，也叫激活 / 注水）**就是把这份已经存在的 DOM 认领下来，让应用变得可交互。它是 SSR 链条上最容易出 bug 的一环，也是理解 Nuxt 各种"奇怪写法"的钥匙。

## 一、水合不是重新渲染

普通 SPA 用 `createApp(App).mount('#app')`：把容器清空，从零创建 DOM。SSR 模式下 Nuxt 用 `createSSRApp(App)`，挂载时 Vue 走 `hydrate()` 分支：

```
普通 mount：                    hydrate：
清空 #app                       保留 #__nuxt 内已有的 DOM
  └─ 按 vnode 新建所有节点        └─ 按 vnode 逐个"比对并认领"已有节点
                                    ├─ 元素节点：复用 el，绑定事件 / props / class
                                    ├─ 文本节点：校验内容，挂上响应式依赖
                                    └─ 组件节点：创建组件实例，接上 ref / computed / watch
```

为什么不直接重画？因为重画会**整页闪烁、丢滚动位置、丢输入框焦点与已输入内容、丢播放中的视频状态**，并且把 SSR 换来的 FCP 优势浪费掉。

### 水合的五个步骤

```
① 浏览器解析 HTML → 立刻绘制出内容（可看，不可点）
② 下载并执行 client bundle
③ 客户端入口读取 __NUXT_DATA__ → 还原 payload → 挂到 useNuxtApp().payload
④ createSSRApp() 创建同构组件树；useFetch/useState 命中 payload 缓存，不再请求
⑤ hydrate() 逐个复用 DOM、绑定事件、激活响应式 → onMounted → 可交互（TTI）
```

第 ③④ 步就是[序列化篇](/nuxt/serialization-payload)的落点：**payload 是水合的输入**。服务端用数据 `D` 渲染出 DOM `H`，客户端必须用**同样的 `D`** 得到同样的 vnode，才能和 `H` 对上。任何让 `D` 或渲染逻辑在两端不一致的因素，都会造成 hydration mismatch。

## 二、Hydration mismatch 到底是什么

Vue 开发环境的典型警告：

```
[Vue warn]: Hydration text mismatch in <h1>:
- Client: 2026/11/6 下午 4:00
- Server: 2026/11/6 08:00
[Vue warn]: Hydration node mismatch ...
```

含义：**客户端按当前状态算出的 vnode，和服务端留下的真实 DOM 对不上**。Vue 的处理策略是"报警告 + 放弃不匹配的这一段，改用客户端渲染结果重新生成"（生产构建里警告可能被移除，于是表现为**页面悄悄闪一下 / 局部重排**）。所以 mismatch 不是可以忽略的噪音：它意味着 SSR 产出的 HTML 被丢弃了一部分，SEO 与首屏收益打折扣，还可能带出事件绑定错位。

### 成因全表

| 类别 | 典型写法 | 为什么两端不一致 |
| --- | --- | --- |
| **时间 / 随机数** | `Date.now()`、`Math.random()`、`new Date().toLocaleString()` | 服务端与客户端执行时刻不同、时区与 locale 不同 |
| **浏览器 API** | `window.innerWidth`、`localStorage.getItem`、`navigator.userAgent`、`matchMedia` | 服务端没有这些对象，只能走 fallback 分支 |
| **条件渲染分歧** | `v-if="isMobile"`、`v-if="isLoggedIn"`（SSR 时 cookie 未透传） | 两端判断结果不同，DOM 结构直接不同 |
| **数据不一致** | 裸 `$fetch`、接口随机排序、A/B 实验、缓存版本不同 | 客户端重新取数与服务端那份不同 |
| **payload 没带过来** | 服务端只用了局部变量；`server: false` 却按有数据渲染 | 客户端首次渲染拿不到值 |
| **非法 HTML** | `<p><div>…</div></p>`、`<table>` 里直接放组件、漏写 `<tbody>` | 浏览器解析 HTML 时会自动纠错、移动节点，DOM 与 vnode 结构不符 |
| **第三方库直改 DOM** | 图表/广告/富文本插件在初始化时插节点、删节点 | 水合前 DOM 已被改写 |
| **空白与实体编码** | 模板里靠换行缩进控制文本、`&nbsp;` 与手写空格混用 | 服务端字符串与浏览器解析后的文本节点不同 |
| **国际化 / 格式化** | 依赖浏览器 `navigator.language` 或系统字体/时区 | 服务端默认 locale 与用户环境不同 |
| **ID / key 不稳定** | 用随机数或数组下标生成 `id` / `:key` / `for` | 两端生成不同标识 |
| **客户端插件抢跑** | 插件在水合前修改 DOM 或注入全局样式影响布局 | 与 SSR 输出不同步 |

> 排查时记住一句口诀：**mismatch 一定是"服务端 HTML"与"客户端首次渲染"不一致**，去对比这两者，而不是盯着后续的交互更新。

## 三、定位 mismatch 的标准流程

1. **确认是水合问题**：Console 出现 `Hydration ... mismatch`；或首屏短暂出现旧内容后闪成新内容；或元素事件偶发失效。
2. **看服务端原始 HTML**：`View Source` / `curl`（**不要用 DevTools Elements**，那是水合后的 DOM）。搜索关键字，确认服务端到底输出了什么。
3. **对比 payload**：在同一份 HTML 里找 `__NUXT_DATA__`，检查对应 `data` / `state` 是否是客户端期望的值。
4. **二分法**：临时在 `nuxt.config.ts` 设 `ssr: false`，若现象消失 → 双端一致性问题；若仍在 → 纯客户端逻辑 bug。
5. **缩小范围**：把可疑组件逐个用 `<ClientOnly>` 包起来，或者注释掉，快速锁定组件。
6. **检查 HTML 合法性**：嵌套是否合规、表格/列表结构是否被浏览器改写。
7. **最后再看第三方**：图表、地图、编辑器、广告 SDK 是否在水合前操作 DOM。

## 四、修复工具箱

### 1. `<ClientOnly>`：只在客户端渲染这块内容

```vue
<template>
  <div>
    <h1>{{ post.title }}</h1>              <!-- 保持 SSR，SEO 需要它 -->

    <ClientOnly>
      <Chart :data="post.stats" />        <!-- 依赖 canvas/window，服务端跳过 -->
      <template #fallback>
        <p>图表加载中…</p>                  <!-- 服务端输出的占位内容 -->
      </template>
    </ClientOnly>
  </div>
</template>
```

原理：服务端只渲染 `fallback`，客户端水合完成后再挂载真实子组件，因此这块 DOM 天然不参与双端比对。**代价是这部分内容不进 HTML**，需要 SEO 的正文、标题、描述绝不能包进去。

### 2. `onMounted` / `import.meta.client`：把浏览器逻辑推迟到水合之后

```vue
<script setup lang="ts">
const width = ref<number | null>(null)

// ❌ 服务端执行时 window 不存在，且两端初始值不同
// const width = ref(window.innerWidth)

// ✅ 水合完成后才赋值，首屏服务端与客户端都渲染同一个 fallback
onMounted(() => { width.value = window.innerWidth })
</script>

<template>
  <p>屏幕宽度：{{ width ?? '测量中…' }}</p>
</template>
```

```ts
// composables/useMounted.ts —— 复用版
export function useMounted() {
  const mounted = ref(false)
  onMounted(() => { mounted.value = true })
  return mounted
}
```

环境判断则用于"同一逻辑两端走不同分支"：

```ts
if (import.meta.server) {
  // 只在服务端：读 event.context、连库、读私有配置
}
if (import.meta.client) {
  // 只在客户端：访问 DOM、埋点、注册事件
}
```

> 旧代码里的 `process.server` / `process.client` 仍可见，但新项目建议用 `import.meta.server` / `import.meta.client`，tree-shaking 更干净。

### 3. `<NuxtClientFallback>`：水合失败时自动回退

```vue
<NuxtClientFallback fallback-tag="div" @ssr-error="logSsrError">
  <ThirdPartyWidget />
  <template #fallback>内容加载中…</template>
</NuxtClientFallback>
```

当子组件在 SSR 期间抛错或水合无法完成时，Nuxt 用 `fallback` 内容顶上并改为纯客户端渲染。适合包裹不可控的第三方组件（该能力在部分版本标记为实验性，用前确认当前版本文档）。

### 4. 让双端输入一致：`useState` / `useCookie` / `useRequestHeaders`

```ts
// 服务端算一次，值随 payload 传给客户端，避免随机/时间不一致
const seed = useState('seed', () => Math.floor(Math.random() * 1000))
```

```ts
// 服务端把浏览器的 cookie / UA / 语言转给内部接口，避免"服务端未登录、客户端已登录"
const headers = useRequestHeaders(['cookie', 'user-agent'])
const { data } = await useFetch('/api/me', { headers })
```

`useCookie` 在服务端从请求头读、在客户端从 `document.cookie` 读，天然同构；`useState` 保证同一 key 在两端取到同一值（值来自 payload）。

### 5. 时间、随机数、ID 的稳定化

| 写法 | 建议 |
| --- | --- |
| 显示时间 | 服务端用 **UTC / 固定 locale** 格式化成字符串，把字符串传下来；或在 `onMounted` 后再按本地时区格式化 |
| 随机值 | 服务端生成 → 放进 `useState` → 客户端复用；纯装饰性随机放 `onMounted` |
| `id` / `for` / `:key` | 用数据自身稳定标识；需要自动生成时用较新 Vue/Nuxt 提供的 `useId()`，它保证双端一致 |
| `v-for` 的 key | 永远用业务 id，不用数组下标，更不用随机数 |

### 6. HTML 结构与第三方库

- 模板中避免 `<p>` 包 `<div>`、`<table>` 缺 `<tbody>` 等浏览器会自动修正的结构；
- 图表、地图、编辑器统一放进 `<ClientOnly>`，并在组件 `onMounted` 里初始化、`onUnmounted` 里销毁；
- 只影响开发环境的调试 UI 用 `<DevOnly>` 包起来。

## 五、水合的性能成本与进阶方案

水合不是免费的：客户端要**下载全部首屏 JS → 解析执行 → 遍历整棵 DOM → 为每个节点建组件实例与依赖**。内容越多、交互组件越多，"可看"到"可点"之间的空窗越长（尤其是移动端）。优化方向：

| 方案 | 做法 | 取舍 |
| --- | --- | --- |
| **减少首屏交互组件** | 静态内容保持纯 HTML，交互组件按需 `defineAsyncComponent` / 懒加载 | 最稳妥的通用手段 |
| **缩小 payload** | `pick` / `transform`、分页（见[序列化篇](/nuxt/serialization-payload)） | 同时改善 TTFB 与水合解析 |
| **延迟水合** | 社区模块 `nuxt-delay-hydration` 把水合推迟到空闲或首次交互 | 需评估交互响应、埋点与可访问性 |
| **岛屿架构 / Server Components** | Nuxt 实验性的 `experimental.componentIslands` 与 `<NuxtIsland>`：只有"岛屿"组件在客户端水合，其余保持服务端 HTML | 能力随版本演进，需确认实验开关与部署平台支持 |
| **按路由关 SSR** | `routeRules: { '/admin/**': { ssr: false } }` | 对不需要 SEO 的页面最省事，见[渲染模式篇](/nuxt/rendering-modes-and-deploy) |

> 一句话选型：先做「减数据 + 减交互组件」，再考虑延迟水合/岛屿这类进阶方案；不要一上来引入实验特性。

## 六、症状 → 修复速查

| 症状 | 最可能原因 | 先看哪一篇 |
| --- | --- | --- |
| Console 报 `Hydration text mismatch` | 时间/随机数/格式化/i18n 两端不同 | 本文 §2、§4.5 |
| Console 报 `Hydration node mismatch` | 条件渲染分歧、非法 HTML、第三方改 DOM | 本文 §2、§4.6 |
| 页面首屏闪一下、内容跳变 | 客户端重新取数、裸 `$fetch`、payload 未命中 | [数据获取](/nuxt/data-fetching) |
| `window is not defined` / `localStorage is not defined` | 浏览器 API 在服务端执行 | [SSR 原理](/nuxt/ssr-principles) §4 |
| 同一个接口发两次请求 | 没用 `useFetch`，或 key 不稳定 | [数据获取](/nuxt/data-fetching) |
| 按钮首屏点不动，过几秒才好 | 水合慢（JS 体积 / payload 过大 / 组件过多） | 本文 §5 |
| 登录后 SSR 显示未登录、水合后变已登录 | 服务端请求没带 cookie / 用户信息没进 payload | [序列化篇](/nuxt/serialization-payload)、[路由与服务端层](/nuxt/routing-and-architecture) |

## 回到入口

- 复习整体地图 → [Nuxt 知识库入口](/nuxt/)
- 前后衔接 → [序列化与 Payload](/nuxt/serialization-payload) · [SSR 原理](/nuxt/ssr-principles) · [数据获取与跨端状态](/nuxt/data-fetching) · [高频踩坑](/nuxt/pitfalls-cheatsheet)
