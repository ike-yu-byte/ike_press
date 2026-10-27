# 状态管理 Pinia

> Vue 生态的全局状态管理经历了 Vuex 3 → Vuex 4 → **Pinia** 的收敛，现在官方答案只有一个：Pinia。它去掉了 mutations、类型推导一流、支持多 store 自由组合。这一页把 API 讲完，更重要的是讲清**什么该进 store、什么不该**——这是比 API 更常出错的决策。

## 装配

```bash
npm i pinia
```

```ts
// main.ts
import { createApp } from 'vue';
import { createPinia } from 'pinia';

const app = createApp(App);
app.use(createPinia());     // 唯一要做的配置
app.use(router);
app.mount('#app');
```

## 定义 store：两种风格

### Option Store（像组件一样分块）

```ts
// stores/counter.ts
import { defineStore } from 'pinia';

export const useCounter = defineStore('counter', {
  state: () => ({ count: 0, history: [] as number[] }),   // state 必须是工厂函数！
  getters: {
    double: (s) => s.count * 2,
    lastThree: (s) => s.history.slice(-3),
    getByUser(): (user: string) => boolean {               // this 形式可访问其他 getter
      return (user) => this.count > 0 && user.length > 0;
    },
  },
  actions: {
    increment() { this.count++; this.history.push(this.count); },
    async fetchInitial() {                                  // actions 可以是 async
      const r = await fetch('/api/count');
      this.count = (await r.json()).value;
    },
  },
});
```

### Setup Store（组合式写法，逻辑复用更顺）

```ts
export const useCounter = defineStore('counter', () => {
  const count = ref(0);
  const double = computed(() => count.value * 2);
  function increment() { count.value++; }
  return { count, double, increment };    // 返回什么暴露什么（类似模块导出）
});
```

两种风格 API 完全等价，按需选：团队习惯 Options 就 Option，组合式项目用 Setup 更顺手（内部还能私有变量——不 return 的就是私有的）。

## 使用：处处都是响应式

```vue
<script setup>
import { storeToRefs } from 'pinia';
import { useCounter } from '@/stores/counter';

const counter = useCounter();          // 在组件 setup 里调用（也可在 store 之间互相调用）

// ✓ 直接读写
counter.increment();
console.log(counter.count, counter.double);

// ✓ 解构必须经过 storeToRefs，否则丢响应式
const { count, double } = storeToRefs(counter);   // 状态和 getter
const { increment } = counter;                     // action 直接解构没问题（函数不依赖 this 的引用）
</script>
<template>
  <p>{{ count }} / {{ double }}</p>
  <button @click="counter.increment">+1</button>
</template>
```

::: danger 第一大坑：直接解构 store
`const { count } = useCounter()` 拿到的是**一次性快照**——普通 number 的拷贝，之后 store 变了它不动，组件重渲染也拿不到新值。这是从 Pinia 文档第一条警告延伸出的最高频 bug。记住：**解构走 `storeToRefs`，action 可以裸拿。**
:::

### 批量修改与重置

```ts
counter.$patch({ count: 10 });                 // 批量改 state
counter.$patch((state) => {                    // 函数式 patch，复杂逻辑
  state.history.push(state.count);
  state.count++;
});
counter.$reset();                              // 回到初始 state（option store 自带；setup store 需自己实现 reset）
counter.$subscribe((mutation, state) => {      // 订阅所有变更（持久化、日志）
  localStorage.setItem('counter', JSON.stringify(state));
});
```

## 该不该进 store：一条清晰的边界线

| 状态 | 放哪 | 例子 |
| --- | --- | --- |
| 只有一个组件用 | 组件内 `ref` | 弹窗开关、输入框草稿、tab 当前索引 |
| 父子两三层共享 | props/emit 或提升到共同父 | 表单分步组件 |
| **跨路由、多页面、生命周期长** | **Pinia** | 登录用户、权限、购物车、主题、全局筛选条件 |
| **从后端拿来的数据** | **优先 vue-query/SWR 风格方案**，或 Pinia + 手动缓存 | 列表、详情、字典 |
| 仅 URL 能表达 | 路由 query | 页码、搜索词、tab 定位 |

::: warning 别把 Pinia 当垃圾桶
Vuex 时代最大的恶习是"所有数据先进 store 再说"——接口数据、临时 UI 态全塞进去，最后没人敢删。Pinia 没解决这个问题，只是让每个 store 独立了。写之前问一句：**"这份状态有几个互不相干的消费者？需要跨路由存活吗？"** 两个都不满足就别进。
:::

## 模块化与互相调用

一个业务域一个 store 文件，store 之间可以互相 `use`：

```ts
// stores/cart.ts
import { useUser } from './user';
export const useCart = defineStore('cart', () => {
  const user = useUser();
  const myList = computed(() => items.value.filter(i => i.owner === user.id));  // 跨 store 派生
  return { items, myList };
});
```

注意在**函数体内**调用其他 store（setup 顶层或 action 里），不要模块顶层就 `const user = useUser()`——那时 pinia 实例还没装好。

## 持久化

生产上一般不手写 `$subscribe` 存 localStorage，用官方生态插件：

```ts
// main.ts
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
createPinia().use(piniaPluginPersistedstate);

// store 里
export const useUser = defineStore('user', {
  state: () => ({ token: '' }),
  persist: { key: 'ike-user', paths: ['token'], storage: sessionStorage },  // 只持久化 token
});
```

适合持久化的只有"重启后仍该成立"的状态：token、主题、侧栏折叠。购物车看业务，接口数据**永远不要**持久化。

## SSR 与测试

- **SSR（Nuxt 自带集成）**：每个请求要新 pinia 实例防状态污染；`app.use(createPinia())` 在 Nuxt 里由框架处理，手写 SSR 时注意 `pinia.state.value` 的序列化与 hydrate。
- **测试**：`vitest` + `@pinia/testing` 或直接 `setActivePinia(createPinia())` 每个用例新实例；store 的 action 是普通函数，单测成本极低——这也是"把逻辑从组件搬进 store"的真实收益之一。

## 下一步

- 路由守卫里怎么用 store 做鉴权 → [路由 vue-router](/vue/router)
- store 里的响应式基础 → [响应式与生命周期](/vue/reactivity-lifecycle)
