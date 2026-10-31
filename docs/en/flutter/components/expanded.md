---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/expanded' # Flutter Web preview URL for this page
---

# Expanded / Flexible

> 🟢 Stateless widget · `StatelessWidget`

`Expanded` and `Flexible` make one child of Row/Column consume the *remaining* main-axis space; `flex` distributes proportionally. The only difference between the two: `Expanded` forces the child to fill that space, `Flexible` merely loosens the constraint (the child may stay smaller).

## Expanded: fill the remaining space

```dart
import 'package:flutter/material.dart';

/// Example: expanded-fill —— text field eats the remaining width
class ExpandedFillDemo extends StatelessWidget {
  const ExpandedFillDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24),
        child: Row(
          children: [
            const Icon(Icons.person),
            const SizedBox(width: 8),
            const Expanded(child: TextField(decoration: InputDecoration(labelText: 'Username'))),
          ],
        ),
      ),
    );
  }
}
```

## flex ratio distribution

`flex: 1 / 2` splits the remaining space 1:2.

```dart
import 'package:flutter/material.dart';

/// Example: expanded-flex —— 1:2 blue-red split
class ExpandedFlexDemo extends StatelessWidget {
  const ExpandedFlexDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        height: 80,
        child: const Row(
          children: [
            Expanded(flex: 1, child: ColoredBox(color: Colors.blue)),
            Expanded(flex: 2, child: ColoredBox(color: Colors.red)),
          ],
        ),
      ),
    );
  }
}
```

## Flexible: constrain only, don't stretch

In the same 1:2 ratio, the `Flexible` child stays at its intrinsic size instead of filling the slot.

```dart
import 'package:flutter/material.dart';

/// Example: flexible-loose —— Flexible vs Expanded comparison
class FlexibleLooseDemo extends StatelessWidget {
  const FlexibleLooseDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const SizedBox(
            height: 60,
            child: Row(
              children: [
                Flexible(flex: 1, child: ColoredBox(color: Colors.blue)),
                Flexible(flex: 2, child: ColoredBox(color: Colors.blue)),
              ],
            ),
          ),
          const Text('Flexible: blue blocks take 1/3 and 2/3 width each'),
          const SizedBox(height: 8),
          const SizedBox(
            height: 60,
            child: Row(
              children: [
                Expanded(flex: 1, child: ColoredBox(color: Colors.red)),
                Expanded(flex: 2, child: ColoredBox(color: Colors.red)),
              ],
            ),
          ),
          const Text('Expanded: same split but children fill the slots'),
        ],
      ),
    );
  }
}
```

## fill vs tight

`Expanded` defaults to tight constraints; `Flexible` defaults to loose. Use `Expanded` to make a child "fill"; use `Flexible` to keep it from "overflowing".

```dart
import 'package:flutter/material.dart';

/// Example: expanded-fit-compare —— Row with fit: loose / tight
class ExpandedFitDemo extends StatelessWidget {
  const ExpandedFitDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 300,
            child: Row(
              children: [
                Flexible(fit: FlexFit.loose, child: Container(color: Colors.amber, child: const Text('short'))),
                Flexible(fit: FlexFit.loose, child: Container(color: Colors.blueAccent, child: const Text('a somewhat longer text'))),
              ],
            ),
          ),
          const SizedBox(height: 12),
          SizedBox(
            width: 300,
            child: Row(
              children: [
                Expanded(child: Container(color: Colors.amber, child: const Text('short'))),
                Expanded(child: Container(color: Colors.blueAccent, child: const Text('a somewhat longer text'))),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
```

## API

| Property | Expanded / Flexible | Description |
| --- | --- | --- |
| `flex` | Both | Weight, default 1 |
| `fit` | Flexible only | `tight` forces fill / `loose` keeps intrinsic size |
| `child` | Both | The child that takes the remaining space |

## Pitfalls

::: danger Only usable as a direct child of Row/Column/Flex
Wrapping Expanded in another widget before putting it in a Row has no effect and throws.
:::

::: warning Infinite height in a Column
An `Expanded` in a Column needs a height-bounded parent; nesting it inside a ScrollView makes it meaningless and throws.
:::
