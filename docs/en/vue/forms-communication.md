# Forms & Communication

> Forms are `v-model`'s main battlefield and where the "two-way binding" magic most often trips up; component communication is where architectural skill shows. The first half explains `v-model` from internals to modifiers to native-control behavior; the second half gives a **full decision map of seven communication styles**.

## What v-model actually does on native elements

```vue
<input v-model="text" />
<!-- compiles ≈ -->
<input :value="text" @input="text = $event.target.value" />
```

On components it's `:modelValue` + `@update:modelValue` (see [Component System](/en/vue/components)). Understand this expansion and every "why" below is explained.

### Modifiers

| Modifier | Behavior change | Use when |
| --- | --- | --- |
| `.lazy` | listens to `change` instead of `input` (syncs on blur/enter) | throttle costly reactivity while typing; **also sidesteps the Chinese-IME composition problem** |
| `.number` | `parseFloat` before storing | `<input type="number">` always yields a string — required when comparing/doing math |
| `.trim` | strips leading/trailing whitespace before storing | usernames, titles, pre-submit cleanup |

```vue
<input v-model.lazy="query" />         <!-- search box, debounce-friendly -->
<input v-model.number="age" type="number" />
<input v-model.trim="name" />
<input v-model.trim.number.lazy="code" />   <!-- chainable -->
```

::: warning Three classic traps
1. **`type="number"` binds a string**: `"18" !== 18`, validation never passes → add `.number`.
2. **Not initialized to empty string**: `<input v-model="form.name">` where `form.name` is `undefined` behaves oddly in some browsers → set `''` explicitly in initial state.
3. **v-model eats the `value` attribute**: in `<input value="default" v-model="text" />` the `value` is ignored — put the default in `text`'s initial value.
:::

### The three checkbox shapes

```vue
<!-- 1. single boolean -->
<input type="checkbox" v-model="isAgree" />          <!-- true / false -->

<!-- 2. several fixed values → array -->
<input type="checkbox" v-model="langs" value="js" />
<input type="checkbox" v-model="langs" value="dart" /> <!-- langs = ['js','dart'] -->

<!-- 3. two custom truth/falsy values -->
<input type="checkbox" v-model="state" true-value="on" false-value="off" />
```

### Radio and select

```vue
<label v-for="opt in options" :key="opt.id">
  <input type="radio" v-model="picked" :value="opt.id" /> {{ opt.label }}
</label>

<select v-model="city">
  <option disabled value="">Please choose</option>   <!-- empty-value placeholder: shown when nothing picked -->
  <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
</select>

<!-- multi-select: v-model binds an array -->
<select v-model="multi" multiple> … </select>

<!-- when an option's value is an object, bind the whole object with :value -->
<select v-model="selectedUser">
  <option v-for="u in users" :key="u.id" :value="u">{{ u.name }}</option>
</select>
```

### textarea and v-model on components

`<textarea v-model="note"></textarea>` works directly (textarea content as children is unreliable — must use v-model). For `v-model`, `v-model:xxx`, and `defineModel` on custom components, see [Component System](/en/vue/components).

## Validation: from hand-rolled to libraries

### Small forms: computed + submit guard

```vue
<script setup>
import { ref, computed } from 'vue';
const email = ref('');
const touched = ref(false);
const emailErr = computed(() =>
  !email.value ? 'Required' : !/^\S+@\S+\.\S+$/.test(email.value) ? 'Bad format' : '');
function submit() {
  touched.value = true;
  if (emailErr.value) return;
  // ...send request
}
</script>
<template>
  <input v-model="email" @blur="touched = true" />
  <p v-if="touched && emailErr" class="err">{{ emailErr }}</p>
</template>
```

With few rules, just do this — don't add a library. When rules multiply, reach for:

| Solution | Positioning |
| --- | --- |
| **async-validator** | the rule engine behind Ant Design Vue — pure validation logic, no UI binding |
| **VeeValidate** | Vue's most complete form library: field management, validation, error state, accessibility all-in |
| **Element Plus / TDesign Form** | UI libraries ship `rules` validation — the de facto standard for admin dashboards; if the component library solves it, don't rebuild it |

## The communication map: choosing among seven ways

| # | Way | Direction | Use for | Cost |
| --- | --- | --- | --- | --- |
| 1 | **props** | parent → child | all explicit data down | per-level threading (props drilling) |
| 2 | **emit** | child → parent | announce "what happened", request a change | parent must listen |
| 3 | **v-model / defineModel** | two-way | form values, visibility, selection | a single "main" value channel |
| 4 | **slots (incl. scoped)** | parent → child content | child owns skeleton, parent owns skin | rising composition complexity |
| 5 | **ref + defineExpose** | parent → child command | `open()`/`reset()`/`focus()` one-off actions | breaks encapsulation, use sparingly |
| 6 | **provide / inject** | ancestor → any descendant | cross-level implicit sharing (theme, form context) | dependency not explicit |
| 7 | **Pinia** | anywhere ↔ anywhere | genuinely global business state | an extra abstraction & debug layer |

### Decision tree

```
Just parent & child?
 ├─ data down ──────────────> props
 ├─ event / value back up ──> emit; form-like values → v-model
 ├─ content customization ──> slots
 └─ imperative action (open/reset) ──> ref + defineExpose
Across many levels but within one subtree? ──> provide/inject (component-library contexts)
Unrelated components sharing, long-lived? ──> Pinia
Occasional notice between totally unrelated components? ──> prefer lifting to a common parent; only then a mitt event bus
```

### Event bus: removed from Vue 3 core

Vue 2's `bus.$emit/$on` was deleted in Vue 3. If you still want the bus pattern, use [mitt](https://github.com/developit/mitt) (300 bytes):

```js
// bus.js
import mitt from 'mitt';
export const bus = mitt();

// publisher
bus.emit('cart:added', { id: 1 });

// subscriber (always unsubscribe on unmount!)
import { onBeforeUnmount } from 'vue';
function handler(e) { /* ... */ }
bus.on('cart:added', handler);
onBeforeUnmount(() => bus.off('cart:added', handler));
```

But be clear-eyed: the bus is a **global implicit dependency**; once events pile up nobody knows "who emits, who receives". Anything expressible via props/emit/lifting/Pinia should not use a bus.

## Next

- The proper answer for global state → [State Management (Pinia)](/en/vue/state-management)
- Performance handling for big form lists → [Performance & Best Practices](/en/vue/performance-best-practices)
