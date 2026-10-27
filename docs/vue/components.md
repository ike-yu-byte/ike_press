# 组件系统

> 组件是 Vue 的基本叙事单位。这一页覆盖组件从"怎么定义"到"怎么组合"的全链路：props / emits / 插槽 / v-model / ref 暴露 / 动态组件 / KeepAlive / Teleport / 异步组件。以 `<script setup>` 组合式写法为主线（它是官方当前推荐），并标注与 Options API 的对应关系。

## 一个 SFC 的形状

```vue
<script setup>
import { ref } from 'vue';            // 导入即注册，模板直接可用
const count = ref(0);
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>

<style scoped>
/* scoped：样式只作用于本组件元素（编译时给选择器加 data-v-xxx 属性） */
button { color: red; }
</style>
```

`<script setup>` 的编译魔法：顶层 import、`ref`、`computed` 等**自动暴露给模板**，不需要 `return`；组件不需要注册自己就能被父组件 `import` 使用。

::: info 多根节点（Fragment）
Vue 3 模板允许并列多个根元素。代价是：父组件传来的 `class`/`style`/原生事件等 attribute **无法自动落到某个根上**，需要 `<script setup>` 里 `defineOptions({ inheritAttrs: false })` 配合 `v-bind="$attrs"` 手动分配。单根组件无此烦恼——这也是为什么多数组件仍习惯包一个根 `<div>`。
:::

## Props：父 → 子的单向数据流

### 声明与校验

```vue
<script setup>
// 运行时声明
const props = defineProps({
  title: { type: String, required: true },
  level: { type: Number, default: 1 },
  tags: { type: Array, default: () => [] },     // 引用类型默认值必须是工厂函数
  status: { type: String, validator: (v) => ['a', 'b'].includes(v) },
});

// 类型声明（TS 项目推荐）：纯类型即契约
const props2 = defineProps<{ title: string; level?: number }>();
withDefaults(defineProps<{ title: string; level?: number }>(), { level: 1 });
</script>
```

### 三条铁律

1. **props 是只读的**。子组件改 props 会告警；需要"以 props 为初值"就在本地复制一份（`ref(props.count)` 只取初值）或用 computed 派生。
2. **命名：camelCase 声明，kebab-case 传递**。`defineProps({ bgColor })` → 模板里 `:bg-color="..."`，两种都能对上，但官方风格建议模板统一 kebab-case。
3. **解构会丢响应式**（Vue 3.5 之前）：`const { title } = props` 拿到的是一次性快照。Vue 3.5+ 支持响应式解构并保留默认值：`const { title = 'hi' } = defineProps({...})`；低版本用 `toRef(props, 'title')`。

### 批量透传

```vue
<Child v-bind="post" />        <!-- post 对象的每个键都变成 prop -->
```

做"组件包装器"（加个 loading 壳转发全部 props）时非常有用。

## Emits：子 → 父的事件通知

```vue
<script setup>
const emit = defineEmits(['like', 'delete']);           // 运行时声明
const emit2 = defineEmits<{                               // 类型声明
  (e: 'like', id: number): void;
  (e: 'delete', payload: { id: number; reason?: string }): void;
}>();

emit('like', 42);
</script>
```

要点：

- 声明了 `emits` 后，同名自定义事件**不会再透传成原生监听器**（`$attrs` 里被移除），避免父组件 `@like` 触发两次。
- 事件名官方推荐 kebab-case（`update:modelValue`、`item-deleted`），模板里 `@item-deleted` 与 `@itemDeleted` 都能接。
- 事件只该用来通知"发生了什么"，不要在 emit 里塞函数回调模拟 props 下发——那是 React 的习惯，Vue 里有更顺手的 `defineModel` 和插槽。

## v-model：双向绑定的完整机制

### 原理拆开看

```vue
<Child v-model="text" />
<!-- 等价于 -->
<Child :modelValue="text" @update:modelValue="text = $event" />
```

子组件要做的：声明接收 `modelValue`，在合适的时机 `emit('update:modelValue', 新值)`。

### defineModel（Vue 3.4+，官方推荐）

上面这套样板被一个编译器宏全包了：

```vue
<!-- 子组件 -->
<script setup>
const model = defineModel({ type: String });        // 自动声明 prop + emit
function onClear() { model.value = ''; }
</script>
<template><input v-model="model" /></template>
```

```vue
<!-- 父组件 -->
<Child v-model="keyword" />
```

支持修饰符透传：`const [model, modifiers] = defineModel({ set(value, oldValue) { if (modifiers.capitalize) return value.charAt(0).toUpperCase() + value.slice(1); return value; } })`。

### 多个 v-model

```vue
<Child v-model:title="bookTitle" v-model:body="bookBody" />
```

子组件用 `defineModel('title')` / `defineModel('body')` 分别接收。`.sync` 修饰符（Vue 2）已死，全部由带参数的 `v-model` 取代。

## 插槽：父组件向子组件"塞内容"

三种形态，逐级增强：

```vue
<!-- 子组件 Layout.vue -->
<template>
  <header><slot name="header">默认标题</slot></header>
  <main><slot>默认内容</slot></main>
  <footer><slot name="footer" :page="2" :total="10">页脚</slot></footer>
</template>
```

```vue
<!-- 父组件使用 -->
<Layout>
  <!-- 1. 默认插槽：无 name 的 slot 接这里 -->
  <p>正文</p>

  <!-- 2. 具名插槽：v-slot 缩写为 # -->
  <template #header><h1>标题</h1></template>

  <!-- 3. 作用域插槽：子组件通过 slot 参数往外"回传"数据 -->
  <template #footer="{ page, total }">
    第 {{ page }} / {{ total }} 页
  </template>
</Layout>
```

- 作用域插槽是 Vue 版的"render prop"：分页器、表格列这类"逻辑在子、展示在父"的场景全靠它。
- `v-slot` 只能用在 `<template>` 上（默认插槽有个例外：直接写在组件上的裸内容视为默认插槽）。
- 判断插槽是否有内容：`v-if="$slots.header"`（Vue 2 的 `$slots.default` 判断方式在 3 里更可靠，编译期不再总是真）。

## 父访问子：ref + defineExpose

`<script setup>` 默认**封闭**——父组件拿不到子内部任何东西。想开放就显式暴露：

```vue
<!-- 子 -->
<script setup>
import { ref } from 'vue';
const count = ref(0);
function reset() { count.value = 0; }
defineExpose({ count, reset });        // 白名单
</script>
```

```vue
<!-- 父 -->
<script setup>
const childEl = ref(null);             // template ref
</script>
<template>
  <Child ref="childEl" />
  <button @click="childEl.reset()">重置子组件</button>   <!-- 挂载后 childEl 是子组件实例 -->
</template>
```

使用边界：能用 props/emits 说清的别用 ref 直捅。`defineExpose` 适合命令式场景——播放器 `play()`、表单 `focusFirst()`、弹窗 `open()`。

## 动态组件与 KeepAlive

```vue
<script setup>
import { shallowRef } from 'vue';
import TabHome from './TabHome.vue';
import TabMe from './TabMe.vue';

const current = shallowRef(TabHome);   // 组件对象用 shallowRef，避免深层响应式代理开销
</script>

<template>
  <!-- 按数据切组件 -->
  <component :is="current" />

  <!-- 配 KeepAlive：切走的组件不销毁，状态保留 -->
  <KeepAlive include="TabHome,TabMe" :max="10">
    <component :is="current" />
  </KeepAlive>
</template>
```

- `:is` 传**组件对象**（导入进来的）或**注册名**（字符串）。
- `KeepAlive` 让被缓存的组件走 `activated/deactivated` 而非 `mounted/unmounted`；`include`/`exclude` 按组件名过滤（组件需 `defineOptions({ name: 'TabHome' })` 声明名字）。
- 典型用途：tab 切换保留各页滚动位置与表单草稿、返回列表页保留列表状态。

## 异步组件与 Suspense

```js
// 路由级懒加载（最常用，见路由页）
const Settings = () => import('./Settings.vue');

// 显式异步组件：带加载/错误态与延迟
import { defineAsyncComponent } from 'vue';
const Heavy = defineAsyncComponent({
  loader: () => import('./Heavy.vue'),
  loadingComponent: Spinner,
  errorComponent: ErrBox,
  delay: 200,          // 200ms 内加载完就不闪 loading
  timeout: 10000,
});
```

配合 `<Suspense>`（实验性）可以给整棵异步子树统一兜底：

```vue
<Suspense>
  <template #default><AsyncTree /></template>
  <template #fallback><Spinner /></template>
</Suspense>
```

## Teleport：把 DOM 传送到组件树之外

弹窗、toast、全屏浮层需要挂在 `<body>` 下躲开父级 `overflow/z-index/transform` 的管辖，但逻辑仍想留在组件里——`Teleport` 就是干这个的：

```vue
<template>
  <button @click="open = true">打开</button>
  <Teleport to="body" :disabled="!mounted">
    <div v-if="open" class="modal">…</div>   <!-- DOM 在 body 下，状态仍归本组件管 -->
  </Teleport>
</template>
```

`defer`（3.5+）等目标元素就绪再传送；多对一场景用 `data` 属性配 `defer` 解决挂载顺序问题。

## provide / inject：跨层依赖注入

```vue
<!-- 祖先 -->
<script setup>
import { provide, readonly, ref } from 'vue';
const theme = ref('dark');
provide('theme', readonly(theme));          // key 用 Symbol 更安全；只读防子组件乱改
</script>

<!-- 任意层后代 -->
<script setup>
import { inject } from 'vue';
const theme = inject('theme', 'light');     // 第二参是默认值（未提供时不报错）
</script>
```

- 与 `props` 的区别：不需要逐层透传，跨 N 层直达；但依赖关系是隐式的。
- 与 Pinia 的区别：provide/inject 适合**组件私有的小范围共享**（主题、表单上下文、封装的 widget 内部）；全局业务状态归 store。
- 典型应用：Element Plus 的 `el-form` → `el-form-item` 校验联动、`el-tabs` → `el-tab-pane`，都是 provide/inject。

## 组件注册

| 方式 | 写法 | 场景 |
| --- | --- | --- |
| 局部（默认） | `<script setup>` 里 `import X from './X.vue'` | 99% 的情况 |
| 全局 | `app.component('MyBtn', {...})` | 确实到处用且想省 import（基础组件库、全局布局件） |
| 自动导入 | `unplugin-vue-components` 扫描目录自动注册 | 中大型项目配 UI 库按需引入 |

全局注册会失去 tree-shaking 与类型提示，别滥用。

## 下一步

- props 为什么只读、响应式怎么追踪 → [响应式与生命周期](/vue/reactivity-lifecycle)
- `v-model` 在原生表单上的行为 → [表单与组件通信](/vue/forms-communication)
