# Hydration: how static HTML becomes a Vue app

> Stop 3: The HTML returned by the server is only "visible" — no events, no reactivity, no Vue instance. **Hydration (a.k.a. activation / rehydration)** is the act of claiming that already-existing DOM so the app becomes interactive. It is the most bug-prone link in the SSR chain, and the key to understanding Nuxt's various "weird idioms".

## 1. Hydration is not re-rendering

A plain SPA uses `createApp(App).mount('#app')`: it empties the container and builds the DOM from scratch. In SSR mode Nuxt uses `createSSRApp(App)`, and on mount Vue takes the `hydrate()` branch:

```
plain mount:                    hydrate:
empty #app                     keep the existing DOM inside #__nuxt
  └─ build all nodes from vnode  └─ "compare and claim" each node against the vnode
                                    ├─ element node: reuse el, bind events / props / class
                                    ├─ text node: verify content, attach reactive deps
                                    └─ component node: create instance, wire ref / computed / watch
```

Why not just repaint? Because repainting would **flicker the whole page, lose scroll position, lose input focus & typed content, and lose playing video state**, and it would waste the FCP benefit SSR bought.

### The five steps of hydration

```
① Browser parses HTML → paints content immediately (visible, not clickable)
② Download & execute the client bundle
③ Client entry reads __NUXT_DATA__ → restores payload → onto useNuxtApp().payload
④ createSSRApp() builds the isomorphic component tree; useFetch/useState hit the payload cache, no request
⑤ hydrate() reuses DOM, binds events, activates reactivity → onMounted → interactive (TTI)
```

Steps ③④ are the landing point of [Serialization](/en/nuxt/serialization-payload): **the payload is the input to hydration.** The server rendered DOM `H` from data `D`; the client must derive the same vnode from the **same `D`** to line up with `H`. Anything that makes `D` or the render logic differ between the two sides causes a hydration mismatch.

## 2. What exactly is a Hydration mismatch

A typical Vue dev-environment warning:

```
[Vue warn]: Hydration text mismatch in <h1>:
- Client: 2026/11/6 4:00 PM
- Server: 2026/11/6 08:00
[Vue warn]: Hydration node mismatch ...
```

Meaning: **the vnode the client computes from its current state does not line up with the real DOM the server left behind.** Vue's policy is "warn + give up on this mismatched segment, regenerate it from the client render" (in production builds the warning may be stripped, so it shows up as **the page silently flickering / local reflow**). So a mismatch is not noise to ignore: it means part of the SSR HTML was discarded, the SEO & first-paint gains shrink, and event bindings can get misplaced.

### Full table of causes

| Category | Typical writing | Why sides differ |
| --- | --- | --- |
| **Time / random** | `Date.now()`, `Math.random()`, `new Date().toLocaleString()` | Different execution moment / timezone / locale on server vs client |
| **Browser APIs** | `window.innerWidth`, `localStorage.getItem`, `navigator.userAgent`, `matchMedia` | Server has no such objects, can only take a fallback branch |
| **Conditional render divergence** | `v-if="isMobile"`, `v-if="isLoggedIn"` (cookie not forwarded during SSR) | Different judgment results, structurally different DOM |
| **Data inconsistency** | bare `$fetch`, random API ordering, A/B test, different cache version | Client re-fetches, differs from the server's copy |
| **Payload not carried over** | Server only used a local variable; `server: false` but rendered as if data exists | Client's first render gets no value |
| **Illegal HTML** | `<p><div>…</div></p>`, components directly inside `<table>`, missing `<tbody>` | Browser auto-corrects & moves nodes, so DOM ≠ vnode structure |
| **Third-party lib mutating DOM** | Chart/ad/rich-text plugin inserts/deletes nodes during init | DOM already changed before hydration |
| **Whitespace & entity encoding** | Text controlled by newline indentation in templates, mixing `&nbsp;` with literal spaces | Server string differs from browser-parsed text node |
| **i18n / formatting** | Relying on browser `navigator.language` or system font/timezone | Server default locale differs from user environment |
| **Unstable ID / key** | Generating `id` / `:key` / `for` from random or array index | Different identifiers on each side |
| **Client plugin racing ahead** | Plugin modifies DOM or injects global styles before hydration | Out of sync with SSR output |

> Remember one rule when troubleshooting: **a mismatch is always between "server HTML" and "client's first render"** — compare those two, not the later interaction updates.

## 3. The standard flow to locate a mismatch

1. **Confirm it is a hydration issue**: Console shows `Hydration ... mismatch`; or the first paint briefly shows old content then flips; or element events occasionally fail.
2. **Look at the raw server HTML**: `View Source` / `curl` (**not DevTools Elements**, which is post-hydration DOM). Search keywords to confirm what the server actually output.
3. **Compare the payload**: find `__NUXT_DATA__` in that same HTML and check whether the corresponding `data` / `state` is what the client expects.
4. **Binary search**: temporarily set `ssr: false` in `nuxt.config.ts`; if the symptom vanishes → dual-environment consistency issue; if it remains → pure client-side bug.
5. **Narrow the scope**: wrap suspicious components one by one in `<ClientOnly>`, or comment them out, to quickly pin down the component.
6. **Check HTML validity**: are nestings compliant, are table/list structures rewritten by the browser.
7. **Only then look at third parties**: do charts, maps, editors, ad SDKs touch the DOM before hydration.

## 4. The toolbox of fixes

### 1. `<ClientOnly>`: render this block only on the client

```vue
<template>
  <div>
    <h1>{{ post.title }}</h1>              <!-- keep SSR, SEO needs it -->

    <ClientOnly>
      <Chart :data="post.stats" />        <!-- depends on canvas/window, skipped on server -->
      <template #fallback>
        <p>Loading chart…</p>              <!-- placeholder output by the server -->
      </template>
    </ClientOnly>
  </div>
</template>
```

Principle: the server only renders `fallback`; the real child mounts after client hydration, so this DOM naturally never participates in the dual-side comparison. **The cost is that this content is absent from the HTML** — never wrap SEO-bearing body text, titles, or descriptions in it.

### 2. `onMounted` / `import.meta.client`: defer browser logic until after hydration

```vue
<script setup lang="ts">
const width = ref<number | null>(null)

// ❌ window does not exist on the server, and initial values differ between sides
// const width = ref(window.innerWidth)

// ✅ assign only after hydration; first paint renders the same fallback on both sides
onMounted(() => { width.value = window.innerWidth })
</script>

<template>
  <p>Screen width: {{ width ?? 'measuring…' }}</p>
</template>
```

```ts
// composables/useMounted.ts —— reusable version
export function useMounted() {
  const mounted = ref(false)
  onMounted(() => { mounted.value = true })
  return mounted
}
```

Environment checks are for "the same logic takes different branches on each side":

```ts
if (import.meta.server) {
  // server only: read event.context, hit DB, read private config
}
if (import.meta.client) {
  // client only: access DOM, analytics, register events
}
```

> In older code you still see `process.server` / `process.client`, but new projects should use `import.meta.server` / `import.meta.client` for cleaner tree-shaking.

### 3. `<NuxtClientFallback>`: auto-fallback when hydration fails

```vue
<NuxtClientFallback fallback-tag="div" @ssr-error="logSsrError">
  <ThirdPartyWidget />
  <template #fallback>Loading…</template>
</NuxtClientFallback>
```

When a child throws during SSR or cannot complete hydration, Nuxt replaces it with the `fallback` content and switches to pure client rendering. Good for wrapping uncontrollable third-party components (this capability is marked experimental in some versions; check your version's docs first).

### 4. Make both sides' input consistent: `useState` / `useCookie` / `useRequestHeaders`

```ts
// computed once on the server, value carried to the client via payload, avoiding random/time divergence
const seed = useState('seed', () => Math.floor(Math.random() * 1000))
```

```ts
// server forwards the browser's cookie / UA / language to the internal API, avoiding "server logged out, client logged in"
const headers = useRequestHeaders(['cookie', 'user-agent'])
const { data } = await useFetch('/api/me', { headers })
```

`useCookie` reads from the request header on the server and from `document.cookie` on the client — naturally isomorphic; `useState` guarantees the same key yields the same value on both sides (from the payload).

### 5. Stabilizing time, random, and IDs

| Writing | Suggestion |
| --- | --- |
| Display time | Server formats to a string with **UTC / fixed locale** and passes the string down; or format by local timezone after `onMounted` |
| Random value | Generated on server → into `useState` → reused on client; purely decorative random goes in `onMounted` |
| `id` / `for` / `:key` | Use the data's own stable identifier; when auto-generation is needed, use the newer `useId()` Vue/Nuxt provides, which guarantees both-side consistency |
| `v-for` key | Always a business id, never an array index, and certainly never random |

### 6. HTML structure and third-party libraries

- Avoid in templates structures the browser auto-corrects, like `<p>` wrapping `<div>`, or `<table>` missing `<tbody>`;
- Charts, maps, editors uniformly go into `<ClientOnly>`, initialized in the component's `onMounted` and destroyed in `onUnmounted`;
- Wrap debug-only UI (dev environment) in `<DevOnly>`.

## 5. The performance cost of hydration and advanced options

Hydration is not free: the client must **download all first-paint JS → parse & execute → traverse the whole DOM → build a component instance & deps for every node**. The more content and interactive components, the longer the gap between "visible" and "clickable" (especially on mobile). Optimization directions:

| Option | How | Trade-off |
| --- | --- | --- |
| **Fewer first-paint interactive components** | Keep static content as plain HTML; load interactive components on demand via `defineAsyncComponent` / lazy loading | The most robust general approach |
| **Shrink payload** | `pick` / `transform`, paging (see [Serialization](/en/nuxt/serialization-payload)) | Also improves TTFB and hydration parsing |
| **Deferred hydration** | Community module `nuxt-delay-hydration` postpones hydration to idle or first interaction | Evaluate interaction response, analytics, accessibility |
| **Islands / Server Components** | Nuxt experimental `experimental.componentIslands` and `<NuxtIsland>`: only the "island" components hydrate on the client, the rest stay server HTML | Capabilities evolve with versions; confirm the experimental flag & deployment support |
| **Turn off SSR per route** | `routeRules: { '/admin/**': { ssr: false } }` | Simplest for non-SEO pages; see [Rendering modes](/en/nuxt/rendering-modes-and-deploy) |

> One-line selection: first do "less data + fewer interactive components", then consider deferred hydration / islands; don't jump into experimental features upfront.

## 6. Symptom → fix quick reference

| Symptom | Most likely cause | Read first |
| --- | --- | --- |
| Console: `Hydration text mismatch` | time/random/format/i18n differ between sides | This article §2, §4.5 |
| Console: `Hydration node mismatch` | conditional render divergence, illegal HTML, third-party DOM mutation | This article §2, §4.6 |
| First paint flickers, content jumps | client re-fetch, bare `$fetch`, payload miss | [Data fetching](/en/nuxt/data-fetching) |
| `window is not defined` / `localStorage is not defined` | browser API runs on server | [SSR Principles](/en/nuxt/ssr-principles) §4 |
| Same API requested twice | not using `useFetch`, or unstable key | [Data fetching](/en/nuxt/data-fetching) |
| Button not clickable on first paint, works after a few seconds | slow hydration (JS size / huge payload / too many components) | This article §5 |
| After login SSR shows logged-out, becomes logged-in after hydration | server request missing cookie / user info not in payload | [Serialization](/en/nuxt/serialization-payload), [Routing & server layer](/en/nuxt/routing-and-architecture) |

## Back to the entry

- Review the big picture → [Nuxt Knowledge Base](/en/nuxt/)
- Adjacent topics → [Serialization & Payload](/en/nuxt/serialization-payload) · [SSR Principles](/en/nuxt/ssr-principles) · [Data fetching & cross-environment state](/en/nuxt/data-fetching) · [Top pitfalls](/en/nuxt/pitfalls-cheatsheet)
