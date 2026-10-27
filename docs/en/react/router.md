# Routing

> Vue routing is "one global router instance + a declarative `routes` array + a pile of navigation-guard hooks". React Router has a different philosophy: **a route is itself a component, the config is written as a `<Route>` tag tree, and guards are done via "wrapper components + redirect"**. This page uses React Router v6 (the current mainstream) and maps it item-by-item against vue-router.

## Install & wrap

- For web SPAs use `react-router-dom` (v6.4+ introduced the data router).
- Wrap everything in `<BrowserRouter>` at the top (the counterpart of Vue's `createRouter` + `app.use(router)`).

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

## Route table: array config vs component tree

Vue:

```js
const routes = [
  { path: '/user/:id', component: User },
  { path: '/admin', component: AdminLayout, children: [
      { path: 'dashboard', component: Dashboard },
  ]},
  { path: '/:pathMatch(.*)*', redirect: '/' },
];
```

React Router: written as nested `<Route>` elements; `element` is the component to render (note it's `<X/>`, not `X`):

```jsx
<Routes>
  <Route path="/user/:id" element={<User />} />
  <Route path="/admin" element={<AdminLayout />}>
    <Route path="dashboard" element={<Dashboard />} />   {/* child route; parent must render <Outlet/> */}
  </Route>
  <Route path="*" element={<Navigate to="/" replace />} />  {/* 404 fallback + redirect */}
</Routes>
```

::: info A "config style" is also supported (data router)
Since v6.4 you can use `createBrowserRouter([{ path, element, children, loader }])` + `<RouterProvider>`, which looks much closer to vue-router's array config and even lets you attach `loader`/`action` (data prefetching). Vue devs who like config objects will feel at home here. The hooks sections below apply to both styles.
:::

## Outlet & links

| vue-router | React Router |
| --- | --- |
| `<router-view />` | `<Outlet />` |
| `<router-link to="/x">text</router-link>` | `<Link to="/x">text</Link>` |
| `<router-link :to="..." active-class="on">` | `<NavLink to="..." className={({isActive}) => isActive?'on':''}>` |
| `replace` | `<Link to="/x" replace>` or `nav('/x', { replace: true })` |

```jsx
import { NavLink, Outlet } from 'react-router-dom';

function AdminLayout() {
  return (
    <div>
      <nav>
        {/* NavLink exposes isActive, the counterpart of active-class */}
        <NavLink to="dashboard" className={({ isActive }) => isActive ? 'active' : ''}>
          Dashboard
        </NavLink>
      </nav>
      <Outlet />     {/* child-route slot = <router-view> */}
    </div>
  );
}
```

## Programmatic navigation & reading route info: all hooks

In Vue you `import { useRouter, useRoute }`. React Router splits this into finer-grained hooks:

| Need | vue-router | React Router |
| --- | --- | --- |
| navigate | `router.push('/x')` | `const nav = useNavigate(); nav('/x')` |
| go back | `router.back()` | `nav(-1)` |
| path param `:id` | `route.params.id` | `useParams().id` |
| query string `?q=` | `route.query.q` | `useSearchParams()` |
| full current location | `route.fullPath` | `useLocation()` |
| matched route objects | `route.matched` | `useMatches()` (data router) |

```jsx
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';

function User() {
  const { id } = useParams();                 // the id in /user/:id
  const [params] = useSearchParams();         // ?tab=a&page=2
  const tab = params.get('tab');
  const nav = useNavigate();

  return (
    <div>
      User {id} · tab={tab}
      <button onClick={() => nav('/list')}>Go to list</button>
      <button onClick={() => nav(-1)}>Back</button>
    </div>
  );
}
```

::: warning Use replace to "close the current page" after navigating
`nav('/x')` is a push (you can go back to it); `nav('/x', { replace: true })` replaces the current history entry (use it after login to jump home when you don't want the user to go back to the login page). The counterpart of vue-router's `router.replace`.
:::

## Navigation guards: no beforeEach — use these two techniques

vue-router has global `beforeEach`, per-route `beforeEnter`, in-component `beforeRouteLeave`. React Router **has no guard hooks**; auth/interception relies on:

### 1. Protected routes: wrapper component (the counterpart of beforeEach + requiresAuth meta)

```jsx
import { Navigate, useLocation, Outlet } from 'react-router-dom';

function RequireAuth() {
  const isLogin = useAuthStore((s) => s.isLogin);   // your login-state source
  const loc = useLocation();
  if (!isLogin) {
    // not logged in: go to login, remembering where they wanted to go
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  }
  return <Outlet />;   // logged in: let child routes render
}

// In the route table, wrap the ones that need login
<Routes>
  <Route element={<RequireAuth />}>
    <Route path="/profile" element={<Profile />} />
  </Route>
</Routes>
```

The login page reads `useLocation().state.from` to decide where to redirect after login — equivalent to `next({ path: redirect })` in a vue-router guard.

### 2. Confirm before leaving (the counterpart of beforeRouteLeave)

Use `useBlocker` (data router) or `usePrompt` to intercept when a form is unsaved:

```jsx
import { useBlocker } from 'react-router-dom';

function EditForm() {
  const dirty = useRef(false);
  const blocker = useBlocker(() => dirty.current);   // fires when leaving while dirty
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

## Meta info

vue-router lets you write `meta: { title: '...', roles: [...] }` on a route and read it in guards. React Router has no dedicated `meta` field; two approaches:

1. The data router's `handle` field holds any object, read via `useMatches()` (commonly used for dynamic titles, breadcrumbs).
2. Pass extra custom props directly on `<Route>`, or encode permission info into the wrapper component.

```jsx
// data router style
const router = createBrowserRouter([
  { path: '/profile', element: <Profile />, handle: { title: 'Profile' } },
]);
function DocTitle() {
  const matches = useMatches();
  const title = matches.at(-1)?.handle?.title;
  useEffect(() => { if (title) document.title = title; }, [title]);
  return null;
}
```

## Lazy loading

Vue: route `component: () => import('./X.vue')`. React: `React.lazy` + `<Suspense>`:

```jsx
import { lazy, Suspense } from 'react';
const Settings = lazy(() => import('./Settings'));

<Suspense fallback={<Spinner />}>
  <Routes>
    <Route path="/settings" element={<Settings />} />
  </Routes>
</Suspense>
```

The data router's `Route` also supports `HydrateFallback` combined with `loader` for data-level code splitting.

## Nested layouts & scroll restoration

- Nesting: the parent `<Route>` renders `<Outlet/>`, child routes fill it — structurally identical to vue-router's `children` + `<router-view>`.
- Scroll: under the data router, render `<ScrollRestoration />` to restore scroll position on back navigation (the counterpart of vue-router's `scrollBehavior`).

## Overall differences from vue-router

| Aspect | vue-router | React Router |
| --- | --- | --- |
| Registration | global instance `app.use` | component-style `<BrowserRouter>`/`<RouterProvider>` |
| Config | routes array | `<Route>` tree (or data-router array) |
| Outlet | `<router-view>` | `<Outlet/>` |
| Reading route | `useRoute()` one big object | split into `useParams`/`useSearchParams`/`useLocation` |
| Guards | `beforeEach` and friends | wrapper component + `<Navigate>` / `useBlocker` |
| meta | built-in `meta` | `handle` + `useMatches` |
| Data prefetch | manual fetch in guards | `loader`/`action` (built into data router) |

## Next step

- Where to put cross-page shared data like login state → [State Management](/en/react/state-management)
