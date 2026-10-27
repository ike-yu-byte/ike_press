# JSX 与模板语法

> 你会 Vue 模板，就意味着你已经理解"声明式描述 UI"。这一页只做一件事：把你脑子里的 `v-if` / `v-for` / <span v-pre>`{{ }}`</span> / `@click` / `v-model` / `<slot>` 那一套，逐个翻译成 JSX 里对应的 JS 写法。核心差异一句话——**Vue 模板是一门带指令的 DSL，JSX 就是 JS 本身，没有专用语法，全靠表达式**。

## JSX 到底是什么

JSX 是 `React.createElement` 的语法糖，编译器帮你把标签转成函数调用：

```jsx
// 你写的
const el = <p className="hi">你好</p>;

// 等价于（简化）
const el = React.createElement('p', { className: 'hi' }, '你好');
```

所以 JSX 里 `{}` 包住的是**一个 JS 表达式**，它的求值结果会被渲染。理解这一点，下面所有规则都是自然推论。

::: warning 别在 VitePress 正文的行内代码里直接写双大括号
本页凡是要在**表格或行内代码**里展示 <span v-pre>`{{ }}`</span> 这类内容，都用 &lt;span v-pre&gt; 包住，否则会被 Vue 模板编译器当成插值导致构建失败。放在 ``` 围栏代码块里则天然安全。
:::

## 插值：<span v-pre>`{{ }}`</span> → `{}`

Vue 用双大括号插值，JSX 用单大括号包表达式：

<table>
<thead><tr><th>意图</th><th>Vue</th><th>React (JSX)</th></tr></thead>
<tbody>
<tr><td>输出变量</td><td><code v-pre>{{ msg }}</code></td><td><code v-pre>{msg}</code></td></tr>
<tr><td>表达式</td><td><code v-pre>{{ name.toUpperCase() }}</code></td><td><code v-pre>{name.toUpperCase()}</code></td></tr>
<tr><td>拼接</td><td><code v-pre>{{ a + b }}</code></td><td><code v-pre>{a + b}</code></td></tr>
<tr><td>属性插值</td><td><code>:title="msg"</code></td><td><code v-pre>title={msg}</code></td></tr>
</tbody>
</table>

::: danger 大括号里只能是表达式，不能是语句
`{ if (x) {...} }`、`{ const a = 1 }` 都会报错。要写"逻辑"只能用会返回值的表达式：三元、`&&`、IIFE（`() => {}()`）。这是 Vue 转 React 最常撞的墙——Vue 模板里也基本只写表达式，但你可能习惯 `<script>` 里算好再绑，React 里同样建议**先在组件函数体里算，再 `{}` 出来**。
:::

## 条件渲染：`v-if` / `v-show` 的替身

Vue：

```vue
<span v-if="isAdmin">管理员</span>
<span v-else>普通用户</span>
<div v-show="hidden" class="panel">还在 DOM 里，只是 display:none</div>
```

React 没有指令，全靠 JS 表达式：

```jsx
{/* v-if */}
{isAdmin && <span>管理员</span>}

{/* v-if / v-else */}
{isAdmin ? <span>管理员</span> : <span>普通用户</span>}

{/* 多分支：抽成函数或用嵌套三元（复杂时建议抽函数，别写三层三元） */}
{status === 'loading' ? <Spinner /> : status === 'error' ? <Err /> : <List />}

{/* v-show：元素始终渲染，靠 style 控制显隐 */}
<div style={{ display: hidden ? 'none' : 'block' }} className="panel">…</div>
```

::: tip 提前 return 替代大块 v-if
组件级"没数据就不渲染"，Vue 里习惯整块 `v-if` 包着；React 更地道的写法是在函数里提前 return：
```jsx
function Profile({ user }) {
  if (!user) return <Loading />;
  return <div>{user.name}</div>;   // 下面不用再套一层条件
}
```
:::

::: warning `&&` 的 0 陷阱
`{count && <Badge/>}` 在 `count === 0` 时会渲染出一个 `0`——因为 `0 && x` 求值为 `0`，而 `0` 是会显示的合法节点（`false`/`null`/`undefined` 才不显示）。Vue 的 `v-if="count"` 走的是布尔真值，不会有这问题。修法：`{count > 0 && <Badge/>}`。
:::

## 列表渲染：`v-for` → `map`

Vue：

```vue
<ul>
  <li v-for="(item, i) in list" :key="item.id">{{ i }}: {{ item.text }}</li>
</ul>
```

React 就是数组 `map`，返回节点数组：

```jsx
<ul>
  {list.map((item, i) => (
    <li key={item.id}>{i}: {item.text}</li>
  ))}
</ul>
```

要点：

- `key` 写在元素上，取值规则和 Vue 一样——用稳定唯一 ID，**别用 index**（列表增删/重排会导致状态错位、diff 错乱）。
- 列表渲染是表达式，所以能直接嵌在 `{}` 里；外层括号只是可读性。
- 过滤/排序先 `.filter().sort()` 再 `.map()`，链式即可，不需要 Vue 那套 `<template v-for>`。

```jsx
{items
  .filter((x) => x.done)
  .map((x) => <li key={x.id}>{x.text}</li>)}
```

## 事件绑定：`@click` → `onClick`

Vue：

```vue
<button @click="handleClick">点</button>
<button @click.stop.prevent="submit">提交</button>
<input @keyup.enter="search" />
```

React：

```jsx
// 传函数引用，不要写成 handleClick()（那是渲染时立即调用）
<button onClick={handleClick}>点</button>

// 要传参就用箭头包一层
<button onClick={() => remove(item.id)}>删</button>

// .stop / .prevent 没有修饰符，在处理函数里手写
<button onClick={(e) => { e.stopPropagation(); e.preventDefault(); submit(); }}>提交</button>

// .enter 等按键判断也手写
<input onKeyUp={(e) => e.key === 'Enter' && search()} />
```

差异清单：

| 维度 | Vue | React |
| --- | --- | --- |
| 命名 | `@click` / `v-on:click` | `onClick`（驼峰） |
| 传参 | `@click="fn(id)"` 模板里直接写 | `onClick={() => fn(id)}` 箭头包 |
| 修饰符 | `.stop .prevent .once .enter` 内置 | 无，全在 handler 里手写 |
| 事件对象 | 原生 `Event` | **合成事件** SyntheticEvent（委托到根，`e.nativeEvent` 取原生） |
| 解绑 | 组件销毁自动解绑 | 同样自动，但 `addEventListener` 手动加的要在 effect 清理 |

::: warning `onClick={fn()}` 是 bug
`onClick={fn()}` 会在**每次渲染时**立即执行 `fn` 并把返回值当 handler。传函数本身：`onClick={fn}`。这是新手最高频笔误。
:::

## class 与 style

Vue：

```vue
<div :class="{ active: isActive, 'text-red': error }" :style="{ color: themeColor }">
```

React：`class`→`className`，`style` 是**对象**（键驼峰）不是字符串：

```jsx
<div
  className={`box ${isActive ? 'active' : ''} ${error ? 'text-red' : ''}`}
  style={{ color: themeColor, fontSize: 14 }}   // 数值单位默认 px；非默认属性要字符串如 '1.5'
>
```

条件类名多了别堆模板字符串，用 `clsx`（Vue 里你不需要，因为 `:class` 原生支持对象）：

```jsx
import clsx from 'clsx';
<div className={clsx('box', { active: isActive, 'text-red': error })} />
```

## 属性与"透传"

| Vue | React |
| --- | --- |
| 组件上写 `class`/`id`/`data-*` 自动落到根元素（attribute fallthrough） | **不会**自动透传，必须显式接住再往下传 |
| `v-bind="$attrs"` | `<Child {...rest} />` 展开 |
| `inheritAttrs: false` | 默认就是不透传，无需关 |

```jsx
// 想做一个"包一层"的组件把多余属性传给内部元素，得手动展开
function FancyInput({ label, ...rest }) {   // rest 收集其余全部 props
  return (
    <label>
      {label}
      <input {...rest} />                   {/* 手动 spread 下去 */}
    </label>
  );
}
// <FancyInput label="邮箱" placeholder="a@b.com" maxLength={20} />
//   placeholder / maxLength 通过 rest 落到 <input>
```

## 双向绑定：`v-model` 的真相

Vue 一行 `v-model="text"` 背后是 `:value` + `@input`。React **没有** `v-model`，双向要自己拼：

```jsx
function NameInput() {
  const [text, setText] = useState('');
  return (
    <input
      value={text}                            {/* 下行：state → 视图 */}
      onChange={(e) => setText(e.target.value)} {/* 上行：视图 → state */}
    />
  );
}
```

这叫**受控组件**。自定义组件的"v-model"也要手动成对传（见[组件通信](/react/communication)）。

## 插槽 → children 与 JSX-as-prop

Vue 的具名/作用域插槽，在 React 里统统是"把 JSX 当普通值传递"：

<table>
<thead><tr><th>Vue</th><th>React</th></tr></thead>
<tbody>
<tr><td><code>&lt;slot&gt;</code> 默认插槽</td><td><code>{props.children}</code></td></tr>
<tr><td><code>&lt;slot name="header"&gt;</code> 具名插槽</td><td>约定一个 prop 收 JSX：<code>header={&lt;X/&gt;}</code></td></tr>
<tr><td>作用域插槽 <code>&lt;slot :row="r"&gt;</code></td><td>传一个"返回 JSX 的函数"prop（render prop）</td></tr>
</tbody>
</table>

```jsx
// 默认插槽 = children
function Card({ title, children }) {
  return <section><h3>{title}</h3>{children}</section>;
}
<Card title="订单"><p>这里是 children</p></Card>

// 具名插槽 = 传 JSX 的 prop
function Layout({ header, footer, children }) {
  return <div>{header}<main>{children}</main>{footer}</div>;
}
<Layout
  header={<TopBar />}
  footer={<span>版权</span>}
>
  <Content />
</Layout>

// 作用域插槽 = 函数 prop（把内部数据回传给调用方渲染）
function VirtualList({ data, renderItem }) {   // renderItem 是个函数
  return <div>{data.map((row, i) => renderItem(row, i))}</div>;
}
<VirtualList
  data={rows}
  renderItem={(row, i) => <Row key={row.id} index={i} row={row} />}
/>
```

## 过渡与 KeepAlive

React 无内置 `<Transition>` / `<KeepAlive>`：

- 进出场动画：用 `react-transition-group`，或更主流的 <a href="https://www.framer.com/motion/" target="_blank" rel="noopener noreferrer">framer-motion</a> 的 `<AnimatePresence>`。
- "缓存组件不丢状态"（KeepAlive 的替身）：靠**让组件保持挂载**（比如把切换目标渲染出来再用 CSS 隐藏），或用状态管理把数据提到组件外，卸载也不丢。

## 速查对照

| Vue 模板 | React JSX |
| --- | --- |
| <code v-pre>{{ x }}</code> | <code v-pre>{x}</code> |
| `v-if` / `v-else` | `cond && <X/>` / `cond ? <X/> : <Y/>` |
| `v-show` | <span v-pre>`style={{ display: v ? 'none' : '' }}`</span> |
| `v-for` | `list.map(x => <X key={x.id} />)` |
| `:class="{a:x}"` | `clsx({ a: x })` |
| `:style` 字符串/对象 | `style` 对象（键驼峰） |
| `@click` / `@click.stop` | `onClick` / `onClick={e => e.stopPropagation()}` |
| `v-model` | `value` + `onChange` |
| `<slot>` / `#name` | `children` / JSX prop / render prop |
| `v-html` | <span v-pre>`dangerouslySetInnerHTML={{ __html }}`</span> |
| `<Transition>` | framer-motion 等三方 |

## 下一步

- 组件怎么写、props 怎么传、state 为什么要"换新对象" → [组件与状态](/react/components-state)
- `useEffect` 等钩子逐个对照 → [Hooks 详解](/react/hooks)
