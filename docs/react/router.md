# 路由

> Vue 的路由是"一个全局 router 实例 + 声明式 routes 数组 + 一堆导航守卫钩子"。React Router 的哲学不同：**路由本身就是组件，配置写成 `<Route>` 标签树，守卫靠"包装组件 + 重定向"实现**。这一页以 React Router v6（当前主流）为准，和 vue-router 逐项对照。

## 装与包

- Web SPA 用 `react-router-dom`（v6.4+ 引入 data router）。
- 顶层包 `<BrowserRouter>`（对应 Vue 里 `createRouter` + `app.use(router)`）。

```jsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
```

## 路由表：数组配置 vs 组件树

Vue：

```js
const routes = [
  { path: '/user/:id', component: User },
  { path: '/admin', component: AdminLayout, children: [
      { path: 'dashboard', component: Dashboard },
  ]},
  { path: '/:pathMatch(.*)*', redirect: '/' },
];
```

React Router：写成嵌套的 `<Route>` 元素，`element` 是要渲染的组件（注意是 `<X/>` 不是 `X`）：

```jsx
<Routes>
  <Route path="/user/:id" element={<User />} />
  <Route path="/admin" element={<AdminLayout />}>
    <Route path="dashboard" element={<Dashboard />} />   {/* 子路由，父需渲染 <Outlet/> */}
  </Route>
  <Route path="*" element={<Navigate to="/" replace />} />  {/* 404 兜底 + 重定向 */}
</Routes>
```

::: info 也支持"配置式"（data router）
v6.4 起可用 `createBrowserRouter([{ path, element, children, loader }])` + `<RouterProvider>`，形态更接近 vue-router 的数组配置，还能挂 `loader`/`action`（数据预取）。习惯配置式对象的 Vue 开发者会觉得这个更亲切。下文 hooks 部分两种都通用。
:::

## 出口与链接

| vue-router | React Router |
| --- | --- |
| `<router-view />` | `<Outlet />` |
| `<router-link to="/x">文字</router-link>` | `<Link to="/x">文字</Link>` |
| `<router-link :to="..." active-class="on">` | `<NavLink to="..." className={({isActive}) => isActive?'on':''}>` |
| `replace` | `<Link to="/x" replace>` 或 `nav('/x', { replace: true })` |

```jsx
import { NavLink, Outlet } from 'react-router-dom';

function AdminLayout() {
  return (
    <div>
      <nav>
        {/* NavLink 自带 isActive，对应 active-class */}
        <NavLink to="dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          面板
        </NavLink>
      </nav>
      <Outlet />     {/* 子路由渲染位 = <router-view> */}
    </div>
  );
}
```

## 编程式导航与读路由信息：全靠 hooks

Vue 里你 `import { useRouter, useRoute }`。React Router 拆成更细的 hooks：

| 需求 | vue-router | React Router |
| --- | --- | --- |
| 跳转 | `router.push('/x')` | `const nav = useNavigate(); nav('/x')` |
| 后退 | `router.back()` | `nav(-1)` |
| 路径参数 `:id` | `route.params.id` | `useParams().id` |
| 查询串 `?q=` | `route.query.q` | `useSearchParams()` |
| 当前完整位置 | `route.fullPath` | `useLocation()` |
| 匹配到的路由对象 | `route.matched` | `useMatches()`（data router） |

```jsx
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';

function User() {
  const { id } = useParams();                 // /user/:id 里的 id
  const [params] = useSearchParams();         // ?tab=a&page=2
  const tab = params.get('tab');
  const nav = useNavigate();

  return (
    <div>
      用户 {id} · tab={tab}
      <button onClick={() => nav('/list')}>去列表</button>
      <button onClick={() => nav(-1)}>返回</button>
    </div>
  );
}
```

::: warning 跳转后想"关掉当前页"用 replace
`nav('/x')` 是 push（能后退回去）；`nav('/x', { replace: true })` 替换当前历史条目（登录成功后跳首页、不想让用户后退到登录页就用它）。对应 vue-router 的 `router.replace`。
:::

## 导航守卫：没有 beforeEach，改用这两招

vue-router 有全局 `beforeEach`、独享 `beforeEnter`、组件内 `beforeRouteLeave`。React Router **没有守卫钩子**，鉴权/拦截靠：

### 1. 保护路由：包装组件（对应 beforeEach + requiresAuth meta）

```jsx
import { Navigate, useLocation, Outlet } from 'react-router-dom';

function RequireAuth() {
  const isLogin = useAuthStore((s) => s.isLogin);   // 你的登录态来源
  const loc = useLocation();
  if (!isLogin) {
    // 未登录：跳登录页，并记住原来想去哪
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  }
  return <Outlet />;   // 已登录：放行渲染子路由
}

// 路由表里把需要登录的包一层
<Routes>
  <Route element={<RequireAuth />}>
    <Route path="/profile" element={<Profile />} />
  </Route>
</Routes>
```

登录页读 `useLocation().state.from` 决定登录后回跳——等价于你在 vue-router 守卫里 `next({ path: redirect })`。

### 2. 离开前确认（对应 beforeRouteLeave）

用 `useBlocker`（data router）或 `usePrompt`，在表单未保存时拦一下：

```jsx
import { useBlocker } from 'react-router-dom';

function EditForm() {
  const dirty = useRef(false);
  const blocker = useBlocker(() => dirty.current);   // 想离开且 dirty 时触发
  return (
    <>
      {/* ... */}
      {blocker.state === 'blocked' && (
        <Confirm onOk={() => blocker.proceed()} onCancel={() => blocker.reset()} />
      )}
    </>
  );
}
```

## meta 信息

vue-router 在路由上写 `meta: { title: '...', roles: [...] }`，守卫里读。React Router 没有专用 `meta` 字段，两种做法：

1. data router 的 `handle` 字段挂任意对象，`useMatches()` 读（常用于动态标题、面包屑）。
2. 直接在 `<Route>` 上多传自定义 prop，或把权限信息编码进包装组件。

```jsx
// data router 风格
const router = createBrowserRouter([
  { path: '/profile', element: <Profile />, handle: { title: '个人中心' } },
]);
function DocTitle() {
  const matches = useMatches();
  const title = matches.at(-1)?.handle?.title;
  useEffect(() => { if (title) document.title = title; }, [title]);
  return null;
}
```

## 懒加载

Vue：路由 `component: () => import('./X.vue')`。React：`React.lazy` + `<Suspense>`：

```jsx
import { lazy, Suspense } from 'react';
const Settings = lazy(() => import('./Settings'));

<Suspense fallback={<Spinner />}>
  <Routes>
    <Route path="/settings" element={<Settings />} />
  </Routes>
</Suspense>
```

data router 的 `Route` 还支持 `HydrateFallback` 配 `loader` 做数据级代码分割。

## 嵌套布局与滚动恢复

- 嵌套：父 `<Route>` 渲染 `<Outlet/>`，子路由填进去——和 vue-router 的 children + `<router-view>` 完全同构。
- 滚动：data router 下渲染 `<ScrollRestoration />` 即可在返回时恢复滚动位置（对应 vue-router 的 `scrollBehavior`）。

## 与 vue-router 的整体差异小结

| 方面 | vue-router | React Router |
| --- | --- | --- |
| 注册 | 全局实例 `app.use` | 组件式 `<BrowserRouter>`/`<RouterProvider>` |
| 配置 | routes 数组 | `<Route>` 树（或 data router 数组） |
| 出口 | `<router-view>` | `<Outlet/>` |
| 读路由 | `useRoute()` 一个大对象 | 拆成 `useParams`/`useSearchParams`/`useLocation` |
| 守卫 | `beforeEach` 等钩子 | 包装组件 + `<Navigate>` / `useBlocker` |
| meta | 内建 `meta` | `handle` + `useMatches` |
| 数据预取 | 导航守卫里手动 fetch | `loader`/`action`（data router 内建） |

## 下一步

- 登录态这类跨页共享数据放哪 → [状态管理](/react/state-management)
