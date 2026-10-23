---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# SizedBox 尺寸占位

> 🟢 无状态组件 · `StatelessWidget`

`SizedBox` 强制 `child` 采用固定尺寸；无 `child` 时就是撑间距的占位块。

## 撑出间距

Column / Row 里最常用的间隔方式。

```dart
import 'package:flutter/material.dart';

/// 示例: sizedbox-gap —— 垂直撑间距
class SizedBoxGapDemo extends StatelessWidget {
  const SizedBoxGapDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('标题', style: TextStyle(fontWeight: FontWeight.bold)),
          SizedBox(height: 24), // 撑出 24 的垂直间距
          Text('内容'),
        ],
      ),
    );
  }
}
```

## 固定尺寸盒子

```dart
import 'package:flutter/material.dart';

/// 示例: sizedbox-fixed —— 固定宽高
class SizedBoxFixedDemo extends StatelessWidget {
  const SizedBoxFixedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: SizedBox(
        width: 160,
        height: 80,
        child: ColoredBox(color: Colors.teal),
      ),
    );
  }
}
```

## 全宽

`width: double.infinity` 让子撑满父级宽度。

```dart
import 'package:flutter/material.dart';

/// 示例: sizedbox-infinite —— 全宽按钮
class SizedBoxInfiniteDemo extends StatelessWidget {
  const SizedBoxInfiniteDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: () {},
          child: const Text('全宽按钮'),
        ),
      ),
    );
  }
}
```

## API

| 构造函数/属性 | 说明 |
| --- | --- |
| `width` / `height` | 固定尺寸 |
| `SizedBox.shrink()` | 0×0 空占位 |
| `SizedBox.fromSize(size:)` | 用 Size 给宽高 |

::: tip 条件渲染的空占位用 shrink
不想显示任何东西时返回 `SizedBox.shrink()`，比空 `Container()` 更省且不会误撑。
:::
