---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Row

`Row` places its children side by side horizontally: main axis = horizontal, cross axis = vertical.

## Basic horizontal line

```dart
import 'package:flutter/material.dart';

/// Example: row-basic —— three children in a line
class RowBasicDemo extends StatelessWidget {
  const RowBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(width: 60, height: 60, color: Colors.red),
          Container(width: 60, height: 60, color: Colors.green),
          Container(width: 60, height: 60, color: Colors.blue),
        ],
      ),
    );
  }
}
```

## Main axis alignment

`mainAxisAlignment` controls the horizontal distribution.

```dart
import 'package:flutter/material.dart';

/// Example: row-main-axis —— spaceBetween distribution
class RowMainAxisDemo extends StatelessWidget {
  const RowMainAxisDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Container(width: 50, height: 50, color: Colors.orange),
            Container(width: 50, height: 50, color: Colors.orange),
            Container(width: 50, height: 50, color: Colors.orange),
          ],
        ),
      ),
    );
  }
}
```

## Cross axis alignment

Children of different heights align vertically via `crossAxisAlignment`.

```dart
import 'package:flutter/material.dart';

/// Example: row-cross-axis —— center vertical alignment
class RowCrossAxisDemo extends StatelessWidget {
  const RowCrossAxisDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(width: 50, height: 40, color: Colors.teal),
          Container(width: 50, height: 90, color: Colors.teal),
          Container(width: 50, height: 60, color: Colors.teal),
        ],
      ),
    );
  }
}
```

## Width distribution with Expanded

`Expanded` consumes the remaining width; `flex` distributes it proportionally.

```dart
import 'package:flutter/material.dart';

/// Example: row-expanded —— 1:2 weighted widths
class RowExpandedDemo extends StatelessWidget {
  const RowExpandedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Row(
          children: [
            const Expanded(flex: 1, child: ColoredBox(color: Colors.red, child: SizedBox(height: 50))),
            const Expanded(flex: 2, child: ColoredBox(color: Colors.blue, child: SizedBox(height: 50))),
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
| `children` | Child list |
| `mainAxisAlignment` | Main axis (horizontal) alignment |
| `crossAxisAlignment` | Cross axis (vertical) alignment |
| `mainAxisSize` | `max` fills / `min` shrinks to content |
| `textDirection` | Decides whether start is on the left or right |

::: danger Wrap Text in Expanded inside a Row
A `Row` gives children infinite width; `Text`/`Image` without `Expanded` will overflow.
:::
