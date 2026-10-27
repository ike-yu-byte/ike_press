# Component Communication

> Vue has a whole dedicated toolkit for component communication: props, `emit`, `v-model`, `provide/inject`, `slot`, Pinia. React's answer is almost suspiciously plain — **besides the trunk "parent passes values down, child calls a function up", everything else is a variation of it**. This page maps each Vue communication style to its React form, highlighting Context and its key difference from `provide/inject`.

## The whole picture: only three directions

| Direction | React way | Vue counterpart |
| --- | --- | --- |
| parent → child | pass props (values, JSX, functions all work) | props |
| child → parent | call a callback the parent passed down | `emit` |
| cross-level / global | Context, a state library, or lift state to a common parent | `provide/inject`, Pinia |

No `$parent`, no `$refs` chains, no event bus (React barely needs one because data flow is explicit).

## parent → child: props

The basics are in [Components & State](/en/react/components-state). The key insight: **everything you pass is a plain JS value**, so slots, scoped slots, and two-way binding all reduce to "pass a value / pass a function" in React.

```jsx
<Child
  title="text"                     {/* a string */}
  count={n}                        {/* a number (reactivity flows down via parent re-render) */}
  onAdd={handleAdd}                {/* a function = lets the child call back to the parent */}
  header={<Banner />}              {/* JSX = a Vue named slot */}
  renderItem={(row) => <Row row={row} />}  {/* function returning JSX = scoped slot */}
/>
```

## child → parent: call a callback

Vue's `emit('add', 1)` is, in React, "the parent passes an `onAdd` function down and the child calls it":

```jsx
function AddButton({ onAdd }) {
  return <button onClick={() => onAdd(1)}>+1</button>;
}
function Parent() {
  const [n, setN] = useState(0);
  return <AddButton onAdd={(v) => setN((x) => x + v)} />;
}
```

Naming: event-ish props are `onXxx` (`onClick` `onChange` `onSubmit`), matching Vue's `@xxx`.

## Two-way: the value + onChange convention

React has no `v-model`. A custom component's "v-model-ability" is implemented as a pair — take `value`, expose `onChange`:

```jsx
function FancyInput({ value, onChange }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} />;
}

function Demo() {
  const [name, setName] = useState('');
  return <FancyInput value={name} onChange={setName} />;
}
```

That's React's `v-model` (Vue 3's `v-model` also desugars to `modelValue` + `update:modelValue` — same essence). Multiple v-models (`v-model:first` `v-model:second`) → just more `xxxValue`/`onXxxChange` pairs.

## Slots → children / JSX prop / render prop

Vue's three slot kinds, React's three passing styles (shown on the [JSX page](/en/react/jsx), summarized here):

| Vue | React |
| --- | --- |
| `<slot>` default | `props.children` |
| `<slot name="x">` named | a prop receiving JSX: `x={<Node/>}` |
| scoped slot `<slot :row="r">` | a "function returning JSX" prop (render prop) |

```jsx
// children: unnamed content all lands in children
function Panel({ title, children }) {
  return <section><h3>{title}</h3>{children}</section>;
}
<Panel title="Settings"><ThemeForm /></Panel>   // <ThemeForm/> is children
```

## Cross-level: Context (≈ provide / inject)

When you don't want to thread props through every layer (prop drilling), use Context — Vue's `provide`/`inject` counterpart:

```jsx
import { createContext, useContext, useState } from 'react';

// 1. create the Context
const ThemeContext = createContext('light');   // arg is the default value

// 2. a parent provides the value
function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Page />
    </ThemeContext.Provider>
  );
}

// 3. any-depth descendants consume it
function ThemedButton() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
    now: {theme}
  </button>;
}
```

### The key difference from provide/inject: re-render scope

In Vue you provide a reactive object and only components using the specific field update. In React, **when a Context `value` changes, every component that `useContext`s it re-renders** (you can't subscribe to just part of it).

::: warning Context is a poor fit for high-frequency / large state
A value that changes many times a second in Context will make the whole consuming subtree re-render. Mitigations:
1. **Split into multiple Contexts**: separate the "stable value" from the "frequently-changing setter", or split by concern to shrink the blast radius.
2. For high-frequency global state, use an **external store** (Zustand etc.) — its selector subscriptions let a component re-render only when the slice it cares about changes, exactly what Context lacks (see [State Management](/en/react/state-management)).
:::

From React 19 you can use `<ThemeContext value={...}>` directly as the Provider and read with `use(ThemeContext)` — shorter, same semantics.

## Lifting state up: the most "React" solution

In Vue you might drop shared sibling data into Pinia. React prefers **lifting the shared state to the nearest common parent**, then passing down via props and up via callbacks — "lifting state up":

```jsx
// sibling A inputs, sibling B displays: state lifted to the parent
function Parent() {
  const [text, setText] = useState('');
  return (
    <>
      <Input value={text} onChange={setText} />
      <Preview text={text} />
    </>
  );
}
```

Decision chain: **if props/lifting suffices, skip Context; if Context suffices, skip a state library.** Shallow + little sharing → lift; many layers + moderate sharing → Context; global + high-frequency + cross-module → a state library.

## Imperative: forwardRef + useImperativeHandle

In Vue you `defineExpose` and the parent calls `childRef.value.method()`. React function components have no instance to expose by default; to do this you `forwardRef` the ref inward and `useImperativeHandle` to shape what's exposed:

```jsx
import { forwardRef, useImperativeHandle, useRef } from 'react';

const MyInput = forwardRef(function MyInput(props, ref) {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus() { inputRef.current.focus(); },   // expose only these to the parent
    clear() { inputRef.current.value = ''; },
  }));
  return <input ref={inputRef} />;
});

// parent:
const ref = useRef(null);
<MyInput ref={ref} />
<button onClick={() => ref.current.focus()}>focus</button>
```

::: tip Use sparingly
Imperative calls are an escape hatch; most of the time prefer "lift state to the parent and drive via props" (data over commands). Reach for `forwardRef` only when truly needed — e.g. an input wrapper exposing `focus()`, an animation wrapper exposing `play()`.
:::

## Event bus? Basically unnecessary

Vue projects often use a mitt event bus to decouple cross-component comms. In React, because data flow is explicit (props down, callbacks up, globals via store/context), you almost never need one. If you insist, `useSyncExternalStore` can bridge an external emitter — but that's already state management.

## Next

- how to choose a global store (Zustand / Redux Toolkit / React Query) → [State Management](/en/react/state-management)
