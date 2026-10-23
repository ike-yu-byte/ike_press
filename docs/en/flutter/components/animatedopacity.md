---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# AnimatedOpacity

`AnimatedOpacity` fades in/out automatically when `opacity` changes. Great for showing/hiding elements with a soft transition instead of a harsh appear/disappear.

## Fade in and out

```dart
import 'package:flutter/material.dart';

/// Example: animatedopacity-toggle —— show/hide transition
class AnimatedOpacityToggleDemo extends StatefulWidget {
  const AnimatedOpacityToggleDemo({super.key});

  @override
  State<AnimatedOpacityToggleDemo> createState() => _AnimatedOpacityToggleDemoState();
}

class _AnimatedOpacityToggleDemoState extends State<AnimatedOpacityToggleDemo> {
  bool _visible = true;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedOpacity(
            opacity: _visible ? 1.0 : 0.0,
            duration: const Duration(milliseconds: 400),
            child: Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.blue.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text('I fade in and out'),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => setState(() => _visible = !_visible),
            child: const Text('Toggle visibility'),
          ),
        ],
      ),
    );
  }
}
```

## Invisible but still occupying space

opacity 0 only makes things unseen — the layout space stays and taps still land. This is the most common mental pitfall.

```dart
import 'package:flutter/material.dart';

/// Example: animatedopacity-placeholder —— hiding doesn't remove the gap
class AnimatedOpacityPlaceholderDemo extends StatefulWidget {
  const AnimatedOpacityPlaceholderDemo({super.key});

  @override
  State<AnimatedOpacityPlaceholderDemo> createState() => _AnimatedOpacityPlaceholderDemoState();
}

class _AnimatedOpacityPlaceholderDemoState extends State<AnimatedOpacityPlaceholderDemo> {
  bool _hide = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Above'),
          AnimatedOpacity(
            opacity: _hide ? 0 : 1,
            duration: const Duration(milliseconds: 300),
            child: Container(height: 80, width: 200, color: Colors.amber),
          ),
          const Text('Below — even when the amber block "vanishes", the two lines keep a gap between them'),
          const SizedBox(height: 16),
          Switch(value: _hide, onChanged: (v) => setState(() => _hide = v)),
        ],
      ),
    );
  }
}
```

## Faded out AND collapsed

After the fade-out, swap in `SizedBox.shrink()`, or use `Visibility` to do it in one step.

```dart
import 'package:flutter/material.dart';

/// Example: animatedopacity-gone —— fully collapsed after fading
class AnimatedOpacityGoneDemo extends StatefulWidget {
  const AnimatedOpacityGoneDemo({super.key});

  @override
  State<AnimatedOpacityGoneDemo> createState() => _AnimatedOpacityGoneDemoState();
}

class _AnimatedOpacityGoneDemoState extends State<AnimatedOpacityGoneDemo> {
  bool _show = true;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedSize( // smooth transition when child size changes, avoiding a "jump"
            duration: const Duration(milliseconds: 300),
            child: AnimatedOpacity(
              opacity: _show ? 1 : 0,
              duration: const Duration(milliseconds: 300),
              child: _show
                  ? Container(height: 80, width: 200, color: Colors.teal)
                  : const SizedBox(width: 200), // after fade-out, no longer occupies height
            ),
          ),
          const SizedBox(height: 16),
          Switch(value: _show, onChanged: (v) => setState(() => _show = v)),
        ],
      ),
    );
  }
}
```

> Readier options: `Visibility(visible: _show, maintainSize: false, replacementBuilder: ...)`, or `AnimatedCrossFade` to fade between two children.

## Sibling implicit animations

```dart
import 'package:flutter/material.dart';

AnimatedOpacity   // opacity
AnimatedDefaultTextStyle // text style transition
// translucent over a background: FadeTransition (explicit) achieves the same effect
```

## Property reference

| Property | Description |
| --- | --- |
| `opacity` | Target opacity 0.0~1.0; any change triggers the animation |
| `duration` | Required |
| `curve` | Animation curve |
| `child` | The content being faded |

## Pitfalls

::: danger opacity 0 ≠ removed
It still occupies layout, still receives taps and focus; if you truly don't want it, conditionally render `SizedBox.shrink()` instead.
:::

::: warning Rapid toggling re-interpolates
Changing opacity mid-animation retweens from the current value — usually fine visually, but watch setState ordering when combined with "delayed removal" logic.
:::

::: info Whole-page fade-in
Route-level fades belong to `PageTransitionsBuilder`/`FadeTransition`; AnimatedOpacity is for single elements.
:::
