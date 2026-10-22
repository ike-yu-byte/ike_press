---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Column

`Column` stacks its children vertically -- the mirror image of `Row`, with the main axis = vertical.

## Basic vertical stack

```dart
/// Example: column-basic —— three blocks stacked
class ColumnBasicDemo extends StatelessWidget {
  const ColumnBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(width: 120, height: 40, color: Colors.red),
          Container(width: 120, height: 40, color: Colors.green),
          Container(width: 120, height: 40, color: Colors.blue),
        ],
      ),
    );
  }
}
```

## Main axis alignment

`mainAxisAlignment` controls the vertical distribution.

```dart
/// Example: column-main-axis —— spaceAround distribution
class ColumnMainAxisDemo extends StatelessWidget {
  const ColumnMainAxisDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        height: 260,
        child: Column(
          mainAxisAlignment: MainAxisAlignment.spaceAround,
          children: [
            Container(width: 120, height: 40, color: Colors.purple),
            Container(width: 120, height: 40, color: Colors.purple),
            Container(width: 120, height: 40, color: Colors.purple),
          ],
        ),
      ),
    );
  }
}
```

## Stretching children to full width

`CrossAxisAlignment.stretch` makes children fill the horizontal space.

```dart
/// Example: column-stretch —— full-width children
class ColumnStretchDemo extends StatelessWidget {
  const ColumnStretchDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 260,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            ElevatedButton(onPressed: () {}, child: const Text('Full-width button A')),
            ElevatedButton(onPressed: () {}, child: const Text('Full-width button B')),
          ],
        ),
      ),
    );
  }
}
```

## Height distribution with Expanded

One child consumes the remaining height.

```dart
/// Example: column-expanded —— header / body / footer
class ColumnExpandedDemo extends StatelessWidget {
  const ColumnExpandedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        height: 260,
        child: ColoredBox(
          color: Colors.grey.shade200,
          child: Column(
            children: [
              Container(height: 50, color: Colors.blue, child: const Center(child: Text('Header'))),
              const Expanded(child: ColoredBox(color: Colors.white)),
              Container(height: 50, color: Colors.green, child: const Center(child: Text('Footer'))),
            ],
          ),
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
| `mainAxisAlignment` | Vertical distribution |
| `crossAxisAlignment` | Horizontal alignment |
| `mainAxisSize` | `max` fills / `min` shrinks to content |

::: danger Tall content overflows
A `Column` defaults to filling its parent's height; content taller than the screen overflows. Use a `ListView` instead, or wrap one child in `Expanded`.
:::
