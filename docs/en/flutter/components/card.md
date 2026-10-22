---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Card

`Card` is a Material surface container with rounded corners, a shadow and inset spacing, grouping related content so it "floats" on the page. It is only a shell -- put anything inside.

## Basic info card

Card + an inner Column makes one content card.

```dart
/// Example: card-basic —— title + body content card
class CardBasicDemo extends StatelessWidget {
  const CardBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Card(
          margin: const EdgeInsets.all(12),
          child: const Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Card title', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                SizedBox(height: 8),
                Text('Card body text. Card only handles the surface styling -- arrange any widget freely inside.'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

## Clickable card

Card itself doesn't handle taps -- embed an `InkWell` (and mind `clipBehavior` so the ripple stays inside the rounded corners).

```dart
/// Example: card-clickable —— whole card tappable with ripple
class CardClickableDemo extends StatelessWidget {
  const CardClickableDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Card(
          clipBehavior: Clip.antiAlias, // ripple clipped to the rounded corners
          child: InkWell(
            onTap: () {},
            child: const Padding(
              padding: EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.photo_album, color: Colors.blue),
                  SizedBox(width: 12),
                  Expanded(child: Text('Tapping anywhere ripples the card')),
                  Icon(Icons.chevron_right),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

## Media card

The classic image-on-top, text-below feed card.

```dart
/// Example: card-media —— image + text + actions
class CardMediaDemo extends StatelessWidget {
  const CardMediaDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 280,
        child: Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              Image.network(
                'https://picsum.photos/seed/card/280/150',
                height: 150,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
              const Padding(
                padding: EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Dali, Yunnan', style: TextStyle(fontWeight: FontWeight.bold)),
                    SizedBox(height: 4),
                    Text('Wind, flowers, snow and moon -- Cangshan and Erhai.', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(right: 8, bottom: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    IconButton(icon: Icon(Icons.favorite_border), onPressed: null),
                    IconButton(icon: Icon(Icons.share), onPressed: null),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

## Shape and elevation

`shape` swaps border/radius, `elevation` sets the shadow level (0 = flat).

```dart
/// Example: card-shape —— different radii and shadows side by side
class CardShapeDemo extends StatelessWidget {
  const CardShapeDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Card(
              elevation: 0, // flat, no shadow
              color: Colors.amber.shade50,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: const BorderSide(color: Colors.amber), // outlined card
              ),
              child: const Padding(padding: EdgeInsets.all(16), child: Text('Outlined + flat')),
            ),
            Card(
              elevation: 8, // deep shadow, lifted
              shape: const StadiumBorder(), // pill shape
              child: const Padding(padding: EdgeInsets.all(16), child: Text('Stadium + deep shadow')),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `child` | Card content (Card adds no padding -- do it yourself) |
| `margin` | Outer spacing |
| `color` / `surfaceTintColor` | Background / M3 tint |
| `elevation` | Shadow level, drives depth |
| `shape` | `RoundedRectangleBorder` / `StadiumBorder` etc. |
| `clipBehavior` | Clips children to the card shape (required for ripples/images on rounded cards) |

## Pitfalls

::: warning Card has no padding
Card leaves no inset; a raw Text hugs the edge. The convention is one inner `Padding` layer.
:::

::: danger Ripples need InkWell
Card is not interactive -- implement `onTap` with `InkWell` / `GestureDetector`. When using ripples always pair `clipBehavior: Clip.antiAlias`, otherwise ink spills over the corners.
:::

::: warning Avoid deep shadows in long lists
Many cards with high `elevation` cost performance on low-end devices; M3 prefers shallow shadows + surface colors for hierarchy.
:::
