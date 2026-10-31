---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/safearea' # Flutter Web preview URL for this page
---

# SafeArea

> 🟢 Stateless widget · `StatelessWidget`

`SafeArea` reads `MediaQuery.padding` and pushes its child inward, away from notches, status bars and bottom gesture bars -- the system's "unsafe" zones -- so content isn't covered. It doesn't take extra space; it just "spends" the existing system insets.

## Basic inset

Without `SafeArea`, content runs to the screen edge and gets hidden under the notch; wrapping it in a `SafeArea` insets the content into the safe zone. (The preview box fakes a device's `padding` to simulate the safe area -- the blue-grey is the exposed "danger zone" background.)

```dart
import 'package:flutter/material.dart';

/// Example: safearea-basic —— fake notch / gesture bar to show the inset
class SafeAreaBasicDemo extends StatelessWidget {
  const SafeAreaBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    // Simulate a device with unsafe zones on all four sides
    const fake = EdgeInsets.fromLTRB(20, 36, 20, 36);
    return MediaQuery(
      data: MediaQuery.of(context).copyWith(padding: fake, viewPadding: fake),
      child: Container(
        color: Colors.blueGrey, // background exposed in the danger zone
        child: const SafeArea(
          child: ColoredBox(
            color: Colors.white,
            child: Center(child: Text('Content pushed into the safe area')),
          ),
        ),
      ),
    );
  }
}
```

## Per-edge switches

`top` / `bottom` / `left` / `right` toggle whether each edge insets (all `true` by default); `minimum` adds an extra minimum inset on top of the safe area.

```dart
import 'package:flutter/material.dart';

/// Example: safearea-edges —— top/bottom/left/right control which edges inset
class SafeAreaEdgesDemo extends StatelessWidget {
  const SafeAreaEdgesDemo({super.key});

  static Widget _cell(String label, bool allEdges) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 12)),
        const SizedBox(height: 4),
        Expanded(
          child: Container(
            color: Colors.blueGrey,
            child: SafeArea(
              top: allEdges,
              bottom: allEdges,
              child: const ColoredBox(color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    const fake = EdgeInsets.fromLTRB(16, 32, 16, 32);
    return MediaQuery(
      data: MediaQuery.of(context).copyWith(padding: fake, viewPadding: fake),
      child: Padding(
        padding: const EdgeInsets.all(8),
        child: Row(
          children: [
            Expanded(child: _cell('All edges', true)),
            const SizedBox(width: 8),
            Expanded(child: _cell('Top/bottom off', false)),
          ],
        ),
      ),
    );
  }
}
```

::: tip You often don't write it by hand
`Scaffold` already keeps `AppBar` and `BottomNavigationBar` out of the safe area. The real need for `SafeArea` is full-bleed content that doesn't use a `Scaffold` structure (custom splash screens, landscape game canvases, etc.).
:::

## Property reference

| Property | Description |
| --- | --- |
| `top` / `bottom` / `left` / `right` | Whether each edge insets; all `true` by default |
| `minimum` | Extra minimum `EdgeInsets` beyond the safe area |
| `maintainBottomViewPadding` | Keep the bottom safe-area inset even when `viewInsets` (keyboard) appear |
| `child` | The child pushed into the safe area |

## Pitfalls

::: warning Depends on MediaQuery.padding
`SafeArea` spends the `MediaQuery` `padding`. If an ancestor uses `MediaQuery.removePadding` to zero a side, `SafeArea` won't inset on that side.
:::

::: info SafeArea vs Padding
`SafeArea`'s inset is decided by the device (varies per model); `Padding` is a fixed value you hardcode. They stack: `SafeArea` keeps content unobstructed, `Padding` handles aesthetic spacing.
:::
