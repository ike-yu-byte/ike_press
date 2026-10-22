---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# SizedBox

`SizedBox` forces its `child` to a fixed size; with no child it becomes a pure spacer block.

## Creating gaps

The most common way to add spacing inside Column / Row.

```dart
/// Example: sizedbox-gap —— vertical spacer
class SizedBoxGapDemo extends StatelessWidget {
  const SizedBoxGapDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Title', style: TextStyle(fontWeight: FontWeight.bold)),
          SizedBox(height: 24), // 24 px vertical gap
          Text('Content'),
        ],
      ),
    );
  }
}
```

## Fixed-size box

```dart
/// Example: sizedbox-fixed —— fixed width and height
class SizedBoxFixedDemo extends StatelessWidget {
  const SizedBoxFixedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: SizedBox(
        width: 160,
        height: 80,
        child: ColoredBox(color: Colors.teal),
      ),
    );
  }
}
```

## Full width

`width: double.infinity` stretches the child across the parent's width.

```dart
/// Example: sizedbox-infinite —— full-width button
class SizedBoxInfiniteDemo extends StatelessWidget {
  const SizedBoxInfiniteDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: double.infinity,
        child: ElevatedButton(
          onPressed: () {},
          child: const Text('Full-width button'),
        ),
      ),
    );
  }
}
```

## API

| Constructor / property | Description |
| --- | --- |
| `width` / `height` | Fixed dimensions |
| `SizedBox.shrink()` | 0x0 empty placeholder |
| `SizedBox.fromSize(size:)` | Size given as a `Size` object |

::: tip Use shrink() for empty conditional slots
When nothing should render, return `SizedBox.shrink()` -- cheaper than an empty `Container()` and it never expands by accident.
:::
