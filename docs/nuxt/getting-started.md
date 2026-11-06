# 上手与工程结构

> 第 5 站：从零跑起一个 Nuxt 项目，认清"约定优于配置"到底约定了什么。看完能独立搭出一个带页面、带接口、能构建部署的骨架。

## 一、创建与运行

环境：Node.js 20+（LTS）、包管理器任选（npm / pnpm / yarn / bun）。

```bash
npm create nuxt@latest my-nuxt-app     # 官方脚手架（Nuxt 3/4 通用）
# 旧写法：npx nuxi@latest init my-nuxt-app
cd my-nuxt-app
npm install
npm run dev -- --open                  # http://localhost:3000
```

| 命令 | 作用 | 产物 |
| --- | --- | --- |
| `npm run dev` / `nuxi dev` | 开发服务器（HMR、`/api`、SSR 全开） | `.nuxt/`（自动生成，勿提交） |
| `npm run build` / `nuxi build` | 生产构建（SSR 服务端 + 客户端） | `.output/` |
| `npm run generate` / `nuxi generate` | 预渲染成静态站点（SSG） | `.output/public/` |
| `npm run preview` / `nuxi preview` | 本地预览构建产物 | — |
| `nuxi prepare` | 只生成类型与 `.nuxt`（CI、IDE 常用） | `.nuxt/` |
| `nuxi add page about` | 按约定生成文件 | `pages/about.vue` 等 |
| `nuxi module add @nuxt/content` | 装并注册模块 | 自动改 `nuxt.config.ts` |
| `nuxi typecheck` / `nuxi cleanup` | 类型检查 / 清理生成物 | — |

> `.nuxt/` 是开发期生成目录（类型、路由表、自动导入声明），`.output/` 是部署目录。两者都应加入 `.gitignore`。

## 二、目录约定：Nuxt 3 与 Nuxt 4 的差异

Nuxt 4 默认把**应用源码收进 `app/`**（`srcDir` 默认 `app/`），服务端、静态资源、共享代码留在根目录，IDE 与构建更快、职责更清楚：

```
Nuxt 3（默认）                       Nuxt 4（默认）
├─ app.vue                           ├─ app/
├─ pages/                            │  ├─ app.vue
├─ components/                       │  ├─ pages/
├─ layouts/                          │  ├─ components/
├─ composables/                      │  ├─ layouts/
├─ middleware/                       │  ├─ composables/
├─ plugins/                          │  ├─ middleware/
├─ utils/                            │  ├─ plugins/
├─ server/                           │  └─ utils/
├─ public/                           ├─ server/
├─ assets/                           ├─ public/
├─ nuxt.config.ts                    ├─ shared/         # 服务端/客户端共享的 utils、types
└─ ...                               ├─ assets/
                                     └─ nuxt.config.ts
```

> 版本兼容说明：Nuxt 3 可通过 `future.compatibilityVersion: 4` 提前启用新目录；Nuxt 4 也允许通过 `srcDir` 保留旧结构。不同小版本默认值有差异，以当前项目生成的模板为准。下文示例按 Nuxt 3 布局书写，Nuxt 4 把应用目录整体挪进 `app/` 即可。

### 各目录职责

| 目录 / 文件 | 作用 | 关键约定 |
| --- | --- | --- |
| `app.vue` | 应用根组件 | 有 `pages/` 时必须含 `<NuxtPage />` |
| `pages/` | **文件即路由** | `index.vue` → `/`，`posts/[id].vue` → `/posts/:id` |
| `components/` | 组件，**自动导入** | 路径即组件名：`components/App/Header.vue` → `<AppHeader />` |
| `layouts/` | 页面外壳 | `default.vue` 默认生效，`<slot />` 放页面 |
| `composables/` | 组合式函数，自动导入 | 顶层导出命名函数 |
| `utils/` | 工具函数，自动导入 | 会按使用做 tree-shaking |
| `middleware/` | 路由中间件 | `*.global.ts` 全局执行，其余按 `definePageMeta` 引用 |
| `plugins/` | 应用插件 | `.client.ts` / `.server.ts` 后缀限定运行环境 |
| `server/api/` | 后端接口 | 文件路由 + 方法后缀：`hello.get.ts` → `GET /api/hello` |
| `server/routes/` | 非 `/api` 前缀的服务端路由 | 适合 webhook、sitemap、文件下载 |
| `server/middleware/` | 每个请求都跑的服务端中间件 | 鉴权、日志、注入 `event.context` |
| `public/` | 原样拷贝的静态资源 | `/logo.png` 直接可访问，不参与打包哈希 |
| `assets/` | 需经构建处理的资源 | CSS、字体、会被打包的图片 |
| `shared/` | 双端共享代码（Nuxt 4） | 类型、纯函数，禁止放浏览器/服务端专属 API |
| `nuxt.config.ts` | 全局配置 | 模块、渲染模式、运行时配置、Nitro 等 |

## 三、最小可运行示例

```vue
<!-- app.vue -->
<template>
  <div>
    <header><NuxtLink to="/">IKE Nuxt Demo</NuxtLink></header>
    <NuxtPage />
  </div>
</template>
```

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
const { data: hello } = await useFetch('/api/hello')
useSeoMeta({ title: 'Nuxt 首页' })
</script>

<template>
  <main>
    <h1>{{ hello?.message }}</h1>
    <NuxtLink to="/about">关于</NuxtLink>
  </main>
</template>
```

```ts
// server/api/hello.get.ts
export default defineEventHandler(() => ({ message: 'Hello from Nitro' }))
```

这三个文件已经跑通了完整链路：**服务端渲染 HTML → `useFetch` 内部直调 `/api/hello` → 结果进 payload → 客户端水合 → `<NuxtLink>` 客户端导航**。想验证 SSR，把浏览器 JS 关掉刷新，标题和正文依然在。

## 四、自动导入：Nuxt 最"魔法"的部分

以下都**不需要 import**（类型由 `.nuxt` 生成，IDE 可跳转）：

| 类别 | 例子 |
| --- | --- |
| Vue API | `ref`、`computed`、`watch`、`onMounted`、`defineComponent` |
| Nuxt composables | `useFetch`、`useAsyncData`、`useState`、`useRoute`、`useRouter`、`navigateTo`、`useCookie`、`useNuxtApp`、`useRuntimeConfig`、`useSeoMeta`、`definePageMeta` |
| 服务端 | `defineEventHandler`、`readBody`、`getQuery`、`getCookie`、`createError`、`defineCachedEventHandler` |
| 项目代码 | `components/`、`composables/`、`utils/` 下的导出 |
| 组件 | `<NuxtPage />`、`<NuxtLink />`、`<ClientOnly />`、`<NuxtLoadingIndicator />` |

需要关闭或调整时：`imports: { autoImport: false }` / `components: { dirs: [] }`。团队规范里建议保留自动导入，但给 `components/` 加清晰的目录前缀，避免命名冲突。

## 五、`nuxt.config.ts` 常用配置

```ts
export default defineNuxtConfig({
  // 模块：一行接入一整套能力
  modules: ['@nuxt/content', '@pinia/nuxt', '@nuxtjs/i18n'],

  // 全局样式
  css: ['~/assets/css/main.css'],

  // 渲染总开关：false = 全站 SPA
  ssr: true,

  // 运行时配置：私有段只在服务端可读，public 段会进客户端包
  runtimeConfig: {
    dbPassword: '',                       // 用 NUXT_DB_PASSWORD 覆盖
    public: { apiBase: '/api' },          // 用 NUXT_PUBLIC_API_BASE 覆盖
  },

  // 按路由定制渲染策略（本套文档第 7 篇重点）
  routeRules: {
    '/': { prerender: true },
    '/blog/**': { isr: 60 },
    '/admin/**': { ssr: false },
  },

  nitro: { preset: 'node-server' },      // 部署目标
  devtools: { enabled: true },
  typescript: { strict: true },
  compatibilityDate: '2026-01-01',       // 锁定框架行为版本，减少升级意外
})
```

```bash
# .env —— 运行时覆盖，无需改代码
NUXT_DB_PASSWORD=secret
NUXT_PUBLIC_API_BASE=https://api.example.com
```

> ⚠️ `runtimeConfig` 顶层的私有值只能在服务端代码里通过 `useRuntimeConfig()` 读取；`public` 段会进入客户端 JS 与 payload，绝不能放密钥。

## 六、模块生态（别重复造轮子）

| 模块 | 用途 |
| --- | --- |
| `@nuxt/content` | Markdown / 内容站、文档站，带查询 API |
| `@nuxt/image` | 图片优化、响应式尺寸、懒加载 |
| `@nuxt/ui` | 基于 Tailwind 的组件库 |
| `@nuxtjs/i18n` | 多语言路由与文案 |
| `@pinia/nuxt` | SSR 友好的状态管理 |
| `@nuxtjs/tailwindcss` | Tailwind 集成 |
| `@nuxt/test-utils` | 组件 / E2E 测试 |
| `@nuxtjs/sitemap` / `robots` | SEO 辅助 |

## 七、构建产物与第一次部署

```bash
npm run build          # → .output/（含 server/ 与 public/）
node .output/server/index.mjs   # 本地起生产 SSR 服务，默认 3000 端口
```

- **SSR**：部署 `.output` 整个目录到 Node / Serverless / Edge 运行时，用 `node .output/server/index.mjs` 或平台 preset 启动；
- **SSG**：`npm run generate` 后只把 `.output/public/` 丢到任意静态托管（OSS、GitHub Pages、CDN）；
- **混合**：`routeRules` 里部分静态、部分 SSR，按平台能力选择 preset，详见[渲染模式与部署](/nuxt/rendering-modes-and-deploy)。

## 八、Nuxt 2 → 3/4 迁移速查

| Nuxt 2 | Nuxt 3 / 4 |
| --- | --- |
| `asyncData(ctx)` | `useAsyncData` / `useFetch`（在 `setup` 中） |
| `fetch()` hook | `useFetch`，`$fetch` 替代 axios 基础请求 |
| `this.$config` / `publicRuntimeConfig` | `useRuntimeConfig()` |
| `store/`（Vuex） | `useState` / `@pinia/nuxt` |
| `middleware(ctx)` | `defineNuxtRouteMiddleware((to, from) => ...)` |
| `static/` | `public/` |
| `nuxt.config.js` + `buildModules` | `nuxt.config.ts`，统一用 `modules` |
| `serverMiddleware` | `server/` 目录 + Nitro `defineEventHandler` |
| `window.__NUXT__` | `__NUXT_DATA__` JSON 脚本 + `useNuxtApp().payload` |
| webpack | Vite（可切回 webpack 的场景极少） |

## 回到入口

- 复习整体地图 → [Nuxt 知识库入口](/nuxt/)
- 继续深入 → [路由、布局、中间件与服务端层](/nuxt/routing-and-architecture) · [渲染模式与部署](/nuxt/rendering-modes-and-deploy) · [SSR 原理](/nuxt/ssr-principles) · [高频踩坑](/nuxt/pitfalls-cheatsheet)
