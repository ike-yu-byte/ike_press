---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Column 纵向布局

> 🟢 无状态组件 · `StatelessWidget`

`Column` 把子组件沿垂直方向排成一列，与 `Row` 对称，主轴=垂直。

## 基本竖排

```dart
import 'package:flutter/material.dart';

/// 示例: column-basic —— 竖排三块
class ColumnBasicDemo extends StatelessWidget {
  const ColumnBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 120, height: 40, color: Colors.red),
          Container(width: 120, height: 40, color: Colors.green),
          Container(width: 120, height: 40, color: Colors.blue),
        ],
      ),
    );
  }
}
```

## 主轴对齐

`mainAxisAlignment` 控制垂直排布。

```dart
import 'package:flutter/material.dart';

/// 示例: column-main-axis —— spaceAround 分布
class ColumnMainAxisDemo extends StatelessWidget {
  const ColumnMainAxisDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        height: 260,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            Container(width: 120, height: 40, color: Colors.purple),
            Container(width: 120, height: 40, color: Colors.purple),
            Container(width: 120, height: 40, color: Colors.purple),
          ],
        ),
      ),
    );
  }
}
```

## 交叉轴拉伸满宽

`CrossAxisAlignment.stretch` 让子项横向撑满。

```dart
import 'package:flutter/material.dart';

/// 示例: column-stretch —— 子项满宽
class ColumnStretchDemo extends StatelessWidget {
  const ColumnStretchDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 260,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton(onPressed: () {}, child: const Text('全宽按钮 A')),
            ElevatedButton(onPressed: () {}, child: const Text('全宽按钮 B')),
          ],
        ),
      ),
    );
  }
}
```

## 用 Expanded 分配高度

某项吃掉剩余高度。

```dart
import 'package:flutter/material.dart';

/// 示例: column-expanded —— 头部/内容/底部
class ColumnExpandedDemo extends StatelessWidget {
  const ColumnExpandedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        height: 260,
        child: ColoredBox(
          color: Colors.grey.shade200,
          child: Column(
            children: [
              Container(height: 50, color: Colors.blue, child: const Center(child: Text('头部'))),
              const Expanded(child: ColoredBox(color: Colors.white)),
              Container(height: 50, color: Colors.green, child: const Center(child: Text('底部'))),
            ],
          ),
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
| `mainAxisAlignment` | 垂直方向排布 |
| `crossAxisAlignment` | 水平方向对齐 |
| `mainAxisSize` | `max` 撑满 / `min` 收缩 |

::: danger 内容超高会溢出
`Column` 默认撑满父高度，内容超屏会溢出。超高改用 `ListView`，或给某项套 `Expanded`。
:::
