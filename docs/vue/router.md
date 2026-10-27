# 路由 vue-router

> vue-router 是 Vue 官方配套的路由库，当前主版本 v4（配 Vue 3）。这一页按"配置 → 取参 → 守卫 → 进阶"的顺序梳理，重点讲**导航守卫的执行顺序**——面试与实战都最爱在这里出问题。

## 装配

```bash
npm i vue-router        # create-vue 脚手架会自动带上
```

```ts
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';

const router = createRouter({
  history: createWebHistory(),      // HTML5 History 模式
  routes: [
    { path: '/', component: Home },
    { path: '/about', component: () => import('../views/About.vue') },  // 懒加载
    { path: '/:catchAll(.*)', component: NotFound },                    // 404 兜底
  ],
});

export default router;
```

```ts
// main.ts
import { createApp } from 'vue';
import router from './router';
createApp(App).use(router).mount('#app');
```

### history 模式选择

| 模式 | URL | 要求 |
| --- | --- | --- |
| `createWebHistory()` | `/user/1` | **服务器必须配 fallback**（所有路径回退到 index.html），Nginx `try_files $uri /index.html`；GitHub Pages 等纯静态托管要么配 404.html 重定向要么放弃 |
| `createWebHashHistory()` | `/#/user/1` | 零服务器配置，兼容老环境；URL 丑、锚点被占用 |
| `createMemoryHistory()` | 无 URL | SSR / 测试 / 特殊容器 |

## 路由表语法全集

```ts
const routes = [
  // 动态段
  { path: '/user/:id', component: User },                    // /user/42 → params.id = '42'
  { path: '/file/:name.:ext', component: File },             // 多个参数
  { path: '/Optional/:msg?', component: Opt },               // 尾随 ? 可选
  { path: '/:catchAll(.*)', component: Catch },              // 自定义正则：兜底

  // 嵌套：父组件里再放 <router-view />
  {
    path: '/admin',
    component: AdminLayout,
    children: [
      { path: '', component: AdminHome },                    // 默认子路由（父路径本身）
      { path: 'dashboard', component: Dashboard, name: 'dash' },  // /admin/dashboard
    ],
  },

  // 重定向与别名
  { path: '/home', redirect: '/' },
  { path: '/old/:id', redirect: to => `/new/${to.params.id}` },  // 函数重定向
  { path: '/docs', alias: '/d' },                            // 别名：URL 不变，渲染同一组件

  // 组件命名（KeepAlive include / devtools 用）
  { path: '/x', component: X, name: 'x-route' },
];
```

### 嵌套布局要点

```vue
<!-- AdminLayout.vue -->
<template>
  <aside>菜单</aside>
  <router-view />          <!-- 子路由渲染在这里 -->
</template>
```

- 子路由 `path` **不带** `/`（相对父级）。
- 想匹配"父路径本身"就配 `path: ''` 的默认子路由。
- 多层嵌套时 `<router-view />` 逐层往下放即可。

## 链接与编程式导航

```vue
<script setup>
import { useRouter, useRoute } from 'vue-router';
const router = useRouter();
const route = useRoute();          // 当前路由信息（响应式）

function go() {
  router.push('/user/1');                       // 字符串
  router.push({ name: 'user', params: { id: 1 } });   // 命名路由（推荐）
  router.push({ path: '/search', query: { q: 'vue' } }); // /search?q=vue
  router.replace('/login');                     // 替换不留历史
  router.go(-1);  router.forward();             // 前进后退
}
</script>

<template>
  <!-- 声明式 -->
  <RouterLink to="/about">关于</RouterLink>
  <RouterLink :to="{ name: 'user', params: { id: 1 } }">用户</RouterLink>
  <RouterLink to="/x" replace>替换进入</RouterLink>

  <!-- 激活样式：默认 .router-link-active / .router-link-exact-active，可全局改 -->
  <RouterLink to="/admin" active-class="on">后台</RouterLink>

  <!-- 外层 RouterView 可直接拿匹配项做过渡 -->
  <RouterView v-slot="{ Component }">
    <Transition name="fade" mode="out-in">
      <component :is="Component" />
    </Transition>
  </RouterView>
</template>
```

### 取参：params / query / props 三选一

```vue
<script setup>
import { useRoute } from 'vue-router';
const route = useRoute();
route.params.id;     // 路径参数（字符串！）
route.query.q;       // 查询串
</script>
```

**更推荐 props 解耦**：路由配置里 `props: true`（params 变 props）或 `props: (route) => ({ id: Number(route.params.id) })`，组件不感知 router 的存在，可测试性立刻上升。

::: warning 同路由只变参数的坑
从 `/user/1` 跳到 `/user/2`，**组件实例被复用**——`onMounted` 不再执行！两种解法：
```vue
<script setup>
// 1. 侦听参数
watch(() => route.params.id, (id) => fetchUser(id), { immediate: true });
</script>
<template>
  <!-- 2. 给 router-view 加 key，参数变了强制重建 -->
  <RouterView :key="$route.fullPath" />
</template>
```
:::

## 导航守卫：执行顺序是灵魂

三个层级：**全局 → 路由独享 → 组件内**。完整执行顺序：

```
1. 导航触发
2. 全局 beforeEach        （逐个路由，父 → 子）
3. 路由独享 beforeEnter
4. 组件内 beforeRouteUpdate（复用实例只变参数时；父 → 子）
5. 解析异步组件
6. 全局 beforeResolve     （父 → 子）
7. 路由独享/组件内 beforeRouteLeave（被离开的页面，先离开后进入）
8. 全局 afterEach（无 next，仅通知；DOM 更新后执行）
```

记忆核心：**进入类守卫"从上到下"，离开类守卫"从下到上"；leave 在一切进入守卫之后、组件渲染之前。**

```ts
// 全局：登录鉴权最常用
router.beforeEach((to, from) => {
  const auth = useAuthStore();
  if (to.meta.requiresAuth && !auth.isLogin) {
    return { path: '/login', query: { redirect: to.fullPath } };  // 返回对象 = 重定向
  }
  // 返回 false = 取消导航；什么都不返回 = 放行
});
```

```ts
// 路由独享
{ path: '/admin', component: Admin, beforeEnter: (to, from) => { /* ... */ } }
```

```vue
<script setup>
// 组件内守卫（组合式要用 vue-router 提供的钩子函数，不是选项式那三个名字）
import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';

onBeforeRouteLeave((to, from) => {
  if (formDirty.value && !confirm('有未保存内容，确定离开？')) return false;
});
onBeforeRouteUpdate((to) => { fetchData(to.params.id); });
</script>
```

::: tip 异步守卫的三种写法
`next` 回调可以不用（直接 return / await / throw）；需要 `next()` 时必须**每条分支恰好调用一次**，漏调导航永远卡住，多调直接报错。Vue Router 4 更推荐 return 语义。
:::

## meta：给路由挂业务信息

```ts
{ path: '/profile', component: Profile, meta: { requiresAuth: true, title: '个人中心', roles: ['admin'] } }
```

```ts
// 配合 afterEach 统一改标题
router.afterEach((to) => {
  document.title = to.meta.title ? `${to.meta.title} | IKE Press` : 'IKE Press';
});
```

TS 项目记得增强类型：

```ts
declare module 'vue-router' {
  interface RouteMeta { requiresAuth?: boolean; title?: string; }
}
```

## 滚动行为与懒加载

```ts
const router = createRouter({
  history: createWebHistory(),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;               // 后退还原
    if (to.hash) return { el: to.hash, behavior: 'smooth' }; // 锚点
    return { top: 0 };                                     // 默认滚顶
  },
});
```

懒加载两种粒度：

- **路由级**：`component: () => import('...')` —— 每个页面一个 chunk，最常用。
- **组件级**：页面内部大部件用 `defineAsyncComponent`。

配合 Vite 打包分析：`rollup-plugin-visualizer` 看 chunk 分布。

## 下一步

- 守卫里用的登录态放哪 → [状态管理 Pinia](/vue/state-management)
- 动态权限路由（按角色 addRoute）属于进阶，官方文档 "路由匹配语法" 与 API 页各读一遍即可
