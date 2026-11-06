# 组件通信

> Vue 里组件通信有一整套专用机制：props、`emit`、`v-model`、`provide/inject`、`slot`、Pinia。React 的答案朴素得令人怀疑——**除了"父传子传值、子传父调函数"这条主干，其余全是它的变体**。这一页把每种 Vue 通信方式在 React 里的对应写法讲清楚，重点在 Context 与它和 `provide/inject` 的关键差异。

## 全景：只有三个方向

| 方向 | React 做法 | Vue 对应 |
| --- | --- | --- |
| 父 → 子 | 传 props（值、JSX、函数都行） | props |
| 子 → 父 | 调用父传下来的回调函数 | `emit` |
| 跨层 / 全局 | Context、状态管理库、或把状态提到共同父 | `provide/inject`、Pinia |

没有 `$parent`、`$refs` 链、事件总线这些"旁门"（事件总线在 React 里几乎不需要，因为数据流清晰）。

## 父 → 子：props

最基础，见[组件与状态](/react/components-state)。关键是理解：**你能传的一切都是普通 JS 值**，所以插槽、作用域插槽、双向绑定在 React 里都能用"传值/传函数"统一表达。

```jsx
<Child
  title="文本"                    {/* 传字符串 */}
  count={n}                       {/* 传数字（响应式靠父组件重渲染自动流下来） */}
  onAdd={handleAdd}               {/* 传函数 = 让子能回调父 */}
  header={<Banner />}             {/* 传 JSX = Vue 具名插槽 */}
  renderItem={(row) => <Row row={row} />}  {/* 传函数返回 JSX = 作用域插槽 */}
/>
```

## 子 → 父：调用回调

Vue 的 `emit('add', 1)` 在 React 里就是"父把 `onAdd` 函数传下来，子调用它"：

```jsx
function AddButton({ onAdd }) {
  return <button onClick={() => onAdd(1)}>+1</button>;
}
function Parent() {
  const [n, setN] = useState(0);
  return <AddButton onAdd={(v) => setN((x) => x + v)} />;
}
```

命名约定：事件型 prop 用 `onXxx`（`onClick` `onChange` `onSubmit`），Vue 里对应 `@xxx`。

## 双向：value + onChange 约定

React 没有 `v-model`。自定义组件的"可被 v-model"要自己成对实现——传 `value`、暴露 `onChange`：

```jsx
// 一个可"双向绑定"的自定义输入
function FancyInput({ value, onChange }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} />;
}

function Demo() {
  const [name, setName] = useState('');
  return <FancyInput value={name} onChange={setName} />;
}
```

这就是 React 版的 `v-model`（Vue 3 的 `v-model` 也糖化为 `modelValue` + `update:modelValue`，本质相同）。多个"v-model"（`v-model:first` `v-model:second`）→ 就多对 `xxxValue`/`onXxxChange`。

## 插槽 → children / JSX prop / render prop

Vue 三种插槽，React 三种对应传法（都在[JSX 页](/react/jsx)演示过，这里归纳）：

| Vue | React |
| --- | --- |
| `<slot>` 默认插槽 | `props.children` |
| `<slot name="x">` 具名插槽 | 约定 prop 收 JSX：`x={<Node/>}` |
| 作用域插槽 `<slot :row="r">` | 传"返回 JSX 的函数"prop（render prop） |

```jsx
// children：不具名的内容全进 children
function Panel({ title, children }) {
  return <section><h3>{title}</h3>{children}</section>;
}
<Panel title="设置"><ThemeForm /></Panel>   // <ThemeForm/> 就是 children
```

## 跨层：Context（≈ provide / inject）

深层组件不想逐层传 props（prop drilling），用 Context。对应 Vue 的 `provide`/`inject`：

```jsx
import { createContext, useContext, useMemo, useState } from 'react';

// 1. 建 Context
const ThemeContext = createContext('light');   // 参数是默认值

// 2. 父组件 Provider 提供值
function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Page />
    </ThemeContext.Provider>
  );
}

// 3. 任意深度后代消费
function ThemedButton() {
  const { theme, setTheme } = useContext(ThemeContext);
  return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
    当前：{theme}
  </button>;
}
```

### 消费 Context 的三种写法

| 写法 | 适用场景 | 备注 |
| --- | --- | --- |
| `useContext(Context)` | 组件里读值 | **默认选择**；遵守 Hook 规则：必须顶层无条件调用，不能放 `if` 里 |
| `use(Context)`（React 19+） | 需要在**条件分支 / 循环中**读取，或配合 Suspense | 读完可以提前 `return`，不受 Hook 规则约束 |
| `<Context.Consumer>` | 极少用 | class 组件时代的 render prop 写法，认识即可 |

```jsx
// 写法 1：useContext —— 顶层读取（不能放条件里）
const { theme } = useContext(ThemeContext);

// 写法 2：use（React 19+）—— 可以放在条件分支里，读完提前返回
function Toolbar({ showTheme }) {
  if (!showTheme) return null;
  const { theme } = use(ThemeContext);   // ✅ useContext 做不到这一点
  return <span>主题：{theme}</span>;
}

// 写法 3：Consumer —— 老写法，看到别人的代码能看懂就行
<ThemeContext.Consumer>
  {({ theme }) => <span>主题：{theme}</span>}
</ThemeContext.Consumer>
```

### value 传对象字面量：引用不稳定是隐形炸弹

上面的示例故意留了个坑：<span v-pre>`value={{ theme, setTheme }}`</span>。只要 `App` 因为**任何原因**重渲染一次，这个行内对象就是**新引用**，而 Context 只做 `Object.is` 引用比较——于是即使 `theme` 没变，**所有消费者也全部重渲染**。值一多、子树一大，这就是性能黑洞。

```jsx
// ❌ 每次渲染都是新对象，消费者全量重渲染
<ThemeContext.Provider value={{ theme, setTheme }}>

// ✅ 对策 1：useMemo 稳定引用 —— theme 不变时，value 始终是同一个对象
const value = useMemo(() => ({ theme, setTheme }), [theme]);
<ThemeContext.Provider value={value}>
```

```jsx
// ✅ 对策 2：读写拆成两个 Context —— 只订阅"读"的组件不会被"写"触发
const ThemeContext = createContext('light');
const ThemeSetContext = createContext(() => {});

function App() {
  const [theme, setTheme] = useState('light');
  return (
    <ThemeSetContext.Provider value={setTheme}>
      <ThemeContext.Provider value={theme}>
        <Page />
      </ThemeContext.Provider>
    </ThemeSetContext.Provider>
  );
}
// 需要改主题的组件只消费 ThemeSetContext（setTheme 引用稳定，几乎从不触发更新）
```

顺带两个高频坑：

- **默认值别随手写 `{}`**：没有匹配到 Provider 时，`useContext` 返回的是 `createContext` 的参数。默认值若是 `{}`，`const { theme } = useContext(...)` 静默解构出一堆 `undefined`，Bug 非常隐蔽。推荐默认值给 `null` 并在使用处判断，或干脆不传默认值，让"忘了包 Provider"尽早报错。
- **setter 本身引用稳定**：`useState` 返回的 setter 永远是同一个函数，所以"setter 单独放一个 Context、易变的值放另一个"是标准优化；同理，函数 props 用 `useCallback` 包一层再放进 `value` 对象，效果相同。

### 与 provide/inject 的关键差异：重渲染范围

Vue 的 `provide` 一个 reactive 对象，只有真正用到对应字段的组件会更新。React 的 Context：**`value` 一变，所有消费它的组件全部重渲染**（无法只订阅其中一部分）——这也是上面"对象字面量"与"拆 Context"两个问题的根源。

::: warning Context 不适合高频/大数据状态
一个每秒变N次的值放 Context，会让整棵消费子树跟着抖。对策：
1. **拆多个 Context**：把"稳定的值"和"频繁变的 setter"分开提供，或按主题拆细，缩小失效面。
2. 高频全局状态请交给**外部 store**（Zustand 等）——它们用"选择器订阅"让组件只在自己关心的片段变化时重渲染，正是 Context 缺的能力（见[状态管理](/react/state-management)）。
:::

React 19 起还有个语法糖：`<ThemeContext value={...}>` 可直接当 Provider 用（不必写 `.Provider`），配合 `use(ThemeContext)` 读取，写法更短，语义不变。

## 状态提升：最"React"的解法

Vue 里两个兄弟组件共享数据，你可能直接扔进 Pinia。React 更推荐**把共享 state 提到最近的共同父组件**，再各自以 props 下发、以回调上收——这叫 "lifting state up"：

```jsx
// 兄弟 A 输入、兄弟 B 显示：state 提到父
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

判断链：**能用 props/状态提升解决就别上 Context，能用 Context 就别引状态库。** 层级浅、共享少 → 提升；跨很多层且共享中等 → Context；全局、高频、多模块共享 → 状态管理库。

## 命令式：forwardRef + useImperativeHandle

Vue 里 `defineExpose` + 父用 `childRef.value.method()` 命令式调用子组件方法。React 函数组件默认没有"实例"可暴露，要做到这点得用 `forwardRef` 把 ref 透传到内部、`useImperativeHandle` 定制暴露的方法：

```jsx
import { forwardRef, useImperativeHandle, useRef } from 'react';

const MyInput = forwardRef(function MyInput(props, ref) {
  const inputRef = useRef(null);
  useImperativeHandle(ref, () => ({
    focus() { inputRef.current.focus(); },   // 只暴露这两个方法给父
    clear() { inputRef.current.value = ''; },
  }));
  return <input ref={inputRef} />;
});

// 父：
const ref = useRef(null);
<MyInput ref={ref} />
<button onClick={() => ref.current.focus()}>聚焦</button>
```

::: tip 少用为妙
命令式调用是"逃生舱"，多数场景应优先"把状态提到父、用 props 驱动"（数据驱动优于命令式）。真需要再上 `forwardRef`，典型如封装输入框暴露 `focus()`、封装动画暴露 `play()`。
:::

## 事件总线？基本不需要

Vue 项目常见 mitt 事件总线解耦跨组件通信。React 里因为数据流显式（props 下、回调上、全局走 store/context），几乎不用事件总线。硬要做，就用 `useSyncExternalStore` 接一个外部 emitter，但那已经是状态管理的范畴了。

## 下一步

- 全局状态选型（Zustand / Redux Toolkit / React Query）→ [状态管理](/react/state-management)
