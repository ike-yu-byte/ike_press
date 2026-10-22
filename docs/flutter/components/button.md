---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Button 按钮

Flutter SDK 内置了一族 Material 按钮组件（`package:flutter/material.dart`），无需任何三方包。它们都派生自 `ButtonStyleButton`，**参数几乎一致，区别只在默认样式**。

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
`RaisedButton` / `FlatButton` / `OutlineButton` / 裸 `MaterialButton` 在 Flutter 3.x 已 deprecated。迁移映射：`RaisedButton → ElevatedButton`、`FlatButton → TextButton`、`OutlineButton → OutlinedButton`。
:::

## 按钮家族

四种文本按钮 + 图标按钮的横向对比。

```dart
/// 示例: button-family —— 按钮家族一览
class ButtonFamilyDemo extends StatelessWidget {
  const ButtonFamilyDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Wrap(
        spacing: 12,
        runSpacing: 12,
        alignment: WrapAlignment.center,
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
      ),
    );
  }
}
```

## 禁用状态

`onPressed` 传 `null` 即禁用——颜色变灰、不响应点击，**不需要**额外的 `disabled` 参数。

```dart
/// 示例: button-disabled —— onPressed 为 null 即禁用
class ButtonDisabledDemo extends StatelessWidget {
  const ButtonDisabledDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const bool canSubmit = false;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ElevatedButton(
            onPressed: canSubmit ? () {} : null, // null 即禁用
            child: const Text('提交（禁用）'),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () {},
            child: const Text('可用'),
          ),
        ],
      ),
    );
  }
}
```

## 图标按钮

`IconButton` 只有图标；`ElevatedButton.icon` / `FilledButton.icon` 等提供图标 + 文字组合。

```dart
/// 示例: button-icon —— 纯图标按钮与图标文字按钮
class ButtonIconDemo extends StatelessWidget {
  const ButtonIconDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(onPressed: () {}, icon: const Icon(Icons.share)),
              IconButton(onPressed: () {}, icon: const Icon(Icons.delete_outline)),
              IconButton(onPressed: () {}, icon: const Icon(Icons.settings)),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.download),
            label: const Text('下载'),
          ),
        ],
      ),
    );
  }
}
```

## 浮动按钮 FAB

放在 `Scaffold.floatingActionButton`，通常是页面单一主行动；`FloatingActionButton.extended` 支持图标 + 文字。

```dart
/// 示例: button-fab —— 普通 FAB 与扩展 FAB
class ButtonFabDemo extends StatelessWidget {
  const ButtonFabDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton(
            onPressed: () {},
            child: const Icon(Icons.add),
          ),
          const SizedBox(height: 16),
          FloatingActionButton.extended(
            onPressed: () {},
            icon: const Icon(Icons.edit),
            label: const Text('写文章'),
          ),
        ],
      ),
    );
  }
}
```

## 加载状态

Flutter 没有内置 `loading` 属性，通用做法是自己换 child 并在加载时禁用点击。

```dart
/// 示例: button-loading —— 提交时切换为进度圈并禁用
class ButtonLoadingDemo extends StatefulWidget {
  const ButtonLoadingDemo({super.key});

  @override
  State<ButtonLoadingDemo> createState() => _ButtonLoadingDemoState();
}

class _ButtonLoadingDemoState extends State<ButtonLoadingDemo> {
  bool _isLoading = false;

  Future<void> _submit() async {
    setState(() => _isLoading = true);
    await Future<void>.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ElevatedButton(
        onPressed: _isLoading ? null : _submit,
        child: _isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Text('提交'),
      ),
    );
  }
}
```

## 自定义样式

每个按钮都有 `style`，更常用的快捷方式是 `组件名.styleFrom()`。

```dart
/// 示例: button-style —— styleFrom 改颜色/尺寸/圆角
class ButtonStyleDemo extends StatelessWidget {
  const ButtonStyleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton(
        onPressed: () {},
        style: FilledButton.styleFrom(
          backgroundColor: Colors.deepOrange,
          foregroundColor: Colors.white,
          minimumSize: const Size(160, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
        ),
        child: const Text('胶囊大按钮'),
      ),
    );
  }
}
```

## 状态样式

需要按悬停/按下/禁用给不同值时，用 `WidgetStateProperty`。

```dart
/// 示例: button-state-style —— WidgetStateProperty 分状态配色
class ButtonStateStyleDemo extends StatelessWidget {
  const ButtonStateStyleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton(
        onPressed: () {},
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) return Colors.grey;
            if (states.contains(WidgetState.pressed)) return Colors.red.shade700;
            if (states.contains(WidgetState.hovered)) return Colors.red.shade300;
            return Colors.red;
          }),
        ),
        child: const Text('悬停/按下变色'),
      ),
    );
  }
}
```

::: tip 全 App 统一风格
不用每处都写 `style`——在 `MaterialApp.theme` 里配置 `elevatedButtonTheme` / `filledButtonTheme` 等，全站按钮一次改齐。
:::

## API

### ElevatedButton / FilledButton / OutlinedButton / TextButton（共有参数）

| 名称 | 类型 | 默认值 | 说明 | 必填 |
| --- | --- | --- | --- | --- |
| onPressed | `VoidCallback?` | 必需 | 点击回调；传 `null` 即禁用 | ✅ |
| onLongPress | `VoidCallback?` | `null` | 长按回调 | 否 |
| onHover | `ValueChanged<bool>?` | `null` | 鼠标悬停回调（Web/桌面端） | 否 |
| style | `ButtonStyle?` | `null` | 样式覆盖，通常用 `.styleFrom()` 构造 | 否 |
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

::: details 想要 iOS 风格按钮？
用 `CupertinoButton`（`package:flutter/cupertino.dart`），它不属于 Material 家族：无阴影概念、按下整体变淡。
:::
