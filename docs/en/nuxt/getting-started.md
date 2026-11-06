# Getting started & project structure

> Stop 5: Spin up a Nuxt project from zero and understand what "convention over configuration" actually commits to. After this you can independently scaffold a skeleton with pages, APIs, build, and deployment.

## 1. Create & run

Environment: Node.js 20+ (LTS), any package manager (npm / pnpm / yarn / bun).

```bash
npm create nuxt@latest my-nuxt-app     # official scaffolder (Nuxt 3/4)
# old writing: npx nuxi@latest init my-nuxt-app
cd my-nuxt-app
npm install
npm run dev -- --open                  # http://localhost:3000
```

| Command | Purpose | Output |
| --- | --- | --- |
| `npm run dev` / `nuxi dev` | Dev server (HMR, `/api`, SSR all on) | `.nuxt/` (auto-generated, do not commit) |
| `npm run build` / `nuxi build` | Production build (SSR server + client) | `.output/` |
| `npm run generate` / `nuxi generate` | Prerender into a static site (SSG) | `.output/public/` |
| `npm run preview` / `nuxi preview` | Preview the build locally | — |
| `nuxi prepare` | Only generate types & `.nuxt` (for CI, IDE) | `.nuxt/` |
| `nuxi add page about` | Generate files by convention | `pages/about.vue`, etc. |
| `nuxi module add @nuxt/content` | Install & register a module | auto-edits `nuxt.config.ts` |
| `nuxi typecheck` / `nuxi cleanup` | Type check / clean generated files | — |

> `.nuxt/` is the dev-time generated directory (types, route table, auto-import declarations), `.output/` is the deploy directory. Both should be in `.gitignore`.

## 2. Directory conventions: Nuxt 3 vs Nuxt 4

Nuxt 4 by default moves **app source into `app/`** (`srcDir` defaults to `app/`), while server, static assets, and shared code stay at the root — faster IDE & build, clearer responsibilities:

```
Nuxt 3 (default)                   Nuxt 4 (default)
├─ app.vue                           ├─ app/
├─ pages/                            │  ├─ app.vue
├─ components/                       │  ├─ pages/
├─ layouts/                          │  ├─ components/
├─ composables/                      │  ├─ layouts/
├─ middleware/                       │  ├─ composables/
├─ plugins/                          │  ├─ middleware/
├─ utils/                            │  ├─ plugins/
├─ server/                           │  └─ utils/
├─ public/                           ├─ server/
├─ assets/                           ├─ public/
├─ nuxt.config.ts                    ├─ shared/         # utils/types shared by server & client
└─ ...                               ├─ assets/
                                     └─ nuxt.config.ts
```

> Version note: Nuxt 3 can opt into the new layout early via `future.compatibilityVersion: 4`; Nuxt 4 can also keep the old structure via `srcDir`. Defaults differ across minor versions — follow the template your project generates. The examples below use the Nuxt 3 layout; for Nuxt 4 just move the app directory into `app/`.

### Per-directory responsibilities

| Directory / file | Role | Key convention |
| --- | --- | --- |
| `app.vue` | Root component | Must contain `<NuxtPage />` when `pages/` exists |
| `pages/` | **Files are routes** | `index.vue` → `/`, `posts/[id].vue` → `/posts/:id` |
| `components/` | Components, **auto-imported** | Path is the component name: `components/App/Header.vue` → `<AppHeader />` |
| `layouts/` | Page shells | `default.vue` applies by default, `<slot />` holds the page |
| `composables/` | Composables, auto-imported | Top-level named exports |
| `utils/` | Utility functions, auto-imported | Tree-shaken by usage |
| `middleware/` | Route middleware | `*.global.ts` runs globally; rest referenced via `definePageMeta` |
| `plugins/` | App plugins | `.client.ts` / `.server.ts` suffix restricts runtime |
| `server/api/` | Backend API | File routing + method suffix: `hello.get.ts` → `GET /api/hello` |
| `server/routes/` | Server routes not under `/api` | webhook, sitemap, file download |
| `server/middleware/` | Server middleware per request | auth, logging, inject `event.context` |
| `public/` | Static assets copied as-is | `/logo.png` directly accessible, no hash |
| `assets/` | Assets needing build processing | CSS, fonts, images to be bundled |
| `shared/` | Code shared by both sides (Nuxt 4) | types, pure functions; no browser/server-only APIs |
| `nuxt.config.ts` | Global config | modules, rendering mode, runtime config, Nitro, etc. |

## 3. Minimal runnable example

```vue
<!-- app.vue -->
<template>
  <div>
    <header><NuxtLink to="/">IKE Nuxt Demo</NuxtLink></header>
    <NuxtPage />
  </div>
</template>
```

```vue
<!-- pages/index.vue -->
<script setup lang="ts">
const { data: hello } = await useFetch('/api/hello')
useSeoMeta({ title: 'Nuxt Home' })
</script>

<template>
  <main>
    <h1>{{ hello?.message }}</h1>
    <NuxtLink to="/about">About</NuxtLink>
  </main>
</template>
```

```ts
// server/api/hello.get.ts
export default defineEventHandler(() => ({ message: 'Hello from Nitro' }))
```

These three files complete the full chain: **SSR HTML → `useFetch` internal call to `/api/hello` → result into payload → client hydration → `<NuxtLink>` client navigation**. To verify SSR, disable browser JS and refresh — the title and body are still there.

## 4. Auto-imports: the most "magical" part of Nuxt

None of the following need `import` (types are generated in `.nuxt`, IDE can jump):

| Category | Examples |
| --- | --- |
| Vue API | `ref`, `computed`, `watch`, `onMounted`, `defineComponent` |
| Nuxt composables | `useFetch`, `useAsyncData`, `useState`, `useRoute`, `useRouter`, `navigateTo`, `useCookie`, `useNuxtApp`, `useRuntimeConfig`, `useSeoMeta`, `definePageMeta` |
| Server | `defineEventHandler`, `readBody`, `getQuery`, `getCookie`, `createError`, `defineCachedEventHandler` |
| Project code | exports under `components/`, `composables/`, `utils/` |
| Components | `<NuxtPage />`, `<NuxtLink />`, `<ClientOnly />`, `<NuxtLoadingIndicator />` |

To disable or adjust: `imports: { autoImport: false }` / `components: { dirs: [] }`. It is recommended to keep auto-imports but give `components/` clear directory prefixes to avoid name collisions.

## 5. Common `nuxt.config.ts`

```ts
export default defineNuxtConfig({
  // modules: one line plugs in a whole capability
  modules: ['@nuxt/content', '@pinia/nuxt', '@nuxtjs/i18n'],

  // global styles
  css: ['~/assets/css/main.css'],

  // master rendering switch: false = whole-site SPA
  ssr: true,

  // runtime config: private section only readable on server; public section enters client bundle
  runtimeConfig: {
    dbPassword: '',                       // overridden by NUXT_DB_PASSWORD
    public: { apiBase: '/api' },          // overridden by NUXT_PUBLIC_API_BASE
  },

  // per-route rendering strategy (focus of Article 7)
  routeRules: {
    '/': { prerender: true },
    '/blog/**': { isr: 60 },
    '/admin/**': { ssr: false },
  },

  nitro: { preset: 'node-server' },      // deployment target
  devtools: { enabled: true },
  typescript: { strict: true },
  compatibilityDate: '2026-01-01',       // pin framework behavior version, fewer upgrade surprises
})
```

```bash
# .env —— runtime overrides, no code change needed
NUXT_DB_PASSWORD=secret
NUXT_PUBLIC_API_BASE=https://api.example.com
```

> ⚠️ The private values at the top level of `runtimeConfig` can only be read server-side via `useRuntimeConfig()`; the `public` section enters client JS and the payload — never put secrets there.

## 6. Module ecosystem (don't reinvent wheels)

| Module | Purpose |
| --- | --- |
| `@nuxt/content` | Markdown / content sites, docs sites, with query API |
| `@nuxt/image` | Image optimization, responsive sizes, lazy loading |
| `@nuxt/ui` | Tailwind-based component library |
| `@nuxtjs/i18n` | Multi-language routing & copy |
| `@pinia/nuxt` | SSR-friendly state management |
| `@nuxtjs/tailwindcss` | Tailwind integration |
| `@nuxt/test-utils` | Component / E2E testing |
| `@nuxtjs/sitemap` / `robots` | SEO helpers |

## 7. Build output & first deployment

```bash
npm run build          # → .output/ (contains server/ and public/)
node .output/server/index.mjs   # run the production SSR service locally, port 3000 by default
```

- **SSR**: deploy the whole `.output` to a Node / Serverless / Edge runtime; start with `node .output/server/index.mjs` or the platform preset;
- **SSG**: after `npm run generate`, just drop `.output/public/` onto any static host (OSS, GitHub Pages, CDN);
- **Hybrid**: some static, some SSR via `routeRules`; choose the preset by platform capability, see [Rendering modes & deployment](/en/nuxt/rendering-modes-and-deploy).

## 8. Nuxt 2 → 3/4 migration cheat sheet

| Nuxt 2 | Nuxt 3 / 4 |
| --- | --- |
| `asyncData(ctx)` | `useAsyncData` / `useFetch` (in `setup`) |
| `fetch()` hook | `useFetch`, `$fetch` replaces axios base requests |
| `this.$config` / `publicRuntimeConfig` | `useRuntimeConfig()` |
| `store/` (Vuex) | `useState` / `@pinia/nuxt` |
| `middleware(ctx)` | `defineNuxtRouteMiddleware((to, from) => ...)` |
| `static/` | `public/` |
| `nuxt.config.js` + `buildModules` | `nuxt.config.ts`, unified `modules` |
| `serverMiddleware` | `server/` directory + Nitro `defineEventHandler` |
| `window.__NUXT__` | `__NUXT_DATA__` JSON script + `useNuxtApp().payload` |
| webpack | Vite (rarely switched back to webpack) |

## Back to the entry

- Review the big picture → [Nuxt Knowledge Base](/en/nuxt/)
- Go deeper → [Routing, layouts, middleware & server layer](/en/nuxt/routing-and-architecture) · [Rendering modes & deployment](/en/nuxt/rendering-modes-and-deploy) · [SSR Principles](/en/nuxt/ssr-principles) · [Top pitfalls](/en/nuxt/pitfalls-cheatsheet)
