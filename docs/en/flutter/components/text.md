---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/text' # Flutter Web preview URL for this page
---

# Text

> 🟢 Stateless widget · `StatelessWidget`

`Text` renders a piece of text with one uniform style; the styling details live in `TextStyle`.

## Basic styling

Font size, weight, color, letter spacing.

```dart
import 'package:flutter/material.dart';

/// Example: text-style —— headline text style
class TextStyleDemo extends StatelessWidget {
  const TextStyleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text(
        'Hello, Flutter',
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

## Overflow ellipsis

Text longer than `maxLines` gets truncated with an ellipsis.

```dart
import 'package:flutter/material.dart';

/// Example: text-overflow —— clamp to two lines
class TextOverflowDemo extends StatelessWidget {
  const TextOverflowDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 220,
        child: const Text(
          'This is a very long sentence that will be truncated with an ellipsis once it exceeds the configured number of lines, so it never blows the layout apart.',
          maxLines: 2,
          overflow: TextOverflow.ellipsis,
        ),
      ),
    );
  }
}
```

## Rich text

Mixing several styles within one paragraph: `Text.rich` + `TextSpan`.

```dart
import 'package:flutter/material.dart';

/// Example: text-rich —— partially recolored and bolded
class TextRichDemo extends StatelessWidget {
  const TextRichDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Text.rich(
        TextSpan(
          children: [
            TextSpan(text: 'Total ', style: TextStyle(color: Colors.grey)),
            TextSpan(
              text: '12',
              style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 20),
            ),
            TextSpan(text: ' items', style: TextStyle(color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}
```

## Theme inheritance

`DefaultTextStyle` sets a default text style for the whole subtree; child `Text.style` values merge with it.

```dart
import 'package:flutter/material.dart';

/// Example: text-default-style —— one style for the subtree
class TextDefaultStyleDemo extends StatelessWidget {
  const TextDefaultStyleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: DefaultTextStyle(
        style: const TextStyle(fontSize: 18, color: Colors.blue),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [Text('Inherits blue automatically'), Text('No per-widget style')],
        ),
      ),
    );
  }
}
```

## API

| Property | Description |
| --- | --- |
| `data` | The text content (first positional argument) |
| `style` | `TextStyle`: family/size/color/weight etc. |
| `textAlign` | Alignment for multi-line text |
| `maxLines` | Maximum number of lines |
| `overflow` | Overflow strategy: clip / ellipsis / fade / visible |
| `softWrap` | Whether to soft-wrap at the width limit |

::: danger Wrap Text in Expanded inside a Row
A `Text` inside a `Row` without an `Expanded` receives infinite width and throws an overflow error.
:::
