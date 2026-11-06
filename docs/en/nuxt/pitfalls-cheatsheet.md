# Top pitfalls & cheat sheet

> Stop 8: A condensed "check here first when something breaks" list of the previous seven articles. Bookmark it; when something weird happens, locate via §1 → match the API in §2 → troubleshoot via the flow in §3.

## 1. 15 high-frequency pitfalls (symptom → cause → fix)

| # | Symptom | Root cause | Fix |
| --- | --- | --- | --- |
| 1 | `window / document / localStorage is not defined` | component `setup` also runs on the server | `onMounted`, `import.meta.client`, `<ClientOnly>`, `.client.ts` plugin |
| 2 | `Hydration text mismatch` | time, random, timezone/locale, i18n differ between sides | fix server UTC/locale, put random values into `useState`, stabilize formatting |
| 3 | `Hydration node mismatch` | conditional render divergence, illegal HTML, third-party DOM mutation | unify dual-side checks, fix HTML nesting, `<ClientOnly>` around third parties |
| 4 | First paint flickers, content jumps | bare `$fetch` / `server: false` / payload miss | switch to `useFetch` / `useAsyncData`, give a stable `key` |
| 5 | Same API requested twice | client re-fetches on hydration or `key` changes each time | explicit `key`, move fetching into a composable |
| 6 | After login, SSR shows logged-out | server internal request missing cookie | `useRequestFetch()`, `useRequestHeaders(['cookie'])`, `useCookie` |
| 7 | token / phone visible in page source | sensitive fields in `useState` or API return → payload | trim fields on server, secrets into `runtimeConfig` private section |
| 8 | HTML hundreds of KB, slow first paint | payload too big | `pick` / `transform`, paging, server-side aggregation |
| 9 | Button not clickable on first paint, works after seconds | slow hydration (JS size + component count) | fewer first-paint interactive components, lazy load, deferred hydration/islands |
| 10 | class instance methods vanish on client | prototype/functions not serializable | pass plain data, or use `definePayloadReducer/Reviver` |
| 11 | Cross-user data bleed (seeing others' info) | module-level `let`, shared CDN cache | state into `event.context` / `useState`; disable shared cache for private pages |
| 12 | Client navigation 404s on `_payload.json` | static output incomplete, CDN block, stale cache | check `payloadExtraction` output and cache rules |
| 13 | Direct sub-route access 404 | static host missing fallback / SSR missing reverse proxy | generate the HTML or configure SPA fallback, deploy `.output/server` |
| 14 | API return order occasionally differs → mismatch | random ordering, A/B test, non-idempotent API | fix ordering on server and carry the result via payload |
| 15 | `nuxt instance unavailable` | composable called outside `setup` (plain util, async callback) | move back to sync context, or `nuxtApp.runWithContext(() => ...)` |

## 2. API quick reference

### Environment & dual side

| Need | Write |
| --- | --- |
| Server only | `import.meta.server` (old: `process.server`) |
| Client only | `import.meta.client` (old: `process.client`) |
| Only after mount | `onMounted` |
| Render a DOM block client-only | `<ClientOnly>` + `#fallback` |
| Check during hydration | `useNuxtApp().isHydrating` |
| Read payload | `useNuxtApp().payload` (`state` / `data` / `error`) |
| Read config only | `useRuntimeConfig()` (private values server-readable only) |

### Fetching & state

| Need | API |
| --- | --- |
| First-paint fetch (preferred) | `useFetch(url, { key, query, pick, transform })` |
| Custom fetch logic | `useAsyncData(key, handler)` |
| Fire request / submit in events | `$fetch` |
| Don't block render | `useLazyFetch` / `lazy: true` / `immediate: false` |
| Refresh / clear | `refresh()` / `clear()` |
| Cross-environment shared state | `useState(key, init)` |
| Isomorphic cookie | `useCookie(name)` |
| Forward inbound request | `useRequestFetch()` / `useRequestHeaders([...])` |
| Complex state management | `@pinia/nuxt` |

### Routing, server, errors

| Need | API |
| --- | --- |
| Page meta | `definePageMeta({ layout, middleware, ... })` |
| Navigation | `<NuxtLink>` / `navigateTo()` |
| Route middleware | `defineNuxtRouteMiddleware`, `navigateTo()` / `abortNavigation()` |
| Plugin | `defineNuxtPlugin`, `.client.ts` / `.server.ts` |
| API | `defineEventHandler` (`server/api/*.get.ts`) |
| Read request | `readBody` / `getQuery` / `getRouterParam` / `getCookie` / `getHeader` |
| Write response | `setCookie` / `sendRedirect` |
| Throw error | `createError({ statusCode, statusMessage, fatal })`, `showError()` |
| Server cache | `defineCachedEventHandler`, `routeRules.swr/isr/cache` |
| SEO head | `useSeoMeta()` / `useHead()` |

### Commands & config

| Need | Write |
| --- | --- |
| Dev / build / prerender / preview | `nuxi dev` / `build` / `generate` / `preview` |
| Generate types / add file / add module | `nuxi prepare` / `nuxi add ...` / `nuxi module add ...` |
| Disable whole-site SSR | `ssr: false` |
| Per-route rendering strategy | `routeRules` |
| Deployment target | `nitro.preset` / `NITRO_PRESET` |
| Environment variables | `NUXT_*` (private), `NUXT_PUBLIC_*` (client-visible) |

## 3. Six troubleshooting flows by symptom

1. **Blank / 500**: check server logs & `curl` status code → is it an SSR-stage error or a client JS error → binary search with `ssr: false` → check `window` / relative URL / DB connection.
2. **mismatch or flicker**: `View Source` to compare pre-hydration DOM → check the corresponding value in `__NUXT_DATA__` → check time/random/conditional render → narrow down with `<ClientOnly>` one by one (see [Hydration](/en/nuxt/hydration) §3).
3. **API requested twice**: in Network check the timing (document request / XHR) → check for bare `$fetch` → check `key` stability → check `server: false` and `lazy`.
4. **Login state issue**: confirm cookie `httpOnly` / `sameSite` → does the server forward via `useRequestFetch` → is user info in `useState('user')` → is private HTML put into shared cache.
5. **Abnormal after deploy**: `curl -I` for status & cache headers → is `.output/public` complete (with `_nuxt/`, `_payload.json`) → did CDN cache stale HTML → does the preset match the platform runtime.
6. **Performance**: measure TTFB (server fetch/render), HTML size (payload), FCP, hydration time (JS size) separately → pick `isr/swr` cache, payload slimming, fewer first-paint interactive components by the bottleneck; don't just add machines upfront.

## 4. Learning path

```
① SSR Principles (8 steps of one request)   → build the global picture
② Serialization / Payload                   → understand how data crosses environments
③ Hydration & mismatch                      → solve 80% of "weird phenomena"
④ Data fetching / useState / cookie         → write correct isomorphic code
⑤ Getting started & conventions             → scaffold a project independently
⑥ Routing / middleware / server layer        → write a complete business loop
⑦ Rendering modes & deployment              → ship and choose
⑧ This cheat sheet                          → come back when something breaks
```

Three accompanying maxims:

- **The same code runs twice** — before writing, ask "can this run in Node?"
- **Server state must be serialized** — don't put non-serializable things into `useState`.
- **Hydration demands both sides be exactly identical** — any randomness, time, browser info, or API difference is a potential mismatch.

## Back to the entry

- Review the big picture → [Nuxt Knowledge Base](/en/nuxt/)
- By topic → [SSR Principles](/en/nuxt/ssr-principles) · [Serialization & Payload](/en/nuxt/serialization-payload) · [Hydration](/en/nuxt/hydration) · [Data fetching](/en/nuxt/data-fetching) · [Getting started & project structure](/en/nuxt/getting-started) · [Routing & server layer](/en/nuxt/routing-and-architecture) · [Rendering modes & deployment](/en/nuxt/rendering-modes-and-deploy)
