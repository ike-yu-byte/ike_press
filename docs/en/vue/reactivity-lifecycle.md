# Reactivity & Lifecycle

> This page answers the two low-level questions behind Vue's "magic": **why the view knows data changed** (reactivity), and **what you can do at each moment from a component's creation to destruction** (lifecycle). Read this and every "why" from the earlier pages answers itself.

## Reactivity internals: Proxy intercepts reads and writes

Vue 3 wraps an object in a `Proxy`; on property read it registers "the side-effect currently rendering" as a dependent, on write it notifies all dependents to re-run:

```
ref/reactive creates a proxy object
        ↓
template render / computed / watchEffect reads a property   → track: record "who read which key"
        ↓
mutate a property (.value = x or obj.a = x)                  → trigger: look up subscribers, enqueue
        ↓
scheduler (dedup + merge in a microtask queue)               → after nextTick, re-run render fn → diff → patch
```

vs Vue 2's `Object.defineProperty`: Proxy intercepts the whole object, so **adding properties, deleting them, and array index changes are all detected** — no more `Vue.set`. The cost: no IE11 support (the hard reason Vue 2 stopped).

## ref: the universal entry for every type

```vue
<script setup>
import { ref } from 'vue';

const count = ref(0);              // primitive
const user = ref({ name: 'ike' }); // objects too: inner values are deep-reactive-ized

console.log(count.value);          // in JS you must write .value
user.value.name = 'yu';            // mutating object properties is reactive too

count.value++;                     // ✓ reactive
// const { name } = user.value;    // ✗ the destructured name is a plain string, disconnected
</script>

<template>
  <p>{{ count }}</p>              <!-- auto-unwrapped in templates, no .value -->
  <p>{{ user.name }}</p>
</template>
```

**Why is `.value` needed?** At the JS language level you can't intercept reads/writes of a plain variable (primitive), so `ref` wraps it in an object and proxies the `.value` property. Templates, watch sources, and reactive-object properties are auto-unwrapped for you; only manual reads/writes in `<script>` need it.

**Forgetting `.value` is Vue's #1 source of low-level bugs**: `count++` writes a new property on the wrapper object, the view never moves. TypeScript catches half of it (type mismatch); plain JS relies on habit — a `countRef` suffix is a common team convention.

## reactive: object-only, with three boundaries

```vue
<script setup>
import { reactive, toRefs, toRef } from 'vue';

const state = reactive({ count: 0, user: { name: 'ike' } });
state.count++;                   // mutate directly, no .value
```

| Boundary | Consequence | Countermeasure |
| --- | --- | --- |
| **Destructuring loses reactivity** | `const { count } = state` yields a plain number | `toRefs(state)` for per-property refs; or don't destructure |
| **Whole replacement disconnects** | `state = reactive({...})` breaks the reference; `Object.assign(state, newObj)` doesn't trigger | use a ref holding the object, `obj.value = newObj`; or assign per-property |
| **Objects only** | `reactive(0)` warns and is useless | primitives always go in ref |

```vue
<script setup>
const state = reactive({ count: 0, name: 'ike' });
const { count, name } = toRefs(state);   // count/name are Refs, reactivity link preserved
// in the template {{ count }} auto-unwraps; in script use count.value
</script>
```

### ref or reactive, ultimately?

Official recommendation: **prefer ref** (including for objects). Reasons: one mental model (always `.value`), whole-replacement works, destructurable (with toRef), better type inference. `reactive` suits "a group of strongly-related fields naturally form one object" (form models, config objects) that you never replace wholesale.

```vue
<script setup>
import { ref, reactive } from 'vue';

// ✓ recommended: everything is a ref
const form = ref({ user: '', pass: '' });
form.value = { user: '', pass: '' };      // reset: one-line whole replacement

// ✓ also fine: a field-group like a form as reactive
const form2 = reactive({ user: '', pass: '' });
Object.assign(form2, { user: 'a', pass: 'b' });   // reset: assign merges, keeps reference
</script>
```

## shallowRef & the performance escape hatches

Deeply proxying a big object costs (every nested property gets wrapped). **Large data that doesn't need deep reactivity** uses shallow APIs:

```js
import { shallowRef, shallowReactive, markRaw } from 'vue';

const bigList = shallowRef([{...}, {...}]);   // only a whole .value replacement triggers updates
bigList.value = newList;                       // ✓ triggers
bigList.value[0].name = 'x';                   // ✗ doesn't (nothing inside is proxied)

const chart = markRaw(new ECharts.Instance()); // permanently excluded: third-party class instances / huge static data
```

Typical cases: ECharts instances, map objects, read-only lists of thousands of rows. See [Performance & Best Practices](/en/vue/performance-best-practices).

## The lifecycle map

Composition hooks are `onXxx` functions registered at the top level of `<script setup>`:

```
createApp / component instance created
   │
   ├─ setup() runs             ← the component body itself: create state, register hooks (NO DOM yet!)
   │
onBeforeMount                 ← last chance to change data before mount (template not rendered yet)
   │
[first DOM render complete]
onMounted                     ← ✓ grab DOM, init third-party libs (echarts/swiper), fire first-screen requests
   │
data changes → component updates
onBeforeUpdate                ← before update, can read old DOM (e.g. preserve scroll position)
onUpdated                     ← new DOM ready. ⚠️ don't mutate state here, it loops
   │
onBeforeUnmount               ← cleanup before unmount: timers/global listeners/observers (still in time)
[DOM removed]
onUnmounted                   ← final cleanup (can't touch DOM)
```

Components cached by `KeepAlive` additionally run:

```
onActivated     ← each time you switch back (refetch data, restore scroll)
onDeactivated   ← each time you switch away (pause polling, dismiss overlays)
```

::: warning Three frequent misuses
1. **Touching the DOM at setup top level** — `document.querySelector` can't find this component's elements yet; put it in `onMounted`.
2. **Mutating state in onUpdated** — update triggers the hook, hook triggers update → infinite loop. Derive with computed, don't sync in onUpdated.
3. **Forgetting to clean up side effects** — a `window.addEventListener` / `setInterval` from `onMounted` must be removed in `onBeforeUnmount`, or after you navigate away the timer keeps running and its callback references a destroyed instance (memory leak).
:::

## nextTick: after changing data, when is the DOM new?

Data change → Vue opens a **microtask queue** to collect all updates this round → dedups and merges, then flushes the DOM once. So:

```vue
<script setup>
import { ref, nextTick } from 'vue';

const list = ref([]);

async function add() {
  list.value.push({ id: Date.now() });
  console.log(listEl.value.children.length);   // old DOM, not updated yet!

  await nextTick();                            // wait for this round's flush
  console.log(listEl.value.children.length);   // new DOM ✓
}
</script>
```

You need it rarely but critically: scroll to bottom, focus a newly inserted input, measure a new element's size. A `flush: 'post'` watch also expresses "act after DOM update" and is usually more declarative.

## Composables: Vue's logic-reuse unit

Vue's "custom hooks", but with looser constraints — just a plain function that uses reactive APIs:

```js
// useMouse.js — name, organize, and return freely
import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useMouse() {
  const x = ref(0);
  const y = ref(0);
  function update(e) { x.value = e.pageX; y.value = e.pageY; }
  onMounted(() => window.addEventListener('mousemove', update));
  onBeforeUnmount(() => window.removeEventListener('mousemove', update));
  return { x, y };   // convention: return a plain object of refs, caller destructures as needed
}
```

```vue
<script setup>
import { useMouse } from './useMouse';
const { x, y } = useMouse();     // safe to destructure: they're independent refs
</script>
<template><p>{{ x }}, {{ y }}</p></template>
```

Conventions:

- Name `useXxx`; put files in `composables/` or `hooks/`.
- **Call at the component's setup top level** (when it uses lifecycle hooks / injection internally, leaving the synchronous setup context breaks them).
- For "global singleton" state, define the ref at module level outside the function (every component gets the same instance).

They replace Vue 2 mixins: explicit origin (visible in imports), no name clashes, parameterizable.

## Next

- How reactivity flows between components → [Component System](/en/vue/components)
- Deep-proxy cost and big-object optimization → [Performance & Best Practices](/en/vue/performance-best-practices)
