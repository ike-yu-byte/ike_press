---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/padding' # Flutter Web preview URL for this page
---

# Padding

> 🟢 Stateless widget · `StatelessWidget`

`Padding` inserts whitespace around its `child`. It only handles spacing -- no background, no sizing -- which makes it lighter than `Container`.

## Padding on all sides

```dart
import 'package:flutter/material.dart';

/// Example: padding-all —— even inset on all sides
class PaddingAllDemo extends StatelessWidget {
  const PaddingAllDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Container(
        color: Colors.blue.shade100,
        child: const Padding(
          padding: EdgeInsets.all(32),
          child: ColoredBox(color: Colors.blue, child: Text('Content')),
        ),
      ),
    );
  }
}
```

## Asymmetric padding

`EdgeInsets.only` / `symmetric` target specific edges.

```dart
import 'package:flutter/material.dart';

/// Example: padding-symmetric —— separate horizontal/vertical
class PaddingSymmetricDemo extends StatelessWidget {
  const PaddingSymmetricDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ColoredBox(
        color: Colors.amber.shade100,
        child: const Padding(
          padding: EdgeInsets.symmetric(horizontal: 40, vertical: 16),
          child: Text('40 horizontal, 16 vertical'),
        ),
      ),
    );
  }
}
```

## API

| Expression | Meaning |
| --- | --- |
| `EdgeInsets.all(12)` | Same inset on all four edges |
| `EdgeInsets.symmetric(h, v)` | Horizontal / vertical |
| `EdgeInsets.only(left: ..)` | Specific edges |
| `EdgeInsets.fromLTRB(l,t,r,b)` | Explicit per edge |

::: tip Use Padding for pure whitespace
`Padding` is lighter than `Container(padding:)`; reach for `Container` only when you also need a background or rounded corners.
:::
