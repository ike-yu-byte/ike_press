# Performance & Common Pitfalls

> The previous pages covered the APIs; this one is the "fall into fewer holes" guide. It splits in two: the top half explains React's performance model — why it re-renders "the whole subtree by default" and how the memo family works together; the bottom half is a checklist of the most frequent pitfalls when moving from Vue to React, each with "symptom + cause + fix". Bookmark it and come back when something weird happens.

## React's performance model: re-rendering is the default

Set the right expectation first, or optimization is pointless.

| | Vue | React |
| --- | --- | --- |
| What triggers an update | reactive precise tracking: only nodes depending on the data update | state changes → **the component function re-executes, and by default all children re-execute with it** |
| Who decides | compiler + runtime, automatically | you (draw the boundaries manually with the memo family) |
| Cost | you barely think about it, Vue already optimized | big lists / deep trees get slow without optimization |

The decision chain for one render: **a parent re-renders → children re-render by default**, unless you block it. React uses "reference comparison" to decide whether to skip — so optimization is fundamentally about **controlling whether references change**.

## The memo family: how the three work together

- `React.memo(Comp)`: **skip re-rendering the component when a shallow props comparison shows no change.** ≈ let a child "selectively respond" to parent updates.
- `useMemo(fn, deps)`: cache a value; while deps are unchanged it returns the same reference.
- `useCallback(fn, deps)`: cache a function reference.

The three must **work together** to matter — if you only `memo` the child but the parent hands down a brand-new function/object every render, the shallow comparison still sees "changed", and memo is wasted:

```jsx
import { memo, useCallback, useMemo } from 'react';

// child: skip re-render when props don't change
const Row = memo(function Row({ onSelect, style }) {
  console.log('render row');
  return <div style={style} onClick={onSelect}>Row</div>;
});

function List() {
  const [n, setN] = useState(0);
  // without caching, every List re-render makes onSelect/style new references → Row's memo is defeated
  const onSelect = useCallback(() => select(), []);
  const style = useMemo(() => ({ color: 'red' }), []);
  return (
    <>
      <button onClick={() => setN(n + 1)}>{n}</button>
      <Row onSelect={onSelect} style={style} />   {/* now the parent's n changes no longer drag Row along */}
    </>
  );
}
```

::: tip Don't reflexively wrap everything
memo/useMemo/useCallback carry their own comparison and caching overhead. **Don't optimize by default**; use the React DevTools Profiler to find components that genuinely slow down from re-rendering, then handle those specifically. Premature memo-ization is the most common negative optimization among newcomers. React 18+'s **React Compiler** (automatic memo at build time) exists precisely to retire this manual work, but it needs to be wired into the build toolchain.
:::

## Other performance tools

- **Long-list virtualization**: render only the visible slice of a thousand rows. `react-window` / `@tanstack/react-virtual` (Vue's ecosystem is vue-virtual-scroller).
- **Code splitting**: `React.lazy` + `<Suspense>` to split by route/on demand (see [Routing](/en/react/router)).
- **`useTransition` / `useDeferredValue`**: mark a "slow to re-render" update as interruptible low-priority work to keep inputs responsive (e.g. live-filtering a large list).
- **Use stable IDs as keys**: let diff reuse nodes; don't use the index (it's a correctness problem as much as a performance one).
- **Minimize + colocate state**: keep state in the lowest component that actually needs it, shrinking the blast radius of re-renders.

## High-frequency pitfalls when moving Vue → React

::: danger Go item by item — know which ones have bitten you
1. **Mutating state in place → view doesn't update**
   Symptom: UI doesn't change after `list.push(x)`. Cause: reference unchanged, React skips. Fix: return a new object/array (`[...list, x]`), or use immer. See [Components & State](/en/react/components-state).

2. **Stale closure: async/timer reads old state**
   Symptom: `count` inside `setInterval` is stuck at its initial value. Cause: the callback closed over one render's snapshot. Fix: functional update `setC(p=>...)`, add the value to the effect deps, or stash it in `useRef`. See [Hooks](/en/react/hooks).

3. **Dependency array with missing or extra entries**
   Missing → the item above; putting an unstable object in → effect re-runs infinitely. Fix: listen to `eslint-plugin-react-hooks`, don't casually disable it.

4. **Doing side effects during render → infinite loop**
   Symptom: calling `fetch`/`setState`/touching the DOM directly in the component body causes infinite re-render or an error. Fix: move side effects into `useEffect`; compute derived values inline instead of setState.

5. **Calling hooks in conditionals/loops**
   Symptom: `if (x) useState(...)` throws "rendered fewer hooks". Cause: hooks match slots by call order. Fix: hooks always at the top level, conditional logic outside them.

6. **`onClick={fn()}` runs immediately**
   Symptom: fires on render, or errors that handler isn't a function. Fix: pass the reference `onClick={fn}`; to pass args use `onClick={() => fn(a)}`.

7. **Reading the new value right after setState**
   Symptom: `setCount(1); log(count)` prints the old value. Cause: state is a render snapshot. Fix: functional update; to "do something after the update" use `useEffect([count])`.

8. **Treating useRef as a reactive variable**
   Symptom: changing `ref.current` doesn't update the page. Cause: it's never meant to trigger a render. Fix: use `useState` for values that drive UI; keep `ref` for imperative references / side storage.

9. **Using the array index as key**
   Symptom: after insert/remove/reorder, input contents land on the wrong rows, animations glitch. Fix: use a stable unique id that comes with the data.

10. **Putting high-frequency / large objects in Context → whole subtree shakes**
    Symptom: one frequently-changing value forces many unrelated components to re-render. Cause: when a Context value changes, every consumer must update. Fix: split Context finer, or switch to an external store with selector subscriptions. See [Component Communication](/en/react/communication).

11. **Thinking the double effect run under StrictMode is a bug**
    Symptom: in dev, requests/logs fire twice. Truth: it's deliberate, to expose missing cleanup. Fix: write correct cleanups, don't add locks to dedupe. Production doesn't double-run.

12. **Rebuilding functions every render in forms/lists defeats memo**
    Symptom: passing an inline `onClick={() => ...}` to a memoized child still re-renders it. Fix: stabilize the reference with `useCallback`, or move the invariant logic out.

13. **Copying Vue's "one giant store" habit**
    Symptom: stuffing API caches into Redux/Context and hand-managing loading/error. Fix: give server data to React Query; keep only genuine client UI state in the global store. See [State Management](/en/react/state-management).
:::

## Debugging tools

- **React DevTools** (browser extension): inspect the component tree, props/state, and use the **Profiler panel** to record per-render time and highlight "why it re-rendered". The counterpart of Vue DevTools.
- **eslint-plugin-react-hooks**: catches dependency-array and hook-call-rule errors while you code — a must-install.
- **why-did-you-render** (dev only): prints at runtime "which prop change caused a component to re-render", a sharp tool for locating defeated memo.

## Back to the entrance

- Review the whole migration map → [React Knowledge Base](/en/react/)
- Go deeper by topic → [JSX](/en/react/jsx) · [Components & State](/en/react/components-state) · [Hooks](/en/react/hooks) · [Component Communication](/en/react/communication) · [Routing](/en/react/router) · [State Management](/en/react/state-management)
