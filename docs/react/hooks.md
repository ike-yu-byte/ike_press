# Hooks 详解

> Hook 是 React 区别于 Vue 的最大体感差异点。Vue 的组合式函数（composable）是"可选的复用手段"，而 React 的 Hook 是"用函数的同时必须遵守的调用规则"。这一页把最常用的几个 Hook 逐个和 Vue 概念对齐，重点讲**依赖数组**和**闭包陷阱**——Vue 转 React 九成的诡异 bug 都出在这。

## 为什么需要 Hook

函数组件本身是"纯计算：props → JSX"，没有地方安放"状态""副作用""引用"这些需要跨渲染存活的东西。Hook 就是给函数组件开的"外挂存储槽"——React 在背后按**调用顺序**为每个组件实例维护一串槽位，`useState`/`useEffect` 等就是往这串槽位里存取。

由此推出 Hook 的铁律：

::: danger 只能在顶层调用，不能进条件/循环/回调
```jsx
if (ready) { const [x, setX] = useState(0); }   // ✗ 报错/行为错乱
list.forEach(() => { useEffect(...); });         // ✗
```
因为 React 靠"第 N 个 hook 调用"对号入座。一旦某次渲染少调/多调/换序，槽位全部错位。ESLint 插件 `eslint-plugin-react-hooks` 必装，它会直接标红这类写法。Vue 的 composable 没这限制，这是从 Vue 来的人最容易忽略的规则。
:::

## useState / useReducer：状态

`useState` 见[组件与状态](/react/components-state)。当状态更新逻辑复杂（多个子状态互相关联、有固定几种动作）时，用 `useReducer`，它等价于 Vue 里你手写的多个 ref + 函数，但把"怎么变"集中到一处，神似 Vuex/Pinia 的 action：

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
      <button onClick={() => dispatch({ type: 'reset' })}>重置</button>
    </>
  );
}
```

## useEffect：副作用（生命周期 + watch 的合体）

Vue 把"何时跑"拆成 `onMounted` / `onUnmounted` / `watch` / `watchEffect` 好几个 API；React 全塞进一个 `useEffect`，靠**第二个参数（依赖数组）** 决定行为：

```jsx
useEffect(() => {
  // effect 体：在"渲染提交到 DOM 之后"执行
  const timer = setInterval(tick, 1000);

  return () => {
    // 清理函数：在下一次 effect 运行前、以及组件卸载时执行
    clearInterval(timer);
  };
}, /* 依赖数组 */);
```

三种形态对照 Vue：

| 意图 | React | Vue 等价 |
| --- | --- | --- |
| 只在挂载后跑一次 | `useEffect(fn, [])` | `onMounted(fn)` |
| 某依赖变了就重跑 | `useEffect(fn, [userId])` | `watch(userId, fn)` |
| 每次渲染后都跑（自动追踪） | `useEffect(fn)`（省略第二参） | `watchEffect(fn)` |
| 卸载时清理 | effect 返回的 cleanup + `[]` | `onUnmounted(fn)` |

### 依赖数组：第一大坑

effect 里用到的**所有**外部响应式值（props、state、组件内派生的变量/函数）都该出现在依赖数组里。漏了 → 闭包捕获旧值（stale closure）；多了不稳定的对象/函数 → 疯狂重跑。

```jsx
const [count, setCount] = useState(0);   // count 是组件里的一个 state

// ✗ 漏依赖：日志永远打印第一次的 count
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000); // count 被冻结
  return () => clearInterval(id);
}, []);   // 该写 [count]，或改用函数式更新

// ✓ 方案 A：把 count 加进依赖，每次变了重建定时器
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, [count]);

// ✓ 方案 B：不依赖具体值时用函数式更新
const [n, setN] = useState(0);           // n 也是 state，只是不直接读它的值
useEffect(() => {
  const id = setInterval(() => setN(prev => prev + 1), 1000); // 不需要 n 在依赖里
  return () => clearInterval(id);
}, []);
```

::: warning 把对象/数组/函数写进依赖 = 每次渲染都是新引用 = 无限循环
先看陷阱怎么形成的：

```jsx
function Article() {
  const [text, setText] = useState('');
  const opts = { page: 1 };                     // ① 每次渲染都重新执行这行 → 一个全新对象
  useEffect(() => { fetchData(opts); }, [opts]); // ② React 只比引用：新对象 ≠ 旧对象 → 判定"变了"
}
```

循环链条：渲染 → ② 发现引用变了 → 跑 effect → effect 里往往有 `setText` 之类的更新 → 触发新渲染 → ① 又造出新对象 → ② 又"变了" → 再跑 effect…… 只要 effect 里有任何 state 更新，就是无限循环；即便不循环，effect 也会白白在每次渲染都重跑一遍。

根本原因一句话：**React 判断依赖变没变只用 `Object.is`（基元比值，对象/数组/函数只比引用），不看内容。** Vue 的 `watch` 对响应式对象能感知内部变化，所以同样写法没这毛病。

三条出路，各自配代码：

**方案 1：拆到基本类型**——依赖只写真正关心的字段（最常用）：

```jsx
const opts = { page: 1 };   // page 在这里是写死的字面量，opts.page 取出来就是基元 number
useEffect(() => { fetchData({ page: opts.page }); }, [opts.page]);  // number 比的是值，不变就不跑
```

**方案 2：useMemo 稳定引用**——对象确实要整体传时，缓存它：

```jsx
const [page, setPage] = useState(1);             // page 是组件的 state
const opts = useMemo(() => ({ page }), [page]);  // 只有 page 变时才产生新对象（{ page } 是 { page: page } 的简写）
useEffect(() => { fetchData(opts); }, [opts]);   // 现在引用稳定，比较结果符合直觉
```

**方案 3：把易变的东西挪进 effect 内**——它根本不当依赖，引用再新也无所谓：

```jsx
const [page, setPage] = useState(1);   // 同样来自 state
useEffect(() => {
  const opts = { page };      // 在 effect 里现造，不出现在依赖数组
  fetchData(opts);
}, [page]);                   // 依赖只剩基元
```

选择顺序：能拆基元就拆（方案 1）；对象字段多、确实整体变化才有意义时用 useMemo（方案 2）；对象/函数只是 effect 内部的一次性临时值时直接挪进去（方案 3）。共同心法：**依赖数组里只放"它变了才该重跑"的值，且这些值要嘛是基元、要嘛引用稳定。**
:::

::: info StrictMode 双跑不是 bug
开发模式下 React 会故意把 effect 执行→清理→再执行跑两遍，用来暴露"清理没写全"的问题。别为此加去重锁，正确做法是把 cleanup 写对（如上例 `clearInterval`）。生产构建不会双跑。
:::

### 数据请求怎么取消

Vue 里你可能用 `AbortController` + `onUnmounted`。React 同款，放 effect 的 cleanup 里：

```jsx
useEffect(() => {
  const ctrl = new AbortController();
  fetch(`/api/user/${id}`, { signal: ctrl.signal })
    .then((r) => r.json())
    .then(setUser)
    .catch((e) => { if (e.name !== 'AbortError') setError(e); });
  return () => ctrl.abort();     // 依赖变了或卸载时取消上一次请求
}, [id]);
```

（实际项目这类逻辑交给 React Query，见[状态管理](/react/state-management)，不必手写。）

## useRef：DOM 引用 + 跨渲染可变盒子

名字叫 ref，但**和 Vue 的 `ref()` 语义几乎无关**。它给你一个 `{ current: 值 }` 对象，改 `.current` **不触发渲染**，且这个盒子跨渲染保持同一个。两大用途：

```jsx
// 用途 1：拿 DOM/组件实例（≈ Vue 的 template ref）
const inputRef = useRef(null);
useEffect(() => { inputRef.current.focus(); }, []);
return <input ref={inputRef} />;

// 用途 2：存"变了也不用重渲染"的可变值（定时器 id、上一次的 props、挂载标记）
const timerId = useRef(0);
const mounted = useRef(false);
useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
```

::: danger 别在 render 期间读/写 ref.current 来算 UI
`useRef` 的值改变不会触发重渲染，所以在渲染函数里根据 `ref.current` 决定显示什么，可能读到旧值且不更新。渲染要用的值请用 `useState`；`ref` 只用于"命令式操作"和"副作用里读写的旁路数据"。
:::

对照表：

| 需求 | Vue | React |
| --- | --- | --- |
| 响应式局部状态 | `ref(0)` | `useState(0)` |
| 拿 DOM 元素 | template `ref` | `useRef` + `ref` 属性 |
| 存不触发渲染的可变值 | 普通 `let`（在 setup 里天然跨渲染存活） | `useRef`（函数组件没有 setup 那种"只跑一次的闭包"，必须借 ref） |

## useMemo / useCallback：缓存值 / 稳定引用

- `useMemo(fn, deps)`：deps 不变就不重算，返回缓存值。**近似 `computed` 的缓存，但没有响应式追踪**——deps 变了不会主动通知谁，只是下次渲染时省一次计算。
- `useCallback(fn, deps)`：等价于 `useMemo(() => fn, deps)`，返回**同一个函数引用**，用于把稳定的回调传给 `memo` 子组件。

```jsx
const total = useMemo(() => items.reduce((s, x) => s + x.price, 0), [items]);
const onAdd = useCallback((id) => addItem(id), []);
```

::: tip 默认别包，卡了再包
memo 化本身有开销（比较 deps、多一层缓存）。React 官方态度：先不优化，用 Profiler 确认某处真的因重渲染变慢，再针对性 `useMemo`/`useCallback`/`memo`。Vue 转来的人常犯的错是"给每个派生值和回调都套上"，既增加心智负担又未必更快。派生值多数直接算即可（见[组件与状态](/react/components-state)）。
:::

## 自定义 Hook：把有状态逻辑抽成函数

和 Vue 的 composable 概念几乎一模一样——命名以 `use` 开头，内部可再调别的 hook，返回你想复用的东西：

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

// 组件里
const [theme, setTheme] = useLocalStorage('theme', 'light');
```

更多常见自研 hook 与 Vue 对照：

| 自定义 Hook | 干什么 | Vue 里的对应 |
| --- | --- | --- |
| `useWindowSize()` | 监听窗口尺寸 | `useElementSize` / `@vueuse` |
| `useInterval(cb, ms)` | 声明式定时器 | `@vueuse` 的 `useIntervalFn` |
| `useDebounce(value, ms)` | 防抖值 | `refDebounced` |
| `useMediaQuery(q)` | 响应式媒体查询 | `useMediaQuery` |

::: warning 自定义 hook 也受"顶层调用"约束
它在组件渲染时执行，内部 hook 的调用顺序同样要稳定。别在自定义 hook 里写条件调用别的 hook。
:::

## 其它值得知道的

- **useLayoutEffect**：和 `useEffect` 一样，但在 DOM 变更后、浏览器绘制前**同步**执行。用于"读布局再同步改 DOM 防闪烁"（如测量尺寸）。日常副作用优先 `useEffect`。
- **useId**：生成 SSR 稳定的唯一 id（表单 label 关联用）。
- **useSyncExternalStore**：把外部 store（第三方状态库、浏览器 API）接进 React 并保证一致订阅——Zustand/Redux 底层就是它，你一般不直接用。
- **useTransition / useDeferredValue**（React 18 并发）：把"大列表过滤"这类更新标记为低优先级，保持输入框响应。对应 Vue 无直接物。

## 生命周期速查（Class 时代 → Hook）

Vue 有一串 `onBeforeMount/onMounted/onBeforeUpdate/onUpdated/onUnmounted`；函数组件里基本都归一到 `useEffect`：

| 时机 | Hook 写法 |
| --- | --- |
| 挂载后 | `useEffect(fn, [])` 首次执行 |
| 卸载前 | `useEffect` 的 cleanup |
| 更新后（每次渲染后） | `useEffect(fn)` 不传依赖 |
| 特定值变化后 | `useEffect(fn, [dep])` |
| beforeUpdate / 渲染期间 | 直接在组件函数体里写（渲染即执行） |

## 下一步

- 组件间数据怎么传、Context 怎么用 → [组件通信](/react/communication)
- 重渲染到底何时发生、memo 家族怎么配合 → [性能与高频踩坑](/react/performance-pitfalls)
