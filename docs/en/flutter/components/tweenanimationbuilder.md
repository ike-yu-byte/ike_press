---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/tweenanimationbuilder' # Flutter Web preview URL for this page
---

# TweenAnimationBuilder

> 🔵 Stateful widget · `StatefulWidget`

`TweenAnimationBuilder` is the go-to for "lightweight explicit animation": give it a target `tween.end` and it automatically tweens from the current value, feeding each frame's interpolated value back through the callback so you can build widgets. **No hand-written AnimationController, no Ticker mixin.**

## Size tween

Whenever `end` changes, it glides smoothly from the current value.

```dart
import 'package:flutter/material.dart';

/// Example: tween-size —— tap to toggle square between 60~160
class TweenSizeDemo extends StatefulWidget {
  const TweenSizeDemo({super.key});

  @override
  State<TweenSizeDemo> createState() => _TweenSizeDemoState();
}

class _TweenSizeDemoState extends State<TweenSizeDemo> {
  double _target = 60;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 60, end: _target),
            duration: const Duration(milliseconds: 500),
            curve: Curves.easeOutBack,
            builder: (context, value, child) => Container(
              width: value,
              height: value,
              decoration: BoxDecoration(
                color: Colors.blue,
                borderRadius: BorderRadius.circular(8),
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => setState(() => _target = _target == 60 ? 160 : 60),
            child: const Text('Grow / shrink'),
          ),
        ],
      ),
    );
  }
}
```

## Rotation tween

Angle tweens 0 → π, dropped into Transform.rotate inside the builder.

```dart
import 'package:flutter/material.dart';

/// Example: tween-rotate —— tap to rotate 180°
class TweenRotateDemo extends StatefulWidget {
  const TweenRotateDemo({super.key});

  @override
  State<TweenRotateDemo> createState() => _TweenRotateDemoState();
}

class _TweenRotateDemoState extends State<TweenRotateDemo> {
  double _turns = 0;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TweenAnimationBuilder<double>(
            tween: Tween(begin: 0, end: _turns),
            duration: const Duration(milliseconds: 600),
            curve: Curves.easeInOut,
            builder: (context, value, child) => Transform.rotate(
              angle: value * 3.14159, // 0 → π
              child: Container(
                width: 100,
                height: 100,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: Colors.orange, borderRadius: BorderRadius.circular(12)),
                child: const Icon(Icons.arrow_upward, color: Colors.white, size: 40),
              ),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => setState(() => _turns = _turns == 0 ? 1 : 0),
            child: const Text('Flip'),
          ),
        ],
      ),
    );
  }
}
```

## Number roll-up (counter effect)

The type isn't limited to double — `IntTween`, `Color`, custom Tweens all work.

```dart
import 'package:flutter/material.dart';

/// Example: tween-counter —— number rolls from 0 up to target
class TweenCounterDemo extends StatefulWidget {
  const TweenCounterDemo({super.key});

  @override
  State<TweenCounterDemo> createState() => _TweenCounterDemoState();
}

class _TweenCounterDemoState extends State<TweenCounterDemo> {
  int _target = 0;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          TweenAnimationBuilder<int>(
            tween: IntTween(begin: 0, end: _target),
            duration: const Duration(milliseconds: 800),
            builder: (context, value, child) => Text(
              '$value',
              style: const TextStyle(fontSize: 48, fontWeight: FontWeight.bold, color: Colors.indigo),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              OutlinedButton(onPressed: () => setState(() => _target += 100), child: const Text('+100')),
              const SizedBox(width: 12),
              OutlinedButton(onPressed: () => setState(() => _target = 0), child: const Text('Reset')),
            ],
          ),
        ],
      ),
    );
  }
}
```

## Color tween

```dart
import 'package:flutter/material.dart';

/// Example: tween-color —— tap to switch with a color transition
class TweenColorDemo extends StatefulWidget {
  const TweenColorDemo({super.key});

  @override
  State<TweenColorDemo> createState() => _TweenColorDemoState();
}

class _TweenColorDemoState extends State<TweenColorDemo> {
  Color _color = Colors.red;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: TweenAnimationBuilder<Color?>(
        tween: ColorTween(end: _color),
        duration: const Duration(milliseconds: 600),
        builder: (context, value, child) => Container(
          width: 120,
          height: 120,
          decoration: BoxDecoration(color: value, shape: BoxShape.circle),
          child: TextButton(
            onPressed: () => setState(() => _color = _color == Colors.red ? Colors.green : Colors.red),
            child: const Text('Tap to recolor', style: TextStyle(color: Colors.white)),
          ),
        ),
      ),
    );
  }
}
```

## The child parameter: skip rebuilds

Pass the frame-invariant part as `child` so it isn't rebuilt every frame.

```dart
import 'package:flutter/material.dart';

// The third builder parameter child is exactly the top-level child field;
// it is not rebuilt during the animation — put static content in it:
TweenAnimationBuilder<double>(
  tween: Tween(end: _target),
  duration: const Duration(milliseconds: 300),
  builder: (context, value, child) => Transform.scale(
    scale: value,
    child: child, // reused directly, not re-building an Image every frame
  ),
  child: const Image.network('https://picsum.photos/100/100'),
)
```

## Property reference

| Property | Description |
| --- | --- |
| `tween` | `Tween<T>(begin:, end:)`; a changed end restarts the animation |
| `duration` / `curve` | Length and curve |
| `builder(context, value, child)` | Called each frame; value is the current interpolation |
| `child` | Static content passed straight through to builder, avoiding per-frame rebuilds |

## Pitfalls

::: danger begin only applies to the first run
When `end` changes mid-animation it tweens from the **current value**; `begin` only seeds the very first frame. To "reset and re-roll", change the key to force a rebuild.
:::

::: warning It can't pause/reverse/loop
For `pause` / `reverse` / `repeat` semantics you must use an `AnimationController` (see the AnimatedBuilder page); this widget only knows "glide to the new target".
:::

::: info Simulating loops
`Tween(begin: 0, end: 1)` plus a timer flipping `end` can fake a breathing/looping effect, but performance and controllability lose to a controller.
:::
