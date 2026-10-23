---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Container 容器

`Container` 是最"万能"的布局盒子，一个组件同时负责尺寸、padding、margin、装饰（背景/圆角/边框/阴影）、对齐。

## 彩色圆角块

背景色 + 圆角 + 内边距。

```dart
import 'package:flutter/material.dart';

/// 示例: container-basic —— 圆角背景盒子
class ContainerBasicDemo extends StatelessWidget {
  const ContainerBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 200,
        height: 100,
        alignment: Alignment.center,
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.blue,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Text('内容', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}
```

## 渐变 + 阴影

`BoxDecoration` 支持渐变与投影。

```dart
import 'package:flutter/material.dart';

/// 示例: container-decorated —— 渐变阴影卡片
class ContainerDecoratedDemo extends StatelessWidget {
  const ContainerDecoratedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        width: 220,
        height: 120,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Colors.blue, Colors.purple],
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: const [
            BoxShadow(color: Colors.black26, blurRadius: 12, offset: Offset(0, 6)),
          ],
        ),
        child: const Text('渐变阴影', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}
```

## 描边盒子

`Border.all` 加边框。

```dart
import 'package:flutter/material.dart';

/// 示例: container-border —— 带描边
class ContainerBorderDemo extends StatelessWidget {
  const ContainerBorderDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
        decoration: BoxDecoration(
          border: Border.all(color: Colors.orange, width: 2),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Text('描边盒子'),
      ),
    );
  }
}
```

## API

| 属性 | 说明 |
| --- | --- |
| `width` / `height` | 尺寸 |
| `color` | 快捷背景色（与 `decoration` 互斥） |
| `decoration` | `BoxDecoration`：渐变/圆角/边框/阴影 |
| `padding` / `margin` | 内 / 外边距 |
| `alignment` | child 在内部的对齐 |
| `transform` | 矩阵变换 |

::: danger color 与 decoration 二选一
两者同时传会断言报错。需要背景色 + 圆角/阴影时，把颜色写进 `decoration: BoxDecoration(color: ...)`。
:::
