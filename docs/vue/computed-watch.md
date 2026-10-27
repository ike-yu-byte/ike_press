# 计算属性与侦听器

> `computed` 和 `watch` 长得很像——都是"根据某些值做点什么"。选错它们导致的代码质量问题比性能问题更常见。这一页把两者讲透，重点在**缓存机制、依赖收集、watch 的三种来源写法**，以及"什么时候其实两个都不该用"。

## computed：声明"值怎么来的"

```vue
<script setup>
import { ref, computed } from 'vue';

const first = ref('Ike');
const last = ref('Yu');

// getter：读的时候自动收集依赖（first/last），依赖变了才重算
const fullName = computed(() => `${first.value} ${last.value}`);
</script>

<template>
  <p>{{ fullName }}</p>
  <p>{{ fullName }}</p>   <!-- 第二次读不重算，命中缓存 -->
</template>
```

三个必须理解的性质：

1. **惰性**：没人读它，getter 一次都不跑。
2. **缓存**：依赖不变 → 多次读取返回同一个缓存值（对比 methods：每次调用必重算）。
3. **只读**：对 `fullName.value = 'x'` 赋值会告警，需要可写就用对象形式。

```vue
<script setup>
// 可写 computed：读走 get，模板里 v-model / 赋值走 set
const firstName = ref('Ike');
const fullName = computed({
  get: () => firstName.value.split(' ')[0],
  set: (v) => { firstName.value = v; },
});
</script>
<template>
  <input v-model="fullName" />
</template>
```

::: warning getter 里不要做副作用
computed 的职责是"从已有数据派生新值"。在 getter 里发请求、改别的 ref、写 localStorage，会让依赖追踪变成一团乱麻（你的副作用改了依赖 → 触发重算 → 又触发副作用）。需要"值变了做点事"，那是 `watch` 的活。
:::

## watch：声明"什么变了做什么"

### 形态一：侦听单个 ref / computed

```vue
<script setup>
import { ref, watch } from 'vue';

const keyword = ref('');

// source, callback, options
watch(keyword, (newVal, oldVal) => {
  console.log(`从 ${oldVal} 变成 ${newVal}`);
});
```

回调**默认异步执行**（在当前依赖变化后、DOM 更新前的微任务里），且**初始不触发**——想立刻跑一次加 `{ immediate: true }`。

### 形态二：侦听 getter 函数（最灵活，推荐养成习惯）

```vue
<script setup>
// 侦听 reactive 对象的某个属性 —— 必须用 getter 包一层
const state = reactive({ count: 0, user: { name: 'ike' } });
watch(() => state.count, (n, o) => fetch(n));          // ✓ 精确：只有 count 变才跑
watch(() => state.user, (n) => console.log(n), { deep: true });  // 对象引用不变但内部变

// 直接传 reactive 对象 = 强制深层侦听（性能差，慎用）
watch(state, handler);
```

这是 `watch` 最大的坑：**传 `reactive` 对象本身会自动 deep**，任何嵌套属性变化都触发；传 getter 返回对象则默认只比引用。想精确控制，永远写 getter。

### 形态三：同时侦听多个来源

```vue
<script setup>
watch([a, b, () => state.c], ([newA, newB, newC], [oldA, oldB, oldC]) => {
  // 数组形式，回调参数也是数组
});
```

### 停止侦听

`watch` 返回一个停止函数，组件卸载时会自动停；但**在组件外**（比如某个组合式函数里异步创建的）需要手动：

```js
const stop = watch(src, cb);
// ...条件满足时
stop();
```

## watchEffect：自动收集依赖

```vue
<script setup>
import { ref, watchEffect } from 'vue';

const id = ref(1);

// 回调里用到谁就侦听谁；初始立即执行一次
watchEffect(() => {
  fetchData(id.value);          // 只侦听 id
});
```

| | `watch` | `watchEffect` |
| --- | --- | --- |
| 依赖来源 | 显式声明第一个参数 | 回调运行时自动收集 |
| 拿旧值 | ✓（第二参） | ✗ |
| 初始执行 | 否（除非 immediate） | **是，立即跑一次** |
| 惰性 | 是 | 是 |
| 精确控制 | ✓ 只侦声明的 | 容易"顺手"依赖进不该侦的东西 |

::: tip 官方建议：优先 watch
`watchEffect` 写起来省事，但依赖是"跑出来的"，代码读不出到底侦听了什么，重构时容易误伤。需要旧值、需要精确控制、需要延迟触发时，`watch` 表达力更强。
:::

## 选项全解

```vue
<script setup>
watch(
  () => state.user,
  (n, o) => { /* ... */ },
  {
    deep: true,          // 深层遍历。对象引用不变但内部变时需要
    immediate: true,     // 建立侦听时立刻用当前值跑一次回调
    flush: 'post',       // 回调时机：'pre'(默认，DOM 更新前) | 'post'(DOM 更新后) | 'sync'(同步，慎用)
    once: true,          // Vue 3.4+：只触发一次后自动停止
    title: 'my-watch',   // Vue 3.5+：DevTools 里显示的名字
  }
);
</script>
```

### flush 与 nextTick 的关系

- `flush: 'pre'`（默认）：回调在**组件更新前**跑。想在改数据后立刻读 DOM？不行，DOM 还是旧的。
- `flush: 'post'`：回调在**组件更新后**跑，能读到新 DOM——等价于 `onUpdated` 的时机，但精确依赖某个源。
- `flush: 'sync'`：数据一变立刻同步跑。任何响应式改动都触发，性能黑洞，只在极特殊场景（比如侦听后立即阻断）使用。

需要"数据变了 + DOM 也更新了"再做事，`{ flush: 'post' }` 比 `watch` 里塞 `nextTick` 更清晰。

还有两个变体：`watchPostEffect`（等价 flush post 的 watchEffect）、`watchSyncEffect`（sync 版）。

## 选型：到底用哪个

| 需求 | 用 |
| --- | --- |
| 一个值由其他值算出来 | `computed` |
| 只在模板里用一次的简单表达式 | 直接写表达式或 methods（别为它开 computed） |
| 值变了要执行副作用（请求、跳转、埋点、操作 DOM） | `watch` |
| 副作用的依赖很明确 | `watch` + getter |
| 副作用的依赖多且懒得列 | `watchEffect`（谨慎） |
| 只需要跑一次、且要 DOM 就绪 | `onMounted` |

::: danger 最常见的反模式：用 watch 同步两个"其实可以派生"的值
```js
// ✗ 多余：fullName 完全可以从 first/last 算出来
const fullName = ref('');
watch([first, last], () => { fullName.value = first.value + ' ' + last.value; });

// ✓ 一个 computed 解决，还自带缓存
const fullName = computed(() => `${first.value} ${last.value}`);
```
判断口诀：**"我需要的是一新值" → computed；"我要做的是件事" → watch。** 用 watch 维护一份和源数据重复的状态，等于手动制造两个可能不同步的真相。
:::

## 下一步

- `ref`/`reactive` 的依赖追踪细节 → [响应式与生命周期](/vue/reactivity-lifecycle)
- computed 在性能优化里的位置 → [性能与最佳实践](/vue/performance-best-practices)
