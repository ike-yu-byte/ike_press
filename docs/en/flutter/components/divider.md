---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/divider' # Flutter Web preview URL for this page
---

# Divider

> 🟢 Stateless widget · `StatelessWidget`

`Divider` draws a horizontal separator line to divide content. Under Material 3 it is a thin line with built-in vertical whitespace.

## Basic divider

```dart
import 'package:flutter/material.dart';

/// Example: divider-basic —— between list items
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
            const ListTile(title: Text('Option one')),
            const Divider(),
            const ListTile(title: Text('Option two')),
          ],
        ),
      ),
    );
  }
}
```

## Indent and thickness

Customize with `indent` / `thickness` / `color`.

```dart
import 'package:flutter/material.dart';

/// Example: divider-styled —— indented, thicker, colored
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

## Divider with label

Flutter has no built-in interrupted divider; compose one with a `Row`.

```dart
import 'package:flutter/material.dart';

/// Example: divider-with-text —— label in the middle
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
              child: Text('OR', style: TextStyle(color: Colors.grey)),
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

| Property | Description |
| --- | --- |
| `height` | Total height occupied (incl. vertical whitespace) |
| `thickness` | Line weight |
| `indent` / `endIndent` | Indent at each end |
| `color` | Line color |

::: tip Vertical lines use VerticalDivider
For a vertical separator use `VerticalDivider`, placed inside a `Row`.
:::
