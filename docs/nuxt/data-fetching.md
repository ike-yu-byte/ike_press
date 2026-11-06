# 数据获取与跨端状态

> 第 4 站：SSR 里取数为什么非得用 `useFetch`？这一篇把 Nuxt 的取数三层（`$fetch` → `useAsyncData` → `useFetch`）、payload 缓存、cookie 透传、`useState` 跨端状态，以及"接口为什么请求了两次"讲清楚。

## 一、三种取数方式的定位

| API | 是什么 | 是否进 payload | 服务端行为 | 适用场景 |
| --- | --- | --- | --- | --- |
| `$fetch` | 基于 ofetch 的请求函数（同构） | **否** | 普通 HTTP 调用；相对 URL 在服务端需要 baseURL | 事件回调、提交表单、`server/api` 内部调用、自定义逻辑 |
| `useAsyncData` | 包一层异步函数：缓存 + 去重 + payload | **是** | 服务端执行 handler 并把结果写入 `payload.data[key]` | 取数源不是 URL（SDK、组合多个请求、计算聚合） |
| `useFetch` | `useAsyncData` + `$fetch` 的语法糖 | **是** | 服务端可直调 Nitro handler，自动生成 key | 页面/组件首屏取数的**默认选择** |
| `useLazyFetch` / `useLazyAsyncData` | `lazy: true` 的快捷写法 | 是（拿到后写入） | 不阻塞首屏渲染 | 非 SEO 内容、次要模块 |

关系一句话：

```
$fetch(url)                       → 只是发请求
useAsyncData(key, () => $fetch(url)) → 加缓存 + payload + 双端复用
useFetch(url)                     → 上一种的封装，key 自动由 URL/参数生成
```

**为什么首屏取数必须用后两种**：只有它们把结果写进 [Payload](/nuxt/serialization-payload)，客户端水合时才能复用同一份数据，既不二次请求，也不产生 [mismatch](/nuxt/hydration)。

## 二、`useFetch` 常用选项

```vue
<script setup lang="ts">
const route = useRoute()
const page = computed(() => Number(route.query.page ?? 1))

const { data: list, status, error, refresh, clear } = await useFetch('/api/articles', {
  key: 'article-list',                 // 稳定且唯一的缓存键
  query: { page },                     // 响应式参数，变化时自动重新取数
  pick: ['id', 'title', 'summary'],    // 只让这些字段进 payload，给它瘦身
  default: () => ({ items: [], total: 0 }),
  getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
  // server: false,                   // 只在客户端取（首屏无数据）
  // lazy: true,                      // 不阻塞渲染，需自己处理 status
  // dedupe: 'defer',                 // 较新版本：合并重复请求 / 取消旧请求
})
</script>

<template>
  <p v-if="status === 'pending'">加载中…</p>
  <p v-else-if="error">出错了：{{ error.statusMessage }}</p>
  <ul v-else>
    <li v-for="item in list?.items" :key="item.id">{{ item.title }}</li>
  </ul>
  <button @click="refresh()">刷新</button>
</template>
```

| 选项 | 作用 | 注意 |
| --- | --- | --- |
| `key` | 缓存与 payload 的标识 | 不传则由 URL + 选项自动生成；动态参数多时建议显式指定 |
| `query` / `params` / `body` / `headers` | 请求参数，支持 `ref` 响应式 | 变化会触发重新取数 |
| `watch` | 额外指定要监听的响应式源 | 与 `query` 配合控制刷新时机 |
| `transform` / `pick` | 加工/裁剪返回值 | **减小 payload 的第一手段** |
| `default` | 未拿到数据时的默认值 | 让模板不用到处判空，也避免 `undefined` 造成的双端差异 |
| `server` | 是否在服务端取数 | `false` 会让首屏无该内容 |
| `lazy` / `immediate` | 是否阻塞渲染 / 是否立即执行 | `lazy: true` 时首屏渲染 `data` 为默认值 |
| `getCachedData` | 自定义客户端缓存读取 | 常用来复用 payload 或静态数据缓存 |
| `deep` / `dedupe` | 响应式深度 / 重复请求策略 | 版本相关，用前查当前版本文档 |

返回值里最常用的是：`data`（`Ref`）、`status`（`idle` / `pending` / `success` / `error`）、`error`、`refresh()`、`clear()`、`execute()`。

## 三、`useAsyncData`：取数源不是 URL 时

```ts
const { data: dashboard } = await useAsyncData('dashboard', async () => {
  const [user, stats] = await Promise.all([
    $fetch('/api/me'),
    $fetch('/api/stats'),
  ])
  return { user, stats }
})
```

要点：

- **必须给稳定的 `key`**，否则缓存与 payload 无法对应；
- `Promise.all` 并行发起，避免"请求瀑布"（一个等完再发下一个会拖慢 TTFB）；
- handler 在服务端执行时可以访问 `event.context`（通过 `useRequestEvent()`），但**不能**访问浏览器对象；
- 结果会自动进 payload，客户端水合不会重跑 handler。

## 四、服务端请求的两大陷阱

### 1. 相对 URL 在服务端没有"域名"

`$fetch('/api/x')` 在浏览器里没问题，但在 Node 里没有 origin。Nuxt 的 `useFetch` 会处理内部调用；若在 `server/` 或插件里手写 `$fetch`，要显式给 baseURL 或用 `useRequestFetch`：

```ts
// 在组件/插件中，拿到一个"带当前请求上下文"的 $fetch
const requestFetch = useRequestFetch()
const { data } = await useAsyncData('me', () => requestFetch('/api/me'))
```

### 2. Cookie / 鉴权头不会自动跟到内部请求

浏览器请求页面时带了 `Cookie`，但服务端组件再向 API 取数时是一次"新的内部调用"，不会自动带上它。用户态因此常常出现**服务端渲染出未登录、水合后又变成已登录**的闪烁：

```ts
// 方式 A：显式转发请求头
const headers = useRequestHeaders(['cookie', 'authorization'])
const { data: me } = await useFetch('/api/me', { headers })

// 方式 B：useCookie —— 服务端从请求头读、客户端从 document.cookie 读，天然同构
const token = useCookie('token')
const { data } = await useFetch('/api/me', {
  headers: { Authorization: `Bearer ${token.value}` },
})
```

```ts
// server/api/me.get.ts：服务端从 event 里读 cookie
export default defineEventHandler((event) => {
  const token = getCookie(event, 'token') ?? parseCookies(event).token
  // ... 校验并返回用户
})
```

> 更彻底的做法是把鉴权放进 `server/middleware`，把 `event.context.user` 传给所有 handler，页面上通过 `useState('user')` 拿到同一份用户态——这样服务端与客户端渲染结果天然一致。

## 五、`useState` 与跨端状态

```ts
// 服务端执行一次初始化，值随 payload 传递，客户端复用同一个 key 的值
const counter = useState('counter', () => 0)
const user = useState<User | null>('user', () => null)
```

| 规则 | 说明 |
| --- | --- |
| 必须在 `setup` / 插件 / composable 的同步上下文调用 | 脱离 Nuxt 上下文会报 "nuxt instance unavailable" |
| key 全局唯一 | 相同 key = 共享同一份状态；不同组件想各用各的就加前缀 |
| 值必须可序列化 | 它是 payload 的一部分，见[序列化篇](/nuxt/serialization-payload) |
| 按请求隔离 | Nuxt 保证不会把 A 请求的状态泄漏给 B 请求；**但模块级 `let` 变量不保证** |
| 不要放浏览器对象 | `window`、`HTMLElement`、class 实例都传不过去 |

复杂状态用 Pinia：`@pinia/nuxt` 模块帮你在 SSR 时按请求创建 store 实例，并把 state 交给 Nuxt 的 payload 机制；不要在模块顶层 `export const store = reactive({...})` 自己造全局单例，那会跨请求串数据。

## 六、错误、重定向与缓存

```ts
// 页面取数失败：抛给 Nuxt 的错误页 / error.vue
const { data } = await useFetch('/api/post', {
  async onResponseError({ response }) {
    if (response.status === 404) {
      throw createError({ statusCode: 404, statusMessage: '文章不存在', fatal: true })
    }
  },
})

// 手动触发错误页
showError(createError({ statusCode: 500, statusMessage: '服务器开小差' }))
```

```ts
// server/api/articles.get.ts：服务端缓存，多个用户共享同一份结果
export default defineCachedEventHandler(async (event) => {
  return await db.article.list()
}, { maxAge: 60, name: 'article-list' })
```

缓存有四个层次，别混为一谈：

| 层次 | 手段 | 作用域 |
| --- | --- | --- |
| 首屏 payload | `useFetch` / `useAsyncData` 的 key | 单次请求 → 客户端水合 |
| 客户端内存 | `getCachedData`、key 命中 | 单次会话内导航 |
| 服务端 | `defineCachedEventHandler`、`routeRules.swr/isr/cache` | 所有用户共享 |
| 边缘/CDN | `Cache-Control` headers、部署平台缓存 | 所有用户、跨节点 |

## 七、高频坑清单

| 症状 | 原因 | 修复 |
| --- | --- | --- |
| 同一接口请求两次 | `setup` 里用裸 `$fetch`；或 `key` 每次都变 | 换 `useFetch` / `useAsyncData`，显式固定 `key` |
| 服务端报 `window is not defined` | 第三方 SDK 在顶层初始化 | 放 `onMounted`、`import.meta.client` 或 `.client.ts` 插件 |
| 服务端取数报 `Invalid URL` | 手写 `$fetch('/api/x')` 无 baseURL | `useRequestFetch()`，或配置 `baseURL` / 走内部直调 |
| 登录态闪烁 | 服务端请求没带 cookie / 用户信息没进 payload | 转发请求头、`useCookie`、`useState('user')` |
| 水合 mismatch，接口返回顺序不同 | 接口随机排序、限流返回不同数据 | 服务端固定排序并把结果放进 payload |
| 页面切换后数据还是旧的 | 命中了客户端 key 缓存 / CDN 缓存 | `refresh()`、设计 `key` 包含参数、检查缓存头 |
| 首屏很慢 | 取数串行形成瀑布；payload 过大 | `Promise.all` 并行、`pick`/`transform`、服务端缓存 |
| `nuxt instance unavailable` | 在 `setup` 之外（如普通 util、回调里）调用 composable | 用 `nuxtApp.runWithContext(() => ...)` 或把调用挪回同步上下文 |

## 回到入口

- 复习整体地图 → [Nuxt 知识库入口](/nuxt/)
- 前后衔接 → [序列化与 Payload](/nuxt/serialization-payload) · [水合 Hydration](/nuxt/hydration) · [路由与服务端层](/nuxt/routing-and-architecture) · [高频踩坑](/nuxt/pitfalls-cheatsheet)
