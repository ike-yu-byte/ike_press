# Vue Knowledge Base

> This set of docs is a systematic walkthrough of **Vue 3**: from template syntax to reactivity internals, from component design to routing and state management, ending with performance and common pitfalls. It's not a copy of the official API list — it's organized around "the problems you actually hit in real development", with comparisons, traps, and selection advice on every page. Aimed at developers with JS basics who are learning Vue or filling knowledge gaps.

## Vue's core mindset: frame it first, then the details

Grasp these main threads and most of Vue 3's design becomes a corollary:

| Thread | Meaning | Consequence |
| --- | --- | --- |
| **Template is a DSL** | Directives in `<template>` (`v-if`/`v-for`/`v-model`) are compiled into a render function | Static content is hoisted and cached, dependencies collected precisely — lots of "magic", little boilerplate |
| **Reactivity system** | `ref`/`reactive` built on Proxy track dependencies automatically | Change data → the view updates itself, no manual notification |
| **Precise updates** | Compiler + runtime together mark "which node depends on which data" | Only affected parts re-render by default; you rarely optimize manually |
| **Two-way sugar** | `v-model` is really a `modelValue` prop + an `update:modelValue` event | Forms are extremely fast to build, but see through it: underneath it's still one-way flow |
| **Progressive framework** | Router, state, build tool are official-but-separate libraries | From a single `<script>` tag to a full stack — adopt as needed |

In one line: **Vue makes 80% of the decisions for you** (dependency tracking, update granularity, template compilation), you handle the business; the cost is understanding where the "magic" ends — the writings that break dependency tracking are exactly the high-frequency pitfalls.

## Sub-page navigation

| # | Topic | What you'll learn |
| --- | --- | --- |
| 1 | [Template Syntax](/en/vue/template-syntax) | Interpolation and the full `v-bind`/`v-on` family, class/style binding, conditional & list rendering, what `key` means, event modifiers |
| 2 | [Computed & Watch](/en/vue/computed-watch) | `computed` caching and getter/setter, the three `watch` forms, `watchEffect`, deep/immediate/flush, how to choose |
| 3 | [Component System](/en/vue/components) | The full props/emits chain, `defineModel`, three slot forms, dynamic components, `KeepAlive`, `Teleport`, async components |
| 4 | [Reactivity & Lifecycle](/en/vue/reactivity-lifecycle) | Proxy internals, `ref` vs `reactive`, deactivation traps, the lifecycle map, `nextTick`, composables |
| 5 | [Forms & Communication](/en/vue/forms-communication) | `v-model` internals and every modifier, native control binding, validation approaches, a full communication decision map |
| 6 | [Routing (vue-router)](/en/vue/router) | The whole route-config syntax, nesting & dynamic matching, guard execution order, `meta` auth, scroll & lazy loading |
| 7 | [State Management (Pinia)](/en/vue/state-management) | state/getters/actions, option vs setup stores, `storeToRefs`, persistence, modularization, Pinia vs component state |
| 8 | [Performance & Best Practices](/en/vue/performance-best-practices) | Compile-time optimization (static hoisting / patch flags), `shallowRef`/`v-memo`, virtual lists, bundle optimization, 12 common pitfalls |

Suggested path: **1 → 2 → 3 → 4 are the foundation** (especially page 4's reactivity internals — it explains every "why" from the earlier pages); 5–7 are hands-on walkthroughs of the three official companion libraries; come back to 8 when you hit performance issues or weird behavior.

## Quick reference: main Vue 2 → Vue 3 changes

Saves a lot of doc-digging when maintaining or migrating a Vue 2 project:

| Aspect | Vue 2 | Vue 3 |
| --- | --- | --- |
| Component style | Options API (data/methods/computed blocks) | Composition API + `<script setup>` (Options still supported) |
| Reactivity | `Object.defineProperty`, needs `Vue.set` for new props | `Proxy`, add/delete properties both detected |
| Logic reuse | mixins (name clashes, unclear origin) | composables (explicit import/export) |
| Local state | `data() { return {...} }` | `ref()` / `reactive()` |
| Watching | `watch` option | `watch` / `watchEffect` functions |
| Event bus | `new Vue()` + `$on/$emit` | removed — use [mitt](https://github.com/developit/mitt) or lift state |
| Global state | Vuex (mutations + actions) | Pinia (only state/getters/actions) |
| Routing | vue-router 3 | vue-router 4 (`createRouter` + split history modes) |
| Functional components | needed a special flag | stateless function components removed — just use templates |
| `.sync` modifier | `:prop.sync` | `v-model:prop` |
| `$listeners` | separate | merged into `$attrs` |
| Filters <code>&#124;</code> pipe | built-in template filter | removed — use computed or methods |
| Root node | single-root limit | multiple roots (Fragment), attributes forwarded explicitly |
| Teleport | none (manual appendTo) | built-in `<Teleport to="body">` |
| Build tool | webpack + vue-cli | Vite + `@vitejs/plugin-vue` (de facto standard) |
| Typing | TS support was awkward | TS-native friendly, `defineProps<T>()` generic inference |

## Learning resources

- <a href="https://vuejs.org" target="_blank" rel="noopener noreferrer">Vue 3 official docs</a>: the new interactive docs are excellent; "Getting Started" and "Reactivity in Depth" are must-reads.
- <a href="https://router.vuejs.org" target="_blank" rel="noopener noreferrer">Vue Router official docs</a>: the guard-execution-order section is clearer than any blog.
- <a href="https://pinia.vuejs.org" target="_blank" rel="noopener noreferrer">Pinia official docs</a>: short and sharp — an hour to get productive.
- <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">Vite docs</a>: build and dev-server configuration.
- <a href="https://vuejs.org/style-guide/" target="_blank" rel="noopener noreferrer">Official Vue Style Guide</a>: the A/B/C rules for naming, attribute order, and template-expression restraint.
