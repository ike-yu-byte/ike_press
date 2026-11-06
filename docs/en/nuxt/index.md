# Nuxt Knowledge Base

> This documentation is a **systematic walkthrough of Nuxt 3 / 4**. It is less about listing APIs and more about making three things click: **how SSR actually boots up**, **how the server gets its state "over" to the browser (serialization / Payload)**, and **how the browser turns static HTML into an interactive app (Hydration)**. The second half is the engineering side: directory conventions, routing & middleware, data fetching, rendering modes, deployment, and top pitfalls. It is aimed at developers who have written Vue SPAs and are touching server-side rendering for the first time.

## Build the mental model first: Nuxt is Vue's "full-stack shell"

| What you think Nuxt is | What Nuxt actually is |
| --- | --- |
| Just "a Vue scaffolding tool" | A **convention-based full-stack framework**: Vue 3 for the UI, Vite for bundling, Nitro for the server, and the file directory for routing & APIs |
| "SSR just means the server outputs HTML" | SSR is only the **first-paint** half. Nuxt's default is **Universal Rendering (isomorphic)**: the first paint is server-rendered, then the client takes over and it behaves like a SPA |
| "Server rendering is the end of it" | The state produced during server rendering **must be serialized into the HTML** so the client can **hydrate** from the same data, otherwise the UI flickers or throws a mismatch |
| "Just fetch inside the page" | Code that runs on both sides must use Nuxt's `useFetch` / `useAsyncData` / `useState`, which handle **dedup, caching, payload injection, and cross-environment consistency** |
| "Code only runs in the browser" | The same `setup` runs **once on the server, then again on the client** — so `window`, `localStorage`, randomness, and time zones all become traps |

One sentence to summarize the whole site:

> **The same Vue component code generates HTML plus a serializable state blob (the Payload) on the server; the browser downloads the JS, reads that state, and "activates" the existing DOM into a Vue app; after that, all interaction and navigation happen on the client.**

Understand that sentence and SSR, serialization, hydration, the dual-environment differences, and why `useFetch` exists all become its corollaries.

## The full timeline of one SSR request

```
① Browser     GET /posts/42
② Nitro       matches routeRules / server middleware, creates a fresh Nuxt app instance for THIS request
③ Server      runs route middleware → page setup → useFetch / useAsyncData fetch data
④ Server      renderToString(vueApp) → HTML string
             └── meanwhile serializes useState + async data with devalue into a Payload, inlined into the HTML
⑤ Browser     receives HTML: content is visible immediately (fast FCP, crawlers see full text)
             └── <script type="application/json" id="__NUXT_DATA__">…</script>
⑥ Browser     downloads JS chunk → creates the same Vue app (createSSRApp) → reads the Payload
⑦ Hydration   hydrate(): reuses existing DOM, binds events, restores reactivity → page is interactive
⑧ Afterward   <NuxtLink> navigation no longer goes to the server; it uses client-side routing + client fetching (or loads _payload.json on demand)
```

Steps ③~⑤ are **SSR**; that JSON blob in ⑤ is **serialization / Payload**; ⑥~⑦ are **hydration**. The three topics are expanded in the next three articles respectively.

## Three easily-blurred concepts (conclusions first)

| Concept | One-liner | Why it must exist | Deep dive |
| --- | --- | --- | --- |
| **SSR** | The server renders components into an HTML string and returns it | The first paint does not wait for JS to download & execute; SEO / share cards get real content | [SSR Principles](/en/nuxt/ssr-principles) |
| **Serialization / Payload** | Turning the server's in-memory state into transportable, restorable JSON, embedded in the HTML | The server's memory objects and the browser are separated by an HTTP boundary; the client must render the **same DOM** from the **same data** | [Serialization & Payload](/en/nuxt/serialization-payload) |
| **Hydration** | The client Vue does not rebuild the DOM, it "claims" the server-generated DOM and attaches events & reactivity | Re-`mount`ing would rebuild the whole page (flicker, lost focus); mismatched data makes the DOM not line up, producing a hydration mismatch | [Hydration](/en/nuxt/hydration) |

## Sub-page navigation

| # | Topic | What you will learn |
| --- | --- | --- |
| 1 | [SSR Principles: the full request lifecycle](/en/nuxt/ssr-principles) | The limits of CSR, Universal Rendering architecture, the 8-step request chain, dual-environment difference table, SSR's trade-offs, common misconceptions |
| 2 | [Serialization & Payload](/en/nuxt/serialization-payload) | Why serialization is mandatory, what `__NUXT_DATA__` looks like, what devalue can/cannot serialize, how `useState` & `useAsyncData` enter & leave the payload, `_payload.json`, size & security pitfalls |
| 3 | [Hydration & mismatch](/en/nuxt/hydration) | What `createSSRApp` + `hydrate` do, the full list of mismatch causes, how to locate them, the `<ClientOnly>` / `<NuxtClientFallback>` / `onMounted` toolbox, deferred hydration & islands |
| 4 | [Data fetching & cross-environment state](/en/nuxt/data-fetching) | `useFetch` / `useAsyncData` / `$fetch` compared, key dedup & caching, cookie/header forwarding, `useState` & Pinia, the double-request & waterfall pitfalls |
| 5 | [Getting started & project structure](/en/nuxt/getting-started) | Install & commands, Nuxt 3/4 directory conventions, auto-imports, a minimal runnable example, common `nuxt.config.ts`, the module ecosystem, build output |
| 6 | [Routing, layouts, middleware & the server layer](/en/nuxt/routing-and-architecture) | File-based routing rules, `definePageMeta`, layouts, three kinds of middleware, plugins, `server/api` & Nitro/h3, a complete auth example |
| 7 | [Rendering modes, routeRules & deployment](/en/nuxt/rendering-modes-and-deploy) | SPA / SSR / SSG / ISR / SWR / hybrid rendering, the `routeRules` cookbook, cache layers, Nitro presets & deployment choices, the mode decision tree |
| 8 | [Top pitfalls & cheat sheet](/en/nuxt/pitfalls-cheatsheet) | 15 symptom → cause → fix items, environment checks & API quick reference, production troubleshooting flow, a learning path |

Suggested path: **1 → 2 → 3 are the foundation** (especially 2 and 3 — they are the root cause of almost all "flickering page / hydration mismatch / interface requested twice" issues); 4~6 are daily references; 7 decides the project shape and how you ship; 8 is for when something weird shows up.

## Quick-reference table: which rendering mode

| Mode | Switch | When is HTML generated | Use for | Cost |
| --- | --- | --- | --- | --- |
| **SPA (CSR)** | `ssr: false` | When the browser executes JS | Admin dashboards, post-login systems, heavy-interaction tools | Blank first paint, weak SEO |
| **Universal SSR** (default) | on by default | Generated **per request** on the server | Content sites, e-commerce detail pages, dynamic data with SEO needs | Needs a server runtime; TTFB depends on the backend |
| **SSG / prerender** | `nuxi generate`, `prerender: true` | Generated **at build time** | Docs, blogs, marketing pages | Data changes require a rebuild |
| **ISR** | `routeRules: { '/**': { isr: 60 } }` | Generated on first request, then cached for N seconds | Product pages, news pages — lots of content, infrequent updates | Needs a cache-capable deployment platform |
| **SWR cache** | `routeRules: { '/**': { swr: 60 } }` | Cache + background regeneration | High-traffic read-heavy pages | Brief stale data, cache invalidation strategy |
| **Hybrid rendering** | per-route `routeRules` | Each route decides for itself | A project with both admin and marketing pages | Higher config complexity |

> Nuxt's most underrated power is **per-route hybrid rendering**: turn off SSR for `/admin/**` (SPA), use ISR for `/blog/**`, statically build `/about` at build time, and real-time SSR for `/` — all expressed in one project with `routeRules`. See [Article 7](/en/nuxt/rendering-modes-and-deploy).

## Glossary

| Term | Meaning |
| --- | --- |
| **Universal / Isomorphic rendering** | The same component code runs on both server and client: SSR for the first paint + SPA for later navigation — Nuxt's default mode |
| **Nitro** | Nuxt's server engine: HTTP serving, `server/api`, caching, prerendering, multi-platform deployment output |
| **h3** | The minimal HTTP framework inside Nitro; `defineEventHandler` / `readBody` / `getCookie` all come from it |
| **Payload** | The state data injected into the HTML alongside the SSR result (`state` + `data` + `error` + `once`) |
| **devalue** | The library Nuxt uses to serialize the Payload; supports `Date`/`Map`/`Set`/circular refs, and prevents `</script>` injection |
| **Hydration mismatch** | The vnode the client expects from its data does not line up with the server HTML; Vue warns and rebuilds that section locally |
| **TTFB / FCP / TTI** | Time To First Byte / First Contentful Paint / Time To Interactive; SSR mainly improves FCP but trades off some TTFB and TTI |
| **Island / Server Component** | Only hydrate the interactive parts of a page, keep the rest as static HTML, to cut hydration cost |

## Learning resources

- <a href="https://nuxt.com/docs" target="_blank" rel="noopener noreferrer">Official Nuxt docs</a>: read the "Rendering" and "Data Fetching" sections under `Getting Started` → `Going Further` alongside our Articles 1~4.
- <a href="https://vuejs.org/guide/scaling-up/ssr" target="_blank" rel="noopener noreferrer">Vue official SSR guide</a>: the clearest explanation of `renderToString` / `createSSRApp` / hydration at the low level.
- <a href="https://nitro.unjs.io" target="_blank" rel="noopener noreferrer">Nitro docs</a>: the authoritative source for deployment presets, `routeRules`, and the cache API.
- <a href="https://github.com/Rich-Harris/devalue" target="_blank" rel="noopener noreferrer">devalue</a>: read the "What can be serialized" section in the README to see exactly what belongs in a Payload.
- <a href="https://nuxt.com/modules" target="_blank" rel="noopener noreferrer">Nuxt Modules ecosystem</a>: official & community modules like Content / Image / UI / i18n / Pinia.
