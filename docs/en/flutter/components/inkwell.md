---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# InkWell

> 🔵 Stateful widget · `StatefulWidget`

`InkWell` adds Material's **tap ripple** to a child widget, with built-in `onTap`/`onLongPress` gestures. It's the standard choice for "tappable custom areas".

## Basic ripple

```dart
import 'package:flutter/material.dart';

/// Example: inkwell-basic —— tap the whole block for a ripple
class InkWellBasicDemo extends StatelessWidget {
  const InkWellBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.blue.shade50, // the ripple paints on the nearest Material
      child: InkWell(
        onTap: () {},
        child: const Padding(
          padding: EdgeInsets.all(32),
          child: Text('Tap me for a ripple', style: TextStyle(fontSize: 16)),
        ),
      ),
    );
  }
}
```

## Rounded clipping

The ripple spreads as a rectangle by default; pair `customBorder` or an outer `clipBehavior` to fit the shape.

```dart
import 'package:flutter/material.dart';

/// Example: inkwell-rounded —— rounded card that's tappable
class InkWellRoundedDemo extends StatelessWidget {
  const InkWellRoundedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      clipBehavior: Clip.antiAlias, // key: clip the ripple to the rounded corners
      child: InkWell(
        onTap: () {},
        child: const Padding(
          padding: EdgeInsets.all(24),
          child: Row(children: [Icon(Icons.photo), SizedBox(width: 12), Text('Tappable media card')]),
        ),
      ),
    );
  }
}
```

## State feedback (selected / hovered)

`radius`, hover color and selected highlight are all customizable; desktop hover works too.

```dart
import 'package:flutter/material.dart';

/// Example: inkwell-states —— hover/selected colors
class InkWellStatesDemo extends StatefulWidget {
  const InkWellStatesDemo({super.key});

  @override
  State<InkWellStatesDemo> createState() => _InkWellStatesDemoState();
}

class _InkWellStatesDemoState extends State<InkWellStatesDemo> {
  bool _selected = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Material(
        color: Colors.grey.shade200,
        child: InkWell(
          onTap: () => setState(() => _selected = !_selected),
          selected: _selected,
          hoverColor: Colors.amber.shade100,
          splashColor: Colors.amber.shade300,
          highlightColor: Colors.amber.withAlpha(60),
          child: Padding(
            padding: const EdgeInsets.all(28),
            child: Text(_selected ? 'Selected (amber)' : 'Tap to select'),
          ),
        ),
      ),
    );
  }
}
```

## The Ink decoration family

To let backgrounds/images "soak up" the ripple (painted on the Ink layer instead of the Material layer), use `Ink`/`ColoredBox` in place of a Container background.

```dart
import 'package:flutter/material.dart';

/// Example: ink-image-reveal —— ripple over an image
class InkImageDemo extends StatelessWidget {
  const InkImageDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Material(
      child: InkWell(
        onTap: () {},
        // Ink lets the background image coexist with the ripple
        child: Ink(
          width: 160,
          height: 100,
          decoration: BoxDecoration(
            image: const DecorationImage(
              image: NetworkImage('https://picsum.photos/seed/ink/320/200'),
              fit: BoxFit.cover,
            ),
            borderRadius: BorderRadius.circular(8),
          ),
        ),
      ),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `onTap` / `onLongPress` / `onDoubleTap` | Gestures (null = untappable, no ripple) |
| `splashColor` / `highlightColor` / `hoverColor` | Press ripple / pressed hold / hover colors |
| `splashFactory` | Ripple style (`InkSparkle`/`InkRipple`, M3 defaults to InkSparkle) |
| `radius` | Max ripple radius |
| `customBorder` | Ripple clipping shape |
| `selected` / `focusColor` | Selected state / focus color (remote/keyboard navigation) |
| `excludeFromSemantics` / `enableFeedback` | Accessibility / haptics |

## Pitfalls

::: danger It must sit on a Material
Ripples paint on the nearest `Material` ancestor. An InkWell directly inside `Container(color: ...)` (which isn't a Material) shows no ripple. Use `Card`/`Scaffold` outside (they bring their own Material), use `Ink` as the background, or wrap `Material(child: InkWell(...))`.
:::

::: warning null onTap kills the ripple
InkWell decides interactivity from non-null callbacks; with all callbacks null it becomes a pure layout widget — no hover/press effects (which is also how the disabled state works).
:::

::: info InkWell vs GestureDetector
Want Material feedback (a button feel): InkWell; only drag/scale gestures: GestureDetector; when both are attached, mind arena ownership (an outer InkWell steals the tap).
:::
