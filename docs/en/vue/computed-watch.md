# Computed & Watch

> `computed` and `watch` look alike — both "do something based on some values". Choosing wrong causes code-quality problems more often than performance ones. This page covers both thoroughly, focusing on **caching, dependency collection, watch's three source forms**, and "when you actually shouldn't use either".

## computed: declare "where a value comes from"

```vue
<script setup>
import { ref, computed } from 'vue';

const first = ref('Ike');
const last = ref('Yu');

// getter: on read it auto-collects deps (first/last), recomputes only when they change
const fullName = computed(() => `${first.value} ${last.value}`);
</script>

<template>
  <p>{{ fullName }}</p>
  <p>{{ fullName }}</p>   <!-- second read doesn't recompute, cache hit -->
</template>
```

Three properties you must understand:

1. **Lazy**: if nobody reads it, the getter never runs.
2. **Cached**: deps unchanged → repeated reads return the same cached value (vs methods: always recompute).
3. **Read-only**: assigning `fullName.value = 'x'` warns; need writable? use the object form.

```vue
<script setup>
// writable computed: reads go through get, v-model / assignment go through set
const firstName = ref('Ike');
const fullName = computed({
  get: () => firstName.value.split(' ')[0],
  set: (v) => { firstName.value = v; },
});
</script>
<template>
  <input v-model="fullName" />
</template>
```

::: warning No side effects in the getter
computed's job is "derive a new value from existing data". Fetching, mutating another ref, or writing localStorage in the getter turns dependency tracking into a mess (your side effect changes a dep → recompute → side effect again). Need "do something when a value changes"? That's `watch`'s job.
:::

## watch: declare "when this changes, do that"

### Form 1: a single ref / computed

```vue
<script setup>
import { ref, watch } from 'vue';

const keyword = ref('');

// source, callback, options
watch(keyword, (newVal, oldVal) => {
  console.log(`changed from ${oldVal} to ${newVal}`);
});
```

The callback runs **async by default** (in a microtask after the dep changes, before DOM update), and **doesn't fire initially** — add `{ immediate: true }` to run once right away.

### Form 2: a getter function (most flexible, make it a habit)

```vue
<script setup>
// watching a property of a reactive object — must wrap in a getter
const state = reactive({ count: 0, user: { name: 'ike' } });
watch(() => state.count, (n, o) => fetch(n));          // ✓ precise: only runs when count changes
watch(() => state.user, (n) => console.log(n), { deep: true });  // object ref unchanged but inner changed

// passing the reactive object directly = forces deep watching (costly, use sparingly)
watch(state, handler);
```

This is watch's biggest trap: **passing a `reactive` object itself auto-deep-watches**, any nested change fires; passing a getter returning an object compares by reference by default. For precise control, always write a getter.

### Form 3: watch several sources at once

```vue
<script setup>
watch([a, b, () => state.c], ([newA, newB, newC], [oldA, oldB, oldC]) => {
  // array form; callback args are arrays too
});
```

### Stopping a watcher

`watch` returns a stop function, auto-called on unmount; but **outside a component** (e.g. created asynchronously in a composable) you stop manually:

```js
const stop = watch(src, cb);
// ...when a condition is met
stop();
```

## watchEffect: automatic dependency collection

```vue
<script setup>
import { ref, watchEffect } from 'vue';

const id = ref(1);

// watches whatever the callback touches; runs once immediately
watchEffect(() => {
  fetchData(id.value);          // watches only id
});
```

| | `watch` | `watchEffect` |
| --- | --- | --- |
| Dep source | explicit first argument | collected as the callback runs |
| Old value | ✓ (2nd arg) | ✗ |
| Initial run | no (unless immediate) | **yes, immediately** |
| Lazy | yes | yes |
| Precise control | ✓ only what you declare | easy to "accidentally" depend on something |

::: tip Official advice: prefer watch
`watchEffect` is convenient, but its deps are "discovered at runtime" — you can't read from the code what it actually watches, and refactoring can silently break it. When you need the old value, precise control, or deferred triggering, `watch` is more expressive.
:::

## Options, fully

```vue
<script setup>
watch(
  () => state.user,
  (n, o) => { /* ... */ },
  {
    deep: true,          // traverse deeply; needed when the object ref is unchanged but inner changed
    immediate: true,     // run the callback once with the current value on setup
    flush: 'post',       // timing: 'pre' (default, before DOM update) | 'post' (after) | 'sync' (immediate, use with care)
    once: true,          // Vue 3.4+: fire once then auto-stop
    title: 'my-watch',   // Vue 3.5+: name shown in DevTools
  }
);
</script>
```

### flush and nextTick

- `flush: 'pre'` (default): the callback runs **before the component updates**. Want to read the DOM right after changing data? No — it's still old.
- `flush: 'post'`: runs **after the update**, can read the new DOM — same timing as `onUpdated`, but tied to a specific source.
- `flush: 'sync'`: runs synchronously on any change. Every reactive write triggers it, a performance black hole; only for very special cases.

When you need "data changed + DOM updated" before acting, `{ flush: 'post' }` is clearer than stuffing `nextTick` inside a watch.

Two more variants: `watchPostEffect` (flush-post watchEffect), `watchSyncEffect` (sync version).

## Choosing: which one

| Need | Use |
| --- | --- |
| A value derived from others | `computed` |
| A simple expression used once in the template | just write it or a method (don't open a computed for it) |
| Run a side effect when a value changes (fetch, navigate, track, DOM) | `watch` |
| The side effect's deps are clear | `watch` + getter |
| The side effect has many deps you can't be bothered to list | `watchEffect` (carefully) |
| Run once, and need the DOM ready | `onMounted` |

::: danger The most common anti-pattern: using watch to sync two values that could just be derived
```js
// ✗ redundant: fullName is fully computable from first/last
const fullName = ref('');
watch([first, last], () => { fullName.value = first.value + ' ' + last.value; });

// ✓ one computed solves it, with caching for free
const fullName = computed(() => `${first.value} ${last.value}`);
```
The rule of thumb: **"I need a new value" → computed; "I need to do a thing" → watch.** Using watch to maintain a copy of source data means creating two truths that can drift apart.
:::

## Next

- How `ref`/`reactive` track dependencies → [Reactivity & Lifecycle](/en/vue/reactivity-lifecycle)
- Where computed sits in performance work → [Performance & Best Practices](/en/vue/performance-best-practices)
