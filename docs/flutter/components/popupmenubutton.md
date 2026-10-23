---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# PopupMenuButton 弹出菜单

`PopupMenuButton` 点击后弹出一小组菜单项（常放 AppBar 右上角的 ⋮），选中某项回调 `onSelected`。

## 基本用法

```dart
import 'package:flutter/material.dart';

/// 示例: popup-basic —— 编辑/删除两项
class PopupBasicDemo extends StatelessWidget {
  const PopupBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PopupMenuButton<String>(
        onSelected: (value) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('点了：$value'), duration: const Duration(seconds: 1)),
          );
        },
        itemBuilder: (context) => const [
          PopupMenuItem(value: 'edit', child: Text('编辑')),
          PopupMenuItem(value: 'delete', child: Text('删除')),
        ],
      ),
    );
  }
}
```

## 自定义触发按钮与偏移

默认按钮是 ⋮，可换 icon 或整个 child；`offset` 控制菜单弹出位置。

```dart
import 'package:flutter/material.dart';

/// 示例: popup-custom-trigger —— 文字按钮触发 + 下方弹出
class PopupCustomTriggerDemo extends StatelessWidget {
  const PopupCustomTriggerDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PopupMenuButton<String>(
        offset: const Offset(0, 48), // 菜单在按钮下方出现
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.blue),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Text('排序方式', style: TextStyle(color: Colors.blue)),
        ),
        itemBuilder: (context) => const [
          PopupMenuItem(value: 'time', child: Text('按时间')),
          PopupMenuItem(value: 'price', child: Text('按价格')),
          PopupMenuItem(value: 'sales', child: Text('按销量')),
        ],
        onSelected: (v) {},
      ),
    );
  }
}
```

## 带图标与分组的菜单

`CheckedPopupMenuItem` 单选项、`PopupMenuDivider` 分组。

```dart
import 'package:flutter/material.dart';

/// 示例: popup-rich —— 图标 + 选中态 + 分隔线
class PopupRichDemo extends StatefulWidget {
  const PopupRichDemo({super.key});

  @override
  State<PopupRichDemo> createState() => _PopupRichDemoState();
}

class _PopupRichDemoState extends State<PopupRichDemo> {
  String _view = 'list';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PopupMenuButton<String>(
        icon: const Icon(Icons.view_array),
        initialValue: _view, // 控制 CheckedPopupMenuItem 勾选态
        onSelected: (v) => setState(() => _view = v),
        itemBuilder: (context) => [
          const CheckedPopupMenuItem(value: 'list', child: Text('列表视图')),
          const CheckedPopupMenuItem(value: 'grid', child: Text('网格视图')),
          const PopupMenuDivider(),
          PopupMenuItem(
            value: 'setting',
            child: const Row(children: [Icon(Icons.tune, size: 18), SizedBox(width: 8), Text('显示设置')]),
          ),
        ],
      ),
    );
  }
}
```

## 回调式（不取值，只做动作）

每项自带 `onTap`，不需要统一 `onSelected` 时用 `onClosed`/空泛型。

```dart
import 'package:flutter/material.dart';

/// 示例: popup-callback —— 每项独立回调
class PopupCallbackDemo extends StatelessWidget {
  const PopupCallbackDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PopupMenuButton<void>(
        itemBuilder: (context) => [
          PopupMenuItem(
            onTap: () => print('分享'),
            child: const Text('分享'),
          ),
          PopupMenuItem(
            onTap: () => print('收藏'),
            child: const Text('收藏'),
          ),
        ],
      ),
    );
  }
}
```

## 启用条件

```dart
import 'package:flutter/material.dart';

/// 示例: popup-disabled —— 禁用态
class PopupDisabledDemo extends StatelessWidget {
  const PopupDisabledDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PopupMenuButton<String>(
        enabled: false, // 置灰不可点（权限不足等场景）
        tooltip: '暂不可用',
        itemBuilder: (context) => const [PopupMenuItem(value: 'a', child: Text('A'))],
      ),
    );
  }
}
```

> 想长按才弹菜单？PopupMenuButton 没有 triggerAction 参数，用 `GestureDetector(onLongPress:) + showMenu()` 自己控制弹出位置即可。

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `itemBuilder` | 必填，返回菜单项 List |
| `onSelected` / `onCanceled` / `onOpened` | 选中 / 取消 / 打开回调 |
| `icon` / `child` / `shape` | 触发按钮外观 |
| `offset` / `position` | 菜单相对按钮偏移 / 覆盖在按钮上还是下方（`PopupMenuPosition.under`） |
| `initialValue` | 配合 `CheckedPopupMenuItem` 显示勾选 |
| `enabled` / `tooltip` | 禁用 / 无障碍与长按提示 |
| `PopupMenuItem(enabled:)` | 单项禁用 |

## 易错点

::: warning 菜单项数量宜少
超过 5-6 项应改用 BottomSheet 列表；PopupMenu 一行行点选体验差。
:::

::: danger 点外部取消不会走 onSelected
用户点遮罩关闭属于 cancel，只有 `onCanceled` 能感知；别把"必然执行"的逻辑放 onSelected 里兜底。
:::

::: info 更 M3 的替代
Material 3 规范里复杂菜单建议 `MenuAnchor`（可嵌套子菜单、自定义打开位置），PopupMenuButton 适合简单动作集。
:::
