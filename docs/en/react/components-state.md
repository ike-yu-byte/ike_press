# Components & State

> Vue 3's Composition API already made "a component = a setup function", which looks a lot like a React function component. But there's a fundamental split: **Vue's setup runs once and updates precisely via reactivity; React's component function is re-executed over and over, driven by "swapping in new state".** This page covers component definition, props, and React's unique immutable-state mindset.

## A component is just a function returning JSX

Vue SFC:

```vue
<script setup>
defineProps({ title: String });
</script>
<template><h1>{{ title }}</h1></template>
```

React: no separate file, no `<template>` — the function is the component, and it must be capitalized:

```jsx
function Greeting({ title }) {       // props arrive via parameter destructuring
  return <h1>{title}</h1>;
}

// arrow form works too
const Greeting = ({ title }) => <h1>{title}</h1>;
```

Put as many components in a file as you like; small helper components often live beside what uses them:

```jsx
function Badge({ count }) {
  return count > 0 ? <span className="badge">{count}</span> : null;
}

export default function CartButton({ items, onCheckout }) {
  return (
    <button onClick={onCheckout}>
      Checkout <Badge count={items.length} />
    </button>
  );
}
```

::: info The single most important fact: the function runs over and over
Vue's `setup()` runs **once** per component instance. A React function component **re-runs start to finish on every update**. Three consequences run through everything about optimization:

1. `const fn = () => {}`, `const arr = []` inside get **brand-new references** every render;
2. there is **no "run once at init" spot** — one-time side effects go in `useEffect(fn, [])`;
3. anything that must survive re-renders (timer ids, previous props) can't live in local variables — it goes in a hook (`useRef`/`useState`).
:::

## Props: read-only, one-way, not reactive

| Aspect | Vue | React |
| --- | --- | --- |
| Declare | `defineProps<{...}>()` / object | destructured parameter (add TS types) |
| Defaults | `withDefaults` | destructuring defaults `({ size = 'md' })` |
| Validation | `PropTypes` / TS | mostly TS; runtime via `prop-types` (rare now) |
| Mutability | props read-only (warns if changed) | props read-only (no warning, but changing them does nothing — it's a plain object) |
| Reactivity | props are reactive; destructuring loses it | props are **this render's snapshot**; there's no reactivity to begin with |
| Forward many levels | `$attrs` / provide | pass down, or `{...rest}` spread, or Context |

```jsx
function Avatar({ src = '/def.png', size = 'md', alt }) {
  const px = size === 'md' ? 40 : 24;
  return <img src={src} width={px} height={px} alt={alt || ''} />;
}
```

::: warning Destructured props in async callbacks = a captured snapshot
```jsx
function Panel({ count }) {
  useEffect(() => {
    const t = setInterval(() => {
      console.log(count);   // always the count from the render that set up this effect
    }, 1000);
    return () => clearInterval(t);
  }, []);   // ← missing [count] causes staleness; see the Hooks page
}
```
In Vue `props.count` is reactive, so async reads get the latest; in React `count` is a plain constant that the closure froze. This is one of the biggest mindset gaps.
:::

## Events: child→parent is "calling a function the parent passed down"

Vue declares custom events with `defineEmits`; React has no component event system — **the parent passes a callback as a prop, and the child calls it at the right moment**:

Vue:

```vue
<!-- child -->
<script setup>
const emit = defineEmits(['add']);
</script>
<button @click="emit('add', 1)">+1</button>
<!-- parent -->
<Child @add="onAdd" />
```

React:

```jsx
// child: receives onAdd and calls it
function AddButton({ onAdd }) {
  return <button onClick={() => onAdd(1)}>+1</button>;
}

// parent: passes the handler down (naming convention onXxx)
function Parent() {
  const [n, setN] = useState(0);
  return <AddButton onAdd={(v) => setN((x) => x + v)} />;
}
```

## useState: local state

Vue's `ref` maps to React's `useState`:

```jsx
const [count, setCount] = useState(0);        // initial value
const [user, setUser] = useState({ name: '', age: 0 });
const [list, setList] = useState(() => heavyInit());  // lazy init: fn runs exactly once
```

Versus `ref`:

| Operation | Vue | React |
| --- | --- | --- |
| Read | `count.value` | `count` (it's the value directly) |
| Write | `count.value = 5` | `setCount(5)` |
| Based on old | `count.value++` | `setCount(c => c + 1)` |
| One object for a group | `reactive({...})`, mutate fields | one state per value; swap the whole object |

::: tip One useState manages one value
In Vue you group related fields into a `reactive` object; the React convention is **many small independent useState** (`const [x,setX]` `const [y,setY]`). If you insist on one object you must spread it manually on every update (next section) — tiring unless the fields are truly coupled (like a form).
:::

## Immutable data: the iron law

React decides "re-render or not" by whether references changed. In-place mutation is invisible:

```jsx
const [user, setUser] = useState({ name: 'yu', tags: ['a', 'b'] });
const [list, setList] = useState([{ id: 1, done: false }]);

// ✗ Vue habit: it changed, but the view doesn't (same reference → skipped)
user.name = 'new';
setUser(user);
list.push({ id: 2 });
setList(list);

// ✓ object: spread into a new one
setUser({ ...user, name: 'new' });

// ✓ one level nested: spread level by level
setUser({ ...user, tags: [...user.tags, 'c'] });

// ✓ array add
setList([...list, { id: 2, done: false }]);
// ✓ array remove
setList(list.filter((x) => x.id !== 1));
// ✓ array update one item (replace that element)
setList(list.map((x) => (x.id === 1 ? { ...x, done: true } : x)));

// ✓ functional update: compute from latest prev, avoids clobbering on rapid sets
setCount((prev) => prev + 1);
```

::: danger Deep spreads hurt — use immer
Three-level <span v-pre>`{...a, b: {...a.b, c: [...a.b.c]}}`</span> is easy to botch. Add <a href="https://immer.pages.dev/" target="_blank" rel="noopener noreferrer">immer</a>'s `produce` and you can "mutate directly" like Vue, while immer generates the new object underneath:
```jsx
import { produce } from 'immer';
setUser(produce((draft) => { draft.tags.push('c'); }));   // reads like mutation, is immutable
```
:::

## No nextTick: batching & "can't read fresh state"

In Vue you do `count.value++; await nextTick(); inspect DOM`. Two things differ in React:

1. **Automatic batching**: since React 18, multiple `setX` in one event/async callback merge into a single render — not one per set.
2. **State is a render snapshot**: `setCount(1); console.log(count)` still prints **this render's old value** — the `count` constant never changes within this execution. Compute from old with functional updates; do things "after the value actually updated and re-rendered" with `useEffect`.

```jsx
function incrementThrice() {
  setCount(count + 1);   // all three read the same old count
  setCount(count + 1);
  setCount(count + 1);   // result: only +1!
}
function incrementThriceRight() {
  setCount(c => c + 1);  // functional: queued off latest prev
  setCount(c => c + 1);
  setCount(c => c + 1);  // result: +3 ✓
}
```

Let's dispel the most confusing point first: `count` here is **not** a reactive variable like in Vue. The real state lives in a "storage slot" inside React; `count` is just a **plain constant** copied out of that slot for this render (declared with `const`, immutable at the JS level). So `setCount(newValue)` never touches `count` — it does two things: writes the new value into React's internal slot + requests a re-render.

Frame-by-frame walkthrough of the most common question — "why does count still print the old value after set":

```jsx
const [count, setCount] = useState(0);   // this render: count = 0 (a plain constant)

function handleClick() {
  console.log(count);   // ① prints 0
  setCount(1);          // ② new value 1 goes into React's internal slot; re-render requested
  console.log(count);   // ③ still 0 — count is a const; no code can change it
}
// only after the handler returns does React re-run the whole component function
// in the new run, useState reads 1 out of the slot → a brand-new constant: count = 1
```

See it now: after `setCount` you must **wait for the function to finish and the component to re-execute** before a new `count` exists; in the current run, `count` is frozen at the moment of rendering.

So why did React choose "snapshot" over "live"? A thought experiment: if `setCount(1)` really flipped `count` to 1 instantly, then inside one click handler — the first half of the code would see `count` as 0 and the second half as 1; the result of `if (count > 0)` would depend on which line you wrote it, and which data the UI shows would depend on code order. One piece of state would have two "truths" within a single event, and bugs would be untraceable. The snapshot design enforces "**one render = one fixed set of data**", giving diff a stable baseline to compare — this is the official line *state is a read-only snapshot during rendering*.

Three high-frequency confusion scenarios, contrasted with Vue:

**Scenario 1: reading right after set gives the old value**

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(1);
    console.log(count);        // prints 0, not 1! count is this render's snapshot
    alert(`count is ${count}`);      // the user sees 0 too
  }

  return <button onClick={handleClick}>+1</button>;
}
```

In Vue you're used to "read right after write", because `count.value` is always the latest:

```js
const count = ref(0);
count.value = 1;
console.log(count.value);      // 1 — the reactive proxy reflects the latest value in real time
```

In React, to "do something after the value actually updates and re-renders", listen with `useEffect` (the counterpart of Vue's `watch`):

```jsx
useEffect(() => {
  document.title = `count is now ${count}`;   // runs after each count update + re-render — only here is it the new value
}, [count]);
```

**Scenario 2: consecutive sets computed off the old value overwrite each other** (the cause of incrementThrice above)

```jsx
// count = 0 before the click
setCount(count + 1);   // 0+1=1, queued
setCount(count + 1);   // still 0+1=1, overwrites the previous one
setCount(count + 1);   // 1 again — final result is 1, not 3

// fix: functional updates — React queues the updaters and applies them in order
setCount(c => c + 1);  // 1
setCount(c => c + 1);  // 2
setCount(c => c + 1);  // 3 ✓
```

**Scenario 3: reading state inside an async callback gives the snapshot from "the moment it was scheduled"** (stale closure, see [Hooks](/en/react/hooks))

```jsx
function Timer() {
  const [count, setCount] = useState(0);

  function go() {
    setTimeout(() => {
      console.log(count);        // forever the value at click time; later updates are invisible here
      setCount(count + 1);       // dangerous: computed off a stale snapshot, may clobber someone else's update
    }, 1000);
  }

  return <button onClick={go}>+1 after 1s</button>;
}
```

Same fixes as above: to *compute*, use functional `setCount(c => c + 1)`; to *keep the latest value at hand*, stash it in a `useRef`; to *act after the update*, use `useEffect`.

## Derived state: just compute, don't rush to useMemo

Vue caches derived values with `computed`. In React **most derived values should just be computed inline** — the component re-renders anyway, so one more calculation is cheap:

```jsx
function Cart({ items }) {
  const total = items.reduce((s, x) => s + x.price, 0);  // just compute, no computed
  const count = items.length;
  return <div>{count} items, {total} total</div>;
}
```

Reach for `useMemo` only when the computation is genuinely heavy, or the result must be a stable reference passed to a memoized child (see [Hooks in Depth](/en/react/hooks)). **Don't reflexively wrap every derived value** — the most common over-optimization from Vue converts.

## Conditional & list rendering (recap)

Component-level "no data → early return"; local conditions via `&&`/ternary; lists via `map` — all in [JSX & Template Syntax](/en/react/jsx). One note: React has no `v-show`; "hide but keep state" means render it and set <span v-pre>`style={{ display:'none' }}`</span> — which is exactly the KeepAlive replacement idea.

## Forms: the controlled-component pattern

The React "standard posture" binds one state per input:

```jsx
function LoginForm() {
  const [form, setForm] = useState({ account: '', pwd: '' });

  const update = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    login(form.account, form.pwd);
  };

  return (
    <form onSubmit={submit}>
      <input value={form.account} onChange={update('account')} />
      <input value={form.pwd} type="password" onChange={update('pwd')} />
      <button type="submit">Login</button>
    </form>
  );
}
```

That's React's `v-model`. For complex forms (many fields, validation, linkage) hand-rolling is painful — use `react-hook-form` (Vue's counterpart is VeeValidate).

## Next

- `useEffect` / `useRef` / `useMemo` / custom hooks → [Hooks in Depth](/en/react/hooks)
- passing data between components, what Context is for → [Component Communication](/en/react/communication)
