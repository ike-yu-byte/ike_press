# Hooks in Depth

> Hooks are the biggest felt difference between React and Vue. Vue's composables are an "optional reuse tool"; React's hooks are "calling rules you must follow while using functions". This page aligns each common hook with a Vue concept, focusing on the **dependency array** and the **closure trap** — nine out of ten baffling bugs for Vue converts live here.

## Why hooks exist

A function component is "pure: props → JSX", with nowhere to keep state, side effects, or references that must survive renders. Hooks are "external storage slots" React opens for function components — behind the scenes it keeps an ordered list of slots per instance, and `useState`/`useEffect` read/write those slots.

Which yields the iron rule:

::: danger Top level only — never in conditionals/loops/callbacks
```jsx
if (ready) { const [x, setX] = useState(0); }   // ✗ errors / wrong behavior
list.forEach(() => { useEffect(...); });         // ✗
```
React matches slots by "the Nth hook call". Skip/add/reorder one call and every slot after it misaligns. Install `eslint-plugin-react-hooks` — it flags these directly. Vue's composables have no such limit, so this is the rule Vue converts most often miss.
:::

## useState / useReducer: state

`useState` is covered in [Components & State](/en/react/components-state). When update logic is complex (many coupled sub-states, a fixed set of actions), use `useReducer` — it centralizes "how state changes", much like a Vuex/Pinia action:

```jsx
const initial = { count: 0 };
function reducer(state, action) {
  switch (action.type) {
    case 'inc': return { count: state.count + 1 };
    case 'dec': return { count: state.count - 1 };
    case 'reset': return initial;
    default: throw new Error();
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, initial);
  return (
    <>
      {state.count}
      <button onClick={() => dispatch({ type: 'inc' })}>+1</button>
      <button onClick={() => dispatch({ type: 'reset' })}>reset</button>
    </>
  );
}
```

## useEffect: side effects (lifecycle + watch merged)

Vue splits "when to run" into `onMounted` / `onUnmounted` / `watch` / `watchEffect`; React folds them all into one `useEffect`, whose behavior is set by the **second argument (dependency array)**:

```jsx
useEffect(() => {
  // effect body: runs after the render is committed to the DOM
  const timer = setInterval(tick, 1000);

  return () => {
    // cleanup: runs before the next effect and on unmount
    clearInterval(timer);
  };
}, /* dependency array */);
```

Three shapes, mapped to Vue:

| Intent | React | Vue equivalent |
| --- | --- | --- |
| Run once after mount | `useEffect(fn, [])` | `onMounted(fn)` |
| Re-run when a dep changes | `useEffect(fn, [userId])` | `watch(userId, fn)` |
| Run after every render (auto-track) | `useEffect(fn)` (no 2nd arg) | `watchEffect(fn)` |
| Cleanup on unmount | effect's cleanup + `[]` | `onUnmounted(fn)` |

### The dependency array: pitfall #1

**Every** reactive value the effect uses (props, state, derived variables/functions from the body) should be in the array. Miss one → the closure captures a stale value; add an unstable object/function → it re-runs constantly.

```jsx
const [count, setCount] = useState(0);   // count is a piece of state in the component

// ✗ missing dep: logs the first count forever
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000); // count frozen
  return () => clearInterval(id);
}, []);   // should be [count], or use a functional update

// ✓ A: add count to deps, rebuild the timer when it changes
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, [count]);

// ✓ B: when you don't need the concrete value, use a functional update
const [n, setN] = useState(0);           // n is state too, we just don't read its value
useEffect(() => {
  const id = setInterval(() => setN(prev => prev + 1), 1000); // no n needed in deps
  return () => clearInterval(id);
}, []);
```

::: warning An object/array/function in deps = new reference every render = infinite loop
First, see how the trap forms:

```jsx
function Article() {
  const [text, setText] = useState('');
  const opts = { page: 1 };                     // ① re-executed every render → a brand-new object
  useEffect(() => { fetchData(opts); }, [opts]); // ② React compares references: new ≠ old → "changed"
}
```

The loop: render → ② reference changed → effect runs → effects often contain updates like `setText` → new render → ① yet another new object → ② "changed" again → effect runs again… Any state update inside the effect makes it an infinite loop; even without a loop, the effect needlessly re-runs on every render.

Root cause in one line: **React decides whether a dep changed with `Object.is` — values for primitives, references for objects/arrays/functions — it never looks at contents.** Vue's `watch` perceives internal changes of reactive objects, which is why the same pattern is harmless there.

Three ways out, each with code:

**Option 1: drill down to primitives** — list only the fields you actually care about (most common):

```jsx
const opts = { page: 1 };   // page is a hardcoded literal here; opts.page extracts a primitive number
useEffect(() => { fetchData({ page: opts.page }); }, [opts.page]);  // numbers compare by value — unchanged means no re-run
```

**Option 2: stabilize the reference with useMemo** — when the object genuinely must be passed whole:

```jsx
const [page, setPage] = useState(1);             // page is a piece of component state
const opts = useMemo(() => ({ page }), [page]);  // a new object only when page changes ({ page } is shorthand for { page: page })
useEffect(() => { fetchData(opts); }, [opts]);   // now the reference is stable and comparisons match intuition
```

**Option 3: move the volatile thing inside the effect** — then it's never a dep, and its fresh reference doesn't matter:

```jsx
const [page, setPage] = useState(1);   // also from state
useEffect(() => {
  const opts = { page };      // built inside the effect, absent from the dep array
  fetchData(opts);
}, [page]);                   // deps are primitives only
```

How to choose: prefer primitives (option 1); use useMemo when the object has many fields and only whole-object changes matter (option 2); if the object/function is a one-off temp value inside the effect, just move it in (option 3). Shared principle: **the dep array holds only values whose change should re-run the effect — and each is either a primitive or a reference-stable value.**
:::

::: info StrictMode's double-run isn't a bug
In development React intentionally runs effect → cleanup → effect again to expose missing cleanup. Don't add dedup locks — write the cleanup correctly (like `clearInterval` above). Production doesn't double-run.
:::

### Cancelling data requests

In Vue you might use `AbortController` + `onUnmounted`. Same in React, inside the effect's cleanup:

```jsx
useEffect(() => {
  const ctrl = new AbortController();
  fetch(`/api/user/${id}`, { signal: ctrl.signal })
    .then((r) => r.json())
    .then(setUser)
    .catch((e) => { if (e.name !== 'AbortError') setError(e); });
  return () => ctrl.abort();     // cancel the previous request on dep change / unmount
}, [id]);
```

(In real projects this kind of logic belongs in React Query — see [State Management](/en/react/state-management) — not hand-rolled.)

## useRef: a DOM handle + a mutable box across renders

Named "ref", but its meaning has almost nothing to do with Vue's `ref()`. It gives you a `{ current: value }` box; changing `.current` **triggers no render**, and the box stays the same across renders. Two uses:

```jsx
// use 1: reach a DOM node (≈ Vue's template ref)
const inputRef = useRef(null);
useEffect(() => { inputRef.current.focus(); }, []);
return <input ref={inputRef} />;

// use 2: store a mutable value that needn't re-render (timer id, prev props, mounted flag)
const timerId = useRef(0);
const mounted = useRef(false);
useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
```

::: danger Don't read/write ref.current during render to compute UI
Changing a `useRef` value triggers no render, so deciding what to show from `ref.current` during render can read a stale value and won't update. Values that drive UI go in `useState`; reserve `ref` for imperative access and side-channel data read/written in effects.
:::

| Need | Vue | React |
| --- | --- | --- |
| Reactive local state | `ref(0)` | `useState(0)` |
| Reach a DOM element | template `ref` | `useRef` + `ref` attribute |
| Mutable value that doesn't re-render | plain `let` (survives renders naturally in setup) | `useRef` (function components have no such "run-once closure", so borrow a ref) |

## useMemo / useCallback: cache a value / stabilize a reference

- `useMemo(fn, deps)`: while deps are unchanged, skip recomputing and return the cached value. **Like `computed`'s caching but without reactivity tracking** — changed deps notify nobody; it just skips work on the next render.
- `useCallback(fn, deps)`: equivalent to `useMemo(() => fn, deps)`, returns the **same function reference**, used to hand a stable callback to a `memo` child.

```jsx
const total = useMemo(() => items.reduce((s, x) => s + x.price, 0), [items]);
const onAdd = useCallback((id) => addItem(id), []);
```

::: tip Don't wrap by reflex
Memoization itself costs (comparing deps, an extra cache layer). React's stance: **don't optimize until it's slow** — confirm a real re-render bottleneck with the Profiler, then apply `useMemo`/`useCallback`/`memo`. Wrapping every derived value and callback is a common negative optimization from Vue converts; most derived values should just be computed inline.
:::

## Custom Hooks: extract stateful logic into a function

Almost identical to a Vue composable — name it `use…`, call other hooks inside, return whatever you want to reuse:

```jsx
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    const raw = window.localStorage.getItem(key);
    return raw != null ? JSON.parse(raw) : initial;
  });
  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

// in a component
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

More common home-grown hooks vs Vue:

| Custom Hook | Does | Vue counterpart |
| --- | --- | --- |
| `useWindowSize()` | listen to window size | `useElementSize` / `@vueuse` |
| `useInterval(cb, ms)` | declarative timer | `@vueuse` `useIntervalFn` |
| `useDebounce(value, ms)` | debounced value | `refDebounced` |
| `useMediaQuery(q)` | reactive media query | `useMediaQuery` |

::: warning Custom hooks obey the top-level rule too
They run during render, so the hook order inside must stay stable. Don't conditionally call other hooks inside a custom hook.
:::

## Others worth knowing

- **useLayoutEffect**: like `useEffect` but runs **synchronously** after DOM mutation, before paint — for "read layout then mutate to avoid flicker" (measuring sizes). Prefer `useEffect` for everyday work.
- **useId**: generates an SSR-stable unique id (for label/field association).
- **useSyncExternalStore**: bridges an external store (third-party state libs, browser APIs) into React with consistent subscription — Zustand/Redux use it under the hood; you rarely call it directly.
- **useTransition / useDeferredValue** (React 18 concurrent): mark a slow update (like filtering a big list) as interruptible/low-priority to keep inputs responsive. No direct Vue counterpart.

## Lifecycle cheat sheet (Class era → hooks)

Vue has a long list `onBeforeMount/onMounted/onBeforeUpdate/onUpdated/onUnmounted`; in function components they collapse mostly into `useEffect`:

| Moment | Hook form |
| --- | --- |
| After mount | `useEffect(fn, [])` first run |
| Before unmount | `useEffect`'s cleanup |
| After every render | `useEffect(fn)` with no deps |
| After a specific value changes | `useEffect(fn, [dep])` |
| beforeUpdate / during render | write it in the component body (render = execute) |

## Next

- how components pass data, how to use Context → [Component Communication](/en/react/communication)
- when re-renders actually happen and how the memo family cooperates → [Performance & Pitfalls](/en/react/performance-pitfalls)
