# SSR 原理：一次请求的完整链路

> 第 1 站：先别急着写 `useFetch`。这一篇只回答一个问题——**从浏览器敲下回车，到页面能被点击，中间到底发生了什么**。把这条链路记牢，后面序列化、水合、双端踩坑都只是链路上的某一段。

## 一、先看清对手：纯 CSR 为什么不够

Vue SPA（Vite 创建的普通项目）返回的 HTML 基本是空壳：

```html
<!doctype html>
<html>
  <head><title>My App</title></head>
  <body>
    <div id="app"></div>                 <!-- 空的 -->
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

浏览器必须依次完成：**下载 HTML → 下载 JS → 解析执行 JS → 组件渲染 → 发接口取数 → 再渲染一次**，用户才看到内容。由此带来三个硬伤：

| 问题 | 表现 |
| --- | --- |
| **首屏白屏** | FCP 被 JS 体积、弱网、低端机拖慢；JS 报错就是整页白屏 |
| **SEO / 抓取** | 搜索引擎与微信、Twitter 的分享卡片拿到的是空 `div`，看不到正文与标题（现代爬虫能执行 JS，但成本高、不稳定） |
| **TTI 与 FCP 绑死** | 内容出现和可交互几乎同时，且都在 JS 执行之后 |

SSR 的思路很朴素：**把"组件 → DOM"这一步提前到服务器做**，让浏览器第一次拿到的就是有内容的 HTML；再让客户端 Vue 接管这些 DOM，恢复交互能力。

## 二、Nuxt 的架构：谁负责哪一段

```
                       ┌──────────── 构建期（Vite）────────────┐
                       │  server bundle（Node 跑的 SSR 代码）    │
                       │  client bundle（浏览器跑的 JS chunk）   │
                       └───────────────────────────────────────┘
                                    ↑ 同一份 .vue 源码，两套产物

浏览器 ──① HTTP──▶ Nitro Server ──② 新建 app 实例──▶ Vue SSR Runtime
                        │                              │
                        │ server/api/*（h3 handlers）   │ ③ setup + useFetch 取数
                        │ server/middleware/*           │ ④ renderToString → HTML
                        │ routeRules / 缓存             │ ④ devalue → Payload
                        └────────⑤ HTML + Payload───────┘
                                    │
浏览器 ◀── ⑥ 解析显示 ── ⑦ 下载 client bundle → 读取 Payload → hydrate() → 接管交互
```

几个角色的分工：

| 角色 | 职责 |
| --- | --- |
| **Vue 3** | 组件、响应式、`renderToString` / `createSSRApp` / `hydrate` |
| **Vite** | 开发服务器与打包；同份源码打出 **server / client 两份 bundle** |
| **Nitro** | 真正监听端口的服务端引擎；托管 `server/api`、静态资源、预渲染、缓存、多平台部署 |
| **Nuxt 框架层** | 文件路由、自动导入、composables、payload 注入与读取、生命周期编排 |
| **h3** | Nitro 内的极简 HTTP 层，`defineEventHandler` / `readBody` / `getCookie` 都来自它 |

> 关键认知：**"SSR 需要一台服务器"指的就是 Nitro**。把 Nuxt 丢到纯静态 OSS 上，只能跑 SPA 或预渲染后的 SSG；要每个请求实时出 HTML，就需要 Node、Serverless Function、Edge Worker 之类能执行服务端代码的运行时。

## 三、逐帧拆解一次 SSR 请求

下面这段代码是一个最小但完整的例子，后面 ①~⑧ 都围绕它：

```ts
// server/api/posts/[id].get.ts —— 服务端接口，只有服务端会执行
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const post = await db.post.find(id)          // 直接连库，不经过公网 HTTP
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  return post
})
```

```vue
<!-- pages/posts/[id].vue —— 这份组件代码会跑两次：服务端一次、客户端一次 -->
<script setup lang="ts">
const route = useRoute()
const { data: post } = await useFetch(`/api/posts/${route.params.id}`)
useSeoMeta({ title: () => post.value?.title ?? '文章' })
</script>

<template>
  <article>
    <h1>{{ post?.title }}</h1>
    <p>{{ post?.body }}</p>
  </article>
</template>
```

### ① 浏览器发起请求

`GET /posts/42`。此时浏览器还没有任何 JS，只有一次普通的 HTTP 请求。

### ② Nitro 接住请求，创建「本次请求」的 app 实例

Nitro 先跑 `server/middleware/*`，再按 `routeRules` 决定这条路由的渲染策略（实时 SSR？命中缓存？预渲染好的静态文件？）。若需要 SSR，就**为每个请求新建一个 Nuxt app 实例**（`useNuxtApp()` 拿到的上下文）。

> ⚠️ 这是 SSR 最容易出安全事故的地方：**模块级的可变变量是全进程共享的**。把当前用户信息、购物车写进 `let currentUser` 这类模块作用域变量，A 用户可能读到 B 用户的数据。跨请求状态必须放在请求上下文里（`event.context`、composable 的局部状态），或用 `useState`（Nuxt 保证它按请求隔离）。

### ③ 服务端执行路由与组件 setup

- 匹配 `pages/posts/[id].vue`，执行服务端路由中间件；
- 跑 `<script setup>`：`useRoute()`、`useFetch()`、`useSeoMeta()` 都在服务端执行一遍；
- `useFetch('/api/posts/42')` 在服务端被 Nuxt 转成对 Nitro handler 的**直接内部调用**（不走公网 HTTP 往返），拿到 `post`；
- `useFetch` 把结果按 `key` 记进本次请求的 payload，同时 `useSeoMeta` 收集 `<title>` 等 head 信息。

这一阶段最容易踩的坑是"忘了代码会在服务端跑"：`window`、`document`、`localStorage`、浏览器专属库在 Node 里都不存在。详见[水合篇](/nuxt/hydration)与[踩坑篇](/nuxt/pitfalls-cheatsheet)。

### ④ 渲染成 HTML，并把状态序列化进 Payload

服务端 Vue 用 `renderToString(app, ssrContext)` 生成 HTML 字符串（Nuxt 也允许用 `defineRenderHandler` 自定义渲染器）。同时，Nuxt 用 **devalue** 把本次请求收集到的 `useState` / `useAsyncData` / `useFetch` 结果序列化，内联进 HTML：

```html
<div id="__nuxt">
  <article><h1>Nuxt SSR 入门</h1><p>...</p></article>   <!-- 服务端渲染好的真实 DOM -->
</div>
<script type="application/json" id="__NUXT_DATA__" data-ssr="true">
  [{"post":{"title":1,"body":2}},"Nuxt SSR 入门","正文……"]   <!-- 简化示意，真实是引用表 -->
</script>
```

Nuxt 还会注入预加载的 JS/CSS `<link>`、head 标签、以及客户端入口脚本。这份 JSON 就是[序列化与 Payload 篇](/nuxt/serialization-payload)的主角：**它是服务端与客户端之间唯一的"状态传送带"**。

### ⑤ 浏览器收到 HTML：内容立即可见

浏览器不执行任何 JS 就能把 `<article>` 画出来，所以 **FCP 很快**，爬虫与分享卡片也能直接拿到正文和 `<title>`。此时页面看起来是完整的，但**按钮还点不动**——DOM 上没有任何事件监听器，Vue 实例也还没创建。

这一刻的状态有个专门名字：**"可看不可交互"**，也是 SSR 项目最容易被误解的性能区间。

### ⑥ 下载 client bundle，创建同构 app

客户端入口加载后，Nuxt 用 `createSSRApp()`（不是 `createApp()`）创建**同一份组件树**，并先读取 `__NUXT_DATA__` 还原 Payload。`useFetch` 在客户端发现对应 `key` 的数据已在 payload 中，于是**复用它、不再发第二次请求**——这就是"为什么 SSR 页面打开后 Network 里看不到那条接口"的原因。

### ⑦ 水合：把静态 DOM 变成 Vue 应用

`app.mount()` 在 SSR 模式下走 `hydrate()` 分支：逐个比对 vnode 与已有 DOM，**复用节点、绑定事件、接上响应式**，而不是把 `div#__nuxt` 清空重画。水合完成后 `onMounted` 触发，页面才真正可交互（TTI）。完整机制与 mismatch 排查见[水合篇](/nuxt/hydration)。

### ⑧ 之后的导航回到 SPA

`<NuxtLink to="/posts/43">` 是客户端路由：不重新向服务器要 HTML，只由客户端执行目标页面的 `setup` 并取数（预渲染站点会按需请求 `_payload.json`）。所以 Nuxt 默认模式更准确的名字是 **Universal Rendering（同构 / 通用渲染）**＝「首屏 SSR + 后续 SPA」，而不是"每个页面都回服务器"。

## 四、同一段代码跑两次：双端差异表

| 维度 | 服务端（Node / Edge） | 客户端（浏览器） |
| --- | --- | --- |
| 何时执行 | 每次请求 | 水合时 + 每次客户端更新 |
| Vue 入口 | `renderToString(app, ctx)` | `createSSRApp(app)` + `hydrate()` |
| 生命周期 | **不执行** `onMounted` / `onUnmounted`、`watch` 的 DOM 副作用 | 完整生命周期 |
| 浏览器 API | `window` / `document` / `localStorage` / `navigator` 全不可用 | 可用 |
| 环境判断 | `import.meta.server`（旧写法 `process.server`） | `import.meta.client`（旧写法 `process.client`） |
| 数据获取 | `useFetch` 走 Nitro 内部直调，可连库、可带内部密钥 | `useFetch` 走真实 HTTP 请求 |
| Cookie / 请求头 | 从入站请求读，需显式转发给下游接口 | 浏览器自动带同源 cookie |
| 重定向 | `navigateTo()` 变成 3xx 响应 | `navigateTo()` 变成客户端路由跳转 |
| 状态作用域 | **按请求隔离**，模块级变量是进程级共享，危险 | 单用户、整个会话 |
| 输出 | HTML 字符串 + Payload + HTTP 状态码 | DOM 变更、事件响应 |

**推论**：组件里"读数据 → 渲染"的代码要写成**同构**的（不碰浏览器 API、不依赖随机/时间/用户本地状态）；只有确实需要浏览器的逻辑，才用 `<ClientOnly>`、`onMounted` 或 `import.meta.client` 隔离。

## 五、SSR 的收益、代价与选型

| 收益 | 代价 |
| --- | --- |
| 首屏 FCP 快、白屏短，弱内容敏感场景体验好 | TTFB 取决于服务端取数与渲染耗时，后端慢反而更慢 |
| SEO、分享卡片、爬虫拿到真实 HTML 与 head | 必须部署可执行服务端代码的运行时，运维与成本上升 |
| JS 失败/被禁用时仍有内容可读 | 双端执行 → 环境差异、hydration mismatch、状态污染等新 bug 类别 |
| 服务端可直接连库/内部服务，省一次公网往返 | Payload 让 HTML 变大；状态越大越拖 TTFB |
| 更细的缓存与按路由渲染策略 | 可交互时间（TTI）要等水合，重页面的水合本身可能成为瓶颈 |

经验判断：

- **内容型 / 电商 / 官网 / 需要被搜索到** → 默认 Universal SSR，或按路由 ISR / SWR。
- **登录后的后台、编辑器、图表大屏** → `ssr: false` 或 `routeRules` 局部关掉 SSR，省事又省心。
- **文档 / 博客 / 活动页** → 构建时预渲染（SSG），连运行时服务器都省了。

## 六、三个常见误解

1. **"用了 SSR，每次点击都要回服务器"** —— 只有首屏（或刷新、直接访问 URL）是服务端渲染；站内跳转是客户端路由。
2. **"SSR 一定比 SPA 快"** —— SSR 优化的是 FCP，不是全部指标。接口慢时 TTFB 会很差；此时考虑流式渲染、`swr`/`isr` 缓存或 `payload` 瘦身，而不是盲目加机器。
3. **"服务端 render 完，客户端重新 mount 一遍就行"** —— 那会整页重建、闪烁、丢焦点与滚动位置，所以必须 `hydrate`，而 hydrate 又要求两端数据一致、结构一致，于是才有了 Payload 序列化与 mismatch 这一整套机制。

## 回到入口

- 复习整体地图 → [Nuxt 知识库入口](/nuxt/)
- 顺着链路继续 → [序列化与 Payload](/nuxt/serialization-payload) · [水合 Hydration](/nuxt/hydration) · [数据获取](/nuxt/data-fetching) · [渲染模式与部署](/nuxt/rendering-modes-and-deploy)
