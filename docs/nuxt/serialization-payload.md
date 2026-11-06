# 序列化与 Payload：服务端状态怎么"带"到浏览器

> 第 2 站：SSR 生成的 HTML 只是**看得见**的部分。真正让客户端能无缝接管的，是随 HTML 一起返回的那份状态数据 —— **Payload**。这一篇把它从"为什么存在"到"长什么样、能放什么、怎么瘦身、哪里会炸"完整拆开。

## 一、为什么非序列化不可

假设服务端渲染时拿到了一篇文章对象：

```ts
const post = await db.post.find(42)   // 服务端内存里的对象
```

浏览器要继续用这个对象，但中间隔着一道 HTTP：**内存地址、原型链、闭包、数据库连接，全都没法跨进程传输**。只有文本可以。于是必须把它变成可传输、可还原的数据。

更关键的是，客户端水合时要用**和服务端完全相同的输入**去生成同一棵组件树：

| 没有 Payload 会怎样 | 有了 Payload |
| --- | --- |
| 客户端得重新请求一次接口 → 两次请求、内容闪烁、瀑布式等待 | 直接复用服务端结果，**首屏零额外请求** |
| 接口结果若有变化（时间、排序、随机数、A/B 分流）→ 前后 DOM 不一致 → hydration mismatch | 双端读的是同一份快照，DOM 必然一致 |
| 服务端算出的登录态、主题、CSR token 客户端无从得知 | `useState` 的值自动跨端传递 |
| 预渲染 / ISR 页面客户端导航时无数据可用 | 可按需加载 `_payload.json` |

> 记住这条因果链：**SSR 需要水合 → 水合要求双端一致 → 双端一致要求把服务端状态传给浏览器 → 传递只能靠序列化 → 于是有了 Payload。**

## 二、Payload 里到底装了什么

服务端渲染一次请求，Nuxt 会收集下面几类状态，统一挂在 `useNuxtApp().payload` 上：

| 字段 | 来源 | 作用 |
| --- | --- | --- |
| `payload.state` | `useState()` | SSR 友好的跨端共享状态（主题、用户态、计数器、一次性计算结果） |
| `payload.data` | `useAsyncData` / `useFetch` / `useLazyFetch` | 按 `key` 缓存的接口结果，客户端命中后不再请求 |
| `payload.error` | 上述取数的错误、`createError` | 让客户端渲染出同样的错误页 / 错误提示 |
| `payload._once` / `runWithContext` 类结果 | `callOnce` 等只执行一次的副作用 | 避免客户端重复执行服务端已做的工作 |
| 框架元数据 | `serverRendered`、`prerenderedAt`、head、路由信息 | 客户端判断是否需要水合、是否来自预渲染缓存 |

> 反过来说：**没有经过这些 composables 的数据不会进 payload**。你在 `setup` 里直接 `await $fetch(...)` 拿到一个局部变量，服务端能渲染，但客户端水合时没有这份数据，通常会再请求一次甚至直接 mismatch。这就是为什么 Nuxt 一直强调"用 `useFetch`，别用裸 `$fetch`"。详见[数据获取篇](/nuxt/data-fetching)。

## 三、HTML 里长什么样

Nuxt 3 / 4 把 payload 内联在 HTML 尾部（示意）：

```html
<div id="__nuxt"><article><h1>Nuxt SSR 入门</h1></article></div>

<script type="application/json" id="__NUXT_DATA__" data-ssr="true">
  [{"$snuxt:post":1}, {"title":2,"body":3,"createdAt":4}, "Nuxt SSR 入门", "正文……", ["Date","2026-01-02T08:00:00.000Z"]]
</script>
<script type="module" src="/_nuxt/entry.xxxx.js"></script>
```

几个值得注意的细节：

1. **`type="application/json"`**：浏览器不会执行它，它只是数据容器；Nuxt 客户端入口按 `id="__NUXT_DATA__"` 读取并解析。
2. **内容不是普通对象，而是"扁平引用表"**：`devalue.stringify` 把对象图拍平成一个数组，用下标表示引用。这样**循环引用**、**重复引用同一个对象**都能原样还原，而 `JSON.stringify` 遇到循环引用直接抛错。
3. **`data-ssr="true"`**：标记这份 payload 来自服务端渲染，客户端据此进入水合流程（而不是全新 mount）。
4. **Nuxt 2 的写法是 `window.__NUXT__`**（一段可执行的 JS 赋值），Nuxt 3 起改成 JSON 脚本，更安全、解析更快，也不污染全局。

## 四、为什么用 devalue，而不是 JSON.stringify

`JSON.stringify` 会把 `Date` 变字符串、`undefined`/`NaN`/`Infinity` 变 `null` 或直接丢失、`Map`/`Set` 变 `{}`、循环引用直接报错。Nuxt 用 [devalue](https://github.com/Rich-Harris/devalue) 来解决：

| 值 | `JSON.stringify` | devalue（Nuxt Payload） |
| --- | --- | --- |
| `Date` | 变成字符串（类型丢失） | 保留为 `Date`，还原后仍是 `Date` |
| `Map` / `Set` / `RegExp` / `BigInt` | `{}` / `{}` / `{}` / 报错 | 支持，按类型还原 |
| `undefined` / `NaN` / `Infinity` / `-0` | `null` 或丢失 | 精确保留 |
| 循环引用、同一对象被引用多次 | 报错 / 复制成多份 | 用引用表精确还原（含共享关系） |
| 函数、`Symbol`、`Promise`、DOM 节点、class 实例 | 丢失或报错 | **同样不支持**（或退化成普通对象） |
| 含 `</script>` 的字符串 | 直接闭合脚本 → XSS | 自动转义危险字符 |

**不能序列化的东西要特别小心**：class 实例（原型方法会丢）、`Error`（Nuxt 对自身错误类型做了特殊处理，但自定义错误不一定）、`Symbol`、函数、第三方 SDK 的客户端对象（如 `WebSocket`、`HTMLElement`、Prisma 结果里的特殊类型）、`bigint` 视版本而定。含这类值时应先用 `transform` / `pick` 转成纯数据。

### 自定义类型的还原

如果确实需要传自定义类，可以注册 reducer / reviver（宏由 Nuxt 自动导入，需在双端都注册）：

```ts
// app/plugins/payload.ts（Nuxt 3 为 plugins/payload.ts）
definePayloadReducer('Money', (value) => value instanceof Money && value.cents)
definePayloadReviver('Money', (cents) => new Money(cents as number))
```

reducer 返回 `false` 表示"不归我管"，交给默认逻辑；reviver 在客户端还原时按同名标签调用。只在确实需要时用——**纯数据对象永远比自定义类省心**。

## 五、一次数据从服务端到水合的完整旅程

```
1. 页面 setup：const { data } = await useFetch('/api/posts/42')
2. 服务端：内部直调 Nitro handler → 得到 post
3. useFetch 以 key（默认由 URL + 参数生成）写入 payload.data[key] = post
4. renderToString 生成 HTML
5. Nuxt 把整个 payload 用 devalue.stringify 拍平 → 注入 __NUXT_DATA__
6. 浏览器：客户端入口读取脚本 → devalue 的 unflatten 还原对象图 → 挂到 useNuxtApp().payload
7. 客户端 setup 再跑一次：useFetch 发现 key 已在 payload.data 中 → 直接返回缓存值，不发请求
8. hydrate() 用与服务端相同的 data 生成相同 vnode → DOM 对得上 → 水合成功
```

想在代码里观察它：

```ts
// 页面或插件中（仅调试用）
const nuxtApp = useNuxtApp()
if (import.meta.server) console.log('[ssr] payload', Object.keys(nuxtApp.payload.data))
if (import.meta.client) console.log('[client] payload', nuxtApp.payload, 'hydrating:', nuxtApp.isHydrating)
```

`nuxtApp.isHydrating` 在水合阶段为 `true`，常用于避免水合期间触发副作用（例如上报埋点、弹窗动画）。

## 六、Payload 提取：`_payload.json`

内联 payload 对首屏最友好，但**客户端导航**时不应该把每个页面的数据都塞进首屏 HTML。Nuxt 在预渲染 / ISR 场景可以把每个路由的 payload 单独写成文件（如 `/posts/42/_payload.json`），客户端跳转时按需 fetch：

```ts
// nuxt.config.ts —— 实验开关在不同版本默认值不同，以所用版本文档为准
export default defineNuxtConfig({
  experimental: {
    payloadExtraction: true,   // 预渲染时把 payload 抽出成 _payload.json
    // renderJsonPayloads: true, // 部分版本提供：把内联脚本改为外链 JSON 资源
  },
})
```

要点：

| 现象 | 原因 |
| --- | --- |
| 首屏 HTML 变小了，但跳转变慢/报 404 | `_payload.json` 没被部署、被 CDN 拦截或缓存策略不对 |
| 数据更新后客户端导航仍看到旧内容 | 静态 payload 文件与 CDN 缓存没失效，需要重新生成/清缓存 |
| ISR 页面首屏是旧的、第二次刷新变新 | 缓存再生发生在后台，属预期行为，用 `swr`/`isr` 时间控制 |

## 七、给 Payload 瘦身（直接影响 TTFB 和水合速度）

Payload 是**每个用户、每个请求都要下载的一份 HTML 增量**，越大越慢。实战手段：

```ts
// 只保留渲染需要的字段
const { data } = await useFetch('/api/articles', {
  key: 'article-list',
  pick: ['id', 'title', 'summary', 'publishedAt'],
})
```

```ts
// 或在服务端就完成裁剪/聚合，避免整包对象进 payload
const { data } = await useAsyncData('stats', () =>
  $fetch('/api/raw-stats').then(r => ({ total: r.total, top: r.items.slice(0, 5) })),
)
```

| 手段 | 效果 | 注意 |
| --- | --- | --- |
| `pick` / `transform` | 只序列化必要字段 | 字段裁剪后类型也要跟着改 |
| 服务端聚合、分页 | 从源头减小数据 | 别把整张表塞进 `useState` |
| `server: false` | 数据完全不进 payload，只在客户端取 | 首屏没内容，SEO 场景慎用 |
| `lazy: true` / `immediate: false` | 不阻塞首屏渲染 | 需要自己处理 loading 占位 |
| `default` + `getCachedData` | 复用客户端缓存 | 注意缓存时效与 key 稳定 |
| 按路由 `routeRules` 缓存 | 减少重复渲染与取数 | 缓存失效策略要设计 |

## 八、高频坑清单

| 坑 | 症状 | 修复 |
| --- | --- | --- |
| **把 token / 手机号 / 内部字段放进 `useState` 或接口返回值** | 查看网页源代码就能看到敏感数据 | 服务端只返回渲染必需字段；密钥放 `runtimeConfig` 私有段与 `event.context` |
| **payload 巨大** | HTML 几百 KB、TTFB 高、水合卡顿 | `pick` / `transform`、分页、服务端聚合 |
| **class 实例 / 函数 / DOM 对象进 state** | 客户端拿到普通对象、方法消失、devalue 报错 | 转成纯 JSON 数据，或用 reducer/reviver |
| **Date / 数字格式化依赖本地时区** |  hydration mismatch：服务端 UTC、浏览器本地时区 | 用 UTC 或固定 locale 格式化，或把格式化后的字符串从服务端传下来 |
| **`Math.random()` / `Date.now()` 写进 `useState`** | 双端值不同 → mismatch | 需要随机值就服务端算好放进 payload，或放到 `onMounted` 之后 |
| **`useState` 的 key 重复** | 两个无关组件互相覆盖状态 | 使用带业务前缀的唯一 key；跨组件共享状态时反而要刻意复用同一 key |
| **`server: false` 却指望首屏有内容** | 首屏空白、爬虫抓不到 | 需要 SEO 的数据必须服务端取 |
| **裸 `$fetch` 取数** | Network 里同一接口请求两次、内容闪烁 | 换 `useFetch` / `useAsyncData` |
| **接口不幂等（随机排序、A/B 分流）** | 偶发 mismatch | 把随机因子固定在服务端并随 payload 传递 |
| **`_payload.json` 404** | 客户端导航报错 | 检查 `payloadExtraction` 产物是否随静态资源部署、CDN 是否放行 |
| **自己拼 HTML 插值** | 用户内容里的 `</script>` 造成 XSS | 永远让 Nuxt/devalue 处理注入，不要手工拼脚本内容 |

## 九、调试清单

1. `curl -s https://your.site/posts/42 | grep __NUXT_DATA__`：直接看 payload 内容与大小。
2. 浏览器 `View Source`（不是 DevTools 的 Elements）对比服务端 HTML 与水合后的 DOM。
3. Console 里 `useNuxtApp().payload`（dev 环境）查看 `state` / `data` 是否符合预期。
4. Network 面板搜 `_payload.json`，确认客户端导航的 payload 请求状态与缓存头。
5. 用 `ssr: false` 临时关掉服务端渲染做二分：如果问题消失，基本就是双端状态不一致或序列化问题。

## 回到入口

- 复习整体地图 → [Nuxt 知识库入口](/nuxt/)
- 前后衔接 → [SSR 原理](/nuxt/ssr-principles) · [水合 Hydration](/nuxt/hydration) · [数据获取与跨端状态](/nuxt/data-fetching) · [高频踩坑](/nuxt/pitfalls-cheatsheet)
