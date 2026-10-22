---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Icon

`Icon` renders a monochrome vector glyph. The Material Icons font set is built in and referenced through the `Icons` static constants.

## Basic icons

Size and color.

```dart
/// Example: icon-basic —— different sizes and colors
class IconBasicDemo extends StatelessWidget {
  const IconBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.favorite, size: 24),
          SizedBox(width: 16),
          Icon(Icons.favorite, size: 36, color: Colors.red),
          SizedBox(width: 16),
          Icon(Icons.favorite_border, size: 36, color: Colors.pink),
        ],
      ),
    );
  }
}
```

## Icon variants

The same glyph comes in `_border` / `_outlined` / `_rounded` / `_sharp` variants.

```dart
/// Example: icon-variants —— filled / outlined / rounded
class IconVariantsDemo extends StatelessWidget {
  const IconVariantsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.home, size: 32),
          SizedBox(width: 20),
          Icon(Icons.home_outlined, size: 32),
          SizedBox(width: 20),
          Icon(Icons.home_rounded, size: 32),
        ],
      ),
    );
  }
}
```

## Icon buttons

`IconButton` adds tap handling and the ripple to an icon.

```dart
/// Example: icon-button —— IconButton
class IconButtonDemo extends StatelessWidget {
  const IconButtonDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.share)),
          IconButton(onPressed: () {}, icon: const Icon(Icons.delete_outline)),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.notifications),
            tooltip: 'Notifications',
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
| `icon` | `IconData` (first positional argument) |
| `size` | Logical pixels, default 24 |
| `color` | Inherits from `IconTheme` when omitted |
| `semanticLabel` | Accessibility readout text |

::: tip Finding icons
Search at [fonts.google.com/icons](https://fonts.google.com/icons) -- one click copies the `Icons.xxx` name.
:::
