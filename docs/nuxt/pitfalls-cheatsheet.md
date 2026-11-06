# 高频踩坑与速查表

> 第 8 站：把前七篇浓缩成一张"出问题先查这里"的清单。建议收藏，遇到诡异现象按 §1 定位 → §2 对照 API → §3 按流程排查。

## 一、15 条高频坑（症状 → 原因 → 修复）

| # | 症状 | 根因 | 修复 |
| --- | --- | --- | --- |
| 1 | `window / document / localStorage is not defined` | 组件 `setup` 也会在服务端执行 | `onMounted`、`import.meta.client`、`<ClientOnly>`、`.client.ts` 插件 |
| 2 | `Hydration text mismatch` | 时间、随机数、时区/locale、i18n 两端不同 | 服务端固定 UTC/locale，随机值放进 `useState`，稳定化格式化 |
| 3 | `Hydration node mismatch` | 条件渲染分歧、非法 HTML、第三方库改 DOM | 统一双端判断、修正 HTML 嵌套、`<ClientOnly>` 包第三方 |
| 4 | 首屏闪一下、内容跳变 | 裸 `$fetch` / `server: false` / payload 未命中 | 换 `useFetch` / `useAsyncData`，给稳定 `key` |
| 5 | 同一接口请求两次 | 客户端水合重新取数或 key 每次变化 | 显式 `key`，把取数收进 composable |
| 6 | 登录后 SSR 显示未登录 | 服务端内部请求没带 cookie | `useRequestFetch()`、`useRequestHeaders(['cookie'])`、`useCookie` |
| 7 | 网页源代码里能看到 token / 手机号 | 敏感字段进了 `useState` 或接口返回值 → payload | 服务端裁剪字段，密钥放 `runtimeConfig` 私有段 |
| 8 | HTML 几百 KB，首屏慢 | payload 过大 | `pick` / `transform`、分页、服务端聚合 |
| 9 | 按钮首屏点不动，几秒后才生效 | 水合慢（JS 体积 + 组件数量） | 减少首屏交互组件、懒加载、延迟水合/岛屿方案 |
| 10 | class 实例方法在客户端消失 | 原型/函数不可序列化 | 传纯数据，或用 `definePayloadReducer/Reviver` |
| 11 | 跨用户串数据（看到别人的信息） | 模块级 `let` 变量、共享 CDN 缓存 | 状态放 `event.context` / `useState`；私有页面禁用共享缓存 |
| 12 | 客户端导航报 `_payload.json` 404 | 静态产物没部署全、CDN 拦截、缓存旧版本 | 检查 `payloadExtraction` 产物与缓存规则 |
| 13 | 直接访问子路由 404 | 纯静态托管缺 fallback / SSR 服务没配反代 | 生成对应 HTML 或配置 SPA fallback、部署 `.output/server` |
| 14 | 接口返回顺序偶尔不同导致 mismatch | 随机排序、A/B 实验、非幂等接口 | 服务端固定排序，让结果随 payload 传给客户端 |
| 15 | `nuxt instance unavailable` | 在 setup 之外（普通 util、异步回调）调用 composable | 挪回同步上下文，或 `nuxtApp.runWithContext(() => ...)` |

## 二、API 速查

### 环境与双端

| 需求 | 写法 |
| --- | --- |
| 只在服务端 | `import.meta.server`（旧：`process.server`） |
| 只在客户端 | `import.meta.client`（旧：`process.client`） |
| 只在挂载后 | `onMounted` |
| 只在客户端渲染某块 DOM | `<ClientOnly>` + `#fallback` |
| 水合中判断 | `useNuxtApp().isHydrating` |
| 读 payload | `useNuxtApp().payload`（`state` / `data` / `error`） |
| 只读配置 | `useRuntimeConfig()`（私有值仅服务端可读） |

### 取数与状态

| 需求 | API |
| --- | --- |
| 首屏取数（首选） | `useFetch(url, { key, query, pick, transform })` |
| 自定义取数逻辑 | `useAsyncData(key, handler)` |
| 事件里发请求 / 提交表单 | `$fetch` |
| 不阻塞渲染 | `useLazyFetch` / `lazy: true` / `immediate: false` |
| 刷新 / 清空 | `refresh()` / `clear()` |
| 跨端共享状态 | `useState(key, init)` |
| 同构 cookie | `useCookie(name)` |
| 转发入站请求 | `useRequestFetch()` / `useRequestHeaders([...])` |
| 复杂状态管理 | `@pinia/nuxt` |

### 路由、服务端、错误

| 需求 | API |
| --- | --- |
| 页面元信息 | `definePageMeta({ layout, middleware, ... })` |
| 导航 | `<NuxtLink>` / `navigateTo()` |
| 路由中间件 | `defineNuxtRouteMiddleware`，`navigateTo()` / `abortNavigation()` |
| 插件 | `defineNuxtPlugin`，`.client.ts` / `.server.ts` |
| 接口 | `defineEventHandler`（`server/api/*.get.ts`） |
| 读请求 | `readBody` / `getQuery` / `getRouterParam` / `getCookie` / `getHeader` |
| 写响应 | `setCookie` / `sendRedirect` |
| 抛错误 | `createError({ statusCode, statusMessage, fatal })`、`showError()` |
| 服务端缓存 | `defineCachedEventHandler`、`routeRules.swr/isr/cache` |
| SEO head | `useSeoMeta()` / `useHead()` |

### 命令与配置

| 需求 | 写法 |
| --- | --- |
| 开发 / 构建 / 预渲染 / 预览 | `nuxi dev` / `build` / `generate` / `preview` |
| 生成类型 / 加文件 / 加模块 | `nuxi prepare` / `nuxi add ...` / `nuxi module add ...` |
| 关闭全站 SSR | `ssr: false` |
| 按路由渲染策略 | `routeRules` |
| 部署目标 | `nitro.preset` / `NITRO_PRESET` |
| 环境变量 | `NUXT_*`（私有）、`NUXT_PUBLIC_*`（客户端可见） |

## 三、按症状排查的六条流程

1. **白屏 / 500**：先看服务端日志与 `curl` 响应状态码 → 是 SSR 阶段抛错还是客户端 JS 报错 → `ssr: false` 二分 → 检查 `window` / 相对 URL / 数据库连接。
2. **mismatch 或闪烁**：`View Source` 对比水合前 DOM → 检查 `__NUXT_DATA__` 对应值 → 查时间/随机/条件渲染 → 逐个 `<ClientOnly>` 缩小范围（详见[水合篇](/nuxt/hydration) §3）。
3. **接口请求两次**：Network 看发起时机（文档请求 / XHR）→ 检查是否用了裸 `$fetch` → 检查 `key` 是否稳定 → 检查 `server: false` 与 `lazy`。
4. **登录态问题**：确认 cookie 是否 `httpOnly` / `sameSite` → 服务端是否 `useRequestFetch` 转发 → 用户信息是否进 `useState('user')` → 是否把私有 HTML 放进了共享缓存。
5. **部署后异常**：`curl -I` 看状态码和缓存头 → `.output/public` 是否完整（含 `_nuxt/`、`_payload.json`）→ CDN 是否缓存了旧 HTML → preset 是否匹配平台运行时。
6. **性能问题**：分别量 TTFB（服务端取数/渲染）、HTML 体积（payload）、FCP、水合耗时（JS 体积）→ 按瓶颈选 `isr/swr` 缓存、payload 瘦身、减少首屏交互组件，不要一上来就加机器。

## 四、学习路线

```
① SSR 原理（一次请求 8 步）        → 建立全局图景
② 序列化 / Payload                 → 明白数据怎么跨端
③ 水合与 mismatch                  → 解决 80% 的"奇怪现象"
④ 数据获取 / useState / cookie     → 能写出正确的同构代码
⑤ 上手与目录约定                   → 能独立搭项目
⑥ 路由 / 中间件 / server 层        → 能写完整业务闭环
⑦ 渲染模式与部署                   → 能上线、能选型
⑧ 本篇速查                         → 出问题时回来对照
```

配套心法三句：

- **同一段代码跑两次**，写之前先问"这段在 Node 里能跑吗"。
- **服务端的状态必须序列化**，不能序列化的东西不要放进 `useState`。
- **水合要求两端完全一致**，任何随机、时间、浏览器信息、接口差异都是潜在 mismatch。

## 回到入口

- 复习整体地图 → [Nuxt 知识库入口](/nuxt/)
- 按主题深入 → [SSR 原理](/nuxt/ssr-principles) · [序列化与 Payload](/nuxt/serialization-payload) · [水合 Hydration](/nuxt/hydration) · [数据获取](/nuxt/data-fetching) · [上手与工程结构](/nuxt/getting-started) · [路由与服务端层](/nuxt/routing-and-architecture) · [渲染模式与部署](/nuxt/rendering-modes-and-deploy)
