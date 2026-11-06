# 路由、布局、中间件与服务端层

> 第 6 站：Nuxt 的"约定"一半在 `pages/`，另一半在 `server/`。这一篇把文件路由、布局、中间件、插件、Nitro 服务端层串起来，最后给一个能直接抄的鉴权闭环。

## 一、文件路由

| 文件 | 匹配路径 | 说明 |
| --- | --- | --- |
| `pages/index.vue` | `/` | 首页 |
| `pages/about.vue` | `/about` | 静态段 |
| `pages/posts/index.vue` | `/posts` | 列表页 |
| `pages/posts/[id].vue` | `/posts/42` | 必填动态段，`route.params.id` |
| `pages/posts/[slug].vue` + `pages/posts/index.vue` | `/posts/xxx` 与 `/posts` | 静态段优先于动态段 |
| `pages/[...slug].vue` | 任意层级 | catch-all，常做 404 / CMS 兜底 |
| `pages/users/[group]/[id].vue` | `/users/admin/7` | 多层动态 |
| `pages/posts.vue` + `pages/posts/` 目录 | 嵌套路由 | 父组件里放 `<NuxtPage />` 渲染子路由 |

```vue
<!-- pages/posts/[id].vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'article',                 // 指定布局
  middleware: ['auth'],              // 命名中间件（按顺序执行）
  // validate: route => /^\d+$/.test(String(route.params.id)),
})

const route = useRoute()
const { data: post } = await useFetch(`/api/posts/${route.params.id}`)
</script>

<template>
  <article><h1>{{ post?.title }}</h1></article>
</template>
```

`definePageMeta` 是**编译期宏**：里面只能用字面量或可静态分析的值，不能引用组件里的响应式变量（要动态判断就放进 middleware 或 `setup` 里 `navigateTo`）。

导航：

```vue
<NuxtLink to="/posts/42">阅读</NuxtLink>   <!-- 客户端路由，不刷新整页 -->
```

```ts
await navigateTo('/login')       // 服务端执行 → 3xx 响应；客户端执行 → 路由跳转
await navigateTo('https://example.com', { external: true })
```

## 二、布局与页面外壳

```vue
<!-- layouts/default.vue -->
<template>
  <div>
    <AppHeader />
    <slot />                       <!-- 页面内容 -->
    <AppFooter />
  </div>
</template>
```

```vue
<!-- app.vue：有 pages/ 时的根组件 -->
<template>
  <NuxtLayout>                    <!-- 不传 name 则用 default -->
    <NuxtPage />
  </NuxtLayout>
</template>
```

- `definePageMeta({ layout: 'article' })` 或 `setPageLayout('article')` 切换布局；`layout: false` 完全跳过布局；
- 布局切换只在客户端导航时生效，服务端渲染时由页面级 `definePageMeta` 决定；
- `app.vue` 里放全局 Provider、全局错误边界、`<NuxtLoadingIndicator />` 最合适。

## 三、路由中间件：三种写法与执行顺序

```ts
// middleware/auth.ts —— 命名中间件，按页面声明调用
export default defineNuxtRouteMiddleware((to, from) => {
  const user = useState<User | null>('user')
  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})
```

```ts
// middleware/analytics.global.ts —— 全局中间件，每次导航都跑
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.client) trackPageView(to.fullPath)
})
```

```ts
// 内联中间件，写在 definePageMeta 里
definePageMeta({
  middleware: [
    (to) => to.meta.requiresVip ? undefined : abortNavigation('需要会员'),
  ],
})
```

| 规则 | 说明 |
| --- | --- |
| 执行顺序 | 全局（按文件名字典序）→ 页面声明的命名中间件（按数组顺序）→ 内联中间件 |
| 双端执行 | **首次访问在服务端跑一次，客户端导航再跑一次**；别在里面放副作用重的逻辑 |
| 返回值 | `navigateTo()` 重定向、`abortNavigation()` 中止、什么都不返回则继续 |
| 服务端重定向 | `navigateTo` 会变成真实的 3xx 响应，对 SEO 更友好 |
| 共享状态 | 用 `useState` / `useCookie`，不要用模块级变量（会跨请求污染） |
| 鉴权边界 | 中间件只负责"能不能进页面"，**真正的权限校验必须在 `server/api` 里做** |

## 四、插件与生命周期钩子

```ts
// plugins/api.ts —— 注入一个全应用可用的 $api
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const api = $fetch.create({ baseURL: config.public.apiBase })
  return { provide: { api } }        // → useNuxtApp().$api
})
```

```ts
// plugins/analytics.client.ts —— 文件名带 .client，只在客户端加载
export default defineNuxtPlugin(() => {
  // 可以放心用 window / document
})
```

- `.client.ts` / `.server.ts` 后缀是最干净的环境隔离手段，优先于到处写 `if (import.meta.client)`；
- 常用钩子：`app:created`、`app:mounted`、`page:start`、`vue:error`，用 `nuxtApp.hook('app:created', ...)` 注册；
- 插件里的异步初始化若影响首屏数据，考虑放进 `useAsyncData` 而不是插件，才能进 payload。

## 五、服务端层：Nitro + h3

`server/` 是 Nuxt 自带的后端，不需要再起一个 Express：

| 文件 | 对应 |
| --- | --- |
| `server/api/hello.get.ts` | `GET /api/hello` |
| `server/api/posts/[id].get.ts` | `GET /api/posts/42`，`getRouterParam(event, 'id')` |
| `server/api/login.post.ts` | `POST /api/login`，`readBody(event)` |
| `server/routes/sitemap.xml.get.ts` | `GET /sitemap.xml`（不在 `/api` 下） |
| `server/middleware/auth.ts` | 每个请求都执行，可写 `event.context.user` |
| `server/plugins/db.ts` | Nitro 启动时初始化（连接池等） |

常用 h3 工具：`defineEventHandler`、`readBody`、`getQuery`、`getRouterParam`、`getCookie` / `setCookie` / `parseCookies`、`getHeader`、`createError`、`sendRedirect`、`defineCachedEventHandler`。

```ts
// server/api/login.post.ts
export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event)
  const user = await verifyUser(username, password)       // 真正的权限校验在服务端
  if (!user) throw createError({ statusCode: 401, statusMessage: '账号或密码错误' })

  setCookie(event, 'token', sign(user), {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
  })
  return { id: user.id, name: user.name }                // 别把密码哈希返回给前端
})
```

```ts
// server/middleware/auth.ts —— 统一把用户挂到请求上下文
export default defineEventHandler((event) => {
  const token = getCookie(event, 'token')
  if (token) event.context.user = verifyToken(token) ?? null
})
```

```ts
// server/api/me.get.ts
export default defineEventHandler((event) => {
  if (!event.context.user) throw createError({ statusCode: 401 })
  return event.context.user
})
```

页面侧把这份用户态收进 `useState`，让 SSR 与水合看到同一个值：

```ts
// app.vue 或全局插件里
const requestFetch = useRequestFetch()
const { data } = await useAsyncData('me', () => requestFetch('/api/me').catch(() => null))
useState('user').value = data.value
```

> 用 `useRequestFetch()` 的原因是它会把当前入站请求的 cookie 转发给内部调用，否则服务端取 `/api/me` 时永远是"未登录"。详见[数据获取篇](/nuxt/data-fetching)。

## 六、常见架构坑

| 坑 | 后果 | 修复 |
| --- | --- | --- |
| 把鉴权只放在路由中间件 | 直接调 `/api/xxx` 可绕过 | 服务端 handler 必须独立校验 |
| `server/` 里 import `pages/` 组件代码 | 客户端代码混进服务端 bundle，出现 `window` 报错 | 共享逻辑放 `shared/` 或纯函数 utils |
| middleware 里发埋点/写库 | 服务端+客户端各跑一次，数据重复 | 用 `import.meta.client` 判定，或放 `page:start` 钩子 |
| 模块级 `let` 缓存当前用户 | 跨请求串数据（严重安全事故） | `event.context` / `useState` |
| `definePageMeta` 里用 `useRoute()` 的结果 | 宏是编译期的，拿不到运行时值 | 判断逻辑移到 middleware |
| 只在 `.client.ts` 插件里初始化数据 | SSR 首屏缺数据、水合 mismatch | 首屏数据走 `useAsyncData` / `useState` |
| `server/api` 返回整张表或含密钥字段 | payload 暴露敏感数据、HTML 巨大 | 服务端裁剪，见[序列化篇](/nuxt/serialization-payload) |

## 回到入口

- 复习整体地图 → [Nuxt 知识库入口](/nuxt/)
- 前后衔接 → [上手与工程结构](/nuxt/getting-started) · [数据获取与跨端状态](/nuxt/data-fetching) · [渲染模式与部署](/nuxt/rendering-modes-and-deploy) · [高频踩坑](/nuxt/pitfalls-cheatsheet)
