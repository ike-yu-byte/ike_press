---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Center / Align

`Center` and `Align` place a child somewhere inside the parent's space; `Center` is simply `Align(alignment: Alignment.center)`.

## Centering

```dart
import 'package:flutter/material.dart';

/// Example: align-center —— dead center
class AlignCenterDemo extends StatelessWidget {
  const AlignCenterDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 240,
      height: 160,
      child: ColoredBox(
        color: Colors.blue.shade50,
        child: Center(
          child: ElevatedButton(onPressed: () {}, child: const Text('I am centered')),
        ),
      ),
    );
  }
}
```

## Nine-grid alignment

`Alignment` constants pick which corner/edge to hug.

```dart
import 'package:flutter/material.dart';

/// Example: align-corner —— bottom right
class AlignCornerDemo extends StatelessWidget {
  const AlignCornerDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 240,
      height: 160,
      child: ColoredBox(
        color: Colors.grey.shade200,
        child: Align(
          alignment: Alignment.bottomRight,
          child: Container(width: 40, height: 40, color: Colors.red),
        ),
      ),
    );
  }
}
```

## Text-direction-aware alignment

Under RTL languages `Alignment.centerLeft` still pins the physical left edge; to follow the *start* edge use `AlignmentDirectional.centerStart`.

```dart
import 'package:flutter/material.dart';

/// Example: align-text-direction —— flipping with Directionality
class AlignTextDirectionDemo extends StatelessWidget {
  const AlignTextDirectionDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Directionality(
            textDirection: TextDirection.ltr,
            child: SizedBox(
              width: 220,
              height: 70,
              child: ColoredBox(
                color: Colors.blue.shade50,
                child: const Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Text('LTR hugs left'),
                ),
              ),
            ),
          ),
          Directionality(
            textDirection: TextDirection.rtl,
            child: SizedBox(
              width: 220,
              height: 70,
              child: ColoredBox(
                color: Colors.orange.shade50,
                child: const Align(
                  alignment: AlignmentDirectional.centerStart,
                  child: Text('RTL hugs right'),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}
```

## Forced aspect ratio

```dart
import 'package:flutter/material.dart';

/// Example: align-ratio —— a 16:9 box
class AlignRatioDemo extends StatelessWidget {
  const AlignRatioDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 280,
        child: AspectRatio(
          aspectRatio: 16 / 9,
          child: Container(color: Colors.teal, child: const Center(child: Text('16:9'))),
        ),
      ),
    );
  }
}
```

## API

| Property | Description |
| --- | --- |
| `alignment` | `Alignment` / `AlignmentDirectional` constant |
| `widthFactor` / `heightFactor` | Own size = child size x factor |
| `child` | The positioned child |

`AspectRatio`:

| Property | Description |
| --- | --- |
| `aspectRatio` | width / height ratio |

## Pitfalls

::: danger Align needs bounded space
`Align` tries to grow as large as possible; placed unconstrained inside a Column it throws. Wrap it in a SizedBox or use it inside a bounded parent.
:::

::: tip Alignment vs AlignmentDirectional
`Alignment.centerLeft` is a physical position; `AlignmentDirectional.centerStart` is logical (flips under RTL). For internationalized UIs always use the latter.
:::
