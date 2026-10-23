---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Row 横向布局

> 🟢 无状态组件 · `StatelessWidget`

`Row` 把子组件沿水平方向排成一行，主轴=水平、交叉轴=垂直。

## 基本横排

```dart
import 'package:flutter/material.dart';

/// 示例: row-basic —— 三个子横排
class RowBasicDemo extends StatelessWidget {
  const RowBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(width: 60, height: 60, color: Colors.red),
          Container(width: 60, height: 60, color: Colors.green),
          Container(width: 60, height: 60, color: Colors.blue),
        ],
      ),
    );
  }
}
```

## 主轴对齐

`mainAxisAlignment` 控制水平排布。

```dart
import 'package:flutter/material.dart';

/// 示例: row-main-axis —— spaceBetween 分布
class RowMainAxisDemo extends StatelessWidget {
  const RowMainAxisDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(width: 50, height: 50, color: Colors.orange),
            Container(width: 50, height: 50, color: Colors.orange),
            Container(width: 50, height: 50, color: Colors.orange),
          ],
        ),
      ),
    );
  }
}
```

## 交叉轴对齐

不同高度子项按 `crossAxisAlignment` 垂直对齐。

```dart
import 'package:flutter/material.dart';

/// 示例: row-cross-axis —— center 垂直居中
class RowCrossAxisDemo extends StatelessWidget {
  const RowCrossAxisDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(width: 50, height: 40, color: Colors.teal),
          Container(width: 50, height: 90, color: Colors.teal),
          Container(width: 50, height: 60, color: Colors.teal),
        ],
      ),
    );
  }
}
```

## 用 Expanded 分配宽度

`Expanded` 吃掉剩余宽度，`flex` 按比例分配。

```dart
import 'package:flutter/material.dart';

/// 示例: row-expanded —— 1:2 权重分宽
class RowExpandedDemo extends StatelessWidget {
  const RowExpandedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Row(
          children: [
            const Expanded(flex: 1, child: ColoredBox(color: Colors.red, child: SizedBox(height: 50))),
            const Expanded(flex: 2, child: ColoredBox(color: Colors.blue, child: SizedBox(height: 50))),
          ],
        ),
      ),
    );
  }
}
```

## API

| 属性 | 说明 |
| --- | --- |
| `children` | 子组件列表 |
| `mainAxisAlignment` | 主轴（水平）对齐 |
| `crossAxisAlignment` | 交叉轴（垂直）对齐 |
| `mainAxisSize` | `max` 撑满 / `min` 收缩 |
| `textDirection` | 决定 start 在左还是右 |

::: danger Row 里的 Text 要套 Expanded
`Row` 给子无限宽度，`Text`/`Image` 不加 `Expanded` 会溢出。
:::
