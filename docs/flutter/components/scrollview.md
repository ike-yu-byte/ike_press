---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/scrollview' # 该页 Flutter Web 预览地址
---

# SingleChildScrollView 单孩子滚动

> 🔵 有状态组件 · `StatefulWidget`

`SingleChildScrollView` 让**一个**子组件变得可滚动。当你有一整块固定内容（一个 Column、一段长文）需要滚动，但子项数量少、不需要懒加载时用它。

## 纵向滚动长内容

一整屏放不下的 Column，包一层就能滚。

```dart
import 'package:flutter/material.dart';

/// 示例: scrollview-vertical —— 纵向滚一整块 Column
class ScrollViewVerticalDemo extends StatelessWidget {
  const ScrollViewVerticalDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 240,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('标题', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              for (var i = 0; i < 20; i++) Text('第 $i 行内容，超出容器高度即可滚动'),
            ],
          ),
        ),
      ),
    );
  }
}
```

## 横向滚动一行

`scrollDirection: Axis.horizontal` 让一行 Row 横滚（不懒加载的简易横向内容）。

```dart
import 'package:flutter/material.dart';

/// 示例: scrollview-horizontal —— 横向滚一排色块
class ScrollViewHorizontalDemo extends StatelessWidget {
  const ScrollViewHorizontalDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        height: 90,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: const Row(
            children: [
              Text('很长很长的一行内容 '),
              Text('不会换行 '),
              Text('而是横向滚动 '),
              Icon(Icons.arrow_forward),
            ],
          ),
        ),
      ),
    );
  }
}
```

## 顶部对齐（小内容也滚）

内容不足一屏时默认不滚；加 `AlwaysScrollableScrollPhysics` 或 `Center` 撑满处理。

```dart
import 'package:flutter/material.dart';

/// 示例: scrollview-physics —— 内容不满也能下拉回弹
class ScrollViewPhysicsDemo extends StatelessWidget {
  const ScrollViewPhysicsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 200,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              const SizedBox(height: 20),
              const Text('内容比容器短'),
              const SizedBox(height: 8),
              const Text('但仍然可以滚动回弹'),
            ],
          ),
        ),
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `child` | 唯一子组件（多个必须自己包 Column/Row） |
| `scrollDirection` | 滚动方向，默认竖直 |
| `reverse` | 是否反向（内容从底部开始） |
| `padding` | 滚动容器内边距 |
| `physics` | 滚动物理模型（回弹/是否可滚） |
| `controller` | `ScrollController`，可编程跳位、监听偏移 |

## 何时用哪个

| 场景 | 选择 |
| --- | --- |
| 一整块固定内容滚动 | `SingleChildScrollView` |
| 大量同构列表项 | `ListView.builder`（懒加载） |
| 列表 + 头部 + 网格混合滚动 | `CustomScrollView` + Slivers |

## 易错点

::: danger 只能有一个 child
顾名思义它只接受单个 `child`。要放多个，必须自己包进 `Column`/`Row`。若本来就是一组同构列表项，直接用 `ListView` 更合适。
:::

::: warning Column 撑不满时配合 Expanded
内容想**占满视口高度**（如聊天界面底部对齐）时，`SingleChildScrollView` 里的 Column 默认收缩，需 `ConstrainedBox(BoxConstraints(minHeight: 视口高))` + `IntrinsicHeight` 组合处理。
:::
