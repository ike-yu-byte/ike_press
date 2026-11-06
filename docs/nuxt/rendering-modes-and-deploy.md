# 渲染模式、routeRules 与部署

> 第 7 站：Nuxt 最被低估的能力是**按路由决定怎么渲染**。这一篇给出 SPA / SSR / SSG / ISR / SWR / 混合渲染的全景、`routeRules` 配置大全、缓存层次与部署选型，最后是一棵能直接用的决策树。

## 一、六种模式全景

| 模式 | HTML 生成时机 | 关键配置 | 需要服务端运行时 | 典型场景 |
| --- | --- | --- | --- | --- |
| **SPA（CSR）** | 浏览器执行 JS 时 | `ssr: false` | 否（纯静态托管） | 后台管理、编辑器、登录后系统 |
| **Universal SSR** | **每个请求** | 默认 | 是 | 内容站、电商、需实时数据 + SEO |
| **SSG 预渲染** | **构建时** | `nuxi generate` / `prerender: true` | 否 | 文档、博客、营销页 |
| **ISR** | 首次请求生成，缓存 N 秒后再生 | `isr: 60` | 平台需支持缓存/函数 | 商品页、新闻页、海量详情页 |
| **SWR** | 缓存立即返回，后台异步再生 | `swr: 60` | 是（含缓存层） | 高流量读多写少页面 |
| **混合渲染** | 每条路由各自决定 | `routeRules` 按路径配置 | 视路由而定 | 一个项目里既有官网又有后台 |

> 所谓 "Universal Rendering" 指的是**首屏 SSR + 站内导航 SPA**；它和"老式多页服务端渲染（每次点击都刷新整页）"不是一回事。回顾[SSR 原理篇](/nuxt/ssr-principles)的 ①~⑧ 步。

## 二、`routeRules`：一个项目里混着来

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    // 构建时静态化
    '/': { prerender: true },
    '/about': { prerender: true },

    // 内容页：60 秒增量再生
    '/blog/**': { isr: 60 },

    // 高流量列表：SWR 缓存 10 分钟 + CDN 头
    '/products/**': {
      swr: 600,
      cache: { maxAge: 600 },
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' },
    },

    // 后台：不做 SSR，纯 SPA
    '/admin/**': { ssr: false },

    // 老路径重定向
    '/old-blog/**': { redirect: { to: '/blog/**', statusCode: 301 } },

    // 全站安全头
    '/**': { headers: { 'X-Content-Type-Options': 'nosniff' } },
  },
})
```

常用字段：

| 字段 | 作用 |
| --- | --- |
| `ssr: false` | 只输出 SPA 空壳，不执行服务端渲染 |
| `prerender: true` | 构建时预渲染成静态 HTML（会附带生成 `_payload.json`） |
| `isr: number \| true` | 增量静态再生的秒数；`true` 表示直到下次部署才失效（平台相关） |
| `swr: number \| true` | 缓存与后台再生时间 |
| `cache` | Nitro 层缓存策略（`maxAge`、`name`、`group` 等） |
| `headers` | 给该路由的响应统一加 HTTP 头 |
| `redirect` | 服务端重定向（字符串或 `{ to, statusCode }`） |
| `cors` | 为该路由开启 CORS |

规则按**最具体路径优先**匹配；`/**` 常用来兜底。不同 Nitro 版本对 `isr`/`swr` 的实现依赖部署平台能力，上线前要在目标平台验证。

### 预渲染的细节

```bash
npm run generate            # 生成 .output/public/，可直接丢静态托管
```

```ts
export default defineNuxtConfig({
  nitro: {
    prerender: {
      crawlLinks: true,                 // 从已有页面顺着链接发现更多页面
      routes: ['/sitemap.xml', '/rss.xml'],
    },
  },
})
```

预渲染时 Nuxt 会把每个路由的 payload 抽成 `_payload.json`，**客户端导航时按需请求**，避免把所有页面的数据塞进首屏 HTML（见[序列化篇](/nuxt/serialization-payload)）。纯静态托管必须确保这些 JSON 文件和 HTML 一起部署、且 CDN 不拦截。

## 三、缓存的四层与失效

```
浏览器 Cache-Control → CDN / 边缘 → Nitro 缓存(swr/isr/cache) → 组件取数缓存(payload key)
```

| 层 | 配置 | 失效方式 |
| --- | --- | --- |
| 浏览器 | `headers['Cache-Control']` | max-age 到期 |
| CDN | `s-maxage`、`stale-while-revalidate`、平台配置 | 到期 / 主动 purge |
| Nitro | `swr` / `isr` / `defineCachedEventHandler` | 时间到期 / 重新部署 / 调用失效 API |
| 组件 | `useAsyncData` 的 `key`、`getCachedData` | `refresh()`、导航、页面刷新 |

⚠️ **安全红线**：如果某个 SSR 页面会因 cookie 渲染出用户个人信息（"Hi，张三"、订单、余额），**绝对不能**给它加共享 CDN 缓存，否则 A 用户的 HTML 可能被发给 B 用户。要么对该路由 `ssr: false` 或改为客户端取数，要么显式 `Cache-Control: private, no-store`。

## 四、部署：Nitro preset 与产物

```bash
npm run build                       # → .output/
# 本机 / 容器
node .output/server/index.mjs
# 指定平台
NITRO_PRESET=vercel npm run build
```

| 目标 | preset | 说明 |
| --- | --- | --- |
| 自有 Node 服务器 / Docker | `node-server` | 最通用，`node .output/server/index.mjs` |
| Vercel / Netlify | `vercel` / `netlify` | 通常自动识别，函数即 SSR |
| Cloudflare Workers / Pages | `cloudflare_module` / `cloudflare_pages` | 边缘运行时，注意 Node API 兼容性 |
| 纯静态托管 | `static` + `nuxi generate` | 只能跑 SSG / SPA |
| Bun / Deno 等 | 对应 runtime preset | 依赖所用 Nitro 版本支持情况 |

`.output/` 的粗略结构：

```
.output/
├─ server/          # Nitro 服务端入口与 SSR bundle（SSR 部署需要）
└─ public/          # 静态资源、预渲染 HTML、_payload.json、客户端 JS
   └─ _nuxt/        # 带内容哈希的 JS/CSS
```

| 部署症状 | 排查方向 |
| --- | --- |
| 直接访问子路由 404 | 静态托管没有 SPA fallback；SSR 部署漏了 `server/` 或反向代理规则 |
| 刷新正常、跳转报错 | `_payload.json` 未部署 / 被 CDN 拦截 / 缓存了旧版本 |
| 环境变量不生效 | 私有配置用 `NUXT_*`、公有配置用 `NUXT_PUBLIC_*`；构建时变量与运行时变量要分清 |
| 本地好、线上 `window is not defined` | 边缘运行时没有 Node API，或客户端代码混进服务端 bundle |
| 数据长期不更新 | CDN `s-maxage` 与 Nitro `swr/isr` 叠加，只清了一层 |
| HTML 里出现别人的用户名 | 把带用户态的页面放进了共享缓存（见上方安全红线） |

## 五、模式决策树

```
这个页面需要被搜索引擎抓到 / 需要分享卡片吗？
├─ 否 → 交互重、登录后？ → routeRules: { ssr: false }（SPA）
└─ 是 → 数据多久变一次？
        ├─ 构建时才变（文档、活动页） → prerender / SSG
        ├─ 分钟级、流量大（商品、新闻） → isr 或 swr + CDN 缓存
        ├─ 每次请求都不同（搜索结果、用户相关但需 SEO） → 实时 SSR
        └─ 含用户隐私且需 SEO → 实时 SSR + Cache-Control: private
```

同一个项目完全可以四条分支并存——这正是 `routeRules` 存在的意义。

## 六、上线前检查清单

1. `curl -I` 看关键路由的状态码、`Cache-Control`、是否命中 CDN；
2. 关掉 JS 打开首屏，确认 SEO 内容在无脚本时可见；
3. 打开 Console 确认没有 `Hydration mismatch`（见[水合篇](/nuxt/hydration)）；
4. 查看网页源代码，确认 `__NUXT_DATA__` 里没有敏感字段且体积合理；
5. 验证客户端导航能正确加载 `_payload.json`；
6. 用两个不同账号刷新同一 SSR 页面，确认没有用户态串数据；
7. 检查 `runtimeConfig` 私有值没有出现在客户端 JS 里。

## 回到入口

- 复习整体地图 → [Nuxt 知识库入口](/nuxt/)
- 前后衔接 → [SSR 原理](/nuxt/ssr-principles) · [序列化与 Payload](/nuxt/serialization-payload) · [上手与工程结构](/nuxt/getting-started) · [高频踩坑](/nuxt/pitfalls-cheatsheet)
