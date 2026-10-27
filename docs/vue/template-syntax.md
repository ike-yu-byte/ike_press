# 模板语法

> 模板是 Vue 区别于 JSX 派的核心资产：一门为"描述 UI"而生的 DSL。这一页把插值、指令、修饰符、条件与列表渲染一次讲全，重点解释**编译器拿这些声明做了什么**——理解了"魔法"的机制，才知道它的边界在哪。

::: tip 阅读前提：正文里的双大括号
本页凡是在**表格或行内代码**中出现 Vue 插值语法 <span v-pre>`{{ }}`</span> 的地方，都用 `<span v-pre>` 包住——因为 VitePress 本身就是 Vue 应用，正文里的双大括号会被模板编译器当成插值导致构建失败。放在 ``` 围栏代码块里则天然安全。
:::

## 插值：三种形式

| 形式 | 写法 | 编译行为 | 用在哪 |
| --- | --- | --- | --- |
| 文本插值 | <span v-pre>`{{ msg }}`</span> | 生成 `_toDisplayString(...)` 文本节点，**自动 HTML 转义** | 绝大多数场景 |
| 属性绑定 | `:title="msg"`（`v-bind:` 缩写） | 把表达式的值写进 DOM attribute | 绑定任何非文本内容 |
| 原始 HTML | <span v-pre>`v-html="raw"`</span> | 直接写 `innerHTML`，**不转义** | 仅可信内容（见下方警告） |

```vue
<script setup>
const msg = 'Hello';
const url = 'https://vuejs.org';
const html = '<b>加粗</b>';
</script>

<template>
  <p>{{ msg }}</p>                          <!-- 文本 -->
  <a :href="url">链接</a>                    <!-- attribute -->
  <p v-html="html"></p>                     <!-- 原始 HTML，慎用 -->
</template>
```

::: danger v-html 等于关闭 XSS 防护
只在渲染**完全可信**的内容时使用（比如自家 CMS 审核过的富文本）。任何用户输入拼进 `v-html` 都是跨站脚本漏洞。替代方案：先用 DOMPurify 之类库消毒，或干脆渲染成安全的结构化节点。
:::

插值里能写**单个表达式**，不能写语句：

```vue
<p>{{ ok ? '是' : '否' }}</p>       <!-- ✓ 三元是表达式 -->
<p>{{ msg.split('').reverse() }}</p> <!-- ✓ 链式调用是表达式 -->
<p>{{ let x = 1 }}</p>              <!-- ✗ 语句报错 -->
<p>{{ if (ok) '是' }}</p>           <!-- ✗ 语句报错 -->
```

::: warning 模板表达式要克制
<span v-pre>`{{ item.price * count * (1 - discount) }}`</span> 这种一长串应该挪进 `computed`：模板保持"声明什么"，逻辑放在"怎么算"里，才可测试、可复用。官方风格指南对此有明确的 A 级规则。
:::

## v-bind：attribute 绑定的全部形态

```vue
<!-- 静态 vs 动态 -->
<div id="fixed"></div>
<div :id="dynamicId"></div>

<!-- 布尔 attribute：值为 falsy 时整个 attribute 被移除 -->
<button :disabled="isSubmitting">提交</button>

<!-- 绑定一个对象：展开成多个 attribute -->
<div v-bind="attrsObj"></div>       <!-- attrsObj = { id:'a', class:'b' } -->

<!-- 动态 attribute 名 -->
<div :[attrName]="value"></div>     <!-- attrName = 'role' → role="value" -->
```

值会先经过 JS 表达式求值，所以 `:disabled="isSubmitting"` 与 `:disabled="!ok"` 都行；而写成 `disabled="isSubmitting"`（没冒号）只会得到字符串 `"isSubmitting"`——布尔 attribute 只要存在就是 `true`，这是新手最常见的"按钮永远点不动"原因之一。

## class 与 style 的专用绑定

Vue 对 `class`/`style` 做了增强，支持对象/数组语法（原生 `:class="'...'"` 拼字符串也能用，但难维护）：

```vue
<script setup>
const isActive = true;
const hasError = false;
const type = 'primary';
const base = { color: 'red', fontSize: '14px' };
</script>

<template>
  <!-- 对象语法：键是类名，真值才加上 -->
  <div :class="{ active: isActive, 'text-danger': hasError }"></div>
  <!-- → class="active" -->

  <!-- 计算属性返回对象，模板更干净 -->
  <div :class="classObj"></div>
  <!-- const classObj = computed(() => ({ active: isActive, [type]: true })) -->

  <!-- 数组语法：并列多个对象/字符串，可配三元 -->
  <div :class="[base, { active: isActive }, isActive ? 'yes' : 'no']"></div>

  <!-- style 同理，驼峰或连字符键名都支持 -->
  <div :style="[base, { color: 'blue' }]"></div>   <!-- 后者覆盖前者的 color -->
</template>
```

要点：`:style` 数组里**后面的声明覆盖前面的**，这是实现"默认值 + 运行时覆盖"的常用手法。

## 条件渲染：v-if vs v-show

| | `v-if` | `v-show` |
| --- | --- | --- |
| 首次渲染 | 条件为假则**完全不渲染**，不进 DOM | 始终渲染，用 CSS `display` 控制显隐 |
| 切换开销 | 销毁/重建组件与 DOM 子树（含内部状态） | 只改一个 CSS 属性 |
| 适用 | 条件很少改变、需要真正卸载（含状态的弹窗） | 频繁切换、想保留内部状态 |

```vue
<p v-if="type === 'a'">A</p>
<p v-else-if="type === 'b'">B</p>
<p v-else>other</p>

<!-- 不产生额外元素：用 template 承载多节点分支 -->
<template v-if="ok">
  <h1>标题</h1>
  <p>段落</p>
</template>

<!-- v-else 必须紧邻前一个 v-if/v-else-if 兄弟节点，中间不能插注释外的元素 -->
```

::: tip v-if 切换会保留状态吗
不会——默认情况下 Vue 会**复用**结构相同的元素。若两个分支结构相同但语义不同（比如两个只有 `value` 不同的 `<input>`），需要给它们加不同的 `key` 强制重建，否则输入内容会"串台"。这是 `key` 除列表之外的第二个用途。
:::

## 列表渲染：v-for 与 key

```vue
<script setup>
const items = [{ id: 1, name: 'a' }, { id: 2, name: 'b' }];
const user = { name: 'ike', age: 18 };
</script>

<template>
  <!-- 数组：(项, 索引) -->
  <li v-for="(item, i) in items" :key="item.id">{{ i }}: {{ item.name }}</li>

  <!-- 对象：(值, 键, 索引) -->
  <li v-for="(val, key, i) in user" :key="key">{{ key }} = {{ val }}</li>

  <!-- 数字范围 -->
  <span v-for="n in 10" :key="n">{{ n }}</span>

  <!-- 解构直接写在参数位 -->
  <li v-for="{ id, name } in items" :key="id">{{ name }}</li>
</template>
```

### key 到底在解决什么

Vue 更新列表时做**同层 diff**：拿新旧节点列表比对。有稳定 `key` 时，Vue 能准确识别"这一项还是原来那一项"，只做移动；没有 `key`（或用 index 当 `key`）时，Vue 只能按位置就地复用——增删或排序后，位置错位导致：

- 输入框内容跑到别的行上（DOM 复用但值没换）；
- 子组件状态错乱（组件实例被复用给了另一条数据）；
- CSS 过渡动画乱跳。

::: danger 用 index 当 key 是负优化
只要列表会发生**增删或排序**，`key` 就必须用数据自带的稳定唯一 ID。`index` 只在"纯展示、永不重排"的列表里勉强可接受——但那种场景直接不写 `key` 也行（Vue 会退化到就地复用）。
:::

### v-for 与 v-if 不要同时出现在一个元素上

Vue 2 里 `v-for` 优先级更高（先循环再判断，浪费性能）；Vue 3 反过来 `v-if` 优先，但此时 `v-if` 里**访问不到 `v-for` 的项**，直接报错或拿到 undefined。正确做法：

```vue
<!-- ✗ 二选一都不行 -->
<li v-for="u in users" v-if="u.active" :key="u.id">{{ u.name }}</li>

<!-- ✓ 方案 1：过滤交给 computed -->
<li v-for="u in activeUsers" :key="u.id">{{ u.name }}</li>
<!-- const activeUsers = computed(() => users.filter(u => u.active)) -->

<!-- ✓ 方案 2：外层 template 包一层 -->
<template v-for="u in users" :key="u.id">
  <li v-if="u.active">{{ u.name }}</li>
</template>
```

## v-on：事件绑定的完整语法

```vue
<script setup>
function greet(name, e) { console.log(name, e instanceof MouseEvent); }
const count = ref(0);
</script>

<template>
  <button @click="greet('hi', $event)">带参调用</button>  <!-- 内联调用要显式传 $event -->
  <button @click="count++">行内语句</button>
  <button :click="greet">: 是 v-bind 不是监听（会当 attribute 绑）</button>

  <!-- 对象语法：一个元素多事件 -->
  <input @="{ focus: onFocus, blur: onBlur, keyup: onKeyup }" />

  <!-- 动态事件名 -->
  <button @[eventName]="handler"></button>
</template>
```

`@click="handler"` 与 `@click="handler()"` 的差别很关键：前者**传引用**（事件对象自动作为唯一实参），后者是内联调用（需要参数时手写，事件对象通过 `$event` 拿）。写成 `@click="handler(e)"` 而 `e` 未定义会直接报错。

### 修饰符：替代手动 stopPropagation

| 类别 | 修饰符 | 等价于 |
| --- | --- | --- |
| 事件传播 | `.stop` | `e.stopPropagation()` |
| 默认行为 | `.prevent` | `e.preventDefault()` |
| 仅自身 | `.self` | `if (e.target === e.currentTarget)` |
| 只按某个键 | `.exact` | 组合键时排除其他修饰 |
| 次数 | `.once` | 只触发一次 |
| 被动 | `.passive` | `{ passive: true }`（不阻止滚动，提升移动端） |
| 键盘 | `.enter` `.tab` `.delete` `.esc` `.space` `.up/.down/.left/.right` `.win/.ctrl/.alt/.shift/.meta` | 判断 `e.key` |
| 鼠标 | `.left` `.right` `.middle` | 判断按钮 |

```vue
<!-- 顺序有意义：.prevent 与 .stop 无先后差异，但 .exact 必须放最后 -->
<form @submit.prevent="onSubmit">…</form>
<a @click.stop.prevent="doThis"></a>
<input @keyup.esc="cancel" />
<input @keyup.ctrl.s.prevent="save" />     <!-- 组合键 -->
<div @click.self="onlyIfSelf">点背景才触发</div>
```

## 其他指令与自定义

| 指令 | 用途 | 备注 |
| --- | --- | --- |
| `v-pre` | 跳过元素及其所有子节点的编译 | 展示 mustache 原文、加速超大静态内容 |
| `v-once` | 只渲染一次，之后永久静态 | 首屏静态大块省性能 |
| `v-memo` | 子树记忆：依赖数组不变则跳过更新 | `v-for` 里配合大列表，进阶用法 |
| `v-cloak` | 编译完成前隐藏未编译模板 | 仅无构建步骤（CDN 直用）时需要 |
| `v-else` / `v-else-if` | 条件分支 | 必须紧邻 `v-if` 兄弟 |
| `v-slot`（`#` 缩写） | 插槽 | 见[组件系统](/vue/components) |

自定义指令（注册 `v-focus` 这类）在组合式 API 下用 `app.directive('focus', { mounted(el) { el.focus(); } })`，钩子名与组件生命周期对应（`created`/`mounted`/`updated`/`unmounted` 等）。用得不多，但需要直接操作 DOM 又不想封装组件时很顺手。

## 下一步

- 模板里的派生值怎么算 → [计算属性与侦听器](/vue/computed-watch)
- 数据改了视图为什么知道 → [响应式与生命周期](/vue/reactivity-lifecycle)
