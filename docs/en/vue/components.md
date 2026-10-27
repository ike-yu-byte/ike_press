# Component System

> The component is Vue's basic unit of composition. This page covers the full chain from "how to define" to "how to compose": props / emits / slots / v-model / ref exposure / dynamic components / KeepAlive / Teleport / async components. It leads with `<script setup>` Composition style (the current official recommendation), noting Options-API equivalents.

## The shape of an SFC

```vue
<script setup>
import { ref } from 'vue';            // import = register, usable in template directly
const count = ref(0);
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>

<style scoped>
/* scoped: styles apply only to this component's elements (a data-v-xxx attribute is added at compile time) */
button { color: red; }
</style>
```

The `<script setup>` compile magic: top-level imports, `ref`, `computed`, etc. are **auto-exposed to the template** — no `return` needed; the component needs no self-registration for a parent to `import` and use it.

::: info Multiple roots (Fragment)
Vue 3 templates allow several parallel root elements. The cost: attributes passed from the parent (`class`/`style`/native events) **can't auto-land on one root**, so use `defineOptions({ inheritAttrs: false })` with `v-bind="$attrs"` to distribute manually. Single-root components have no such issue — which is why most still wrap one root `<div>`.
:::

## Props: one-way data flow parent → child

### Declaration & validation

```vue
<script setup>
// runtime declaration
const props = defineProps({
  title: { type: String, required: true },
  level: { type: Number, default: 1 },
  tags: { type: Array, default: () => [] },     // reference-type defaults must be factory functions
  status: { type: String, validator: (v) => ['a', 'b'].includes(v) },
});

// type-based declaration (recommended for TS)
const props2 = defineProps<{ title: string; level?: number }>();
withDefaults(defineProps<{ title: string; level?: number }>(), { level: 1 });
</script>
```

### Three iron rules

1. **Props are read-only.** Mutating a prop warns; to "start from a prop" copy locally (`ref(props.count)` takes only the initial value) or derive with computed.
2. **Naming: declare camelCase, pass kebab-case.** `defineProps({ bgColor })` → template `:bg-color="..."`; both match, but the official style prefers kebab-case in templates.
3. **Destructuring loses reactivity** (before Vue 3.5): `const { title } = props` is a one-time snapshot. Vue 3.5+ supports reactive destructuring with defaults: `const { title = 'hi' } = defineProps({...})`; on older versions use `toRef(props, 'title')`.

### Bulk forwarding

```vue
<Child v-bind="post" />        <!-- every key of post becomes a prop -->
```

Very handy building "component wrappers" (add a loading shell, forward all props).

## Emits: child → parent event notification

```vue
<script setup>
const emit = defineEmits(['like', 'delete']);           // runtime
const emit2 = defineEmits<{                               // typed
  (e: 'like', id: number): void;
  (e: 'delete', payload: { id: number; reason?: string }): void;
}>();

emit('like', 42);
</script>
```

Key points:

- Once declared in `emits`, the same-named custom event **won't also fall through as a native listener** (removed from `$attrs`), avoiding the parent's `@like` firing twice.
- Event names officially prefer kebab-case (`update:modelValue`, `item-deleted`); templates accept both `@item-deleted` and `@itemDeleted`.
- Events should only announce "what happened"; don't stuff callbacks into emit to fake props-down — that's a React habit; Vue has smoother `defineModel` and slots.

## v-model: the full two-way mechanism

### Expanded

```vue
<Child v-model="text" />
<!-- ≈ -->
<Child :modelValue="text" @update:modelValue="text = $event" />
```

The child's job: accept `modelValue`, and `emit('update:modelValue', newValue)` at the right moment.

### defineModel (Vue 3.4+, officially recommended)

That whole boilerplate is wrapped by one compiler macro:

```vue
<!-- child -->
<script setup>
const model = defineModel({ type: String });        // auto-declares prop + emit
function onClear() { model.value = ''; }
</script>
<template><input v-model="model" /></template>
```

```vue
<!-- parent -->
<Child v-model="keyword" />
```

Modifiers pass through: `const [model, modifiers] = defineModel({ set(value, oldValue) { if (modifiers.capitalize) return value.charAt(0).toUpperCase() + value.slice(1); return value; } })`.

### Multiple v-models

```vue
<Child v-model:title="bookTitle" v-model:body="bookBody" />
```

The child receives them with `defineModel('title')` / `defineModel('body')`. The Vue 2 `.sync` modifier is dead, fully replaced by argumented `v-model`.

## Slots: parent "inserts content" into the child

Three forms, progressively more powerful:

```vue
<!-- child Layout.vue -->
<template>
  <header><slot name="header">Default title</slot></header>
  <main><slot>Default content</slot></main>
  <footer><slot name="footer" :page="2" :total="10">Footer</slot></footer>
</template>
```

```vue
<!-- parent usage -->
<Layout>
  <!-- 1. default slot: content with no name lands in the unnamed slot -->
  <p>Body</p>

  <!-- 2. named slot: v-slot shorthand is # -->
  <template #header><h1>Title</h1></template>

  <!-- 3. scoped slot: the child passes data back out via slot props -->
  <template #footer="{ page, total }">
    Page {{ page }} / {{ total }}
  </template>
</Layout>
```

- Scoped slots are Vue's "render prop": paginators, table columns — "logic in child, presentation in parent" — rely on them.
- `v-slot` only goes on `<template>` (one exception: bare content on the component is treated as the default slot).
- Test whether a slot has content: `v-if="$slots.header"` (in Vue 3 this is reliable, unlike Vue 2 where `$slots.default` was always truthy at compile time).

## Parent accessing child: ref + defineExpose

A `<script setup>` component is **closed by default** — the parent can't reach anything inside. Expose explicitly to open it:

```vue
<!-- child -->
<script setup>
import { ref } from 'vue';
const count = ref(0);
function reset() { count.value = 0; }
defineExpose({ count, reset });        // whitelist
</script>
```

```vue
<!-- parent -->
<script setup>
const childEl = ref(null);             // template ref
</script>
<template>
  <Child ref="childEl" />
  <button @click="childEl.reset()">reset the child</button>   <!-- after mount, childEl is the child instance -->
</template>
```

Boundaries: if props/emits can express it, don't poke via ref. `defineExpose` suits imperative cases — player `play()`, form `focusFirst()`, dialog `open()`.

## Dynamic components & KeepAlive

```vue
<script setup>
import { shallowRef } from 'vue';
import TabHome from './TabHome.vue';
import TabMe from './TabMe.vue';

const current = shallowRef(TabHome);   // component objects use shallowRef to avoid deep-proxy overhead
</script>

<template>
  <!-- switch component by data -->
  <component :is="current" />

  <!-- with KeepAlive: switched-away components aren't destroyed, state is kept -->
  <KeepAlive include="TabHome,TabMe" :max="10">
    <component :is="current" />
  </KeepAlive>
</template>
```

- `:is` takes a **component object** (imported) or a **registered name** (string).
- `KeepAlive` routes cached components through `activated/deactivated` instead of `mounted/unmounted`; `include`/`exclude` filter by component name (declare it via `defineOptions({ name: 'TabHome' })`).
- Typical use: tabs keeping each page's scroll position and form drafts; list↔detail keeping list state.

## Async components & Suspense

```js
// route-level lazy loading (most common, see the routing page)
const Settings = () => import('./Settings.vue');

// explicit async component with loading/error states and delay
import { defineAsyncComponent } from 'vue';
const Heavy = defineAsyncComponent({
  loader: () => import('./Heavy.vue'),
  loadingComponent: Spinner,
  errorComponent: ErrBox,
  delay: 200,          // don't flash loading if it resolves within 200ms
  timeout: 10000,
});
```

Paired with `<Suspense>` (experimental) you can give a whole async subtree a fallback:

```vue
<Suspense>
  <template #default><AsyncTree /></template>
  <template #fallback><Spinner /></template>
</Suspense>
```

## Teleport: move DOM outside the component tree

Modals, toasts, full-screen overlays need to mount under `<body>` to escape parent `overflow/z-index/transform`, yet keep their logic in the component — that's `Teleport`:

```vue
<template>
  <button @click="open = true">Open</button>
  <Teleport to="body" :disabled="!mounted">
    <div v-if="open" class="modal">…</div>   <!-- DOM under body, state still owned by this component -->
  </Teleport>
</template>
```

`defer` (3.5+) waits for the target to exist before teleporting; many-to-one cases use the `data` attribute with `defer` to resolve mount order.

## provide / inject: cross-level dependency injection

```vue
<!-- ancestor -->
<script setup>
import { provide, readonly, ref } from 'vue';
const theme = ref('dark');
provide('theme', readonly(theme));          // Symbol keys are safer; readonly stops children mutating
</script>

<!-- any-level descendant -->
<script setup>
import { inject } from 'vue';
const theme = inject('theme', 'light');     // 2nd arg is default (no error if not provided)
</script>
```

- vs `props`: no per-level threading, reaches across N layers directly; but the dependency is implicit.
- vs Pinia: provide/inject suits **small, component-private sharing** (theme, form context, a widget's internals); global business state belongs in a store.
- Typical use: Element Plus's `el-form` → `el-form-item` validation coupling, `el-tabs` → `el-tab-pane` — all provide/inject.

## Component registration

| Way | Syntax | When |
| --- | --- | --- |
| Local (default) | `import X from './X.vue'` in `<script setup>` | 99% of cases |
| Global | `app.component('MyBtn', {...})` | genuinely used everywhere and you want to skip imports (base components, layout pieces) |
| Auto import | `unplugin-vue-components` scanning a directory | mid/large projects with on-demand UI libraries |

Global registration loses tree-shaking and type hints — don't overuse it.

## Next

- Why props are read-only and how reactivity tracks → [Reactivity & Lifecycle](/en/vue/reactivity-lifecycle)
- `v-model` behavior on native form controls → [Forms & Communication](/en/vue/forms-communication)
