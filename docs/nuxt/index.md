# Nuxt 知识库入口

> 这一套文档是 **Nuxt 3 / 4 的系统梳理**，重点不在 API 罗列，而在把三件事讲透：**SSR 到底怎么跑起来的**、**服务端的数据是怎么"带"到浏览器的（序列化 / Payload）**、**浏览器又是怎么把静态 HTML 变成可交互应用的（水合 Hydration）**。后半部分是工程使用：目录约定、路由与中间件、数据获取、渲染模式、部署和高频踩坑。适合写过 Vue SPA、第一次接触服务端渲染的开发者。

## 先立心智模型：Nuxt 是 Vue 的「全栈外壳」

| 你以为的 Nuxt | 实际上的 Nuxt |
| --- | --- |
| 一个"Vue 的脚手架" | 一套**约定式全栈框架**：Vue 3 负责 UI，Vite 负责构建，Nitro 负责服务端，文件目录负责路由与 API |
| "SSR 就是服务端输出 HTML" | SSR 只是**首屏**那一半；Nuxt 默认的是 **Universal Rendering（同构渲染）**：首屏服务端出 HTML，之后客户端接管变回 SPA |
| "服务端渲染完就结束了" | 服务端渲染时的**状态必须序列化**进 HTML，客户端才能用同一份数据**水合**，否则界面会跳变或报 mismatch |
| "页面里直接 fetch 就行" | 双端都能执行的代码必须用 Nuxt 提供的 `useFetch` / `useAsyncData` / `useState`，它们才负责**去重、缓存、进 payload、跨端一致** |
| "代码只跑在浏览器" | 同一段 `setup` 会**先跑一次服务端、再跑一次客户端**，于是 `window`、`localStorage`、随机数、时区都成了坑 |

一句话概括全站：

> **同一份 Vue 组件代码，在服务端生成 HTML + 一份可序列化的状态（Payload），浏览器拿到后下载 JS、读取这份状态、把已有 DOM「激活」成 Vue 应用，之后的交互与跳转都在客户端完成。**

理解了这句话，SSR、序列化、水合、双端差异、`useFetch` 为什么存在，就都是它的推论。

## 一次 SSR 请求，完整时间线

```
① 浏览器   GET /posts/42
② Nitro    匹配 routeRules / server middleware，为「本次请求」新建一个 Nuxt app 实例
③ 服务端   执行路由中间件 → 页面 setup → useFetch / useAsyncData 取数
④ 服务端   renderToString(vueApp) → HTML 字符串
           └── 同时把 useState + 异步数据用 devalue 序列化成 Payload，内联进 HTML
⑤ 浏览器   收到 HTML：立刻能看到内容（FCP 快、爬虫能抓到完整正文）
           └── <script type="application/json" id="__NUXT_DATA__">…</script>
⑥ 浏览器   下载 JS chunk → 创建同一份 Vue app（createSSRApp）→ 读取 Payload
⑦ 水合     hydrate()：复用已有 DOM、绑定事件、恢复响应式 → 页面可交互
⑧ 之后     <NuxtLink> 跳转不再回服务器，走客户端路由 + 客户端取数（或按需加载 _payload.json）
```

其中 ③~⑤ 是 **SSR**，⑤ 里那坨 JSON 是 **序列化 / Payload**，⑥~⑦ 是 **水合**。这三个环节分别展开在下面三篇里。

## 三个最容易糊的概念（先给结论）

| 概念 | 一句话 | 为什么必须存在 | 深入阅读 |
| --- | --- | --- | --- |
| **SSR** | 服务端把组件渲染成 HTML 字符串返回 | 首屏不用等 JS 下载执行，SEO / 分享卡片拿到真实内容 | [SSR 原理](/nuxt/ssr-principles) |
| **序列化 / Payload** | 把服务端内存中的状态变成可传输、可还原的 JSON 数据，塞进 HTML | 服务端内存对象和浏览器之间隔着一次 HTTP，客户端还得用**同一份数据**渲染出**同样的 DOM** | [序列化与 Payload](/nuxt/serialization-payload) |
| **水合 Hydration** | 客户端 Vue 不重建 DOM，而是"认领"服务端已生成的 DOM 并挂上事件与响应式 | 若重新 `mount` 会整页重建（闪烁、丢焦点），若数据不一致则 DOM 对不上，产生 hydration mismatch | [水合机制](/nuxt/hydration) |

## 子页导航

| 序号 | 主题 | 你会学到 |
| --- | --- | --- |
| 1 | [SSR 原理：一次请求的完整链路](/nuxt/ssr-principles) | CSR 的瓶颈、Universal Rendering 架构、8 步请求链路、双端执行差异表、SSR 的收益与代价、常见误解 |
| 2 | [序列化与 Payload](/nuxt/serialization-payload) | 为什么必须序列化、`__NUXT_DATA__` 长什么样、devalue 能/不能序列化什么、`useState` 与 `useAsyncData` 如何进出 payload、`_payload.json`、体积与安全坑 |
| 3 | [水合 Hydration 与 mismatch](/nuxt/hydration) | `createSSRApp` + `hydrate` 做了什么、mismatch 全成因清单、定位手法、`<ClientOnly>` / `<NuxtClientFallback>` / `onMounted` 修复工具箱、延迟水合与岛屿架构 |
| 4 | [数据获取与跨端状态](/nuxt/data-fetching) | `useFetch` / `useAsyncData` / `$fetch` 对照、key 去重与缓存、cookie/请求头转发、`useState` 与 Pinia、常见二次请求与瀑布问题 |
| 5 | [上手与工程结构](/nuxt/getting-started) | 安装与命令、Nuxt 3/4 目录约定、自动导入、最小可运行示例、`nuxt.config.ts` 常用配置、模块生态、构建产物 |
| 6 | [路由、布局、中间件与服务端层](/nuxt/routing-and-architecture) | 文件路由规则、`definePageMeta`、layouts、三种 middleware、plugins、`server/api` 与 Nitro/h3、一个完整鉴权示例 |
| 7 | [渲染模式、routeRules 与部署](/nuxt/rendering-modes-and-deploy) | SPA / SSR / SSG / ISR / SWR / 混合渲染、`routeRules` 配置大全、缓存层次、Nitro preset 与部署选型、模式决策树 |
| 8 | [高频踩坑与速查表](/nuxt/pitfalls-cheatsheet) | 15 条症状→原因→修复清单、环境判断与 API 速查、线上问题排查流程、学习路线 |

建议路径：**1 → 2 → 3 是地基**（尤其 2、3 两篇，是绝大多数"页面闪一下 / Hydration mismatch / 接口请求两次"的根因）；4~6 是日常开发查阅；7 决定项目形态与上线方式；8 在遇到诡异现象时回来对照。

## 速查总表：渲染模式怎么选

| 模式 | 开关 | HTML 何时生成 | 适用场景 | 代价 |
| --- | --- | --- | --- | --- |
| **SPA（CSR）** | `ssr: false` | 浏览器执行 JS 时 | 后台管理、登录后系统、强交互工具 | 首屏白屏、SEO 差 |
| **Universal SSR**（默认） | 默认开启 | **每个请求**在服务端生成 | 内容站、电商详情、需要 SEO 且数据动态 | 需要服务端运行时、TTFB 受后端影响 |
| **SSG / 预渲染** | `nuxi generate`、`prerender: true` | **构建时**生成 | 文档、博客、营销页 | 数据变了要重新构建 |
| **ISR** | `routeRules: { '/**': { isr: 60 } }` | 首次请求生成后缓存 N 秒 | 商品页、新闻页，内容多且更新不频繁 | 需要支持缓存的部署平台 |
| **SWR 缓存** | `routeRules: { '/**': { swr: 60 } }` | 缓存 + 后台再生 | 高流量读多写少页面 | 短暂陈旧数据、缓存失效策略 |
| **混合渲染** | 按路由配 `routeRules` | 各路由自己决定 | 一个项目里既有后台又有官网 | 配置复杂度上升 |

> Nuxt 最被低估的能力就是**按路由混合渲染**：`/admin/**` 关掉 SSR 当 SPA，`/blog/**` 走 ISR，`/about` 构建时静态化，`/` 走实时 SSR，全部在同一个项目里用 `routeRules` 表达。详见[第 7 篇](/nuxt/rendering-modes-and-deploy)。

## 术语表

| 术语 | 含义 |
| --- | --- |
| **Universal / 同构渲染** | 同一套组件代码既跑服务端又跑客户端：SSR 首屏 + SPA 后续导航，Nuxt 默认模式 |
| **Nitro** | Nuxt 的服务端引擎，负责 HTTP 服务、`server/api`、缓存、预渲染、多平台部署产物 |
| **h3** | Nitro 内置的极简 HTTP 框架，`defineEventHandler` / `readBody` / `getCookie` 都来自它 |
| **Payload** | 服务端渲染结果之外，额外注入 HTML 的那份状态数据（`state` + `data` + `error` + `once`） |
| **devalue** | Nuxt 用来序列化 Payload 的库，支持 `Date`/`Map`/`Set`/循环引用等，并防 `</script>` 注入 |
| **Hydration mismatch** | 客户端按数据预期生成的 vnode 与服务端 HTML 对不上，Vue 报警告并局部重建 |
| **TTFB / FCP / TTI** | 首字节时间 / 首次内容绘制 / 可交互时间；SSR 主要改善 FCP，但会牺牲一部分 TTFB 与 TTI |
| **Island / Server Component** | 只水合页面中需要交互的部分，其余保持静态 HTML，用来降低水合成本 |

## 学习资源

- <a href="https://nuxt.com/docs" target="_blank" rel="noopener noreferrer">Nuxt 官方文档</a>：`Getting Started` → `Going Further` 的「Rendering」与「Data Fetching」两节与本套文档 1~4 篇对照阅读。
- <a href="https://vuejs.org/guide/scaling-up/ssr" target="_blank" rel="noopener noreferrer">Vue 官方 SSR 指南</a>：把 `renderToString` / `createSSRApp` / hydration 的底层机制讲得最清楚。
- <a href="https://nitro.unjs.io" target="_blank" rel="noopener noreferrer">Nitro 文档</a>：部署 preset、`routeRules`、缓存 API 的权威来源。
- <a href="https://github.com/Rich-Harris/devalue" target="_blank" rel="noopener noreferrer">devalue</a>：读 README 的 "What can be serialized" 一节，Payload 能放什么一目了然。
- <a href="https://nuxt.com/modules" target="_blank" rel="noopener noreferrer">Nuxt Modules 生态</a>：Content / Image / UI / i18n / Pinia 等官方与社区模块。
