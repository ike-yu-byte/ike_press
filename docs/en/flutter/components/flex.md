---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Flex

`Flex` is the underlying implementation of `Row`/`Column`; `direction` picks the main axis. Use it directly only when the layout direction must switch at runtime.

## Vertical (equivalent to Column)

```dart
import 'package:flutter/material.dart';

/// Example: flex-vertical —— vertical direction
class FlexVerticalDemo extends StatelessWidget {
  const FlexVerticalDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Flex(
        direction: Axis.vertical,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 100, height: 40, color: Colors.red),
          Container(width: 100, height: 40, color: Colors.green),
        ],
      ),
    );
  }
}
```

## Switching direction at runtime

Responsive: horizontal on wide screens, vertical on narrow ones.

```dart
import 'package:flutter/material.dart';

/// Example: flex-responsive —— direction based on available width
class FlexResponsiveDemo extends StatelessWidget {
  const FlexResponsiveDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final horizontal = constraints.maxWidth > 400;
        return Flex(
          direction: horizontal ? Axis.horizontal : Axis.vertical,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(width: 80, height: 80, color: Colors.blue),
            Container(width: 80, height: 80, color: Colors.orange),
          ],
        );
      },
    );
  }
}
```

## API

| Property | Description |
| --- | --- |
| `direction` | `Axis.horizontal` / `Axis.vertical` (required) |
| `children` | Child list |
| `mainAxisAlignment` | Main axis alignment |
| `crossAxisAlignment` | Cross axis alignment |

::: info Row / Column cover almost everything
`Flex` only beats writing two Row/Column variants when the arrangement direction must switch conditionally.
:::
