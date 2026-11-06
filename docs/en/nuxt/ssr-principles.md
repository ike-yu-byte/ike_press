# SSR Principles: the full request lifecycle

> Stop 1: Before you write `useFetch`, this article answers one question only — **from the moment you press Enter in the browser until the page becomes clickable, what actually happens in between**. Memorize this chain and the later topics — serialization, hydration, dual-environment pitfalls — are just segments along it.

## 1. Know the opponent first: why plain CSR is not enough

A Vue SPA (a plain Vite project) returns an essentially empty HTML shell:

```html
<!doctype html>
<html>
  <head><title>My App</title></head>
  <body>
    <div id="app"></div>                 <!-- empty -->
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

The browser must complete, in order: **download HTML → download JS → parse & execute JS → render components → call the API for data → render again** — only then does the user see content. That brings three hard problems:

| Problem | Symptom |
| --- | --- |
| **Blank first paint** | FCP is dragged down by JS size, weak network, low-end devices; a JS error means a fully blank page |
| **SEO / social scraping** | Search engines and WeChat/Twitter share cards get an empty `div`, no body text or title (modern crawlers can run JS, but it is costly and unreliable) |
| **TTI tied to FCP** | Content appears and becomes interactive at almost the same time, both after JS executes |

SSR's idea is simple: **move the "component → DOM" step earlier, to the server**, so the first HTML the browser receives already has content; then the client Vue takes over those DOM nodes and restores interactivity.

## 2. Nuxt's architecture: who owns which segment

```
                       ┌──────────── Build time (Vite)────────────┐
                       │  server bundle (SSR code run by Node)      │
                       │  client bundle (JS chunk run by browser)   │
                       └───────────────────────────────────────────┘
                                    ↑ one .vue source, two outputs

Browser ──① HTTP──▶ Nitro Server ──② new app instance──▶ Vue SSR Runtime
                        │                              │
                        │ server/api/* (h3 handlers)    │ ③ setup + useFetch fetch data
                        │ server/middleware/*           │ ④ renderToString → HTML
                        │ routeRules / cache            │ ④ devalue → Payload
                        └────────⑤ HTML + Payload───────┘
                                    │
Browser ◀── ⑥ parse & display ── ⑦ download client bundle → read Payload → hydrate() → take over interaction
```

The division of labor:

| Role | Responsibility |
| --- | --- |
| **Vue 3** | Components, reactivity, `renderToString` / `createSSRApp` / `hydrate` |
| **Vite** | Dev server & bundling; compiles the same source into **server / client bundles** |
| **Nitro** | The real server engine that listens on a port; hosts `server/api`, static assets, prerendering, caching, multi-platform deployment |
| **Nuxt framework layer** | File routing, auto-imports, composables, payload injection & reading, lifecycle orchestration |
| **h3** | The minimal HTTP layer inside Nitro; `defineEventHandler` / `readBody` / `getCookie` all come from it |

> Key insight: **"SSR needs a server" means Nitro.** Drop Nuxt onto a pure static OSS bucket and you can only run a SPA or prerendered SSG; to produce real-time HTML per request you need a runtime that can execute server code — Node, a Serverless Function, an Edge Worker, etc.

## 3. Frame-by-frame: one SSR request

The minimal but complete example below is what steps ①~⑧ revolve around:

```ts
// server/api/posts/[id].get.ts —— a server-side API, runs only on the server
export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  const post = await db.post.find(id)          // hits the DB directly, no public HTTP round trip
  if (!post) throw createError({ statusCode: 404, statusMessage: 'Not Found' })
  return post
})
```

```vue
<!-- pages/posts/[id].vue —— this component code runs twice: once on server, once on client -->
<script setup lang="ts">
const route = useRoute()
const { data: post } = await useFetch(`/api/posts/${route.params.id}`)
useSeoMeta({ title: () => post.value?.title ?? 'Article' })
</script>

<template>
  <article>
    <h1>{{ post?.title }}</h1>
    <p>{{ post?.body }}</p>
  </article>
</template>
```

### ① The browser sends the request

`GET /posts/42`. At this point the browser has no JS yet, just one ordinary HTTP request.

### ② Nitro catches the request and creates a "per-request" app instance

Nitro first runs `server/middleware/*`, then decides the rendering strategy for this route by `routeRules` (real-time SSR? cache hit? prerendered static file?). If SSR is needed, it **creates a fresh Nuxt app instance for each request** (the context you get from `useNuxtApp()`).

> ⚠️ This is where SSR most easily becomes a security incident: **module-level mutable variables are shared across the whole process.** Storing the current user's info or cart into a module-scoped `let currentUser` means user A could read user B's data. Cross-request state must live in the request context (`event.context`, local state in a composable), or use `useState` (Nuxt guarantees it is isolated per request).

### ③ The server runs routing and component setup

- Matches `pages/posts/[id].vue` and runs the server-side route middleware;
- Runs `<script setup>`: `useRoute()`, `useFetch()`, `useSeoMeta()` all execute once on the server;
- `useFetch('/api/posts/42')` is turned by Nuxt on the server into a **direct internal call** to the Nitro handler (no public HTTP round trip), obtaining `post`;
- `useFetch` records the result into this request's payload by `key`, while `useSeoMeta` collects head info like `<title>`.

The easiest pitfall here is "forgetting the code runs on the server": `window`, `document`, `localStorage`, and browser-only libraries do not exist in Node. See [Hydration](/en/nuxt/hydration) and [Pitfalls](/en/nuxt/pitfalls-cheatsheet).

### ④ Render to HTML and serialize state into the Payload

The server-side Vue uses `renderToString(app, ssrContext)` to produce the HTML string (Nuxt also allows a custom renderer via `defineRenderHandler`). Simultaneously, Nuxt uses **devalue** to serialize the `useState` / `useAsyncData` / `useFetch` results collected for this request, inlined into the HTML:

```html
<div id="__nuxt">
  <article><h1>Nuxt SSR 101</h1><p>...</p></article>   <!-- real DOM rendered on the server -->
</div>
<script type="application/json" id="__NUXT_DATA__" data-ssr="true">
  [{"post":{"title":1,"body":2}},"Nuxt SSR 101","..."]   <!-- simplified; actually a reference table -->
</script>
```

Nuxt also injects preloaded JS/CSS `<link>` tags, head tags, and the client entry script. This JSON is the protagonist of [Serialization & Payload](/en/nuxt/serialization-payload): **it is the only "state conveyor belt" between server and client.**

### ⑤ The browser receives HTML: content is visible immediately

The browser can paint `<article>` without executing any JS, so **FCP is fast**, and crawlers & share cards get the body text and `<title>` directly. The page looks complete now, but **buttons are not clickable yet** — no event listeners on the DOM, no Vue instance created.

This moment has a name: **"visible but not interactive"**, also the most misunderstood performance zone in SSR projects.

### ⑥ Download the client bundle and create the isomorphic app

After the client entry loads, Nuxt uses `createSSRApp()` (not `createApp()`) to create **the same component tree**, and first reads `__NUXT_DATA__` to restore the Payload. `useFetch` on the client finds the data for the corresponding `key` already in the payload, so it **reuses it and does not make a second request** — which is exactly why "you don't see that API call in the Network tab after opening an SSR page."

### ⑦ Hydration: turning static DOM into a Vue app

`app.mount()` takes the `hydrate()` branch in SSR mode: it compares vnodes with the existing DOM one by one, **reusing nodes, binding events, reconnecting reactivity**, instead of emptying `div#__nuxt` and repainting. After hydration `onMounted` fires and the page becomes truly interactive (TTI). Full mechanics and mismatch troubleshooting are in [Hydration](/en/nuxt/hydration).

### ⑧ Later navigation returns to the SPA

`<NuxtLink to="/posts/43">` is client-side routing: it does not ask the server for HTML again, it just runs the target page's `setup` and fetches data on the client (a prerendered site fetches `_payload.json` on demand). So Nuxt's default mode is more accurately named **Universal Rendering (isomorphic)** = "first-paint SSR + later SPA", not "every page goes back to the server".

## 4. The same code runs twice: a dual-environment difference table

| Dimension | Server (Node / Edge) | Client (browser) |
| --- | --- | --- |
| When it runs | Per request | During hydration + each client update |
| Vue entry | `renderToString(app, ctx)` | `createSSRApp(app)` + `hydrate()` |
| Lifecycle | **Does not run** `onMounted` / `onUnmounted`, the DOM side effects of `watch` | Full lifecycle |
| Browser APIs | `window` / `document` / `localStorage` / `navigator` all unavailable | available |
| Environment check | `import.meta.server` (old: `process.server`) | `import.meta.client` (old: `process.client`) |
| Data fetching | `useFetch` does a direct Nitro internal call, can hit DB, can use internal secrets | `useFetch` does a real HTTP request |
| Cookie / headers | Read from the inbound request, must be explicitly forwarded to downstream APIs | Browser auto-sends same-origin cookies |
| Redirect | `navigateTo()` becomes a 3xx response | `navigateTo()` becomes client-side route navigation |
| State scope | **Isolated per request**; module-level vars are process-wide shared, dangerous | Single user, whole session |
| Output | HTML string + Payload + HTTP status code | DOM changes, event responses |

**Corollary**: the "read data → render" code in a component must be written **isomorphically** (no browser APIs, no reliance on randomness/time/user-local state); only logic that truly needs the browser should be isolated with `<ClientOnly>`, `onMounted`, or `import.meta.client`.

## 5. SSR's gains, costs, and when to use it

| Gains | Costs |
| --- | --- |
| Fast FCP on first paint, short blank window — good for content-sensitive scenarios | TTFB depends on server fetch & render time; a slow backend makes it worse |
| SEO, share cards, crawlers get real HTML and head | Must deploy a runtime that can run server code; Ops & cost go up |
| Content still readable if JS fails/disabled | Dual execution → new bug classes: environment differences, hydration mismatch, state pollution |
| Server can hit the DB/internal services directly, saving a public round trip | Payload makes HTML bigger; the larger the state, the more TTFB suffers |
| Finer caching and per-route rendering strategy | Time To Interactive (TTI) waits for hydration; hydration of heavy pages can itself become the bottleneck |

Rules of thumb:

- **Content / e-commerce / official sites / needs to be searchable** → default Universal SSR, or ISR / SWR per route.
- **Post-login admin, editors, big dashboards** → `ssr: false` or turn off SSR locally via `routeRules` — simpler and safer.
- **Docs / blogs / campaign pages** → prerender at build time (SSG), even saving the runtime server.

## 6. Three common misconceptions

1. **"With SSR, every click goes back to the server"** — only the first paint (or refresh / direct URL access) is server-rendered; in-site navigation is client-side routing.
2. **"SSR is always faster than SPA"** — SSR optimizes FCP, not all metrics. When the API is slow, TTFB is bad; consider streaming rendering, `swr`/`isr` caching, or payload slimming, rather than blindly adding machines.
3. **"Server finishes rendering, client just re-mounts"** — that would rebuild the whole page, flicker, lose focus & scroll position, so `hydrate` is mandatory; and hydrate demands identical data & structure on both sides, which is exactly why the whole Payload serialization & mismatch machinery exists.

## Back to the entry

- Review the big picture → [Nuxt Knowledge Base](/en/nuxt/)
- Follow the chain → [Serialization & Payload](/en/nuxt/serialization-payload) · [Hydration](/en/nuxt/hydration) · [Data fetching](/en/nuxt/data-fetching) · [Rendering modes & deployment](/en/nuxt/rendering-modes-and-deploy)
