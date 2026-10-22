---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # Flutter Web 预览地址，留空则显示占位框
---

# Button 按钮

Flutter SDK 内置了一族 Material 按钮组件（`package:flutter/material.dart`），无需任何三方包。它们共享同一条血统——都派生自 `ButtonStyleButton`，因此**参数几乎完全一致，区别只是默认样式**。

Material 3 规范下的分工：

| 组件 | 视觉 | 典型场景 |
| --- | --- | --- |
| `FilledButton` | 实心填充（主色底、主色文字） | 页面最高优先级操作（提交、保存） |
| `ElevatedButton` | 实心填充 + 阴影 | 需要浮起强调的操作 |
| `OutlinedButton` | 透明底 + 描边 | 次要操作 |
| `TextButton` | 纯文字，无底无边 | 最轻量操作（对话框按钮、取消） |
| `IconButton` | 只有图标 | 工具栏、紧凑操作区 |
| `FloatingActionButton` | 圆形浮动按钮 | 页面单一主行动（新建、发送） |

::: warning 已废弃
`RaisedButton` / `FlatButton` / `OutlineButton` / 裸 `MaterialButton` 在 Flutter 3.x 中已标记 deprecated，新代码一律使用上表组件。老项目迁移映射：`RaisedButton → ElevatedButton`、`FlatButton → TextButton`、`OutlineButton → OutlinedButton`。
:::

## 基本用法

```dart
ElevatedButton(
  onPressed: () => print('点击了'),
  child: const Text('主要按钮'),
)
```

::: tip 禁用的正确姿势
`onPressed`（以及 `onLongPress`）传 `null` 时按钮自动进入禁用态——颜色变灰、不再响应点击，**不需要**额外的 `disabled` 布尔参数：

```dart
ElevatedButton(
  onPressed: _canSubmit ? _submit : null, // null 即禁用
  child: const Text('提交'),
)
```
:::

## 按钮家族一览

```dart
Column(
  crossAxisAlignment: CrossAxisAlignment.start,
  children: [
    FilledButton(onPressed: () {}, child: const Text('Filled')),
    ElevatedButton(onPressed: () {}, child: const Text('Elevated')),
    OutlinedButton(onPressed: () {}, child: const Text('Outlined')),
    TextButton(onPressed: () {}, child: const Text('Text')),
    IconButton(
      onPressed: () {},
      icon: const Icon(Icons.favorite_border),
      tooltip: '收藏',
    ),
  ],
)
```

## 扩展按钮（Extended FAB）

`FloatingActionButton.extended` 支持图标 + 文字组合，宽度自适应：

```dart
FloatingActionButton.extended(
  onPressed: () {},
  icon: const Icon(Icons.edit),
  label: const Text('写文章'),
)
```

## 加载状态

Flutter 没有内置 `loading` 属性，社区通用做法是**自己换 child**并禁用点击：

```dart
ElevatedButton(
  onPressed: _isLoading ? null : _submit,
  child: _isLoading
      ? const SizedBox(
          height: 20,
          width: 20,
          child: CircularProgressIndicator(strokeWidth: 2),
        )
      : const Text('提交'),
)
```

## 自定义样式

每个按钮都有 `style` 属性，接收 `ButtonStyle`；更常用的快捷方式是 `组件名.styleFrom()`：

```dart
FilledButton(
  onPressed: () {},
  style: FilledButton.styleFrom(
    backgroundColor: Colors.deepOrange,   // 背景
    foregroundColor: Colors.white,        // 文字/图标
    minimumSize: const Size(120, 48),     // 最小尺寸（近似"大按钮"）
    shape: RoundedRectangleBorder(
      borderRadius: BorderRadius.circular(24), // 圆角（近似"胶囊"）
    ),
  ),
  child: const Text('自定义'),
)
```

需要按状态给不同值（悬停/按下/禁用变色）时，用 `WidgetStateProperty`：

```dart
FilledButton(
  onPressed: () {},
  style: ButtonStyle(
    backgroundColor: WidgetStateProperty.resolveWith((states) {
      if (states.contains(WidgetState.disabled)) return Colors.grey;
      if (states.contains(WidgetState.pressed)) return Colors.red.shade700;
      if (states.contains(WidgetState.hovered)) return Colors.red.shade300;
      return Colors.red;
    }),
  ),
  child: const Text('状态样式'),
)
```

::: tip 全 App 统一风格
不用每处都写 `style`——在 `MaterialApp.theme` 里配置 `elevatedButtonTheme` / `filledButtonTheme` 等 `ButtonStyleFrom`，全站按钮一次改齐。
:::

## API

### ElevatedButton / FilledButton / OutlinedButton / TextButton（共有参数）

| 名称 | 类型 | 默认值 | 说明 | 必填 |
| --- | --- | --- | --- | --- |
| onPressed | `VoidCallback?` | 必需 | 点击回调；传 `null` 即禁用 | ✅ |
| onLongPress | `VoidCallback?` | `null` | 长按回调 | 否 |
| onHover | `ValueChanged<bool>?` | `null` | 鼠标悬停回调（Web/桌面端） | 否 |
| onFocusChange | `ValueChanged<bool>?` | `null` | 焦点变化回调 | 否 |
| style | `ButtonStyle?` | `null` | 样式覆盖，通常用 `.styleFrom()` 构造 | 否 |
| focusNode | `FocusNode?` | `null` | 焦点节点（遥控器/键盘导航） | 否 |
| autofocus | `bool` | `false` | 进入页面时自动获取焦点 | 否 |
| clipBehavior | `Clip` | `none` | 裁剪行为，配 `shape` 圆角裁溢出用 | 否 |
| child | `Widget` | 必需 | 按钮内容，一般是 `Text` | ✅ |

### IconButton

| 名称 | 类型 | 默认值 | 说明 | 必填 |
| --- | --- | --- | --- | --- |
| icon | `Widget` | 必需 | 图标，一般是 `Icon` | ✅ |
| onPressed | `VoidCallback?` | 必需 | 点击回调，`null` 即禁用 | ✅ |
| iconSize | `double` | `24.0` | 图标尺寸 | 否 |
| color | `Color?` | `null` | 图标颜色（覆盖主题） | 否 |
| tooltip | `String?` | `null` | 长按/悬停提示文字 | 否 |
| style | `ButtonStyle?` | `null` | 同家族 `style` | 否 |

### FloatingActionButton

| 名称 | 类型 | 默认值 | 说明 | 必填 |
| --- | --- | --- | --- | --- |
| onPressed | `VoidCallback?` | 必需 | 点击回调，`null` 即禁用 | ✅ |
| child | `Widget?` | `null` | 内容（通常是一个 `Icon`） | 否 |
| heroTag | `Object?` | 自动 | `Hero` 动画标识，同屏多个 FAB 时需区分 | 否 |
| tooltip | `String?` | `null` | 提示文字 | 否 |
| shape | `ShapeBorder?` | 圆形 | 外形，可改 `StadiumBorder` 等 | 否 |

## 常见问题

::: details 文字为什么自动全大写？
Material 2 主题下按钮 `textTransform` 默认大写英文。Material 3（Flutter 3.16+ 默认）已取消；M2 主题可用 `styleFrom(textCase: TextCase.none)` 关闭。中文无此问题。
:::

::: details 点击区域太小怎么办？
按钮最小命中区是 48×48（Kotlin/Swift 平台规范），如果视觉上更小，是外层布局压缩所致——检查是否被 `Row` 挤压，或用 `minimumSize` 撑开。
:::

::: details 想要 iOS 风格按钮？
用 `CupertinoButton`（`package:flutter/cupertino.dart`），它不属于 Material 家族：无阴影概念、按下整体变淡，参数是 `onPressed` / `child` / `padding` / `decoration`。
:::
