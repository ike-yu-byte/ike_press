# Performance & Best Practices

> Vue's default performance is already good — the compiler plus precise reactivity handle the heavy lifting. This page has three parts: **why Vue is fast by default** (the compile-time optimization internals, so you know the boundaries), **what to do when it's still not fast enough** (an on-demand checklist), and a **master list of common pitfalls** (12 items, symptom + cause + fix).

## Why Vue is fast by default: compile-time optimization

A template isn't just "translated into a render function" — the compiler applies four layers of optimization:

| Optimization | What it does | What you feel |
| --- | --- | --- |
| **Static hoisting** | Pure static nodes (no interpolation/directives) are lifted out of the render function, created once, the same vnode reused on later renders | large static layout blocks cost nothing |
| **Patch flags** | Dynamic nodes are flagged: text changed, class changed, props changed are recorded separately | diff only inspects flagged slots, not every property |
| **Block tree** | Dynamic nodes are collected into a flat "block" list; updates skip static subtrees | deeply nested static content doesn't participate in diff |
| **Lazy event hydration** | `@click` compiles to a cached `withModifiers(onClick, ...)` wrapper; no real DOM listener until the event fires | first paint is faster with many event-bearing static lists |

On the runtime side: reactivity collects dependencies at **effect granularity (component render / computed / watcher)** — when `state.a` changes, only effects that read `a` re-run; within a component, patch flags then pinpoint the exact nodes.

**Conclusion: the first rule of "performance" in Vue is not breaking this machinery** — stuffing big non-reactive data into `reactive`, writing giant template expressions, abusing `v-if` to swap heavy components — all of that works against the compiler.

## The checklist when it's still not fast enough

### 1. Strip reactivity from big data: shallowRef / markRaw

```js
// thousands of read-only rows: deep proxies are wasted
const rows = shallowRef(await api.getRows());
rows.value = await api.getRows();      // ✓ only a whole replacement triggers
rows.value[0].status = 'done';         // ✗ doesn't (and shouldn't — nothing inside is proxied)

// third-party class instances (ECharts, maps, Monaco) permanently excluded from proxying
const chart = markRaw(new Chart(el));
```

For "read-only display + occasional whole replacement" data, `shallowRef` is the single highest-return optimization.

### 2. Virtual scrolling for long lists

Render only the visible window ± a few buffer rows. Prefer <a href="https://github.com/tangbc/vue-virtual-scroll-viewport" target="_blank" rel="noopener noreferrer">vue-virtual-scroll-viewport</a> or TanStack Virtual (Vue adapter); Element Plus's `el-table-v2` and Ant Design Vue's `VirtualTable` have virtual scrolling built in — for admin dashboards, just pick those.

### 3. v-memo / v-once: manually skip subtree updates

```vue
<!-- in a big list only the "selected row" changes: every other row's whole subtree skips diff -->
<div v-for="item in list" :key="item.id" v-memo="[item.id === selected]">
  ...
</div>

<!-- render once, static forever -->
<header v-once>{{ siteName }}</header>
```

`v-memo`'s dep array means the same as React `useMemo`; don't sprinkle it everywhere — profile, find what's slow, then apply it there.

### 4. KeepAlive instead of remounting

For tab / list-detail round trips where rebuilding is costly (big forms, re-initialized libs), use `KeepAlive` + `include`; the tradeoff is memory for time — cap it with `:max`.

### 5. Route-level code splitting + prefetch

```ts
{ path: '/about', component: () => import('./About.vue') }   // one chunk per route
```

Under Vite you can add `vite-plugin-prefetch` or idle `import()` prefetch (pull on link hover).

### 6. On-demand component-library imports

```ts
// Element Plus: unplugin-vue-components + unplugin-auto-import for automatic on-demand
// manual: import only what you use
import { ElButton } from 'element-plus';
```

A full Element Plus import is ≈700KB+ pre-gzip; on-demand cuts it to a fraction.

### 7. Production build checks

```bash
# vite.config.ts
build: {
  sourcemap: false,          // don't ship it in prod
  chunkSizeWarningLimit: 800,
  rollupOptions: { manualChunks: { vue: ['vue','vue-router','pinia'] } }  // split the base libs
}
```

Add `rollup-plugin-visualizer` to see bundle composition — duplicate deps and accidental full imports jump right out.

## Master list of common pitfalls

::: danger 12 items — check yourself against them
1. **Forgetting `.value`**
   Symptom: `count++` doesn't move the view / `if (someRef)` is always truthy. Cause: a ref is an object, `someRef` is always truthy; `count++` writes a new property on the wrapper. Fix: TS + naming convention (`xxxRef`), or ESLint `vue/no-ref-as-operand`.

2. **Destructuring a reactive object / store loses reactivity**
   Symptom: data changes but the UI doesn't. Fix: `toRefs()` / `storeToRefs()`, or don't destructure. See [Reactivity](/en/vue/reactivity-lifecycle), [Pinia](/en/vue/state-management).

3. **Mutating props directly**
   Symptom: a console warning + your change is overwritten when the parent re-renders. Fix: copy locally, or emit to ask the parent to change it.

4. **v-if and v-for on the same element**
   Symptom: in Vue 3 `v-if` can't see the `v-for` variable and errors. Fix: filter in a computed, or wrap in `<template>`. See [Template Syntax](/en/vue/template-syntax).

5. **Using index as key**
   Symptom: after insert/remove, input contents shift, animations glitch. Fix: use a stable id from the data.

6. **Timers/global listeners added in onMounted never cleaned up**
   Symptom: memory grows after a few route switches; callbacks error "component destroyed". Fix: pair every add with an `onBeforeUnmount` removal.

7. **Top-level await in setup without wrapping in Suspense**
   Symptom: the component doesn't render, async-setup warnings. Fix: a `<Suspense>` fallback, or do it in `onMounted` with a `.then`.

8. **Watching a reactive property as `watch(state.count, ...)`**
   Symptom: "source must be a ref/function" error or it never fires. Fix: the getter form `watch(() => state.count, ...)`.

9. **Side effects in computed / mutating state in onUpdated**
   Symptom: infinite re-render or an indescribable double update. Fix: move side effects to watch, derive with computed.

10. **Calling big functions in the template**
    Symptom: recomputed on every re-render, slower the longer the list. Fix: cache with computed. <span v-pre>`{{ format(expensive(item)) }}`</span> inside a loop is a hidden bomb.

11. **Cramming a deeply nested big object into ref/reactive**
    Symptom: slow first paint, doubled memory (every nested property proxied). Fix: `shallowRef` + whole replacement, or `markRaw`.

12. **KeepAlive component name doesn't match include**
    Symptom: caching "doesn't work". Cause: a `<script setup>` component has no name by default (needs `defineOptions({ name: 'X' })` or a plugin to infer it). Fix: declare the name explicitly, or match by component object.
:::

## Debugging tools

- **Vue DevTools** (browser extension + in-app): component tree, props/state, the Pinia panel (action replay), the Router panel, render performance graphs. The counterpart of React DevTools.
- **The Performance panel**: record interactions to see long-task attribution; Vue components' render functions are named in the flame chart.
- **`onRenderTracked` / `onRenderTriggered`** (debug lifecycle hooks): print "what was tracked / whose change triggered this render" — sharp for locating unexpected re-renders.
- **ESLint plugin `eslint-plugin-vue`**: rules like `vue/no-mutating-props`, `vue/require-v-for-key` catch half of the above while you code — a must-install.

## Back to the entrance

- Review the Vue knowledge map → [Vue Knowledge Base](/en/vue/)
- Go deeper by topic → [Template Syntax](/en/vue/template-syntax) · [Computed & Watch](/en/vue/computed-watch) · [Component System](/en/vue/components) · [Reactivity & Lifecycle](/en/vue/reactivity-lifecycle) · [Forms & Communication](/en/vue/forms-communication) · [Routing](/en/vue/router) · [State Management](/en/vue/state-management)
