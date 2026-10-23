---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# AnimatedBuilder / Explicit animation

> 🔵 Stateful widget · `StatefulWidget`

When you need **full control** over an animation (play, pause, reverse, loop, orchestrating multiple animations), go explicit: `AnimationController` + `AnimatedBuilder`. This is the core of Flutter's animation system — reach for it only when implicit animations (AnimatedXxx) fall short.

## Endless rotation (repeat)

controller `repeat()` + AnimatedBuilder rebuilding each frame.

```dart
import 'package:flutter/material.dart';

/// Example: animated-spin-repeat —— infinitely spinning loader block
class AnimatedSpinDemo extends StatefulWidget {
  const AnimatedSpinDemo({super.key});

  @override
  State<AnimatedSpinDemo> createState() => _AnimatedSpinDemoState();
}

class _AnimatedSpinDemoState extends State<AnimatedSpinDemo>
    with SingleTickerProviderStateMixin {   // supplies vsync
  late final AnimationController _controller = AnimationController(
    duration: const Duration(seconds: 2),
    vsync: this,
  )..repeat(); // loop forever

  @override
  void dispose() {
    _controller.dispose(); // must release
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) => Transform.rotate(
          angle: _controller.value * 2 * 3.14159, // value: 0→1
          child: child, // reuses the child below, not rebuilt each frame
        ),
        child: Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: Colors.blue,
            borderRadius: BorderRadius.circular(12),
          ),
          child: const Icon(Icons.flutter_dash, color: Colors.white),
        ),
      ),
    );
  }
}
```

## Play / pause / reverse control

The value of explicit animation: `pause` / `reverse` / `fling` at any time.

```dart
import 'package:flutter/material.dart';

/// Example: animated-control —— buttons drive enter/exit
class AnimatedControlDemo extends StatefulWidget {
  const AnimatedControlDemo({super.key});

  @override
  State<AnimatedControlDemo> createState() => _AnimatedControlDemoState();
}

class _AnimatedControlDemoState extends State<AnimatedControlDemo>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    duration: const Duration(milliseconds: 500),
    vsync: this,
  );
  late final Animation<Offset> _slide =
      Tween(begin: const Offset(0, 1), end: Offset.zero).animate(
    CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic),
  );

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ClipRect(
            child: SlideTransition(
              position: _slide,
              child: Container(
                width: 200,
                height: 80,
                alignment: Alignment.center,
                decoration: BoxDecoration(color: Colors.teal, borderRadius: BorderRadius.circular(12)),
                child: const Text('I slid in', style: TextStyle(color: Colors.white)),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton(onPressed: () => _controller.forward(), child: const Text('Enter')),
              const SizedBox(width: 8),
              FilledButton.tonal(onPressed: () => _controller.reverse(), child: const Text('Exit')),
              const SizedBox(width: 8),
              OutlinedButton(onPressed: () => _controller.pause(), child: const Text('Pause')),
            ],
          ),
        ],
      ),
    );
  }
}
```

## Multi-animation orchestration (Chain / Interval)

One controller drives several phases: translate first, then scale.

```dart
import 'package:flutter/material.dart';

/// Example: animated-sequence —— Interval-based staging
class AnimatedSequenceDemo extends StatefulWidget {
  const AnimatedSequenceDemo({super.key});

  @override
  State<AnimatedSequenceDemo> createState() => _AnimatedSequenceDemoState();
}

class _AnimatedSequenceDemoState extends State<AnimatedSequenceDemo>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller =
      AnimationController(vsync: this, duration: const Duration(seconds: 2))
        ..repeat(reverse: true); // bounce back and forth

  // first 50% of time moves, last 50% scales
  late final Animation<double> _move =
      CurvedAnimation(parent: _controller, curve: const Interval(0, .5, curve: Curves.easeOut));
  late final Animation<double> _scale =
      CurvedAnimation(parent: _controller, curve: const Interval(.5, 1, curve: Curves.elasticOut));

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: AnimatedBuilder(
        animation: _controller,
        builder: (context, child) => Transform.translate(
          offset: Offset(_move.value * 120 - 60, 0),
          child: Transform.scale(scale: 0.5 + _scale.value * 0.8, child: child),
        ),
        child: Container(width: 60, height: 60, color: Colors.purple),
      ),
    );
  }
}
```

## The ListenableBuilder alternative

Since Flutter 3.10, if you only listen to a value without needing per-frame subtree rebuilds, `ListenableBuilder` reads better; for animations AnimatedBuilder remains the standard.

```dart
import 'package:flutter/material.dart';

// AnimatedBuilder in essence:
// AnimatedBuilder ≈ ListenableBuilder(listenable: animation,
//     builder: (context, child) => ...recompute each frame...)
```

## API reference

| API | Description |
| --- | --- |
| `AnimationController(vsync:, duration:)` | The driver, value 0→1 |
| `.forward()` / `.reverse()` / `.pause()` / `.repeat()` / `.fling()` | Playback control |
| `CurvedAnimation(parent:, curve:)` | Adds a curve to a controller |
| `Tween(begin:, end:).animate(controller)` | Maps 0→1 onto any range |
| `Interval(a, b)` / `CurveChain` | Segmentation and chaining |
| `AnimatedBuilder(animation:, builder:, child:)` | Rebuilds builder each frame; keep static parts in child |

## Pitfalls

::: danger Controllers must be disposed
`AnimationController` owns a `Listenable` + Ticker; forgetting dispose leaks outright; mix in `SingleTickerProviderStateMixin` to supply vsync.
:::

::: warning Multiple controllers need a different mixin
With two or more controllers `SingleTickerProviderStateMixin` asserts; switch to `TickerProviderStateMixin`.
:::

::: info Prefer implicit when it suffices
Plain property transitions (the AnimatedContainer family) and "tween whenever the target changes" (TweenAnimationBuilder) don't need a controller; go explicit only for pause/loop/orchestration.
:::
