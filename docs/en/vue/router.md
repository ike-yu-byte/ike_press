# Routing (vue-router)

> vue-router is Vue's official companion router; the current major is v4 (for Vue 3). This page follows "config → read params → guards → advanced", with emphasis on **the guard execution order** — where both interviews and real projects most often bite.

## Setup

```bash
npm i vue-router        # create-vue scaffolds it in automatically
```

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';

const router = createRouter({
  history: createWebHistory(),      // HTML5 History mode
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: () => import('../views/About.vue') },  // lazy
    { path: '/:catchAll(.*)', component: NotFound },                    // 404 fallback
  ],
});

export default router;
```

```ts
// main.ts
import { createApp } from 'vue';
import router from './router';
createApp(App).use(router).mount('#app');
```

### Choosing a history mode

| Mode | URL | Requires |
| --- | --- | --- |
| `createWebHistory()` | `/user/1` | **server fallback must be configured** (all paths fall back to index.html); Nginx `try_files $uri /index.html`; on pure static hosts (GitHub Pages) set up a 404.html redirect or give up |
| `createWebHashHistory()` | `/#/user/1` | zero server config, legacy-safe; ugly URL, the anchor is taken |
| `createMemoryHistory()` | no URL | SSR / tests / special containers |

## The full route-config syntax

```ts
const routes = [
  // dynamic segment
  { path: '/user/:id', component: User },                    // /user/42 → params.id = '42'
  { path: '/file/:name.:ext', component: File },             // multiple params
  { path: '/Optional/:msg?', component: Opt },               // trailing ? = optional
  { path: '/:catchAll(.*)', component: Catch },              // custom regex: fallback

  // nested: the parent puts a <router-view /> inside
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      { path: '', component: AdminHome },                    // default child (the parent path itself)
      { path: 'dashboard', component: Dashboard, name: 'dash' },  // /admin/dashboard
    ],
  },

  // redirect & alias
  { path: '/home', redirect: '/' },
  { path: '/old/:id', redirect: to => `/new/${to.params.id}` },  // function redirect
  { path: '/docs', alias: '/d' },                            // alias: URL unchanged, same component

  // named route (for KeepAlive include / devtools)
  { path: '/x', component: X, name: 'x-route' },
];
```

### Nested-layout essentials

```vue
<!-- AdminLayout.vue -->
<template>
  <aside>menu</aside>
  <router-view />          <!-- child routes render here -->
</template>
```

- A child's `path` does **not** start with `/` (relative to the parent).
- To match "the parent path itself", add a default child with `path: ''`.
- For deeper nesting, keep placing `<router-view />` one level down.

## Links & programmatic navigation

```vue
<script setup>
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();          // current route info (reactive)

function go() {
  router.push('/user/1');                       // string
  router.push({ name: 'user', params: { id: 1 } });   // named route (recommended)
  router.push({ path: '/search', query: { q: 'vue' } }); // /search?q=vue
  router.replace('/login');                     // replace, no history entry
  router.go(-1);  router.forward();             // back / forward
}
</script>

<template>
  <!-- declarative -->
  <RouterLink to="/about">About</RouterLink>
  <RouterLink :to="{ name: 'user', params: { id: 1 } }">User</RouterLink>
  <RouterLink to="/x" replace>enter by replace</RouterLink>

  <!-- active classes: default .router-link-active / .router-link-exact-active, globally configurable -->
  <RouterLink to="/admin" active-class="on">Admin</RouterLink>

  <!-- the outer RouterView can take the match to add a transition -->
  <RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
```

### Reading params: params / query / props

```vue
<script setup>
import { useRoute } from 'vue-router';
const route = useRoute();
route.params.id;     // path params (strings!)
route.query.q;       // query string
</script>
```

**Prefer props for decoupling**: in the route config set `props: true` (params become props) or `props: (route) => ({ id: Number(route.params.id) })` — the component doesn't know the router exists, testability jumps.

::: warning The same-route-only-param-changes trap
Going from `/user/1` to `/user/2`, **the component instance is reused** — `onMounted` won't run again! Two fixes:
```vue
<script setup>
// 1. watch the param
watch(() => route.params.id, (id) => fetchUser(id), { immediate: true });
</script>
<template>
  <!-- 2. key the router-view to force recreation when params change -->
  <RouterView :key="$route.fullPath" />
</template>
```
:::

## Navigation guards: execution order is the soul

Three levels: **global → per-route → in-component**. The full order:

```
1. navigation triggered
2. global beforeEach        (per matched route, parent → child)
3. per-route beforeEnter
4. in-component beforeRouteUpdate (instance reused, only params changed; parent → child)
5. resolve async components
6. global beforeResolve     (parent → child)
7. per-route/in-component beforeRouteLeave (leaving pages; leave before enter)
8. global afterEach (no next, notification only; runs after DOM update)
```

Core to memorize: **entering guards run "top-down", leaving guards "bottom-up"; leave runs after all entering guards but before the component renders.**

```ts
// global: login auth is the most common
router.beforeEach((to, from) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLogin) {
    return { path: '/login', query: { redirect: to.fullPath } };  // returning an object = redirect
  }
  // return false = cancel; return nothing = proceed
});
```

```ts
// per-route
{ path: '/admin', component: Admin, beforeEnter: (to, from) => { /* ... */ } }
```

```vue
<script setup>
// in-component guards (composition uses the vue-router hook functions, not the Options names)
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';

onBeforeRouteLeave((to, from) => {
  if (formDirty.value && !confirm('Unsaved changes, leave anyway?')) return false;
});
onBeforeRouteUpdate((to) => { fetchData(to.params.id); });
</script>
```

::: tip Async guards, three styles
You can skip `next` entirely (just return / await / throw); if you do use `next()` it must be called **exactly once per branch** — missing it hangs the navigation forever, calling it twice errors immediately. Vue Router 4 favors return semantics.
:::

## meta: attach business info to routes

```ts
{ path: '/profile', component: Profile, meta: { requiresAuth: true, title: 'Profile', roles: ['admin'] } }
```

```ts
// set the title uniformly in afterEach
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | IKE Press` : 'IKE Press';
});
```

In TS projects, augment the type:

```ts
declare module 'vue-router' {
  interface RouteMeta { requiresAuth?: boolean; title?: string; }
}
```

## Scroll behavior & lazy loading

```ts
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;                 // restore on back
    if (to.hash) return { el: to.hash, behavior: 'smooth' }; // anchor
    return { top: 0 };                                       // default scroll to top
  },
});
```

Two lazy-loading granularities:

- **Route-level**: `component: () => import('...')` — one chunk per page, most common.
- **Component-level**: heavy parts inside a page via `defineAsyncComponent`.

Pair with Vite bundle analysis: `rollup-plugin-visualizer` to see chunk distribution.

## Next

- Where the login state used in guards lives → [State Management (Pinia)](/en/vue/state-management)
- Dynamic permission routes (addRoute by role) are advanced — the official "Routing Matching" and API pages cover it well
