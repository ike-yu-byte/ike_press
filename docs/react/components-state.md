# 组件与状态

> Vue 3 组合式 API 已经让"组件 = 一个 setup 函数"，和 React 的函数组件很像了。但两者有一个根本分歧：**Vue 的 setup 只跑一次，靠响应式系统精确更新；React 的组件函数会被反复重新执行，靠"换新 state"触发重渲染。** 这一页讲透组件定义、props、以及 React 独有的"不可变状态"心智。

## 组件就是一个返回 JSX 的函数

Vue SFC：

```vue
<script setup>
defineProps({ title: String });
</script>
<template><h1>{{ title }}</h1></template>
```

React：不需要单独文件、不需要 `<template>`，函数即组件，首字母必须大写：

```jsx
function Greeting({ title }) {       // props 通过参数解构拿到
  return <h1>{title}</h1>;
}

// 也可写成箭头函数
const Greeting = ({ title }) => <h1>{title}</h1>;
```

一个文件想放几个组件就放几个，小的辅助组件常和被包裹的组件同文件：

```jsx
function Badge({ count }) {
  return count > 0 ? <span className="badge">{count}</span> : null;
}

export default function CartButton({ items, onCheckout }) {
  return (
    <button onClick={onCheckout}>
      结算 <Badge count={items.length} />
    </button>
  );
}
```

::: info 最重要的一条认知：函数会被反复执行
Vue 的 `setup()` 在一个组件实例的生命周期里**只运行一次**。React 函数组件**每次要更新就整个重新运行一遍**——从第一行到 return。这带来三个直接后果，贯穿后续所有优化话题：

1. 组件里 `const fn = () => {}`、`const arr = []` 每次渲染都是**全新引用**；
2. 没有"初始化时跑一次"的代码位置——一次性副作用要放 `useEffect(fn, [])`；
3. 需要跨渲染保留的可变值（定时器 id、上一次 props）不能放局部变量，要放 hook（`useRef`/`useState`）。
:::

## Props：只读、单向、无响应式

| 维度 | Vue | React |
| --- | --- | --- |
| 声明 | `defineProps<{...}>()` / 对象 | 函数参数解构（TS 可加类型） |
| 默认值 | `withDefaults` | 解构默认值 `({ size = 'md' })` |
| 校验 | `PropTypes` / TS | 主要靠 TS；运行时校验用 `prop-types`（已少见） |
| 可变性 | props 只读（改了告警） | props 只读（改了不报错但无效，它是普通对象） |
| 响应式 | props 是 reactive，解构会丢响应式 | props 是**本次渲染的快照**，本来就没有响应式一说 |
| 透传多层 | `$attrs` / provide | 逐层传，或 `{...rest}` 展开，或上 Context |

```jsx
function Avatar({ src = '/def.png', size = 'md', alt }) {
  const px = size === 'md' ? 40 : 24;
  return <img src={src} width={px} height={px} alt={alt || ''} />;
}
```

::: warning 解构 props 后放进异步回调 = 捕获快照
```jsx
function Panel({ count }) {
  useEffect(() => {
    const t = setInterval(() => {
      console.log(count);   // 永远是这个 effect 建立那次渲染的 count
    }, 1000);
    return () => clearInterval(t);
  }, []);   // ← 漏了 [count] 就会 stale，见 Hooks 页
}
```
Vue 里 `props.count` 是响应式的，异步里读也能拿到最新；React 里 `count` 是个普通常量，异步回调闭包住旧值。这是心智差异最大的点之一。
:::

## 事件：子传父就是"调用父传下来的函数"

Vue 用 `defineEmits` 声明自定义事件；React 没有事件系统给组件用，**父组件把一个回调当 prop 传下来，子组件在合适时机调用它**：

Vue：

```vue
<!-- 子 -->
<script setup>
const emit = defineEmits(['add']);
</script>
<button @click="emit('add', 1)">+1</button>
<!-- 父 -->
<Child @add="onAdd" />
```

React：

```jsx
// 子：收到 onAdd 就调用它
function AddButton({ onAdd }) {
  return <button onClick={() => onAdd(1)}>+1</button>;
}

// 父：把处理函数传下去（命名习惯 onXxx）
function Parent() {
  const [n, setN] = useState(0);
  return <AddButton onAdd={(v) => setN((x) => x + v)} />;
}
```

## useState：局部状态

Vue 的 `ref` 对应 React 的 `useState`：

```jsx
const [count, setCount] = useState(0);        // 初始值
const [user, setUser] = useState({ name: '', age: 0 });
const [list, setList] = useState(() => heavyInit());  // 惰性初始化：函数只在建 state 时跑一次
```

对照 `ref`：

| 操作 | Vue | React |
| --- | --- | --- |
| 读 | `count.value` | `count`（直接就是值） |
| 写 | `count.value = 5` | `setCount(5)` |
| 基于旧值 | `count.value++` | `setCount(c => c + 1)` |
| 一个对象管一组 | `reactive({...})` 改字段 | 一个 state 一个值；对象要整体换 |

::: tip 一个 useState 只管一个值
Vue 里你习惯 `reactive` 一个对象管一组相关状态；React 惯例是**拆成多个独立 useState**（`const [x,setX]` `const [y,setY]`）。非要放一个对象里，更新时得手动展开（见下节），比较累，除非字段确实高度耦合（如表单）。
:::

## 不可变数据：React 的铁律

React 靠"引用是否变化"判断要不要更新。原地改对象/数组，它检测不到，视图不动：

```jsx
const [user, setUser] = useState({ name: 'yu', tags: ['a', 'b'] });
const [list, setList] = useState([{ id: 1, done: false }]);

// ✗ Vue 习惯：改了，但视图不更新（引用没变，React 跳过）
user.name = 'new';
setUser(user);
list.push({ id: 2 });
setList(list);

// ✓ 对象：展开换新
setUser({ ...user, name: 'new' });

// ✓ 嵌套一层：逐层展开
setUser({ ...user, tags: [...user.tags, 'c'] });

// ✓ 数组增
setList([...list, { id: 2, done: false }]);
// ✓ 数组删
setList(list.filter((x) => x.id !== 1));
// ✓ 数组改某项（找到后换那个元素）
setList(list.map((x) => (x.id === 1 ? { ...x, done: true } : x)));

// ✓ 函数式更新：基于最新 prev 算，避免连续 set 互相覆盖
setCount((prev) => prev + 1);
```

::: danger 深层嵌套展开很痛苦，用 immer
<span v-pre>`{...a, b: {...a.b, c: [...a.b.c]}}`</span> 这种三层展开极易写错。上 <a href="https://immer.pages.dev/" target="_blank" rel="noopener noreferrer">immer</a> 的 `produce`，就能像 Vue 那样"直接改"，immer 在背后帮你生成新对象：
```jsx
import { produce } from 'immer';
setUser(produce((draft) => { draft.tags.push('c'); }));   // 写起来像 mutation，实为不可变
```
:::

## 没有 nextTick：批处理与"读不到最新 state"

Vue 里 `count.value++; await nextTick(); 看 DOM`。React 里两件事不同：

1. **自动批处理**：React 18 起，同一事件/异步回调里多次 `setX` 会合并成一次渲染，不是每 set 一次渲染一次。
2. **state 是渲染快照**：`setCount(1); console.log(count)` 打印的仍是**本次渲染的旧值**——`count` 这个常量在本次函数执行里根本不会变。想基于旧值算就用函数式更新；想在"值真的更新并重新渲染后"做事，用 `useEffect` 监听。

```jsx
function incrementThrice() {
  setCount(count + 1);   // 三次都基于同一个旧 count
  setCount(count + 1);
  setCount(count + 1);   // 结果：只 +1！
}
function incrementThriceRight() {
  setCount(c => c + 1);  // 函数式：基于最新 prev 排队
  setCount(c => c + 1);
  setCount(c => c + 1);  // 结果：+3 ✓
}
```

先说破最容易迷惑的一点：这里的 `count` **不是** Vue 里那种"响应式变量"。真正的状态存在 React 内部的"存储槽"里，`count` 只是本次渲染时从槽里取出、复制给函数的一个**普通常量**（`const` 声明，JS 层面就不可变）。所以 `setCount(新值)` 从头到尾没碰过 `count`，它做两件事：把新值写进 React 内部的槽 + 申请一次重渲染。

拿最常见的疑问——"为什么 set 三次后打印 count 还是旧值"——逐帧推一遍：

```jsx
const [count, setCount] = useState(0);   // 本次渲染：count = 0（一个普通常量）

function handleClick() {
  console.log(count);   // ① 打印 0
  setCount(1);          // ② 新值 1 写进 React 内部的槽，并申请重渲染
  console.log(count);   // ③ 还是 0 —— count 是 const，没有任何代码能改它
}
// 事件处理函数跑完，React 才重新执行整个组件函数
// 新一轮执行里 useState 从槽里取出 1，得到一个全新的常量：count = 1
```

看清了吗：`setCount` 之后要**等整个函数跑完、组件重新执行**，才会有一个新的 `count`；当前这次执行里的 `count` 永远定格在渲染那一刻。

那 React 为什么要把设计定成"快照"而不是"实时"？做个思想实验：假如 `setCount(1)` 真能立刻把 `count` 变成 1，那在同一个点击函数里——前半段代码看到的 `count` 是 0，后半段看到的是 1，`if (count > 0)` 的结果取决于你把它写在第几行，界面显示哪份数据也取决于代码顺序。同一份状态在一次事件里有两个"事实"，bug 将无法追踪。快照设计强制"**一次渲染 = 一份固定数据**"，diff 才有稳定的比较基准，这就是官方文档那句 *state is a read-only snapshot during rendering*。

三个高频困惑场景，中英对照 Vue 写法：

**场景 1：set 完立刻读，读到的还是旧值**

```jsx
function Counter() {
  const [count, setCount] = useState(0);

  function handleClick() {
    setCount(1);
    console.log(count);        // 打印 0，不是 1！count 是本次渲染快照
    alert(`当前 count = ${count}`);   // 用户看到的也是 0
  }

  return <button onClick={handleClick}>+1</button>;
}
```

Vue 里你习惯了"改完紧接着读"，因为 `count.value` 永远是最新值：

```js
const count = ref(0);
count.value = 1;
console.log(count.value);      // 1，响应式代理实时反映最新值
```

React 想"值真的更新后做事"，用 `useEffect` 监听（相当于 Vue 的 `watch`）：

```jsx
useEffect(() => {
  document.title = `count 现在是 ${count}`;   // 每次 count 更新并重渲染后执行，这里才是新值
}, [count]);
```

**场景 2：连续 set 基于旧值算，互相覆盖**（上面 incrementThrice 的成因）

```jsx
// 点击前 count = 0
setCount(count + 1);   // 0+1=1，排队
setCount(count + 1);   // 还是 0+1=1，把上一个覆盖掉了
setCount(count + 1);   // 又是 1 —— 最终只显示 1，不是 3

// 解法：函数式更新，React 会把多个 updater 按顺序排队逐个算
setCount(c => c + 1);  // 1
setCount(c => c + 1);  // 2
setCount(c => c + 1);  // 3 ✓
```

**场景 3：异步回调里读 state，读到的是"发起那一刻"的快照**（stale closure，详见 [Hooks](/react/hooks)）

```jsx
function Timer() {
  const [count, setCount] = useState(0);

  function go() {
    setTimeout(() => {
      console.log(count);        // 永远是点击那一刻的值，之后 count 再更新也看不到
      setCount(count + 1);       // 危险：基于旧快照算，可能覆盖别人的更新
    }, 1000);
  }

  return <button onClick={go}>1 秒后 +1</button>;
}
```

解法同上一条：要"算"用函数式 `setCount(c => c + 1)`；要"读最新值备用"塞进 `useRef`；要"更新后做事"用 `useEffect`。

## 派生状态：直接算，别急着 useMemo

Vue 用 `computed` 缓存派生值。React 里**多数派生值直接现算就行**——组件本来就每次重渲染，算一次很便宜：

```jsx
function Cart({ items }) {
  const total = items.reduce((s, x) => s + x.price, 0);  // 直接算，不用 computed
  const count = items.length;
  return <div>{count} 件，共 {total} 元</div>;
}
```

只有当"计算真的很重"或"结果要作为稳定引用传给 memo 子组件"时，才用 `useMemo`（见 [Hooks 详解](/react/hooks)）。**不要条件反射地给每个派生值套 useMemo**，那是 React 新手最常见的过度优化。

## 条件渲染与列表（回顾）

组件级"无数据不渲染"用提前 return；局部条件用 `&&`/三元；列表用 `map`——详见 [JSX 与模板语法](/react/jsx)。这里只强调一点：React 没有 `v-show`，"隐藏但保留状态"就渲染出来用 <span v-pre>`style={{ display:'none' }}`</span>，这恰好也是 KeepAlive 的替代思路。

## 表单：受控组件范式

React 表单的"标准姿势"是每个输入框绑一个 state：

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
      <button type="submit">登录</button>
    </form>
  );
}
```

这就是 React 版 `v-model`。复杂表单（大量字段、校验、联动）手写很累，用 `react-hook-form`（对应 Vue 的 VeeValidate）。

## 下一步

- `useEffect` / `useRef` / `useMemo` / 自定义 Hook → [Hooks 详解](/react/hooks)
- 组件间怎么传数据、Context 干什么 → [组件通信](/react/communication)
