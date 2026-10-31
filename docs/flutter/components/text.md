---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/text' # 该页 Flutter Web 预览地址
---

# Text 文本

> 🟢 无状态组件 · `StatelessWidget`

`Text` 渲染一段具有相同样式的文本，样式细节由 `TextStyle` 承载。

## 基本样式

字号、字重、颜色、字间距。

```dart
import 'package:flutter/material.dart';

/// 示例: text-style —— 标题文本样式
class TextStyleDemo extends StatelessWidget {
  const TextStyleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        '你好，Flutter',
        style: TextStyle(
          fontSize: 24,
          fontWeight: FontWeight.bold,
          color: Colors.black87,
          letterSpacing: 1.5,
        ),
      ),
    );
  }
}
```

## 溢出省略

超长文本按 `maxLines` 截断并显示省略号。

```dart
import 'package:flutter/material.dart';

/// 示例: text-overflow —— 两行截断
class TextOverflowDemo extends StatelessWidget {
  const TextOverflowDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 220,
        child: const Text(
          '这是一段很长很长的文字，超出设定行数后会用省略号截断尾部，避免把布局撑爆。',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }
}
```

## 富文本

一段文字里混排多种样式，用 `Text.rich` + `TextSpan`。

```dart
import 'package:flutter/material.dart';

/// 示例: text-rich —— 局部变色加粗
class TextRichDemo extends StatelessWidget {
  const TextRichDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(text: '共 ', style: TextStyle(color: Colors.grey)),
            TextSpan(
              text: '12',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 20),
            ),
            TextSpan(text: ' 件', style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
```

## 主题继承

`DefaultTextStyle` 给整棵子树设默认文字样式，子 `Text` 的 `style` 会与之合并。

```dart
import 'package:flutter/material.dart';

/// 示例: text-default-style —— 统一子树文字样式
class TextDefaultStyleDemo extends StatelessWidget {
  const TextDefaultStyleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: DefaultTextStyle(
        style: const TextStyle(fontSize: 18, color: Colors.blue),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [Text('自动继承蓝色'), Text('无需逐个设 style')],
        ),
      ),
    );
  }
}
```

## API

| 属性 | 说明 |
| --- | --- |
| `data` | 文本内容（首位置参） |
| `style` | `TextStyle`，字体/字号/颜色/字重等 |
| `textAlign` | 多行对齐方式 |
| `maxLines` | 最大行数 |
| `overflow` | 溢出策略：clip / ellipsis / fade / visible |
| `softWrap` | 是否按宽度软换行 |

::: danger Row 里的 Text 要套 Expanded
`Row` 里的 `Text` 若不加 `Expanded`，会因拿到无限宽度而溢出报错。
:::
