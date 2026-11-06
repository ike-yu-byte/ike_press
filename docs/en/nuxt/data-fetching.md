# Data fetching & cross-environment state

> Stop 4: Why must SSR fetching use `useFetch`? This article clarifies Nuxt's three fetch layers (`$fetch` → `useAsyncData` → `useFetch`), payload caching, cookie forwarding, `useState` cross-environment state, and why "the API is requested twice".

## 1. The role of the three fetch APIs

| API | What it is | Enters payload? | Server behavior | Use for |
| --- | --- | --- | --- | --- |
| `$fetch` | ofetch-based request function (isomorphic) | **No** | Plain HTTP call; relative URL needs a baseURL on the server | Event callbacks, form submit, internal `server/api` calls, custom logic |
| `useAsyncData` | Wraps an async function: caching + dedup + payload | **Yes** | Runs the handler on the server, writes result into `payload.data[key]` | Fetch source is not a URL (SDK, combine multiple requests, compute aggregate) |
| `useFetch` | Syntactic sugar over `useAsyncData` + `$fetch` | **Yes** | Server can directly call the Nitro handler; auto-generates key | **Default choice** for first-paint fetching in pages/components |
| `useLazyFetch` / `useLazyAsyncData` | Shortcut for `lazy: true` | Yes (written once available) | Does not block first-paint rendering | Non-SEO content, secondary modules |

One sentence to capture the relationship:

```
$fetch(url)                       → just sends a request
useAsyncData(key, () => $fetch(url)) → adds cache + payload + dual-side reuse
useFetch(url)                     → wraps the above; key auto-derived from URL/params
```

**Why first-paint fetching must use the latter two**: only they write the result into the [Payload](/en/nuxt/serialization-payload), so the client can reuse the same data during hydration — no second request, no [mismatch](/en/nuxt/hydration).

## 2. Common `useFetch` options

```vue
<script setup lang="ts">
const route = useRoute()
const page = computed(() => Number(route.query.page ?? 1))

const { data: list, status, error, refresh, clear } = await useFetch('/api/articles', {
  key: 'article-list',                 // stable, unique cache key
  query: { page },                     // reactive params; auto re-fetch on change
  pick: ['id', 'title', 'summary'],    // only these fields enter payload, keeps it slim
  default: () => ({ items: [], total: 0 }),
  getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key] ?? nuxtApp.static.data[key],
  // server: false,                   // fetch on client only (no first-paint content)
  // lazy: true,                      // don't block render; you handle status yourself
  // dedupe: 'defer',                 // newer versions: merge duplicate / cancel old requests
})
</script>

<template>
  <p v-if="status === 'pending'">Loading…</p>
  <p v-else-if="error">Error: {{ error.statusMessage }}</p>
  <ul v-else>
    <li v-for="item in list?.items" :key="item.id">{{ item.title }}</li>
  </ul>
  <button @click="refresh()">Refresh</button>
</template>
```

| Option | Effect | Caveat |
| --- | --- | --- |
| `key` | Identity for cache & payload | Auto-derived from URL + options if omitted; specify explicitly when dynamic params are many |
| `query` / `params` / `body` / `headers` | Request params, support `ref` reactivity | Changes trigger re-fetch |
| `watch` | Extra reactive sources to watch | Pairs with `query` to control refresh timing |
| `transform` / `pick` | Process/trim the return value | **Primary way to shrink the payload** |
| `default` | Value when no data is available | Avoids scattered null checks and `undefined` dual-side differences |
| `server` | Whether to fetch on the server | `false` means no first-paint content |
| `lazy` / `immediate` | Whether to block render / run immediately | With `lazy: true`, first-paint `data` is the default value |
| `getCachedData` | Custom client cache read | Often used to reuse payload or static data cache |
| `deep` / `dedupe` | Reactivity depth / dedupe strategy | Version-dependent; check your version's docs |

Most-used return values: `data` (`Ref`), `status` (`idle` / `pending` / `success` / `error`), `error`, `refresh()`, `clear()`, `execute()`.

## 3. `useAsyncData`: when the fetch source is not a URL

```ts
const { data: dashboard } = await useAsyncData('dashboard', async () => {
  const [user, stats] = await Promise.all([
    $fetch('/api/me'),
    $fetch('/api/stats'),
  ])
  return { user, stats }
})
```

Key points:

- **Use a stable `key`**, otherwise cache and payload cannot be matched;
- `Promise.all` runs in parallel, avoiding the "request waterfall" (one waits for another, slowing TTFB);
- The handler can read `event.context` on the server (via `useRequestEvent()`), but **cannot** access browser objects;
- The result auto-enters the payload; the client does not re-run the handler during hydration.

## 4. Two server-side request traps

### 1. Relative URLs have no "domain" on the server

`$fetch('/api/x')` is fine in the browser, but Node has no origin. Nuxt's `useFetch` handles the internal call; if you hand-write `$fetch` in `server/` or a plugin, supply a baseURL explicitly or use `useRequestFetch`:

```ts
// get a $fetch "with the current request context" inside a component/plugin
const requestFetch = useRequestFetch()
const { data } = await useAsyncData('me', () => requestFetch('/api/me'))
```

### 2. Cookie / auth headers are not auto-forwarded to internal requests

The browser sends `Cookie` when requesting the page, but when the server component fetches the API again it is a "new internal call" that does not carry it automatically. This is why user state often shows **"logged out on SSR, logged in after hydration"**:

```ts
// Option A: forward request headers explicitly
const headers = useRequestHeaders(['cookie', 'authorization'])
const { data: me } = await useFetch('/api/me', { headers })

// Option B: useCookie —— reads from request header on server, document.cookie on client, naturally isomorphic
const token = useCookie('token')
const { data } = await useFetch('/api/me', {
  headers: { Authorization: `Bearer ${token.value}` },
})
```

```ts
// server/api/me.get.ts: server reads cookie from event
export default defineEventHandler((event) => {
  const token = getCookie(event, 'token') ?? parseCookies(event).token
  // ... verify and return the user
})
```

> A cleaner approach: put auth into `server/middleware`, attach `event.context.user` for all handlers, and read the same user state on the page via `useState('user')` — so server and client render results are naturally identical.

## 5. `useState` and cross-environment state

```ts
// initialized once on the server, value passed via payload, client reuses the same key's value
const counter = useState('counter', () => 0)
const user = useState<User | null>('user', () => null)
```

| Rule | Note |
| --- | --- |
| Must be called within the synchronous context of `setup` / plugin / composable | Outside the Nuxt context it throws "nuxt instance unavailable" |
| Key is globally unique | Same key = shared state; add a prefix when separate components each want their own |
| Value must be serializable | It is part of the payload; see [Serialization](/en/nuxt/serialization-payload) |
| Isolated per request | Nuxt guarantees A's state won't leak to B; **but module-level `let` does not** |
| Don't put browser objects in | `window`, `HTMLElement`, class instances cannot be transported |

For complex state use Pinia: the `@pinia/nuxt` module creates a store instance per request during SSR and hands state to Nuxt's payload mechanism. Don't `export const store = reactive({...})` at module top-level to fake a global singleton — it leaks across requests.

## 6. Errors, redirects & caching

```ts
// page fetch fails: throw to Nuxt's error page / error.vue
const { data } = await useFetch('/api/post', {
  async onResponseError({ response }) {
    if (response.status === 404) {
      throw createError({ statusCode: 404, statusMessage: 'Article not found', fatal: true })
    }
  },
})

// manually trigger the error page
showError(createError({ statusCode: 500, statusMessage: 'Server hiccup' }))
```

```ts
// server/api/articles.get.ts: server-side cache, shared across users
export default defineCachedEventHandler(async (event) => {
  return await db.article.list()
}, { maxAge: 60, name: 'article-list' })
```

There are four cache layers — don't confuse them:

| Layer | Means | Scope |
| --- | --- | --- |
| First-paint payload | `useFetch` / `useAsyncData` key | Single request → client hydration |
| Client memory | `getCachedData`, key hit | Navigation within a session |
| Server | `defineCachedEventHandler`, `routeRules.swr/isr/cache` | Shared across all users |
| Edge/CDN | `Cache-Control` headers, platform cache | All users, cross-node |

## 7. High-frequency pitfall list

| Symptom | Cause | Fix |
| --- | --- | --- |
| Same API requested twice | bare `$fetch` in `setup`; or `key` changes every time | switch to `useFetch` / `useAsyncData`, fix the `key` explicitly |
| Server error `window is not defined` | third-party SDK initialized at top level | move to `onMounted`, `import.meta.client`, or a `.client.ts` plugin |
| Server fetch errors `Invalid URL` | hand-written `$fetch('/api/x')` with no baseURL | `useRequestFetch()`, or configure `baseURL` / use internal call |
| Login state flickers | server request missing cookie / user info not in payload | forward headers, `useCookie`, `useState('user')` |
| Hydration mismatch, API returns different order | random ordering, rate-limit returns different data | fix ordering on server and put result into payload |
| Data still stale after page switch | hit client key cache / CDN cache | `refresh()`, design key to include params, check cache headers |
| Slow first paint | serial fetches form a waterfall; payload too big | `Promise.all` in parallel, `pick`/`transform`, server cache |
| `nuxt instance unavailable` | composable called outside `setup` (plain util, callback) | `nuxtApp.runWithContext(() => ...)` or move the call back to sync context |

## Back to the entry

- Review the big picture → [Nuxt Knowledge Base](/en/nuxt/)
- Adjacent topics → [Serialization & Payload](/en/nuxt/serialization-payload) · [Hydration](/en/nuxt/hydration) · [Routing & server layer](/en/nuxt/routing-and-architecture) · [Top pitfalls](/en/nuxt/pitfalls-cheatsheet)
