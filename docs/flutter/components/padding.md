---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Padding 内边距

`Padding` 在 `child` 周围插入空白，只管留白，不带背景/尺寸能力，比 `Container` 更轻。

## 四周内边距

```dart
import 'package:flutter/material.dart';

/// 示例: padding-all —— 四周留白
class PaddingAllDemo extends StatelessWidget {
  const PaddingAllDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        color: Colors.blue.shade100,
        child: const Padding(
          padding: EdgeInsets.all(32),
          child: ColoredBox(color: Colors.blue, child: Text('内容')),
        ),
      ),
    );
  }
}
```

## 不对称内边距

`EdgeInsets.only` / `symmetric` 指定不同边。

```dart
import 'package:flutter/material.dart';

/// 示例: padding-symmetric —— 水平/垂直分别设
class PaddingSymmetricDemo extends StatelessWidget {
  const PaddingSymmetricDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ColoredBox(
        color: Colors.amber.shade100,
        child: const Padding(
          padding: EdgeInsets.symmetric(horizontal: 40, vertical: 16),
          child: Text('水平 40，垂直 16'),
        ),
      ),
    );
  }
}
```

## API

| 写法 | 含义 |
| --- | --- |
| `EdgeInsets.all(12)` | 四边相等 |
| `EdgeInsets.symmetric(h, v)` | 水平 / 垂直 |
| `EdgeInsets.only(left: ..)` | 指定边 |
| `EdgeInsets.fromLTRB(l,t,r,b)` | 按顺序 |

::: tip 只要留白用 Padding
`Padding` 比 `Container(padding:)` 更轻；需要背景/圆角才用 `Container`。
:::
