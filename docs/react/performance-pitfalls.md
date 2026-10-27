# 性能与高频踩坑

> 前两节把 API 讲完了，这一节是"少踩坑指南"。分两半：上半讲 React 的性能模型——为什么它默认会"整棵子树重渲染"、memo 家族怎么配合；下半把 Vue 转 React 最高频的坑列成清单，每条给"症状 + 原因 + 解法"。建议收藏，遇到诡异现象回来查。

## React 的性能模型：重渲染是默认行为

先建立正确预期，否则优化无从谈起。

| | Vue | React |
| --- | --- | --- |
| 更新触发 | 响应式精确追踪：只有依赖某数据的节点更新 | state 变 → **该组件函数重执行，且默认连带所有子组件重执行** |
| 谁做决定 | 编译器 + 运行时自动 | 你（用 memo 家族手动划定边界） |
| 代价 | 你几乎不用管，Vue 已优化 | 大列表/深层树不优化会卡 |

一次渲染的判定链：**父组件重渲染 → 子组件默认也跟着重渲染**，除非你手动阻断。React 靠"引用比较"决定要不要跳过——所以优化的本质是**控制引用是否变化**。

## memo 家族：三件套如何配合

- `React.memo(Comp)`：**props 浅比较没变就跳过该组件重渲染**。≈ 让子组件"选择性响应父更新"。
- `useMemo(fn, deps)`：缓存一个值，deps 不变返回同一个引用。
- `useCallback(fn, deps)`：缓存一个函数引用。

三者要**配合**才有效——只 `memo` 了子组件，但父每次渲染传下去的函数/对象都是新引用，浅比较照样"变了"，memo 白做：

```jsx
import { memo, useCallback, useMemo } from 'react';

// 子：props 不变就跳过重渲染
const Row = memo(function Row({ onSelect, style }) {
  console.log('render row');
  return <div style={style} onClick={onSelect}>行</div>;
});

function List() {
  const [n, setN] = useState(0);
  // 不缓存的话，每次 List 重渲染，onSelect/style 都是新引用 → Row 的 memo 失效
  const onSelect = useCallback(() => select(), []);
  const style = useMemo(() => ({ color: 'red' }), []);
  return (
    <>
      <button onClick={() => setN(n + 1)}>{n}</button>
      <Row onSelect={onSelect} style={style} />   {/* 现在父 n 变化不再连累 Row */}
    </>
  );
}
```

::: tip 别条件反射地全包上
memo/useMemo/useCallback 本身有比较与缓存开销。**默认不优化**，用 React DevTools Profiler 定位到"确实因重渲染变慢"的组件，再针对性处理。过早 memo 化是新手最常见的负优化。React 18+ 的 **React Compiler**（构建期自动 memo）正是为免除这套手工活而生，但需接入编译工具链。
:::

## 其它性能手段

- **长列表虚拟化**：上千行只渲染可视区。`react-window` / `@tanstack/react-virtual`（Vue 生态是 vue-virtual-scroller）。
- **代码分割**：`React.lazy` + `<Suspense>` 按路由/按需拆包（见[路由](/react/router)）。
- **`useTransition` / `useDeferredValue`**：把"重渲染很慢"的更新标记为可中断的低优先级，保住输入框不卡（如大列表实时过滤）。
- **key 用稳定 ID**：让 diff 能复用节点，别用 index（既是性能问题也是正确性问题）。
- **状态最小化 + 就近**：state 放在真正需要它的最低层组件，减少无谓的重渲染范围。

## Vue 转 React 高频踩坑清单

::: danger 逐条对照，中过哪条心里有数
1. **原地改 state → 视图不动**
   症状：`list.push(x)` 后界面不更新。原因：引用没变，React 跳过。解法：换新对象/数组（`[...list, x]`），或用 immer。见[组件与状态](/react/components-state)。

2. **stale closure：异步/定时器里读到旧 state**
   症状：`setInterval` 里 `count` 永远是初始值。原因：回调闭包捕获了某次渲染的快照。解法：函数式更新 `setC(p=>...)`、把值补进 effect 依赖、或塞进 `useRef`。见 [Hooks](/react/hooks)。

3. **依赖数组漏写或多写**
   漏写 → 上面那条；把不稳定对象写进去 → effect 无限重跑。解法：听 `eslint-plugin-react-hooks` 的话，别乱 disable。

4. **在渲染里做副作用 → 死循环**
   症状：组件函数体里直接 `fetch`/`setState`/改 DOM，无限重渲染或报错。解法：副作用进 `useEffect`；派生值直接算不要 setState。

5. **条件/循环里调 hook**
   症状：`if (x) useState(...)` 报 "rendered fewer hooks"。原因：hook 靠调用顺序对号。解法：hook 一律顶层，条件逻辑写在 hook 之外。

6. **`onClick={fn()}` 立即执行**
   症状：一渲染就触发、或报 handler 不是函数。解法：传引用 `onClick={fn}`，要传参用 `onClick={() => fn(a)}`。

7. **setState 后立刻读新值**
   症状：`setCount(1); log(count)` 打印旧值。原因：state 是渲染快照。解法：函数式更新；要"更新后做事"用 `useEffect([count])`。

8. **把 useRef 当响应式变量**
   症状：改了 `ref.current` 页面不更新。原因：它本就不触发渲染。解法：驱动 UI 的值用 `useState`，`ref` 只做命令式引用/旁路存储。

9. **key 用数组 index**
   症状：列表增删/排序后输入框内容错位、动画乱。解法：用数据自带的稳定唯一 id。

10. **Context 放高频/大对象 → 全子树抖动**
    症状：一个值频繁变导致大量无关组件重渲染。原因：Context 值变，所有消费者强制更新。解法：拆细 Context，或改用带选择器订阅的外部 store。见[组件通信](/react/communication)。

11. **StrictMode 下 effect 跑两遍以为 bug**
    症状：开发时请求/日志打印两次。真相：故意的，用来暴露缺失的 cleanup。解法：写对 cleanup，别加锁去重。生产不双跑。

12. **表单/列表每次渲染新建函数导致 memo 失效**
    症状：给 memo 子组件传 `onClick={() => ...}` 内联箭头，子组件照样重渲染。解法：`useCallback` 稳定引用，或把不变逻辑移出。

13. **把 Vue 的"大 store 一把梭"照搬过来**
    症状：Redux/Context 里塞满接口缓存数据，还手动管 loading/error。解法：服务端数据交给 React Query，全局 store 只放真正的客户端 UI 状态。见[状态管理](/react/state-management)。
:::

## 调试工具

- **React DevTools**（浏览器扩展）：看组件树、props/state、以及 **Profiler 面板**录制每次渲染耗时、高亮"为什么重渲染"。对应 Vue DevTools。
- **eslint-plugin-react-hooks**：把依赖数组、hook 调用规则类错误在编码期拦下，必装。
- **why-did-you-render**（开发环境）：运行时打印"某组件因哪个 prop 变化而重渲染"，定位 memo 失效利器。

## 回到入口

- 复习整体迁移地图 → [React 知识库入口](/react/)
- 具体主题深入 → [JSX](/react/jsx) · [组件与状态](/react/components-state) · [Hooks](/react/hooks) · [组件通信](/react/communication) · [路由](/react/router) · [状态管理](/react/state-management)
