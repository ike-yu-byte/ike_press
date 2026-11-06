# Rendering modes, routeRules & deployment

> Stop 7: Nuxt's most underrated power is **deciding per route how to render**. This article gives the full picture of SPA / SSR / SSG / ISR / SWR / hybrid rendering, a `routeRules` cookbook, cache layers, deployment choices, and a ready-to-use decision tree.

## 1. The six-mode panorama

| Mode | When HTML is generated | Key config | Needs server runtime | Typical scenario |
| --- | --- | --- | --- | --- |
| **SPA (CSR)** | When the browser runs JS | `ssr: false` | No (pure static host) | Admin, editors, post-login systems |
| **Universal SSR** | **Per request** | default | Yes | Content sites, e-commerce, real-time data + SEO |
| **SSG prerender** | **At build time** | `nuxi generate` / `prerender: true` | No | Docs, blogs, marketing pages |
| **ISR** | Generated on first request, regenerated after N seconds | `isr: 60` | Platform must support cache/functions | Product pages, news pages, massive detail pages |
| **SWR** | Cache returns immediately, background async regeneration | `swr: 60` | Yes (with cache layer) | High-traffic read-heavy pages |
| **Hybrid rendering** | Each route decides for itself | `routeRules` by path | Depends on route | A project with both a marketing site and an admin |

> "Universal Rendering" means **first-paint SSR + in-site SPA navigation**; it is not the same as old-style multi-page server rendering (full reload on every click). Review the ①~⑧ steps in [SSR Principles](/en/nuxt/ssr-principles).

## 2. `routeRules`: mix them within one project

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  routeRules: {
    // static at build time
    '/': { prerender: true },
    '/about': { prerender: true },

    // content pages: 60s incremental regeneration
    '/blog/**': { isr: 60 },

    // high-traffic list: SWR cache 10 min + CDN header
    '/products/**': {
      swr: 600,
      cache: { maxAge: 600 },
      headers: { 'Cache-Control': 'public, max-age=0, s-maxage=600, stale-while-revalidate=600' },
    },

    // admin: no SSR, pure SPA
    '/admin/**': { ssr: false },

    // legacy path redirect
    '/old-blog/**': { redirect: { to: '/blog/**', statusCode: 301 } },

    // site-wide security header
    '/**': { headers: { 'X-Content-Type-Options': 'nosniff' } },
  },
})
```

Common fields:

| Field | Effect |
| --- | --- |
| `ssr: false` | Output only an SPA shell, no server rendering |
| `prerender: true` | Prerender to static HTML at build time (also generates `_payload.json`) |
| `isr: number \| true` | Seconds of incremental static regeneration; `true` means invalid only on next deploy (platform-dependent) |
| `swr: number \| true` | Cache & background regeneration duration |
| `cache` | Nitro-layer cache policy (`maxAge`, `name`, `group`, etc.) |
| `headers` | Uniformly add HTTP headers to this route's response |
| `redirect` | Server redirect (string or `{ to, statusCode }`) |
| `cors` | Enable CORS for this route |

Rules match by **most specific path first**; `/**` is the usual fallback. Different Nitro versions implement `isr`/`swr` depending on platform capability — verify on the target platform before launch.

### Prerendering details

```bash
npm run generate            # produces .output/public/, drop onto static hosting directly
```

```ts
export default defineNuxtConfig({
  nitro: {
    prerender: {
      crawlLinks: true,                 // discover more pages by following links from existing ones
      routes: ['/sitemap.xml', '/rss.xml'],
    },
  },
})
```

During prerendering Nuxt extracts each route's payload into `_payload.json`, **fetched on demand during client navigation**, avoiding stuffing every page's data into the first-paint HTML (see [Serialization](/en/nuxt/serialization-payload)). A pure static host must ensure these JSON files are deployed alongside the HTML and not blocked by the CDN.

## 3. The four cache layers and invalidation

```
Browser Cache-Control → CDN / edge → Nitro cache (swr/isr/cache) → component fetch cache (payload key)
```

| Layer | Config | Invalidation |
| --- | --- | --- |
| Browser | `headers['Cache-Control']` | max-age expiry |
| CDN | `s-maxage`, `stale-while-revalidate`, platform config | expiry / active purge |
| Nitro | `swr` / `isr` / `defineCachedEventHandler` | time expiry / redeploy / invalidation API |
| Component | `useAsyncData` key, `getCachedData` | `refresh()`, navigation, page refresh |

⚠️ **Security red line**: if an SSR page renders user-private info via cookie ("Hi, Zhang San", orders, balance), **never** give it a shared CDN cache — otherwise user A's HTML could be served to user B. Either `ssr: false` that route or switch to client fetching, or set `Cache-Control: private, no-store` explicitly.

## 4. Deployment: Nitro presets & output

```bash
npm run build                       # → .output/
# local / container
node .output/server/index.mjs
# specify platform
NITRO_PRESET=vercel npm run build
```

| Target | preset | Note |
| --- | --- | --- |
| Own Node server / Docker | `node-server` | Most universal, `node .output/server/index.mjs` |
| Vercel / Netlify | `vercel` / `netlify` | Usually auto-detected, function = SSR |
| Cloudflare Workers / Pages | `cloudflare_module` / `cloudflare_pages` | Edge runtime, mind Node API compatibility |
| Pure static host | `static` + `nuxi generate` | Can only run SSG / SPA |
| Bun / Deno, etc. | corresponding runtime preset | Depends on the Nitro version's support |

Rough `.output/` structure:

```
.output/
├─ server/          # Nitro server entry & SSR bundle (needed for SSR deploy)
└─ public/          # static assets, prerendered HTML, _payload.json, client JS
   └─ _nuxt/        # content-hashed JS/CSS
```

| Deploy symptom | Where to look |
| --- | --- |
| Direct sub-route access 404 | static host missing SPA fallback; SSR deploy missing `server/` or reverse-proxy rule |
| Refresh OK, navigation errors | `_payload.json` not deployed / blocked by CDN / stale version cached |
| Env vars not effective | private uses `NUXT_*`, public uses `NUXT_PUBLIC_*`; distinguish build-time vs runtime vars |
| Works locally, `window is not defined` online | edge runtime lacks Node APIs, or client code leaked into server bundle |
| Data never updates | CDN `s-maxage` stacks with Nitro `swr/isr`, only one layer purged |
| Someone else's username appears in HTML | put a page with user state into shared cache (see red line above) |

## 5. Mode decision tree

```
Does this page need to be crawled / need a share card?
├─ No → heavy interaction, post-login? → routeRules: { ssr: false } (SPA)
└─ Yes → how often does the data change?
        ├─ only at build time (docs, campaign) → prerender / SSG
        ├─ minutes-level, high traffic (product, news) → isr or swr + CDN cache
        ├─ different every request (search, user-related but needs SEO) → real-time SSR
        └─ has user privacy and needs SEO → real-time SSR + Cache-Control: private
```

All four branches can coexist in one project — that is exactly what `routeRules` exists for.

## 6. Pre-launch checklist

1. `curl -I` to check status codes, `Cache-Control`, CDN hits on key routes;
2. Disable JS and open first paint, confirm SEO content is visible without scripts;
3. Open Console to confirm no `Hydration mismatch` (see [Hydration](/en/nuxt/hydration));
4. View page source, confirm `__NUXT_DATA__` has no sensitive fields and reasonable size;
5. Verify client navigation loads `_payload.json` correctly;
6. Refresh the same SSR page with two different accounts, confirm no cross-user state bleed;
7. Check `runtimeConfig` private values do not appear in client JS.

## Back to the entry

- Review the big picture → [Nuxt Knowledge Base](/en/nuxt/)
- Adjacent topics → [SSR Principles](/en/nuxt/ssr-principles) · [Serialization & Payload](/en/nuxt/serialization-payload) · [Getting started & project structure](/en/nuxt/getting-started) · [Top pitfalls](/en/nuxt/pitfalls-cheatsheet)
