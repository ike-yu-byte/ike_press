---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/gridview' # Flutter Web preview URL for this page
---

# GridView

> 🟢 Stateless widget · `StatelessWidget`

`GridView` shows content in a fixed row/column grid -- typical uses are photo walls and app-style icon tiles. It supports lazy building too.

## Fixed column count

`crossAxisCount` sets how many columns per row; the most common choice.

```dart
import 'package:flutter/material.dart';

/// Example: gridview-count —— 3 equal columns
class GridViewCountDemo extends StatelessWidget {
  const GridViewCountDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 260,
        child: GridView.count(
          crossAxisCount: 3,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          padding: const EdgeInsets.all(8),
          children: [
            for (var i = 1; i <= 9; i++)
              Container(
                alignment: Alignment.center,
                color: Colors.blue.shade100,
                child: Text('$i'),
              ),
          ],
        ),
      ),
    );
  }
}
```

## Max cell width (extent)

`maxCrossAxisExtent` caps each cell's width and fits as many columns as possible -- responsive-friendly.

```dart
import 'package:flutter/material.dart';

/// Example: gridview-extent —— cells at most 100 wide, column count auto
class GridViewExtentDemo extends StatelessWidget {
  const GridViewExtentDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        height: 220,
        child: GridView.extent(
          maxCrossAxisExtent: 100,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          padding: const EdgeInsets.all(8),
          children: [
            for (var i = 0; i < 12; i++)
              Container(
                alignment: Alignment.center,
                color: Colors.green.shade100,
                child: Text('$i'),
              ),
          ],
        ),
      ),
    );
  }
}
```

## Lazy builder

For large data sets use `GridView.builder` + a `SliverGridDelegate`.

```dart
import 'package:flutter/material.dart';

/// Example: gridview-builder —— 100 cells built lazily
class GridViewBuilderDemo extends StatelessWidget {
  const GridViewBuilderDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 260,
        child: GridView.builder(
          padding: const EdgeInsets.all(8),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            mainAxisSpacing: 6,
            crossAxisSpacing: 6,
          ),
          itemCount: 100,
          itemBuilder: (context, index) => Container(
            alignment: Alignment.center,
            color: Colors.primaries[index % Colors.primaries.length].shade100,
            child: Text('$index'),
          ),
        ),
      ),
    );
  }
}
```

## Photo wall (aspect ratio + crop)

`childAspectRatio` sets the cell shape; combine with `Image.network` for a photo wall.

```dart
import 'package:flutter/material.dart';

/// Example: gridview-image —— 2-column photo wall
class GridViewImageDemo extends StatelessWidget {
  const GridViewImageDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 300,
        child: GridView.builder(
          padding: const EdgeInsets.all(4),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 4,
            crossAxisSpacing: 4,
            childAspectRatio: 1, // square cells
          ),
          itemCount: 8,
          itemBuilder: (context, index) => Image.network(
            'https://picsum.photos/seed/$index/200/200',
            fit: BoxFit.cover,
          ),
        ),
      ),
    );
  }
}
```

## Constructors at a glance

| Constructor | Use when |
| --- | --- |
| `GridView.count` | Fixed columns per row |
| `GridView.extent` | Fixed max cell width (responsive) |
| `GridView.builder` | Large data, lazy, with a `SliverGridDelegate` |

## Pitfalls

::: danger Main axis must be bounded
Like ListView, a GridView inside a Column needs `Expanded` to give it a definite height, otherwise `unbounded height` is thrown.
:::

::: warning childAspectRatio distorts content
For non-square cells (e.g. two-line cards) tune `childAspectRatio` accordingly or content gets stretched/squashed.
:::
