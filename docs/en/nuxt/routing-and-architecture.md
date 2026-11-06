# Routing, layouts, middleware & the server layer

> Stop 6: Half of Nuxt's "conventions" live in `pages/`, the other half in `server/`. This article strings together file routing, layouts, middleware, plugins, and the Nitro server layer, ending with a copy-paste auth loop.

## 1. File-based routing

| File | Matches | Note |
| --- | --- | --- |
| `pages/index.vue` | `/` | home |
| `pages/about.vue` | `/about` | static segment |
| `pages/posts/index.vue` | `/posts` | list page |
| `pages/posts/[id].vue` | `/posts/42` | required dynamic segment, `route.params.id` |
| `pages/posts/[slug].vue` + `pages/posts/index.vue` | `/posts/xxx` and `/posts` | static wins over dynamic |
| `pages/[...slug].vue` | any depth | catch-all, often 404 / CMS fallback |
| `pages/users/[group]/[id].vue` | `/users/admin/7` | nested dynamic |
| `pages/posts.vue` + `pages/posts/` directory | nested route | parent puts `<NuxtPage />` for child |

```vue
<!-- pages/posts/[id].vue -->
<script setup lang="ts">
definePageMeta({
  layout: 'article',                 // specify a layout
  middleware: ['auth'],              // named middleware (runs in order)
  // validate: route => /^\d+$/.test(String(route.params.id)),
})

const route = useRoute()
const { data: post } = await useFetch(`/api/posts/${route.params.id}`)
</script>

<template>
  <article><h1>{{ post?.title }}</h1></article>
</template>
```

`definePageMeta` is a **compile-time macro**: only literals or statically analyzable values are allowed inside; you cannot reference a component's reactive variables (do dynamic checks in middleware or `navigateTo` inside `setup`).

Navigation:

```vue
<NuxtLink to="/posts/42">Read</NuxtLink>   <!-- client-side route, no full reload -->
```

```ts
await navigateTo('/login')       // server: 3xx response; client: route jump
await navigateTo('https://example.com', { external: true })
```

## 2. Layouts & page shells

```vue
<!-- layouts/default.vue -->
<template>
  <div>
    <AppHeader />
    <slot />                       <!-- page content -->
    <AppFooter />
  </div>
</template>
```

```vue
<!-- app.vue: root component when pages/ exists -->
<template>
  <NuxtLayout>                    <!-- no name → default -->
    <NuxtPage />
  </NuxtLayout>
</template>
```

- `definePageMeta({ layout: 'article' })` or `setPageLayout('article')` switches layout; `layout: false` skips layout entirely;
- Layout switching only takes effect on client navigation; during SSR it is decided by the page-level `definePageMeta`;
- `app.vue` is the right place for global Providers, global error boundaries, `<NuxtLoadingIndicator />`.

## 3. Route middleware: three forms & execution order

```ts
// middleware/auth.ts —— named middleware, called by page declaration
export default defineNuxtRouteMiddleware((to, from) => {
  const user = useState<User | null>('user')
  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})
```

```ts
// middleware/analytics.global.ts —— global middleware, runs on every navigation
export default defineNuxtRouteMiddleware((to) => {
  if (import.meta.client) trackPageView(to.fullPath)
})
```

```ts
// inline middleware, written inside definePageMeta
definePageMeta({
  middleware: [
    (to) => to.meta.requiresVip ? undefined : abortNavigation('Members only'),
  ],
})
```

| Rule | Note |
| --- | --- |
| Execution order | global (dictionary order by file name) → page-declared named (array order) → inline |
| Runs on both sides | **first visit runs once on server, client navigation runs again**; don't put heavy side effects inside |
| Return value | `navigateTo()` redirect, `abortNavigation()` abort, nothing returned → continue |
| Server redirect | `navigateTo` becomes a real 3xx response, friendlier to SEO |
| Shared state | use `useState` / `useCookie`, not module-level variables (cross-request pollution) |
| Auth boundary | middleware only decides "can enter the page"; **real permission checks must be in `server/api`** |

## 4. Plugins & lifecycle hooks

```ts
// plugins/api.ts —— inject an app-wide $api
export default defineNuxtPlugin((nuxtApp) => {
  const config = useRuntimeConfig()
  const api = $fetch.create({ baseURL: config.public.apiBase })
  return { provide: { api } }        // → useNuxtApp().$api
})
```

```ts
// plugins/analytics.client.ts —— .client suffix loads only on the client
export default defineNuxtPlugin(() => {
  // safe to use window / document here
})
```

- The `.client.ts` / `.server.ts` suffix is the cleanest environment isolation, preferred over sprinkling `if (import.meta.client)` everywhere;
- Common hooks: `app:created`, `app:mounted`, `page:start`, `vue:error`, registered via `nuxtApp.hook('app:created', ...)`;
- If a plugin's async init affects first-paint data, consider putting it in `useAsyncData` rather than the plugin, so it enters the payload.

## 5. The server layer: Nitro + h3

`server/` is Nuxt's built-in backend — no separate Express needed:

| File | Maps to |
| --- | --- |
| `server/api/hello.get.ts` | `GET /api/hello` |
| `server/api/posts/[id].get.ts` | `GET /api/posts/42`, `getRouterParam(event, 'id')` |
| `server/api/login.post.ts` | `POST /api/login`, `readBody(event)` |
| `server/routes/sitemap.xml.get.ts` | `GET /sitemap.xml` (not under `/api`) |
| `server/middleware/auth.ts` | runs on every request, can write `event.context.user` |
| `server/plugins/db.ts` | initialized at Nitro startup (connection pool, etc.) |

Common h3 utilities: `defineEventHandler`, `readBody`, `getQuery`, `getRouterParam`, `getCookie` / `setCookie` / `parseCookies`, `getHeader`, `createError`, `sendRedirect`, `defineCachedEventHandler`.

```ts
// server/api/login.post.ts
export default defineEventHandler(async (event) => {
  const { username, password } = await readBody(event)
  const user = await verifyUser(username, password)       // real permission check on server
  if (!user) throw createError({ statusCode: 401, statusMessage: 'Wrong credentials' })

  setCookie(event, 'token', sign(user), {
    httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7,
  })
  return { id: user.id, name: user.name }                // don't return the password hash
})
```

```ts
// server/middleware/auth.ts —— uniformly attach the user to the request context
export default defineEventHandler((event) => {
  const token = getCookie(event, 'token')
  if (token) event.context.user = verifyToken(token) ?? null
})
```

```ts
// server/api/me.get.ts
export default defineEventHandler((event) => {
  if (!event.context.user) throw createError({ statusCode: 401 })
  return event.context.user
})
```

On the page side, gather this user state into `useState` so SSR and hydration see the same value:

```ts
// in app.vue or a global plugin
const requestFetch = useRequestFetch()
const { data } = await useAsyncData('me', () => requestFetch('/api/me').catch(() => null))
useState('user').value = data.value
```

> The reason for `useRequestFetch()` is that it forwards the inbound request's cookie to the internal call; otherwise the server fetching `/api/me` is always "logged out". See [Data fetching](/en/nuxt/data-fetching).

## 6. Common architecture pitfalls

| Pit | Consequence | Fix |
| --- | --- | --- |
| Putting auth only in route middleware | calling `/api/xxx` directly bypasses it | server handler must verify independently |
| `import` pages/ component code inside `server/` | client code leaks into server bundle, `window` errors | shared logic goes in `shared/` or pure-function utils |
| Sending analytics / writing DB in middleware | runs once on server + once on client, duplicated data | use `import.meta.client` check, or the `page:start` hook |
| Module-level `let` caching current user | cross-request data bleed (serious security incident) | `event.context` / `useState` |
| Using `useRoute()` result inside `definePageMeta` | the macro is compile-time, no runtime value | move the check to middleware |
| Initializing data only in `.client.ts` plugin | SSR first paint missing data, hydration mismatch | first-paint data goes through `useAsyncData` / `useState` |
| `server/api` returns whole table or secret fields | payload exposes sensitive data, huge HTML | trim on server, see [Serialization](/en/nuxt/serialization-payload) |

## Back to the entry

- Review the big picture → [Nuxt Knowledge Base](/en/nuxt/)
- Adjacent topics → [Getting started & project structure](/en/nuxt/getting-started) · [Data fetching & cross-environment state](/en/nuxt/data-fetching) · [Rendering modes & deployment](/en/nuxt/rendering-modes-and-deploy) · [Top pitfalls](/en/nuxt/pitfalls-cheatsheet)
