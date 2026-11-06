# Serialization & Payload: how server state gets "carried" to the browser

> Stop 2: The HTML produced by SSR is only the **visible** part. What truly lets the client take over seamlessly is the state data returned together with the HTML — the **Payload**. This article breaks it open completely, from "why it exists", through "what it looks like, what can go in it, how to slim it down, and where it explodes".

## 1. Why serialization is unavoidable

Suppose the server fetched an article object during rendering:

```ts
const post = await db.post.find(42)   // an object in server memory
```

The browser needs to keep using this object, but an HTTP boundary sits between them: **memory addresses, prototype chains, closures, and DB connections cannot cross the process boundary**. Only text can. So it must be turned into transportable, restorable data.

More importantly, during hydration the client must generate the **same component tree** from the **exact same input** as the server:

| Without a Payload | With a Payload |
| --- | --- |
| The client re-requests the API → two requests, flicker, waterfall of waiting | Directly reuses the server result, **zero extra requests on first paint** |
| If the API result changes (time, ordering, random, A/B split) → DOM differs before/after → hydration mismatch | Both sides read the same snapshot, so the DOM is guaranteed identical |
| Login state, theme, and CSR token computed on the server are unknown to the client | `useState` values are passed across environments automatically |
| Prerendered / ISR pages have no data available on client navigation | Can load `_payload.json` on demand |

> Remember this causal chain: **SSR needs hydration → hydration needs both sides to match → matching needs the server state passed to the browser → passing can only be done by serialization → hence the Payload.**

## 2. What exactly goes into the Payload

During one SSR request, Nuxt collects several kinds of state, all hung on `useNuxtApp().payload`:

| Field | Source | Purpose |
| --- | --- | --- |
| `payload.state` | `useState()` | SSR-friendly cross-environment shared state (theme, user state, counters, one-off computed results) |
| `payload.data` | `useAsyncData` / `useFetch` / `useLazyFetch` | API results cached by `key`; the client hits the cache and stops requesting |
| `payload.error` | errors from the above, `createError` | Lets the client render the same error page / message |
| `payload._once` / `runWithContext` results | `callOnce` and similar one-shot side effects | Avoid the client re-running work the server already did |
| Framework metadata | `serverRendered`, `prerenderedAt`, head, route info | Client decides whether to hydrate, whether it came from a prerender cache |

> Conversely: **data that does not go through these composables never enters the payload.** If you `await $fetch(...)` directly inside `setup` to get a local variable, the server can render it, but the client has no such data during hydration — it usually re-requests, or even mismatches. That is why Nuxt keeps insisting "use `useFetch`, not bare `$fetch`". See [Data fetching](/en/nuxt/data-fetching).

## 3. What it looks like in the HTML

Nuxt 3 / 4 inlines the payload at the end of the HTML (illustrative):

```html
<div id="__nuxt"><article><h1>Nuxt SSR 101</h1></article></div>

<script type="application/json" id="__NUXT_DATA__" data-ssr="true">
  [{"$snuxt:post":1}, {"title":2,"body":3,"createdAt":4}, "Nuxt SSR 101", "...", ["Date","2026-01-02T08:00:00.000Z"]]
</script>
<script type="module" src="/_nuxt/entry.xxxx.js"></script>
```

Details worth noting:

1. **`type="application/json"`**: the browser does not execute it; it is just a data container. The Nuxt client entry reads and parses it by `id="__NUXT_DATA__"`.
2. **The content is not a plain object but a "flat reference table"**: `devalue.stringify` flattens the object graph into an array, using indices to denote references. This means **circular references** and **the same object referenced multiple times** are restored exactly, whereas `JSON.stringify` throws on circular refs.
3. **`data-ssr="true"`**: marks this payload as coming from SSR, so the client enters the hydration flow (rather than a fresh mount).
4. **Nuxt 2 used `window.__NUXT__`** (an executable JS assignment). From Nuxt 3 it switched to a JSON script — safer, faster to parse, and no global pollution.

## 4. Why devalue, not JSON.stringify

`JSON.stringify` turns `Date` into a string, drops `undefined`/`NaN`/`Infinity` to `null` or loses them, turns `Map`/`Set` into `{}`, and throws on circular refs. Nuxt uses [devalue](https://github.com/Rich-Harris/devalue) to fix this:

| Value | `JSON.stringify` | devalue (Nuxt Payload) |
| --- | --- | --- |
| `Date` | becomes a string (type lost) | kept as `Date`, restored as `Date` |
| `Map` / `Set` / `RegExp` / `BigInt` | `{}` / `{}` / `{}` / error | supported, restored by type |
| `undefined` / `NaN` / `Infinity` / `-0` | `null` or lost | preserved exactly |
| Circular refs, same object referenced many times | error / copied into many parts | restored exactly via the reference table (including sharing) |
| Functions, `Symbol`, `Promise`, DOM nodes, class instances | lost or error | **also unsupported** (or degrade to plain objects) |
| Strings containing `</script>` | close the script tag → XSS | auto-escapes dangerous characters |

**Be especially careful with non-serializable values**: class instances (prototype methods are lost), `Error` (Nuxt special-cases its own error types, but custom errors may not be), `Symbol`, functions, third-party SDK client objects (`WebSocket`, `HTMLElement`, special Prisma result types), `bigint` (version-dependent). Convert such values to plain data first with `transform` / `pick`.

### Custom type restoration

If you really must pass a custom class, register a reducer / reviver (the macros are auto-imported by Nuxt, and must be registered on both sides):

```ts
// app/plugins/payload.ts (plugins/payload.ts in Nuxt 3)
definePayloadReducer('Money', (value) => value instanceof Money && value.cents)
definePayloadReviver('Money', (cents) => new Money(cents as number))
```

A reducer returning `false` means "not mine" and defers to the default logic; the reviver is called on the client during restoration by the same tag name. Only use this when genuinely needed — **plain data objects are always more pleasant than custom classes**.

## 5. The full journey of one piece of data, server to hydration

```
1. Page setup: const { data } = await useFetch('/api/posts/42')
2. Server: direct internal call to the Nitro handler → gets post
3. useFetch writes to payload.data[key] = post, key default-derived from URL + params
4. renderToString generates the HTML
5. Nuxt flattens the whole payload with devalue.stringify → injects into __NUXT_DATA__
6. Browser: client entry reads the script → devalue's unflatten restores the object graph → onto useNuxtApp().payload
7. Client setup runs again: useFetch finds the key already in payload.data → returns the cached value, no request
8. hydrate() generates the same vnode from the same data as the server → DOM lines up → hydration succeeds
```

To observe it in code:

```ts
// in a page or plugin (debug only)
const nuxtApp = useNuxtApp()
if (import.meta.server) console.log('[ssr] payload', Object.keys(nuxtApp.payload.data))
if (import.meta.client) console.log('[client] payload', nuxtApp.payload, 'hydrating:', nuxtApp.isHydrating)
```

`nuxtApp.isHydrating` is `true` during hydration, often used to avoid triggering side effects during hydration (e.g. analytics, modal animations).

## 6. Payload extraction: `_payload.json`

Inline payload is best for first paint, but **client-side navigation** should not stuff every page's data into the first-paint HTML. In prerender / ISR scenarios Nuxt can write each route's payload to a separate file (e.g. `/posts/42/_payload.json`), fetched on demand when the client navigates:

```ts
// nuxt.config.ts —— experimental flags differ in default values across versions; follow the docs for your version
export default defineNuxtConfig({
  experimental: {
    payloadExtraction: true,   // extract the payload into _payload.json during prerender
    // renderJsonPayloads: true, // some versions: turn the inline script into an external JSON resource
  },
})
```

Key points:

| Symptom | Cause |
| --- | --- |
| First-paint HTML got smaller but navigation is slower / 404s | `_payload.json` not deployed, blocked by CDN, or wrong cache policy |
| After a data update, client navigation still shows old content | Static payload file and CDN cache not invalidated; need rebuild / cache purge |
| ISR first paint is stale, becomes fresh on second refresh | Cache regeneration happens in the background — expected; control with `swr`/`isr` time |

## 7. Slimming the Payload (directly affects TTFB and hydration speed)

The Payload is an **HTML increment that every user and every request must download** — the bigger it is, the slower. Practical measures:

```ts
// keep only the fields needed for rendering
const { data } = await useFetch('/api/articles', {
  key: 'article-list',
  pick: ['id', 'title', 'summary', 'publishedAt'],
})
```

```ts
// or trim/aggregate on the server side, avoid the whole object entering the payload
const { data } = await useAsyncData('stats', () =>
  $fetch('/api/raw-stats').then(r => ({ total: r.total, top: r.items.slice(0, 5) })),
)
```

| Means | Effect | Caveat |
| --- | --- | --- |
| `pick` / `transform` | serialize only necessary fields | types must be adjusted after trimming |
| server-side aggregation, paging | shrink data at the source | don't stuff a whole table into `useState` |
| `server: false` | data never enters payload, only fetched on client | no first-paint content; careful with SEO |
| `lazy: true` / `immediate: false` | does not block first-paint rendering | you must handle the loading placeholder |
| `default` + `getCachedData` | reuse client cache | mind cache lifetime and key stability |
| per-route `routeRules` cache | reduce repeated rendering & fetching | design the invalidation strategy |

## 8. High-frequency pitfall list

| Pit | Symptom | Fix |
| --- | --- | --- |
| **Putting token / phone / internal fields into `useState` or API return values** | Sensitive data visible by viewing page source | Server returns only fields needed for rendering; secrets go in `runtimeConfig` private section & `event.context` |
| **Huge payload** | HTML hundreds of KB, high TTFB, sluggish hydration | `pick` / `transform`, paging, server-side aggregation |
| **class instance / function / DOM object into state** | Client gets a plain object, methods gone, devalue errors | Convert to plain JSON, or use reducer/reviver |
| **Date / number formatting depends on local timezone** | hydration mismatch: server UTC, browser local | Format with UTC or a fixed locale, or pass the formatted string from the server |
| **`Math.random()` / `Date.now()` written into `useState`** | Different values on both sides → mismatch | Compute random values on the server and put them into the payload, or move them after `onMounted` |
| **Duplicate `useState` key** | Two unrelated components overwrite each other's state | Use a unique key with a business prefix; conversely, reuse the same key when sharing state across components |
| **`server: false` but expecting first-paint content** | Blank first paint, crawlers see nothing | Data needing SEO must be fetched on the server |
| **Bare `$fetch` for fetching** | Same API requested twice in Network, flicker | Switch to `useFetch` / `useAsyncData` |
| **Non-idempotent API (random ordering, A/B split)** | Occasional mismatch | Fix the random factor on the server and pass it via the payload |
| **`_payload.json` 404** | Client navigation errors | Check whether the `payloadExtraction` output is deployed with the static assets and allowed through the CDN |
| **Hand-concatenating HTML interpolation** | User content containing `</script>` causes XSS | Always let Nuxt/devalue handle injection; never hand-concat script content |

## 9. Debug checklist

1. `curl -s https://your.site/posts/42 | grep __NUXT_DATA__` — see the payload content & size directly.
2. Browser `View Source` (not DevTools Elements) to compare server HTML with hydrated DOM.
3. In the Console, `useNuxtApp().payload` (dev) to inspect `state` / `data`.
4. In the Network panel, search `_payload.json` to confirm the payload request status & cache headers on client navigation.
5. Use `ssr: false` to temporarily disable SSR as a binary search: if the problem disappears, it is a dual-environment inconsistency or serialization issue.

## Back to the entry

- Review the big picture → [Nuxt Knowledge Base](/en/nuxt/)
- Adjacent topics → [SSR Principles](/en/nuxt/ssr-principles) · [Hydration](/en/nuxt/hydration) · [Data fetching & cross-environment state](/en/nuxt/data-fetching) · [Top pitfalls](/en/nuxt/pitfalls-cheatsheet)
