# 响应式与生命周期

> 这一页回答 Vue "魔法"的两个底层问题：**数据变了视图为什么知道**（响应式），以及**组件从创建到销毁的每个时机你能干什么**（生命周期）。看懂这页，前面模板、computed、watch 里所有"为什么"都能自答。

## 响应式原理：Proxy 拦截读写

Vue 3 用 `Proxy` 包一层对象，读属性时把"当前正在渲染的副作用"登记为依赖，写属性时通知所有依赖者重新执行：

```
ref/reactive 创建代理对象
        ↓
模板渲染 / computed / watchEffect 读取属性   → track：记录"谁读了哪个 key"
        ↓
修改属性（.value = x 或 obj.a = x）          → trigger：查表找到订阅者，入队
        ↓
调度器（微任务队列去重合并）                  → nextTick 后重新执行渲染函数 → diff → 打补丁
```

对比 Vue 2 的 `Object.defineProperty`：Proxy 拦截整个对象，所以**新增属性、删除属性、数组索引变更都能感知**，不再需要 `Vue.set`。代价是不支持 IE11（这也是 Vue 2 停更的硬原因）。

## ref：一切类型的万能入口

```vue
<script setup>
import { ref } from 'vue';

const count = ref(0);            // 基本类型
const user = ref({ name: 'ike' }); // 对象也行：内部值被深层 reactive 化

console.log(count.value);        // JS 里必须 .value
user.value.name = 'yu';          // 对象属性修改也是响应式的

count.value++;                   // ✓ 响应式
// const { name } = user.value;  // ✗ 解构出来的 name 是普通字符串，失联
</script>

<template>
  <p>{{ count }}</p>             <!-- 模板里自动解包，不写 .value -->
  <p>{{ user.name }}</p>
</template>
```

**为什么需要 `.value`？** JS 语言层面无法拦截对普通变量（原始类型）的读写，`ref` 只能把它包进一个对象里代理 `.value` 这个属性。模板、`watch` 源、reactive 对象属性里 Vue 都帮你自动解包，只有 `<script>` 里手动读写要带。

**忘写 `.value` 是 Vue 第一大低级 bug 来源**：`count++` 改的是包装对象上的新属性，视图永远不动。TypeScript 能拦一半（类型不匹配），纯 JS 项目靠习惯——ref 变量名带后缀提示（`countRef`）是团队常见约定。

## reactive：对象专用，但有三个边界

```vue
<script setup>
import { reactive, toRefs, toRef } from 'vue';

const state = reactive({ count: 0, user: { name: 'ike' } });
state.count++;                   // 直接改属性，无需 .value
```

| 边界 | 后果 | 对策 |
| --- | --- | --- |
| **解构丢响应** | `const { count } = state` 拿到普通数字 | `toRefs(state)` 得到逐属性的 ref；或干脆不解构 |
| **整体替换失联** | `state = reactive({...})` / `Object.assign(state, 新对象)` 前者断引用后者不触发 | 用 ref 装对象，`obj.value = 新对象`；或逐属性赋值 |
| **只能装对象** | `reactive(0)` 无效报警 | 基本类型一律 ref |

```vue
<script setup>
const state = reactive({ count: 0, name: 'ike' });
const { count, name } = toRefs(state);   // count/name 都是 Ref，保持响应式连接
// 模板里 {{ count }} 自动解包；script 里 count.value
</script>
```

### 到底用 ref 还是 reactive？

官方推荐：**优先 ref**（包括装对象）。理由：单一心智模型（永远 `.value`）、可整体替换、可解构（配合 toRef）、类型推导更好。`reactive` 适合"一组强相关状态天然是一个对象"（表单模型、配置对象）且不需要整体替换的场景。

```vue
<script setup>
import { ref, reactive } from 'vue';

// ✓ 推荐：一切皆 ref
const form = ref({ user: '', pass: '' });
form.value = { user: '', pass: '' };      // 重置：整体替换一行搞定

// ✓ 也合理：表单这种"一组字段"用 reactive
const form2 = reactive({ user: '', pass: '' });
Object.assign(form2, { user: 'a', pass: 'b' });   // 重置：assign 合并，保持引用
</script>
```

## shallowRef 与性能逃生舱

深层代理大对象是有成本的（每个嵌套属性都要包）。**不需要深层响应式的大数据**用浅层 API：

```js
import { shallowRef, shallowReactive, markRaw } from 'vue';

const bigList = shallowRef([{...}, {...}]);   // 只有 .value 整体替换才触发更新
bigList.value = newList;                       // ✓ 触发
bigList.value[0].name = 'x';                   // ✗ 不触发（内部不追踪）

const chart = markRaw(new ECharts.Instance()); // 永久排除：第三方类实例/巨型静态数据
```

典型场景：ECharts 实例、地图对象、几千行的只读列表。详见[性能与最佳实践](/vue/performance-best-practices)。

## 生命周期图谱

组合式 API 的钩子就是 `onXxx` 函数，在 `<script setup>` 顶层调用注册：

```
createApp / 组件实例创建
   │
   ├─ setup() 执行            ← 组件函数体本身：建状态、注册钩子（此时还没 DOM！）
   │
onBeforeMount                ← 挂载前最后一刻改数据的机会（模板还没渲染）
   │
【首次 DOM 渲染完成】
onMounted                    ← ✓ 拿 DOM、初始化第三方库（echarts/swiper）、发首屏请求
   │
数据变化 → 组件更新
onBeforeUpdate               ← 更新前，可读旧 DOM（滚动位置保持等场景）
onUpdated                    ← 新 DOM 就绪。⚠️ 别在这里改状态，会死循环
   │
onBeforeUnmount              ← 卸载前清理：定时器/全局事件/观察器（还来得及）
【DOM 移除】
onUnmounted                  ← 兜底清理（不能碰 DOM 了）
```

被 `KeepAlive` 缓存的组件额外走：

```
onActivated     ← 每次切回时（重新拉数据、恢复滚动）
onDeactivated   ← 每次切走时（暂停轮询、收起弹层）
```

::: warning 三个高频误用
1. **setup 顶层直接访问 DOM** —— 那时 `document.querySelector` 拿不到本组件元素，放 `onMounted`。
2. **onUpdated 里 setState** —— 更新触发钩子、钩子触发更新 → 无限循环。派生数据用 computed，别在 onUpdated 里同步。
3. **忘了清理副作用** —— `onMounted` 里 `window.addEventListener` / `setInterval`，必须在 `onBeforeUnmount` 移除，否则路由切走后定时器还在跑、回调里的组件实例已销毁（内存泄漏）。
:::

## nextTick：改完数据，DOM 什么时候是新的

数据变化 → Vue 开一个**微任务队列**收集本轮所有更新 → 队列去重合并后一次性刷新 DOM。所以：

```vue
<script setup>
import { ref, nextTick } from 'vue';

const list = ref([]);

async function add() {
  list.value.push({ id: Date.now() });
  console.log(listEl.value.children.length);   // 旧 DOM，还没更新！

  await nextTick();                            // 等本轮队列刷新完毕
  console.log(listEl.value.children.length);   // 新 DOM ✓
}
</script>
```

需要它的场景很少但很关键：滚动到底部、聚焦新插入的输入框、给新元素量尺寸。`flush: 'post'` 的 watch 也能表达"DOM 更新后做事"，通常更声明式。

## 组合式函数（composable）：Vue 的逻辑复用单元

Vue 版的"自定义 Hook"，但约束更松——就是个用了响应式 API 的普通函数：

```js
// useMouse.js —— 完全自由地命名、组织、返回
import { ref, onMounted, onBeforeUnmount } from 'vue';

export function useMouse() {
  const x = ref(0);
  const y = ref(0);
  function update(e) { x.value = e.pageX; y.value = e.pageY; }
  onMounted(() => window.addEventListener('mousemove', update));
  onBeforeUnmount(() => window.removeEventListener('mousemove', update));
  return { x, y };   // 约定：返回 ref 组成的普通对象，调用方按需解构
}
```

```vue
<script setup>
import { useMouse } from './useMouse';
const { x, y } = useMouse();     // 解构安全：返回的就是独立的 ref
</script>
<template><p>{{ x }}, {{ y }}</p></template>
```

约定俗成：

- 命名 `useXxx`；文件放 `composables/` 或 `hooks/` 目录。
- **在组件 setup 顶层调用**（内部用了生命周期钩子/注入时，离开同步 setup 上下文会失效）。
- 需要"全局单例"状态时，把 ref 提到函数外面模块级定义（每个组件拿到的是同一份）。

替代了 Vue 2 的 mixin：来源显式（import 看得见）、无命名冲突、可参数化。

## 下一步

- 响应式在组件间怎么流动 → [组件系统](/vue/components)
- 深层代理的开销与大对象优化 → [性能与最佳实践](/vue/performance-best-practices)
