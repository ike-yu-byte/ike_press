---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/container' # Flutter Web preview URL for this page
---

# Container

> 🟢 Stateless widget · `StatelessWidget`

`Container` is the most versatile layout box: one widget handling size, padding, margin, decoration (background/rounding/border/shadow) and alignment at the same time.

## Rounded color block

Background color + rounded corners + inner padding.

```dart
import 'package:flutter/material.dart';

/// Example: container-basic —— rounded background box
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
        child: const Text('Content', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}
```

## Gradient + shadow

`BoxDecoration` supports gradients and drop shadows.

```dart
import 'package:flutter/material.dart';

/// Example: container-decorated —— gradient card with shadow
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
        child: const Text('Gradient + shadow', style: TextStyle(color: Colors.white)),
      ),
    );
  }
}
```

## Bordered box

`Border.all` adds a stroke.

```dart
import 'package:flutter/material.dart';

/// Example: container-border —— with a border
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
        child: const Text('Bordered box'),
      ),
    );
  }
}
```

## API

| Property | Description |
| --- | --- |
| `width` / `height` | Size |
| `color` | Shorthand background color (mutually exclusive with `decoration`) |
| `decoration` | `BoxDecoration`: gradient/rounding/border/shadow |
| `padding` / `margin` | Inner / outer spacing |
| `alignment` | Aligns the child inside the box |
| `transform` | Matrix transform |

::: danger color and decoration are mutually exclusive
Passing both triggers an assertion error. When you need color + rounding/shadow, put the color inside `decoration: BoxDecoration(color: ...)`.
:::
