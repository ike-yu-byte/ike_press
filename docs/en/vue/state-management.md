# State Management (Pinia)

> Vue's global state went Vuex 3 → Vuex 4 → **Pinia**, and now the official answer is just Pinia. It dropped mutations, has first-class type inference, and composes multiple stores freely. This page covers the API, but more importantly **what belongs in a store and what doesn't** — a decision that trips people up more than the API itself.

## Setup

```bash
npm i pinia
```

```ts
// main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';

const app = createApp(App);
app.use(createPinia());     // the only config needed
app.use(router);
app.mount('#app');
```

## Defining a store: two styles

### Option Store (block-structured like a component)

```ts
// stores/counter.ts
import { defineStore } from 'pinia';

export const useCounter = defineStore('counter', {
  state: () => ({ count: 0, history: [] as number[] }),   // state must be a factory function!
  getters: {
    double: (s) => s.count * 2,
    lastThree: (s) => s.history.slice(-3),
    getByUser(): (user: string) => boolean {               // this-form can access other getters
      return (user) => this.count > 0 && user.length > 0;
    },
  },
  actions: {
    increment() { this.count++; this.history.push(this.count); },
    async fetchInitial() {                                  // actions can be async
      const r = await fetch('/api/count');
      this.count = (await r.json()).value;
    },
  },
});
```

### Setup Store (composition style, smoother reuse)

```ts
export const useCounter = defineStore('counter', () => {
  const count = ref(0);
  const double = computed(() => count.value * 2);
  function increment() { count.value++; }
  return { count, double, increment };    // whatever you return is exposed (like module exports)
});
```

The two styles are fully equivalent in API; pick by taste: Options if the team leans Options, Setup for composition projects (it also allows private state — anything not returned stays private).

## Using it: reactive everywhere

```vue
<script setup>
import { storeToRefs } from 'pinia';
import { useCounter } from '@/stores/counter';

const counter = useCounter();          // call in a component's setup (stores can also call each other)

// ✓ read and write directly
counter.increment();
console.log(counter.count, counter.double);

// ✓ destructuring must go through storeToRefs or you lose reactivity
const { count, double } = storeToRefs(counter);   // state and getters
const { increment } = counter;                     // actions destructure fine (functions don't rely on the this reference)
</script>
<template>
  <p>{{ count }} / {{ double }}</p>
  <button @click="counter.increment">+1</button>
</template>
```

::: danger Pitfall #1: destructuring the store directly
`const { count } = useCounter()` gives you a **one-time snapshot** — a copy of a plain number; when the store changes it doesn't, and re-renders won't refresh it either. This is the highest-frequency bug stemming from Pinia's very first warning. Remember: **destructure via `storeToRefs`; grab actions bare.**
:::

### Batch changes & reset

```ts
counter.$patch({ count: 10 });                 // batch state change
counter.$patch((state) => {                    // functional patch for complex logic
  state.history.push(state.count);
  state.count++;
});
counter.$reset();                              // back to initial state (option stores have it; setup stores implement reset yourself)
counter.$subscribe((mutation, state) => {      // subscribe to all changes (persistence, logging)
  localStorage.setItem('counter', JSON.stringify(state));
});
```

## Should it go in a store: a clear boundary line

| State | Where | Examples |
| --- | --- | --- |
| Used by one component | component `ref` | dialog open flag, input draft, current tab index |
| Shared across two/three levels | props/emit or lift to a common parent | multi-step form |
| **Across routes, many pages, long-lived** | **Pinia** | logged-in user, permissions, cart, theme, global filters |
| **Data fetched from the backend** | **prefer vue-query/SWR-style**, or Pinia + manual cache | lists, details, dictionaries |
| Expressible in the URL | route query | page number, search term, tab position |

::: warning Don't treat Pinia as a dumping ground
Vuex's worst habit was "put all data in the store first, ask later" — API data, transient UI state all crammed in, and nobody dares delete it. Pinia doesn't fix that; it only isolates stores. Before writing, ask: **"How many unrelated consumers does this state have? Does it need to survive route changes?"** If neither, keep it out.
:::

## Modularization & cross-store calls

One store file per business domain; stores can `use` each other:

```ts
// stores/cart.ts
import { useUser } from './user';
export const useCart = defineStore('cart', () => {
  const user = useUser();
  const myList = computed(() => items.value.filter(i => i.owner === user.id));  // cross-store derivation
  return { items, myList };
});
```

Call other stores **inside a function body** (setup top-level or an action), not at module top level `const user = useUser()` — at that point the pinia instance isn't installed yet.

## Persistence

In production you usually don't hand-write `$subscribe` to localStorage; use the ecosystem plugin:

```ts
// main.ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
createPinia().use(piniaPluginPersistedstate);

// in a store
export const useUser = defineStore('user', {
  state: () => ({ token: '' }),
  persist: { key: 'ike-user', paths: ['token'], storage: sessionStorage },  // persist only token
});
```

Only persist state that "should still hold after a restart": token, theme, sidebar collapsed. Cart depends on the business; API data should **never** be persisted.

## SSR & testing

- **SSR (Nuxt integrates it for you)**: each request needs a fresh pinia instance to avoid state pollution; under Nuxt `app.use(createPinia())` is handled by the framework — when writing SSR by hand, mind serializing and hydrating `pinia.state.value`.
- **Testing**: `vitest` + `@pinia/testing`, or just `setActivePinia(createPinia())` for a fresh instance per case; store actions are plain functions, trivially unit-testable — one real payoff of "moving logic from components into stores".

## Next

- Using a store for auth in route guards → [Routing (vue-router)](/en/vue/router)
- The reactivity behind stores → [Reactivity & Lifecycle](/en/vue/reactivity-lifecycle)
