# 状态管理

> Vue 里全局状态几乎等于 Pinia——官方推荐、API 统一。React 没有官方 store，生态是一堆各擅胜场的库，**选型本身就是 Vue 转 React 的第一道选择题**。这一页给出"和 Pinia 的相似度"排序、每个库的心智，以及一条最重要的现代共识：**把"服务端数据"和"客户端全局状态"分开管**。

## 先别急着上库

React 的默认答案不是某个库，而是这套优先级：

1. **局部 `useState`** —— 只有一个组件用，就别往外放。
2. **状态提升** —— 几个相邻组件共享，提到共同父（见[组件通信](/react/communication)）。
3. **Context** —— 跨多层、低频变化的值（主题、登录用户、语言）。
4. **外部 store** —— 全局、高频、多模块共享，才引库。
5. **React Query** —— 凡是"从后端拿来的数据"，无论大小，都优先交给它，而不是塞进上面的全局 store。

Vue 转来的人常犯的错是"把 Pinia 里那一坨（含接口数据）原样搬进 Redux"。React 社区早已把**服务端状态**单拆出去了，这是最重要的观念更新。

## 全景对照表

| 库 | 心智模型 | 和 Pinia 的关系 | 适合 |
| --- | --- | --- | --- |
| **Zustand** | hook 式、无 Provider、选择器订阅 | **最接近 Pinia 的上手体验**，轻量首选 | 中小到大型，怕 Redux 样板的 |
| **Redux Toolkit** | 中心化、action/reducer、单向数据流、DevTools | 像 Vuex 的加强版（样板更多） | 大型/多人协作/要严格规范与时间旅行调试 |
| **Jotai** | 原子式，自底向上，多个小状态各自订阅 | 像"很多个极小 Pinia store" | 状态零散、想要细粒度订阅 |
| **Recoil** | 原子式（Facebook 出品） | 类似 Jotai，但已基本停止维护 | 新项目不推荐 |
| **MobX + mobx-react-lite** | 响应式对象，`makeAutoObservable` | **竟然最像 Vue 的 reactive**，改对象自动更新 | 想要 Vue 那种响应式手感的人 |
| **TanStack Query (React Query)** | 服务端状态：缓存/请求去重/失效/重试 | Vue 有同款 `@tanstack/vue-query` | 只要有后端数据就该用 |

## Zustand：Pinia 迁移首选

一个 `create` 得到 hook，没有 Provider、没有 reducer 样板，改状态用 `set`（内部帮你处理不可变）。选择器 `(s) => s.xxx` 让组件只订阅自己关心的片段，天然避免全量重渲染。

```jsx
import { create } from 'zustand';

const useCart = create((set, get) => ({
  items: [],
  add: (item) => set((s) => ({ items: [...s.items, item] })),   // 记得换新数组
  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
  clear: () => set({ items: [] }),
  total: () => get().items.reduce((s, x) => s + x.price, 0),    // 需要现算的方法
}));

function CartView() {
  const items = useCart((s) => s.items);       // 只订阅 items，别的字段变不重渲染
  const add = useCart((s) => s.add);
  return (
    <div>
      {items.map((x) => <li key={x.id}>{x.name}</li>)}
      <button onClick={() => add({ id: 1, name: '书', price: 30 })}>加</button>
    </div>
  );
}
```

对照 Pinia：`create((set)=>({...}))` ≈ `defineStore(()=>({...}))`；`set` ≈ 直接改 state；选择器 ≈ `storeToRefs` + 按需取。

**异步、持久化、让 Redux DevTools 识别——三个高频问题一次说清：**

```jsx
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

const useCart = create(
  devtools(                                          // ③ 让 Redux DevTools 插件能识别
    persist(
      (set, get) => ({
        items: [],
        loading: false,

        // ① 异步：action 直接写 async，像 Pinia 的 action 一样发请求
        fetchItems: async () => {
          set({ loading: true }, false, 'cart/fetchStart');   // 第 3 参给 action 命名，DevTools 里可读
          try {
            const data = await fetch('/api/items').then((r) => r.json());
            set({ items: data, loading: false }, false, 'cart/fetchDone');
          } catch {
            set({ loading: false }, false, 'cart/fetchError');
          }
        },

        add: (item) => set((s) => ({ items: [...s.items, item] }), false, 'cart/add'),
      }),
      {
        // ② 持久化：自动写 localStorage，刷新不丢
        name: 'cart-storage',                               // storage key
        partialize: (s) => ({ items: s.items }),            // 只存 items，函数/loading 不进 storage
        // storage: createJSONStorage(() => sessionStorage) // 想换 sessionStorage 时
      }
    ),
    { name: 'CartStore' }                    // Redux DevTools 里显示的 store 名
  )
);

// 组件里：const fetchItems = useCart((s) => s.fetchItems); fetchItems();  // 直接调
```

- **异步**：Zustand 没有 thunk 概念——action 本身就能是 `async` 函数，`await` 接口后 `set` 即可，写法和 Pinia 的 action 一致；错误处理就是普通的 `try/catch`。
- **持久化**：`persist` 中间件自动读写 `localStorage`（≈ `pinia-plugin-persistedstate`）；一定要用 `partialize` 把函数、`loading` 之类的临时态排除掉，只存需要恢复的数据；跨 tab 同步可另配 `storage` 事件监听。
- **让 Redux DevTools 识别**：只装浏览器插件是**看不到** Zustand 状态的——必须包一层 `devtools()` 中间件；之后每个 `set` 都作为一条 action 出现在时间线里（用 `set` 的第 3 个参数给 action 命名），支持跳转/回放。这是调试增强，不装也不影响功能。

## Redux Toolkit：大项目的规范之选

RTK 把 Redux 的样板砍掉一大半：`createSlice` 里你可以"看起来在改"（内部用 immer 生成新对象），action 自动创建。心智仍是**单一 store + 派发 action + 选择器读取**：

```jsx
import { configureStore, createSlice } from '@reduxjs/toolkit';
import { useSelector, useDispatch } from 'react-redux';

const counter = createSlice({
  name: 'counter',
  initialState: { value: 0 },
  reducers: {
    inc: (s) => { s.value += 1; },        // 看着像 mutation，immer 帮你变不可变
    addBy: (s, action) => { s.value += action.payload; },
  },
});

const store = configureStore({ reducer: { counter: counter.reducer } });
const { inc, addBy } = counter.actions;

// 组件里
function Counter() {
  const value = useSelector((s) => s.counter.value);   // 选择器订阅
  const dispatch = useDispatch();
  return <button onClick={() => dispatch(addBy(5))}>{value}</button>;
}
```

和 Pinia/Vuex 的对应：`createSlice.reducers` ≈ actions+mutations 合体；`dispatch(action)` 一致；`useSelector` ≈ `mapState`/`storeToRefs`。学习曲线比 Zustand 陡，但规范和 DevTools（action 回放、时间旅行）是它的价值。

**异步、持久化、DevTools 三个高频问题：**

```jsx
// ① 异步：reducers 必须是纯函数，接口请求写在 createAsyncThunk 里
import { createAsyncThunk } from '@reduxjs/toolkit';

const fetchItems = createAsyncThunk('items/fetch', async (arg, { rejectWithValue }) => {
  const res = await fetch('/api/items');
  if (!res.ok) return rejectWithValue('接口异常');   // 走 rejected 分支
  return res.json();                                 // 返回值 = fulfilled 的 action.payload
});

const itemsSlice = createSlice({
  name: 'items',
  initialState: { list: [], loading: false },
  reducers: {},
  extraReducers: (builder) => builder
    .addCase(fetchItems.pending,   (s) => { s.loading = true; })
    .addCase(fetchItems.fulfilled, (s, a) => { s.loading = false; s.list = a.payload; })
    .addCase(fetchItems.rejected,  (s) => { s.loading = false; }),
});
// 组件里 dispatch(fetchItems()) —— pending/fulfilled/rejected 自动进 DevTools 时间线
```

```jsx
// ② 持久化：redux-persist（npm i redux-persist）
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { PersistGate } from 'redux-persist/integration/react';

const persisted = persistReducer({ key: 'root', storage }, counter.reducer);
const store = configureStore({
  reducer: { counter: persisted },
  middleware: (g) => g({ serializableCheck: { ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'] } }),
});
const persistor = persistStore(store);

// 根组件：数据 rehydrate 完成前显示 loading
<Provider store={store}>
  <PersistGate loading={<Spinner />} persistor={persistor}>
    <App />
  </PersistGate>
</Provider>
```

- **让 Redux DevTools 识别页面状态**：这里**什么都不用配**——`configureStore` 默认已接好 Redux DevTools 扩展，浏览器装上插件就能看到每个 slice 的 state 树、每个 action 及其 diff，支持时间旅行/回放；生产构建自动关闭。这是 RTK 相比 Zustand 的开箱优势（Zustand 需要手动包 `devtools` 中间件）。
- **异步推荐顺序**：简单场景 `createAsyncThunk` 就够；接口多、缓存复杂的场景直接上 **RTK Query**（自动缓存/去重/失效，已覆盖下面 React Query 的场景）。

## Jotai：原子式，最省心

把每个状态看成一个 `atom`，谁用谁 `useAtom`，自动只订阅相关原子。适合状态零散、不想设计大 store 结构的项目：

```jsx
import { atom, useAtom } from 'jotai';

const countAtom = atom(0);
const doubleAtom = atom((get) => get(countAtom) * 2);   // 派生原子 ≈ computed

function Counter() {
  const [count, setCount] = useAtom(countAtom);
  const [double] = useAtom(doubleAtom);
  return <button onClick={() => setCount((c) => c + 1)}>{count} / {double}</button>;
}
```

## MobX：最像 Vue 的那个

如果你怀念 Vue `reactive` 那种"直接改对象、视图自动更新"，MobX 给的就是这个：`makeAutoObservable` 把对象变响应式，组件用 `observer` 包裹后自动追踪依赖。它和 Redux 的"不可变 + 显式 action"是相反哲学。代价：隐式依赖追踪在大型团队里不如 Redux 好追踪调试，社区也小于前几者。

## React Query：服务端状态独立出来

后端数据不是"你的状态"，是"远端状态的本地缓存"。React Query 帮你管缓存、去重、失效重取、加载/错误态、分页、乐观更新，你几乎不用手写 `useEffect + fetch + loading`：

```jsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

function UserList() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['users'],              // 缓存键：变了自动重取
    queryFn: () => fetch('/api/users').then((r) => r.json()),
    staleTime: 30_000,               // 30s 内视为新鲜，不重复请求
  });
  if (isPending) return <Spinner />;
  if (isError) return <Err />;
  return <ul>{data.map((u) => <li key={u.id}>{u.name}</li>)}</ul>;
}

function AddUser() {
  const qc = useQueryClient();
  const mut = useMutation({
    mutationFn: (u) => fetch('/api/users', { method: 'POST', body: JSON.stringify(u) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),  // 写完自动刷新列表
  });
  return <button onClick={() => mut.mutate({ name: '新' })}>添加</button>;
}
```

你在 Vue 里若用过 `@tanstack/vue-query`，这里是同一套 API，零迁移成本。**结论：无论客户端全局状态选 Zustand 还是 Redux，接口数据一律走 React Query。**

## 选型决策树

```
有后端数据要缓存/同步？ ── 是 ──> 用 React Query（或 RTK Query）
        │
        否
        ▼
全局客户端状态多吗？
  ├─ 不多/只几处 ──> Context（低频）或状态提升
  ├─ 中等/怕样板 ──> Zustand
  ├─ 零散/要细粒度 ──> Jotai
  └─ 大型/多人/要严格规范+时间旅行 ──> Redux Toolkit
想要 Vue 那种响应式手感？ ──> MobX
```

## 下一步

- 为什么"选择器订阅"能减少重渲染、memo 家族怎么配合 → [性能与高频踩坑](/react/performance-pitfalls)
