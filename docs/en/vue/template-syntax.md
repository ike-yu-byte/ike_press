# Template Syntax

> The template is Vue's core asset that sets it apart from the JSX camp: a DSL built for "describing UI". This page covers interpolation, directives, modifiers, conditional and list rendering in one pass, with emphasis on **what the compiler does with these declarations** — understand the mechanism and you'll know where the "magic" ends.

::: tip Reading prerequisite: double braces in prose
On this page, anywhere Vue's interpolation <span v-pre>`{{ }}`</span> appears **in a table or inline code**, it's wrapped in `<span v-pre>` — because VitePress itself is a Vue app, and raw double braces in prose get parsed as interpolation by the template compiler, failing the build. Inside ``` fenced blocks they're naturally safe.
:::

## Interpolation: three forms

| Form | Syntax | Compiled behavior | Use when |
| --- | --- | --- | --- |
| Text | <span v-pre>`{{ msg }}`</span> | Emits a `_toDisplayString(...)` text node, **auto HTML-escaped** | most cases |
| Attribute binding | `:title="msg"` (shorthand for `v-bind:`) | writes the expression's value into the DOM attribute | binding anything non-text |
| Raw HTML | <span v-pre>`v-html="raw"`</span> | writes `innerHTML` directly, **no escaping** | trusted content only (see warning) |

```vue
<script setup>
const msg = 'Hello';
const url = 'https://vuejs.org';
const html = '<b>bold</b>';
</script>

<template>
  <p>{{ msg }}</p>                          <!-- text -->
  <a :href="url">link</a>                    <!-- attribute -->
  <p v-html="html"></p>                     <!-- raw HTML, use with care -->
</template>
```

::: danger v-html disables XSS protection
Only render **fully trusted** content (e.g. your own CMS-reviewed rich text). Any user input piped into `v-html` is a cross-site-scripting hole. Alternatives: sanitize first with something like DOMPurify, or render as safe structured nodes.
:::

Interpolation accepts a **single expression**, not statements:

```vue
<p>{{ ok ? 'yes' : 'no' }}</p>        <!-- ✓ ternary is an expression -->
<p>{{ msg.split('').reverse() }}</p>  <!-- ✓ chained call is an expression -->
<p>{{ let x = 1 }}</p>               <!-- ✗ statement errors -->
<p>{{ if (ok) 'yes' }}</p>           <!-- ✗ statement errors -->
```

::: warning Keep template expressions modest
<span v-pre>`{{ item.price * count * (1 - discount) }}`</span> belongs in a `computed`: the template declares *what* to show, the logic of *how* to compute lives elsewhere — testable and reusable. The official style guide has an A-level rule on this.
:::

## v-bind: every form of attribute binding

```vue
<!-- static vs dynamic -->
<div id="fixed"></div>
<div :id="dynamicId"></div>

<!-- boolean attribute: when falsy the whole attribute is removed -->
<button :disabled="isSubmitting">Submit</button>

<!-- bind an object: expands into multiple attributes -->
<div v-bind="attrsObj"></div>       <!-- attrsObj = { id:'a', class:'b' } -->

<!-- dynamic attribute name -->
<div :[attrName]="value"></div>     <!-- attrName = 'role' → role="value" -->
```

The value is first evaluated as a JS expression, so both `:disabled="isSubmitting"` and `:disabled="!ok"` work; but writing `disabled="isSubmitting"` (no colon) yields the string `"isSubmitting"` — a boolean attribute is `true` merely by being present, one of the most common "button never enables" causes for beginners.

## Dedicated class & style binding

Vue enhances `class`/`style` with object/array syntax (plain `:class="'...'"` string building works but is hard to maintain):

```vue
<script setup>
const isActive = true;
const hasError = false;
const type = 'primary';
const base = { color: 'red', fontSize: '14px' };
</script>

<template>
  <!-- object syntax: keys are class names, added when truthy -->
  <div :class="{ active: isActive, 'text-danger': hasError }"></div>
  <!-- → class="active" -->

  <!-- a computed returning an object keeps the template clean -->
  <div :class="classObj"></div>
  <!-- const classObj = computed(() => ({ active: isActive, [type]: true })) -->

  <!-- array syntax: list objects/strings, ternaries allowed -->
  <div :class="[base, { active: isActive }, isActive ? 'yes' : 'no']"></div>

  <!-- style works the same; camelCase or hyphenated keys both fine -->
  <div :style="[base, { color: 'blue' }]"></div>   <!-- later color overrides earlier -->
</template>
```

Key point: in `:style` arrays **later declarations override earlier ones** — the common trick for "defaults + runtime override".

## Conditional rendering: v-if vs v-show

| | `v-if` | `v-show` |
| --- | --- | --- |
| First render | if false, **not rendered at all**, not in DOM | always rendered, toggled via CSS `display` |
| Toggle cost | destroy/recreate the component & DOM subtree (incl. internal state) | change one CSS property |
| Use when | condition rarely changes; you need real unmount (stateful dialogs) | frequent toggling; want to keep internal state |

```vue
<p v-if="type === 'a'">A</p>
<p v-else-if="type === 'b'">B</p>
<p v-else>other</p>

<!-- no extra element: use template to hold a multi-node branch -->
<template v-if="ok">
  <h1>Title</h1>
  <p>Paragraph</p>
</template>

<!-- v-else must be the immediate sibling after v-if/v-else-if -->
```

::: tip Does v-if keep state?
No — by default Vue **reuses** structurally identical elements. If two branches look identical but mean different things (e.g. two `<input>`s differing only in `value`), give them different `key`s to force recreation, or typed content "leaks" across. That's `key`'s second use beyond lists.
:::

## List rendering: v-for and key

```vue
<script setup>
const items = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
const user = { name: 'ike', age: 18 };
</script>

<template>
  <!-- array: (item, index) -->
  <li v-for="(item, i) in items" :key="item.id">{{ i }}: {{ item.name }}</li>

  <!-- object: (value, key, index) -->
  <li v-for="(val, key, i) in user" :key="key">{{ key }} = {{ val }}</li>

  <!-- number range -->
  <span v-for="n in 10" :key="n">{{ n }}</span>

  <!-- destructure right in the parameter -->
  <li v-for="{ id, name } in items" :key="id">{{ name }}</li>
</template>
```

### What key actually solves

When updating a list Vue does **same-level diff**: comparing old and new node lists. With a stable `key`, Vue precisely recognizes "this item is still the same one" and only moves it. Without a `key` (or using the index), Vue can only reuse in place by position — after insert/remove/reorder, positions shift, causing:

- input contents landing on the wrong row (DOM reused but values not swapped);
- child component state confusion (an instance reused for different data);
- CSS transition animations jumping around.

::: danger Using index as key is a negative optimization
Whenever a list can **grow, shrink, or reorder**, `key` must be a stable unique ID from the data. `index` is barely acceptable for "display-only, never-reorder" lists — but there you can omit `key` entirely (Vue falls back to in-place reuse).
:::

### Don't put v-if and v-for on the same element

In Vue 2 `v-for` had higher priority (loop then test, wasteful); Vue 3 flips it so `v-if` runs first — but then `v-if` **can't see the `v-for` item**, erroring or reading undefined. Correct approaches:

```vue
<!-- ✗ neither works -->
<li v-for="u in users" v-if="u.active" :key="u.id">{{ u.name }}</li>

<!-- ✓ Option 1: filter in a computed -->
<li v-for="u in activeUsers" :key="u.id">{{ u.name }}</li>
<!-- const activeUsers = computed(() => users.filter(u => u.active)) -->

<!-- ✓ Option 2: wrap in a template -->
<template v-for="u in users" :key="u.id">
  <li v-if="u.active">{{ u.name }}</li>
</template>
```

## v-on: the complete event-binding syntax

```vue
<script setup>
function greet(name, e) { console.log(name, e instanceof MouseEvent); }
const count = ref(0);
</script>

<template>
  <button @click="greet('hi', $event)">inline with args</button>  <!-- inline calls pass $event explicitly -->
  <button @click="count++">inline statement</button>
  <button :click="greet">: is v-bind, not a listener</button>

  <!-- object syntax: multiple events on one element -->
  <input @="{ focus: onFocus, blur: onBlur, keyup: onKeyup }" />

  <!-- dynamic event name -->
  <button @[eventName]="handler"></button>
</template>
```

The difference between `@click="handler"` and `@click="handler()"` matters: the former **passes the reference** (the event object arrives as the sole argument), the latter is an inline call (write args yourself; grab the event via `$event`). Writing `@click="handler(e)"` with `e` undefined throws immediately.

### Modifiers: replace manual stopPropagation

| Category | Modifier | Equivalent to |
| --- | --- | --- |
| Propagation | `.stop` | `e.stopPropagation()` |
| Default action | `.prevent` | `e.preventDefault()` |
| Self only | `.self` | `if (e.target === e.currentTarget)` |
| Exact keys | `.exact` | excludes other modifiers in combos |
| Once | `.once` | fire only once |
| Passive | `.passive` | `{ passive: true }` (won't block scroll, better on mobile) |
| Keyboard | `.enter` `.tab` `.delete` `.esc` `.space` `.up/.down/.left/.right` `.win/.ctrl/.alt/.shift/.meta` | checks `e.key` |
| Mouse | `.left` `.right` `.middle` | checks button |

```vue
<!-- order matters somewhat: .prevent/.stop are order-free, but .exact goes last -->
<form @submit.prevent="onSubmit">…</form>
<a @click.stop.prevent="doThis"></a>
<input @keyup.esc="cancel" />
<input @keyup.ctrl.s.prevent="save" />     <!-- key combo -->
<div @click.self="onlyIfSelf">fires only on the background</div>
```

## Other directives & custom ones

| Directive | Purpose | Note |
| --- | --- | --- |
| `v-pre` | skip compiling this element & all children | show raw mustaches, speed up huge static content |
| `v-once` | render once, static forever | perf win on large first-screen static blocks |
| `v-memo` | subtree memo: skip update when deps unchanged | pairs with big `v-for` lists; advanced |
| `v-cloak` | hide uncompiled template until ready | only needed with no build step (CDN usage) |
| `v-else` / `v-else-if` | conditional branches | must be adjacent to `v-if` |
| `v-slot` (`#`) | slots | see [Component System](/en/vue/components) |

Custom directives (registering something like `v-focus`) use `app.directive('focus', { mounted(el) { el.focus(); } })` under the Composition API, with hook names matching component lifecycle (`created`/`mounted`/`updated`/`unmounted`). Rare, but handy when you must touch the DOM directly without wrapping a component.

## Next

- How to compute derived values in templates → [Computed & Watch](/en/vue/computed-watch)
- Why the view knows data changed → [Reactivity & Lifecycle](/en/vue/reactivity-lifecycle)
