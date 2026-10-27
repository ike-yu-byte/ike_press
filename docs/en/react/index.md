# React Knowledge Base

> This set of docs is a React migration map for **developers who already know Vue**. It doesn't teach programming from zero — it answers one question: what do the Vue skills you have correspond to in React, where does the "feel" differ completely, and which pitfalls nearly every Vue-to-React convert has stepped in. The content is split into topic sub-pages; read them in the order below.

## Set the mental model first: rewire your brain, then learn the APIs

Vue and React are both "componentized + virtual DOM", but their underlying philosophies are opposite. Grab this table — every sub-page below is an expansion of it:

| Dimension | Vue 3 | React |
| --- | --- | --- |
| Core mechanism | **Reactivity system**: `ref`/`reactive` track dependencies automatically; when data changes the view updates itself | **Re-rendering**: when state changes, the whole component function **runs again**, producing new JSX for diff |
| Template / logic | Template is a DSL; the compiler does static hoisting and dependency collection — lots of "magic" | JSX is just JS, no magic — whatever code you can write, you can render |
| Update granularity | Compiler precisely marks which nodes are affected | Component-level re-render of the whole subtree by default; **you control performance optimization manually** (the memo family) |
| Data flow | Two-way binding `v-model` is standard syntax | **One-way data flow**; "two-way" is something you assemble from value + onChange |
| State mutability | Mutate directly: `state.count++` | **No in-place mutation**: every state update must swap in a new object (immutable data) |
| Organization | Split by "feature option" (template / script / style) | Everything is functions and call order (hooks) |

In one line: **Vue makes 80% of the decisions for you; React hands the choices (and the responsibility) back to you.** Early on you'll feel "why do I have to do everything myself" — what you get in return is extreme flexibility and predictability.

## Sub-page navigation

| # | Topic | What you'll learn |
| --- | --- | --- |
| 1 | [JSX & Template Syntax](/en/react/jsx) | translate `v-if`/`v-for`/<span v-pre>`{{}}`</span>/`@click`/`v-model`/`<slot>` into JSX one by one; three JSX detail traps |
| 2 | [Components & State](/en/react/components-state) | function components, props, `useState`, the **immutable-data law**, no nextTick, controlled forms |
| 3 | [Hooks in Depth](/en/react/hooks) | `useEffect`/`useRef`/`useMemo`/`useCallback`/custom hooks; **dependency array & the closure trap** |
| 4 | [Component Communication](/en/react/communication) | props/callbacks, children instead of slots, **Context vs provide/inject**, lifting state |
| 5 | [Routing](/en/react/router) | React Router v6 in full, mapped item-by-item to vue-router; how to write guards |
| 6 | [State Management](/en/react/state-management) | choosing Zustand/Redux Toolkit/Jotai/MobX; **hand server data to React Query** |
| 7 | [Performance & Common Pitfalls](/en/react/performance-pitfalls) | the re-render model, how the memo trio works together, a 13-item Vue→React pitfall list, debugging tools |

Suggested path: **1 → 2 → 3 are the foundation** (especially the "immutable data" and "dependency array" items — the two places React and Vue diverge most), read them first; consult 4–6 as needed; come back to 7 whenever something weird happens.

## Quick-reference table

| Concept | Vue 3 | React |
| --- | --- | --- |
| Component definition | SFC + `<script setup>` | function + JSX |
| Local state | `ref` / `reactive` | `useState` (immutable updates) |
| Computed / derived | `computed` | compute inline / `useMemo` |
| Watchers | `watch` / `watchEffect` | `useEffect(fn, deps)` |
| Lifecycle | the full `onMounted` family | mostly `useEffect` dominating alone |
| DOM reference | template ref | `useRef` + `ref` attribute |
| Style isolation | `<style scoped>` | CSS Modules / CSS-in-JS |
| Slots | `<slot>` / `#name` | `children` / JSX props / render prop |
| Cross-level comms | `provide` / `inject` | Context (mind the re-render scope) |
| Routing | vue-router (instance + guards) | React Router (component + wrapper guards) |
| Global state | Pinia | Zustand / Redux Toolkit (+ React Query for server data) |
| Transitions | `<Transition>` / `<KeepAlive>` | third-party: framer-motion, etc. |
| Build tool | Vite | Vite (recommended for CSR) / Next.js (SSR/RSC) |
| Meta-framework | Nuxt | Next.js |
| Debugging | Vue DevTools | React DevTools |

## Learning resources

- <a href="https://react.dev" target="_blank" rel="noopener noreferrer">react.dev</a>: the official new docs; the "Thinking in React" section specifically cures Vue muscle-memory conflicts — strongly recommended as your first read.
- <a href="https://reactrouter.com" target="_blank" rel="noopener noreferrer">React Router</a>: official routing docs.
- <a href="https://zustand.docs.pmnd.rs" target="_blank" rel="noopener noreferrer">Zustand</a>: the simplest store, up to speed in ten minutes.
- <a href="https://tanstack.com/query" target="_blank" rel="noopener noreferrer">TanStack Query</a>: the de facto standard for server state (the Vue twin exists — you may already have used it in Vue).
- <a href="https://legacy.reactjs.org/docs/faq-hooks.html" target="_blank" rel="noopener noreferrer">Hooks FAQ</a>: official explanations of the closure trap and other tricky issues.
