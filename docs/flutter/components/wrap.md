---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Wrap 流式布局

`Wrap` 类似 Row/Column，但子组件排到边界放不下时会自动换行。适合标签云、表情面板。

## 标签自动折行

`spacing` 主轴间距、`runSpacing` 行间距。

```dart
import 'package:flutter/material.dart';

/// 示例: wrap-chips —— 标签自动折行
class WrapChipsDemo extends StatelessWidget {
  const WrapChipsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const tags = ['Flutter', 'Dart', '移动端', '跨平台', '开源', '热重载', 'Widget'];
    return Center(
      child: SizedBox(
        width: 280,
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final t in tags)
              Chip(label: Text(t)),
          ],
        ),
      ),
    );
  }
}
```

## 对齐

`alignment` 控制每行内部排布。

```dart
import 'package:flutter/material.dart';

/// 示例: wrap-alignment —— spaceEvenly 分布
class WrapAlignmentDemo extends StatelessWidget {
  const WrapAlignmentDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Wrap(
          alignment: WrapAlignment.spaceEvenly,
          spacing: 8,
          runSpacing: 8,
          children: [
            Container(width: 60, height: 40, color: Colors.blue),
            Container(width: 60, height: 40, color: Colors.blue),
            Container(width: 60, height: 40, color: Colors.blue),
            Container(width: 60, height: 40, color: Colors.blue),
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
| `direction` | 主轴方向 |
| `alignment` | 主轴对齐 |
| `spacing` | 主轴相邻间距 |
| `runSpacing` | 行间距 |
| `runAlignment` | 交叉轴（行）对齐 |

::: warning Wrap 里不能用 Expanded
`Wrap` 给子的约束是松的，`Expanded`/`Flexible` 在 Wrap 里会报错。要等宽分列改用 `GridView`。
:::
