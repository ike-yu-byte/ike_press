# JSX & Template Syntax

> Knowing Vue templates means you already understand "declaratively describing UI". This page does one thing: translate your mental `v-if` / `v-for` / <span v-pre>`{{ }}`</span> / `@click` / `v-model` / `<slot>` vocabulary into JSX's plain-JS equivalents. The core difference in a line — **a Vue template is a DSL with directives; JSX is just JS, no special syntax, everything is an expression**.

## What JSX actually is

JSX is sugar over `React.createElement`; the compiler turns tags into function calls:

```jsx
// what you write
const el = <p className="hi">Hello</p>;

// equivalent (simplified)
const el = React.createElement('p', { className: 'hi' }, 'Hello');
```

So `{}` in JSX wraps **a single JS expression**, and its result gets rendered. Once you get that, every rule below is a natural corollary.

::: warning Don't put raw double braces in VitePress inline code
On this page, anywhere we show <span v-pre>`{{ }}`</span>-style content **in a table or inline code**, it's wrapped in &lt;span v-pre&gt;, otherwise the Vue template compiler treats it as interpolation and the build fails. Inside ``` fenced blocks it's naturally safe.
:::

## Interpolation: <span v-pre>`{{ }}`</span> → `{}`

Vue uses double braces; JSX wraps an expression in single braces:

<table>
<thead><tr><th>Intent</th><th>Vue</th><th>React (JSX)</th></tr></thead>
<tbody>
<tr><td>Print a variable</td><td><code v-pre>{{ msg }}</code></td><td><code v-pre>{msg}</code></td></tr>
<tr><td>Expression</td><td><code v-pre>{{ name.toUpperCase() }}</code></td><td><code v-pre>{name.toUpperCase()}</code></td></tr>
<tr><td>Concatenation</td><td><code v-pre>{{ a + b }}</code></td><td><code v-pre>{a + b}</code></td></tr>
<tr><td>Attribute</td><td><code>:title="msg"</code></td><td><code v-pre>title={msg}</code></td></tr>
</tbody>
</table>

::: danger Braces hold expressions, not statements
`{ if (x) {...} }` and `{ const a = 1 }` are errors. To write "logic" you can only use value-returning expressions: ternary, `&&`, IIFE (`(() => {})()`). This is the wall Vue converts hit most — but note Vue templates also mostly hold expressions, and the React idiom is the same: **compute in the component body first, then `{}` it out**.
:::

## Conditional rendering: the `v-if` / `v-show` stand-ins

Vue:

```vue
<span v-if="isAdmin">Admin</span>
<span v-else>User</span>
<div v-show="hidden" class="panel">still in DOM, just display:none</div>
```

React has no directives — all JS expressions:

```jsx
{/* v-if */}
{isAdmin && <span>Admin</span>}

{/* v-if / v-else */}
{isAdmin ? <span>Admin</span> : <span>User</span>}

{/* multi-branch: extract a function or nest ternaries (prefer a function when it grows) */}
{status === 'loading' ? <Spinner /> : status === 'error' ? <Err /> : <List />}

{/* v-show: element always rendered, toggle via style */}
<div style={{ display: hidden ? 'none' : 'block' }} className="panel">…</div>
```

::: tip Early return replaces a big v-if
For component-level "don't render without data", Vue wraps everything in `v-if`; the idiomatic React way is an early return:
```jsx
function Profile({ user }) {
  if (!user) return <Loading />;
  return <div>{user.name}</div>;   // no extra nesting below
}
```
:::

::: warning The `&&` zero trap
`{count && <Badge/>}` renders a literal `0` when `count === 0` — `0 && x` evaluates to `0`, and `0` is a renderable node (only `false`/`null`/`undefined` render nothing). Vue's `v-if="count"` uses boolean truthiness so it never happens. Fix: `{count > 0 && <Badge/>}`.
:::

## List rendering: `v-for` → `map`

Vue:

```vue
<ul>
  <li v-for="(item, i) in list" :key="item.id">{{ i }}: {{ item.text }}</li>
</ul>
```

React is just array `map` returning a node array:

```jsx
<ul>
  {list.map((item, i) => (
    <li key={item.id}>{i}: {item.text}</li>
  ))}
</ul>
```

Key points:

- `key` goes on the element; same rule as Vue — use a stable unique ID, **never the index** (adds/removes/reorders misplace state and break the diff).
- List rendering is an expression, so it drops straight into `{}`; the outer parens are just readability.
- Filter/sort with `.filter().sort()` then `.map()` — chain it; no `<template v-for>` needed.

```jsx
{items
  .filter((x) => x.done)
  .map((x) => <li key={x.id}>{x.text}</li>)}
```

## Event binding: `@click` → `onClick`

Vue:

```vue
<button @click="handleClick">Click</button>
<button @click.stop.prevent="submit">Submit</button>
<input @keyup.enter="search" />
```

React:

```jsx
// pass the function reference, not handleClick() (that calls it during render)
<button onClick={handleClick}>Click</button>

// to pass args, wrap in an arrow
<button onClick={() => remove(item.id)}>Del</button>

// .stop / .prevent have no modifiers — write them in the handler
<button onClick={(e) => { e.stopPropagation(); e.preventDefault(); submit(); }}>Submit</button>

// key checks likewise
<input onKeyUp={(e) => e.key === 'Enter' && search()} />
```

Differences:

| Aspect | Vue | React |
| --- | --- | --- |
| Naming | `@click` / `v-on:click` | `onClick` (camelCase) |
| Args | `@click="fn(id)"` inline | `onClick={() => fn(id)}` arrow wrap |
| Modifiers | `.stop .prevent .once .enter` built in | none, hand-write in handler |
| Event object | native `Event` | **SyntheticEvent** (delegated to root; `e.nativeEvent` for the original) |
| Unbinding | auto on destroy | also auto, but manual `addEventListener` needs effect cleanup |

::: warning `onClick={fn()}` is a bug
`onClick={fn()}` runs `fn` **on every render** and uses its return value as the handler. Pass the function itself: `onClick={fn}`. The single most common typo.
:::

## class and style

Vue:

```vue
<div :class="{ active: isActive, 'text-red': error }" :style="{ color: themeColor }">
```

React: `class`→`className`, `style` is an **object** (camelCase keys), not a string:

```jsx
<div
  className={`box ${isActive ? 'active' : ''} ${error ? 'text-red' : ''}`}
  style={{ color: themeColor, fontSize: 14 }}   // numbers default to px; non-default units need strings
>
```

When conditional class names pile up, don't string-spam — use `clsx` (in Vue you don't need it because `:class` natively takes objects):

```jsx
import clsx from 'clsx';
<div className={clsx('box', { active: isActive, 'text-red': error })} />
```

## Attributes and "fallthrough"

| Vue | React |
| --- | --- |
| `class`/`id`/`data-*` on a component auto-land on the root (attribute fallthrough) | **not** auto-forwarded; receive and pass explicitly |
| `v-bind="$attrs"` | `<Child {...rest} />` spread |
| `inheritAttrs: false` | that's already the default; nothing to disable |

```jsx
// a "wrapper" component must manually spread extra props down
function FancyInput({ label, ...rest }) {   // rest collects all other props
  return (
    <label>
      {label}
      <input {...rest} />                   {/* spread them onto <input> */}
    </label>
  );
}
// <FancyInput label="Email" placeholder="a@b.com" maxLength={20} />
//   placeholder / maxLength reach <input> via rest
```

## Two-way binding: the truth about `v-model`

Vue's one-line `v-model="text"` is really `:value` + `@input`. React has **no** `v-model`; you assemble two-way yourself:

```jsx
function NameInput() {
  const [text, setText] = useState('');
  return (
    <input
      value={text}                              {/* down: state → view */}
      onChange={(e) => setText(e.target.value)}  {/* up: view → state */}
    />
  );
}
```

This is the **controlled component**. A custom component's "v-model" is also a manual pair (see [Component Communication](/en/react/communication)).

## Slots → children & JSX-as-prop

Vue's named/scoped slots are all just "passing JSX as an ordinary value" in React:

<table>
<thead><tr><th>Vue</th><th>React</th></tr></thead>
<tbody>
<tr><td><code>&lt;slot&gt;</code> default slot</td><td><code>{props.children}</code></td></tr>
<tr><td><code>&lt;slot name="header"&gt;</code> named slot</td><td>a prop that receives JSX: <code>header={&lt;X/&gt;}</code></td></tr>
<tr><td>scoped slot <code>&lt;slot :row="r"&gt;</code></td><td>pass a "function returning JSX" prop (render prop)</td></tr>
</tbody>
</table>

```jsx
// default slot = children
function Card({ title, children }) {
  return <section><h3>{title}</h3>{children}</section>;
}
<Card title="Orders"><p>this is children</p></Card>

// named slot = a prop carrying JSX
function Layout({ header, footer, children }) {
  return <div>{header}<main>{children}</main>{footer}</div>;
}
<Layout header={<TopBar />} footer={<span>©</span>}>
  <Content />
</Layout>

// scoped slot = function prop (render prop): hand inner data back to the caller
function VirtualList({ data, renderItem }) {
  return <div>{data.map((row, i) => renderItem(row, i))}</div>;
}
<VirtualList data={rows} renderItem={(row, i) => <Row key={row.id} index={i} row={row} />} />
```

## Transitions & KeepAlive

React has no built-in `<Transition>` / `<KeepAlive>`:

- Enter/leave animation: `react-transition-group`, or the more mainstream <a href="https://www.framer.com/motion/" target="_blank" rel="noopener noreferrer">framer-motion</a>'s `<AnimatePresence>`.
- "Cache a component without losing state" (the KeepAlive stand-in): **keep the component mounted** (render it, hide with CSS), or lift the data into state management so unmount doesn't lose it.

## Cheat sheet

| Vue template | React JSX |
| --- | --- |
| <code v-pre>{{ x }}</code> | <code v-pre>{x}</code> |
| `v-if` / `v-else` | `cond && <X/>` / `cond ? <X/> : <Y/>` |
| `v-show` | <span v-pre>`style={{ display: v ? 'none' : '' }}`</span> |
| `v-for` | `list.map(x => <X key={x.id} />)` |
| `:class="{a:x}"` | `clsx({ a: x })` |
| `:style` string/object | `style` object (camelCase keys) |
| `@click` / `@click.stop` | `onClick` / `onClick={e => e.stopPropagation()}` |
| `v-model` | `value` + `onChange` |
| `<slot>` / `#name` | `children` / JSX prop / render prop |
| `v-html` | <span v-pre>`dangerouslySetInnerHTML={{ __html }}`</span> |
| `<Transition>` | framer-motion etc. |

## Next

- How to write components, pass props, and why state must be "swapped for a new object" → [Components & State](/en/react/components-state)
- `useEffect` and friends, hook by hook → [Hooks in Depth](/en/react/hooks)
