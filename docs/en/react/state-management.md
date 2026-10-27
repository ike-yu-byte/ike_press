# State Management

> In Vue, global state is practically synonymous with Pinia — officially recommended, one consistent API. React has no official store; the ecosystem is a pile of libraries each good at something, and **choosing one is itself the first decision a Vue convert faces**. This page ranks them by "similarity to Pinia", gives the mindset behind each, and one of the most important modern consensuses: **manage "server data" and "client global state" separately**.

## Don't reach for a library first

React's default answer isn't a library but this priority ladder:

1. **Local `useState`** — if only one component uses it, don't lift it anywhere.
2. **Lift state up** — a few adjacent components share it, hoist to a common parent (see [Component Communication](/en/react/communication)).
3. **Context** — values that span many levels and change rarely (theme, logged-in user, locale).
4. **External store** — global, high-frequency, shared across modules — only then pull in a library.
5. **React Query** — anything "fetched from the backend", big or small, goes here first rather than into the global store above.

A common mistake Vue converts make is dragging their whole Pinia blob (including API data) wholesale into Redux. React long ago split **server state** out on its own — this is the most important mindset update.

## Panorama comparison

| Library | Mindset | Relation to Pinia | Good for |
| --- | --- | --- | --- |
| **Zustand** | hook-style, no Provider, selector subscriptions | **closest to Pinia's feel to pick up**, lightweight first choice | small to large, anyone afraid of Redux boilerplate |
| **Redux Toolkit** | centralized, action/reducer, one-way data flow, DevTools | like a beefed-up Vuex (more boilerplate) | large / multi-dev / strict conventions & time-travel debugging |
| **Jotai** | atomic, bottom-up, many small states each subscribed | like "lots of tiny Pinia stores" | scattered state, fine-grained subscriptions |
| **Recoil** | atomic (from Facebook) | similar to Jotai, but essentially unmaintained | not recommended for new projects |
| **MobX + mobx-react-lite** | reactive objects, `makeAutoObservable` | **actually the most Vue-`reactive`-like**, mutate an object and it updates | people who miss Vue's reactivity feel |
| **TanStack Query (React Query)** | server state: cache / request dedup / invalidation / retry | Vue has the twin `@tanstack/vue-query` | use it whenever there's backend data |

## Zustand: the first choice for Pinia migrants

One `create` gives you a hook — no Provider, no reducer boilerplate; you mutate state with `set` (it handles immutability for you). The selector `(s) => s.xxx` lets a component subscribe only to the slice it cares about, naturally avoiding full re-renders.

```jsx
import { create } from 'zustand';

const useCart = create((set, get) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),   // remember to return a new array
  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((s, x) => s + x.price, 0),    // a method computed on demand
}));

function CartView() {
  const items = useCart((s) => s.items);       // subscribe only to items; other fields changing won't re-render
  const add = useCart((s) => s.add);
  return (
    <div>
      {items.map((x) => <li key={x.id}>{x.name}</li>)}
      <button onClick={() => add({ id: 1, name: 'Book', price: 30 })}>Add</button>
    </div>
  );
}
```

Versus Pinia: `create((set)=>({...}))` ≈ `defineStore(()=>({...}))`; `set` ≈ mutating state directly; selectors ≈ `storeToRefs` + picking what you need. Add persistence with the `persist` middleware (≈ Pinia's `pinia-plugin-persistedstate`).

## Redux Toolkit: the disciplined choice for big projects

RTK cuts most of Redux's boilerplate: inside `createSlice` you can "look like you're mutating" (immer produces new objects under the hood), and actions are created for you. The mindset is still **single store + dispatch actions + read via selectors**:

```jsx
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { useSelector, useDispatch } from 'react-redux';

const counter = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    inc: (s) => { s.value += 1; },        // looks like a mutation, immer makes it immutable
    addBy: (s, action) => { s.value += action.payload; },
  },
});

const store = configureStore({ reducer: { counter: counter.reducer } });
const { inc, addBy } = counter.actions;

// in a component
function Counter() {
  const value = useSelector((s) => s.counter.value);   // selector subscription
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(addBy(5))}>{value}</button>;
}
```

Mapping to Pinia/Vuex: `createSlice.reducers` ≈ actions+mutations merged; `dispatch(action)` is the same; `useSelector` ≈ `mapState`/`storeToRefs`. For async use `createAsyncThunk` or **RTK Query** (the latter already covers the React Query scenarios below). The learning curve is steeper than Zustand's, but the discipline and DevTools (action replay, time travel) are its payoff.

## Jotai: atomic, the least fuss

Treat each piece of state as an `atom`; whoever uses it calls `useAtom`, and it auto-subscribes only to relevant atoms. Good for scattered state where you don't want to design a big store structure:

```jsx
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const doubleAtom = atom((get) => get(countAtom) * 2);   // derived atom ≈ computed

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const [double] = useAtom(doubleAtom);
  return <button onClick={() => setCount((c) => c + 1)}>{count} / {double}</button>;
}
```

## MobX: the one that feels most like Vue

If you miss Vue's `reactive` "just mutate the object, the view updates itself", MobX gives exactly that: `makeAutoObservable` makes an object reactive, and components wrapped in `observer` track dependencies automatically. It's the opposite philosophy to Redux's "immutable + explicit actions". The cost: implicit dependency tracking is harder to trace/debug in large teams than Redux, and the community is smaller than the others above.

## React Query: pull server state out on its own

Backend data isn't "your state", it's "a local cache of remote state". React Query manages caching, dedup, invalidation/refetch, loading/error states, pagination and optimistic updates, so you barely hand-write `useEffect + fetch + loading`:

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function UserList() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['users'],              // cache key: change it and it refetches
    queryFn: () => fetch('/api/users').then((r) => r.json()),
    staleTime: 30_000,               // treat as fresh within 30s, no repeat request
  });
  if (isPending) return <Spinner />;
  if (isError) return <Err />;
  return <ul>{data.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}

function AddUser() {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (u) => fetch('/api/users', { method: 'POST', body: JSON.stringify(u) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),  // refetch list after write
  });
  return <button onClick={() => mut.mutate({ name: 'new' })}>Add</button>;
}
```

If you've used `@tanstack/vue-query` in Vue, this is the same API — zero migration cost. **Bottom line: whichever you pick for client global state, Zustand or Redux, all API data goes through React Query.**

## Decision tree

```
Any backend data to cache/sync?  ── yes ──> use React Query (or RTK Query)
        │
        no
        ▼
Lots of global client state?
  ├─ little / just a few places ──> Context (low-frequency) or lift state up
  ├─ medium / afraid of boilerplate ──> Zustand
  ├─ scattered / want fine granularity ──> Jotai
  └─ large / many devs / need strict rules + time travel ──> Redux Toolkit
Want Vue's reactive feel? ──> MobX
```

## Next step

- Why "selector subscription" cuts re-renders, and how the memo family works together → [Performance & Common Pitfalls](/en/react/performance-pitfalls)
