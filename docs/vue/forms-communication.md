# 表单与组件通信

> 表单是 `v-model` 的主战场，也是"双向绑定"魔法最容易翻车的地方；组件通信则是架构功底的体现。这一页前半把 `v-model` 从原理到修饰符到原生控件行为讲全，后半给出一张**七种通信方式的全景选型图**。

## v-model 在原生元素上到底做了什么

```vue
<input v-model="text" />
<!-- 编译后 ≈ -->
<input :value="text" @input="text = $event.target.value" />
```

组件上则是 `:modelValue` + `@update:modelValue`（见[组件系统](/vue/components)）。理解这个展开式，就能解释下面所有"为什么"。

### 修饰符

| 修饰符 | 行为变化 | 什么时候用 |
| --- | --- | --- |
| `.lazy` | 从监听 `input` 改为 `change`（失焦/回车才同步） | 输入即触发昂贵联动时降频；**也顺带解决中文输入法 composition 问题** |
| `.number` | `parseFloat` 后再存 | `<input type="number">` 拿到的永远是字符串，要和数字比较/计算时必加 |
| `.trim` | 去首尾空格后存 | 用户名、标题等提交前清洗 |

```vue
<input v-model.lazy="query" />         <!-- 搜索框防抖友好版 -->
<input v-model.number="age" type="number" />
<input v-model.trim="name" />
<input v-model.trim.number.lazy="code" />   <!-- 可串联 -->
```

::: warning 三个经典坑
1. **`type="number"` 绑定值却是字符串**：`"18" !== 18`，表单校验死活不通过 → 加 `.number`。
2. **未初始化成空串**：`<input v-model="form.name">` 而 `form.name` 是 `undefined`，部分浏览器表现异常 → data/初值里显式给 `''`。
3. **v-model 会吃掉 `value` attribute**：`<input value="默认" v-model="text" />` 里 `value` 无效，默认值写在 `text` 的初始值里。
:::

### 复选框的三种形态

```vue
<!-- 1. 单个布尔 -->
<input type="checkbox" v-model="isAgree" />          <!-- true / false -->

<!-- 2. 多个固定值 → 数组 -->
<input type="checkbox" v-model="langs" value="js" />
<input type="checkbox" v-model="langs" value="dart" /> <!-- langs = ['js','dart'] -->

<!-- 3. 真/假两值 -->
<input type="checkbox" v-model="state" true-value="on" false-value="off" />
```

### 单选与下拉

```vue
<label v-for="opt in options" :key="opt.id">
  <input type="radio" v-model="picked" :value="opt.id" /> {{ opt.label }}
</label>

<select v-model="city">
  <option disabled value="">请选择</option>   <!-- 空值占位项：未选时显示它 -->
  <option v-for="c in cities" :key="c" :value="c">{{ c }}</option>
</select>

<!-- 多选 select：v-model 绑数组 -->
<select v-model="multi" multiple> … </select>

<!-- option 值是对象时，用 :value 绑整个对象 -->
<select v-model="selectedUser">
  <option v-for="u in users" :key="u.id" :value="u">{{ u.name }}</option>
</select>
```

### textarea 与组件上的 v-model

`<textarea v-model="note"></textarea>` 直接可用（textarea 写子节点内容不靠谱，必须用 v-model）。自定义组件上的 `v-model`、`v-model:xxx`、`defineModel` 详见[组件系统](/vue/components)。

## 校验：从手写到方案库

### 小表单：直接 computed + 提交拦截

```vue
<script setup>
import { ref, computed } from 'vue';
const email = ref('');
const touched = ref(false);
const emailErr = computed(() =>
  !email.value ? '必填' : !/^\S+@\S+\.\S+$/.test(email.value) ? '格式不对' : '');
function submit() {
  touched.value = true;
  if (emailErr.value) return;
  // ...发请求
}
</script>
<template>
  <input v-model="email" @blur="touched = true" />
  <p v-if="touched && emailErr" class="err">{{ emailErr }}</p>
</template>
```

规则少就这样，别引库。规则多了再上方案：

| 方案 | 定位 |
| --- | --- |
| **async-validator** | Ant Design Vue 同款规则引擎，纯校验逻辑无 UI 绑定 |
| **VeeValidate** | Vue 生态最完整的表单库：字段管理、校验、错误态、无障碍全打包 |
| **Element Plus / TDesign 的 Form** | UI 库自带 `rules` 校验，中后台项目的事实标准——组件库能解决就别自己造 |

## 组件通信全景：七种方式怎么选

| # | 方式 | 方向 | 适用 | 代价 |
| --- | --- | --- | --- | --- |
| 1 | **props** | 父 → 子 | 一切显式数据下发 | 逐层透传（props drilling） |
| 2 | **emit** | 子 → 父 | 通知"发生了什么"、请求变更 | 父必须监听 |
| 3 | **v-model / defineModel** | 双向 | 表单值、可见性、选中态 | 仅限"一个值"的主通道 |
| 4 | **插槽（含作用域插槽）** | 父 → 子内容 | 子定逻辑骨架、父定展示皮 | 组合复杂度上升 |
| 5 | **ref + defineExpose** | 父 → 子命令 | `open()`/`reset()`/`focus()` 等一次性动作 | 打破封装，慎用 |
| 6 | **provide / inject** | 祖先 → 任意后代 | 跨层的隐式共享（主题、表单上下文） | 依赖关系不显式 |
| 7 | **Pinia** | 任意 ↔ 任意 | 真正的全局业务状态 | 多一层抽象与调试成本 |

### 决策树

```
只有父子两层？
 ├─ 数据下发 ──────────────> props
 ├─ 事件/值回传 ────────────> emit；表单类值 → v-model
 ├─ 内容定制 ──────────────> 插槽
 └─ 命令式动作（打开/重置）──> ref + defineExpose
跨多层、但都在一棵子树内？ ──> provide/inject（组件库上下文常用）
多个不相干组件共享、生命周期长？ ─> Pinia
完全不相干的组件偶发通知？ ─────> 优先"状态提升到共同父"；确实别扭再上 mitt 事件总线
```

### 事件总线：Vue 3 已内置移除

Vue 2 的 `bus.$emit/$on` 在 Vue 3 被删。仍想用总线模式时，用 [mitt](https://github.com/developit/mitt)（300 字节）：

```js
// bus.js
import mitt from 'mitt';
export const bus = mitt();

// 发布者
bus.emit('cart:added', { id: 1 });

// 订阅者（务必卸载时取消！）
import { onBeforeUnmount } from 'vue';
function handler(e) { /* ... */ }
bus.on('cart:added', handler);
onBeforeUnmount(() => bus.off('cart:added', handler));
```

但要有清醒认识：总线是**全局隐式依赖**，事件多了没人说得清"谁发的、谁收的"。能用 props/emit/状态提升/Pinia 表达的都不要开总线。

## 下一步

- 全局状态的正规解法 → [状态管理 Pinia](/vue/state-management)
- 表单大列表的性能处理 → [性能与最佳实践](/vue/performance-best-practices)
