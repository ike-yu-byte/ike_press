---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/stack' # Flutter Web preview URL for this page
---

# Stack

> 🟢 Stateless widget · `StatelessWidget`

`Stack` layers children along the Z axis -- later children paint on top. Perfect for badges, overlays and watermarks.

## Image + badge

Use `Positioned` for exact placement.

```dart
import 'package:flutter/material.dart';

/// Example: stack-badge —— red dot badge at top-right
class StackBadgeDemo extends StatelessWidget {
  const StackBadgeDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Stack(
        children: [
          Container(width: 120, height: 120, color: Colors.grey.shade300),
          Positioned(
            top: 0,
            right: 0,
            child: Container(
              width: 24,
              height: 24,
              alignment: Alignment.center,
              decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
              child: const Text('3', style: TextStyle(color: Colors.white, fontSize: 12)),
            ),
          ),
        ],
      ),
    );
  }
}
```

## Alignment-based overlay

Children without `Positioned` are placed by the shared `alignment`.

```dart
import 'package:flutter/material.dart';

/// Example: stack-watermark —— bottom-right watermark
class StackWatermarkDemo extends StatelessWidget {
  const StackWatermarkDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Stack(
        alignment: Alignment.bottomRight,
        children: [
          Image.network('https://picsum.photos/240/160', width: 240, height: 160, fit: BoxFit.cover),
          const Padding(
            padding: EdgeInsets.all(8),
            child: Text('© ike', style: TextStyle(color: Colors.white70)),
          ),
        ],
      ),
    );
  }
}
```

## API

| Property | Description |
| --- | --- |
| `children` | Layered children; later ones paint on top |
| `alignment` | Placement for non-positioned children |
| `fit` | loose wraps content / expand fills the stack |
| `clipBehavior` | How overflow is clipped |

::: tip Positioned does the placement
`Stack` itself never positions children -- use `Positioned` (top/bottom/left/right/width/height) for exact placement.
:::
