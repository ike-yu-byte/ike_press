---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/divider' # 该页 Flutter Web 预览地址
---

# Divider 分割线

> 🟢 无状态组件 · `StatelessWidget`

`Divider` 画一条水平分隔线，区隔内容。Material 3 下默认细线带上下留白。

## 基本分割线

```dart
import 'package:flutter/material.dart';

/// 示例: divider-basic —— 列表项之间
class DividerBasicDemo extends StatelessWidget {
  const DividerBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 280,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ListTile(title: Text('选项一')),
            const Divider(),
            const ListTile(title: Text('选项二')),
          ],
        ),
      ),
    );
  }
}
```

## 缩进与粗细

`indent` / `thickness` / `color` 定制。

```dart
import 'package:flutter/material.dart';

/// 示例: divider-styled —— 缩进加粗变色
class DividerStyledDemo extends StatelessWidget {
  const DividerStyledDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: SizedBox(
        width: 280,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Divider(thickness: 3, color: Colors.orange, indent: 40, endIndent: 40),
            SizedBox(height: 16),
            Divider(thickness: 1, color: Colors.grey),
          ],
        ),
      ),
    );
  }
}
```

## 带文字分割线

Flutter 无内置打断式分割线，用 `Row` 拼。

```dart
import 'package:flutter/material.dart';

/// 示例: divider-with-text —— 中间放文字
class DividerTextDemo extends StatelessWidget {
  const DividerTextDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: SizedBox(
        width: 280,
        child: Row(
          children: [
            Expanded(child: Divider()),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 12),
              child: Text('或', style: TextStyle(color: Colors.grey)),
            ),
            Expanded(child: Divider()),
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
| `height` | 分割线占据的总高度（含上下留白） |
| `thickness` | 线的粗细 |
| `indent` / `endIndent` | 两端缩进 |
| `color` | 线颜色 |

::: tip 竖线用 VerticalDivider
要竖向分隔线用 `VerticalDivider`，放在 `Row` 里。
:::
