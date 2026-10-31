---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/animatedcontainer' # Flutter Web preview URL for this page
---

# AnimatedContainer

> 🟢 Stateless widget · `StatelessWidget`

Beyond what a plain `Container` does, `AnimatedContainer` **tween-transitions automatically** whenever properties change (size, color, radius, margin, etc.) — no hand-written `AnimationController` needed.

## Toggle size/color on tap

Change properties + setState, let the animation do the rest.

```dart
import 'package:flutter/material.dart';

/// Example: animatedcontainer-toggle —— size, color and radius change together
class AnimatedContainerToggleDemo extends StatefulWidget {
  const AnimatedContainerToggleDemo({super.key});

  @override
  State<AnimatedContainerToggleDemo> createState() => _AnimatedContainerToggleDemoState();
}

class _AnimatedContainerToggleDemoState extends State<AnimatedContainerToggleDemo> {
  bool _big = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 400),
            curve: Curves.easeInOut,
            width: _big ? 180.0 : 80.0,
            height: _big ? 180.0 : 80.0,
            decoration: BoxDecoration(
              color: _big ? Colors.red : Colors.blue,
              borderRadius: BorderRadius.circular(_big ? 90 : 8),
            ),
          ),
          const SizedBox(height: 24),
          FilledButton(
            onPressed: () => setState(() => _big = !_big),
            child: Text(_big ? 'Restore' : 'Grow & morph'),
          ),
        ],
      ),
    );
  }
}
```

## Expandable card (accordion)

List items changing height and background on tap is AnimatedContainer's home turf.

```dart
import 'package:flutter/material.dart';

/// Example: animatedcontainer-expand —— single FAQ accordion item
class AnimatedContainerExpandDemo extends StatefulWidget {
  const AnimatedContainerExpandDemo({super.key});

  @override
  State<AnimatedContainerExpandDemo> createState() => _AnimatedContainerExpandDemoState();
}

class _AnimatedContainerExpandDemoState extends State<AnimatedContainerExpandDemo> {
  bool _expanded = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: _expanded ? Colors.blue.shade50 : Colors.grey.shade100,
            border: Border.all(color: _expanded ? Colors.blue : Colors.transparent),
            borderRadius: BorderRadius.circular(12),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('What is hot reload?', style: TextStyle(fontWeight: FontWeight.bold)),
              if (_expanded) ...[
                const SizedBox(height: 8),
                const Text('Press r after editing code and see results without restarting — a superb dev experience.'),
              ],
              TextButton(
                onPressed: () => setState(() => _expanded = !_expanded),
                child: Text(_expanded ? 'Collapse' : 'Expand'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

## Staggered properties (different durations)

For different rhythms within one change, nest two layers each handling part.

```dart
import 'package:flutter/material.dart';

/// Example: animatedcontainer-stagger —— grow first, recolor later
class AnimatedContainerStaggerDemo extends StatefulWidget {
  const AnimatedContainerStaggerDemo({super.key});

  @override
  State<AnimatedContainerStaggerDemo> createState() => _AnimatedContainerStaggerDemoState();
}

class _AnimatedContainerStaggerDemoState extends State<AnimatedContainerStaggerDemo> {
  bool _on = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            // outer layer drives size (fast)
            duration: const Duration(milliseconds: 200),
            width: _on ? 140.0 : 60.0,
            height: _on ? 140.0 : 60.0,
            child: AnimatedContainer(
              // inner layer drives color (slow, creating a trailing feel)
              duration: const Duration(milliseconds: 600),
              decoration: BoxDecoration(
                color: _on ? Colors.orange : Colors.indigo,
                borderRadius: BorderRadius.circular(16),
              ),
            ),
          ),
          const SizedBox(height: 24),
          Switch(value: _on, onChanged: (v) => setState(() => _on = v)),
        ],
      ),
    );
  }
}
```

## How it works and the family

```dart
import 'package:flutter/material.dart';

// The AnimatedXxx family (same usage pattern):
AnimatedOpacity   // transitions opacity changes
AnimatedPadding   // transitions padding changes
AnimatedAlign     // transitions alignment changes
AnimatedDefaultTextStyle // transitions text style
AnimatedSwitcher  // switch animation when the child is replaced wholesale
```

::: info It's a composite widget
`AnimatedContainer` holds an interpolator per animatable property; during build it starts a tween whenever a property differs from last time. So it **can only animate properties it directly receives** — changes inside a child widget are beyond its reach.
:::

## Property reference

| Property | Description |
| --- | --- |
| `duration` | **Required**, nothing animates without it |
| `curve` | Animation curve, default `Curves.linear` |
| `width/height/margin/padding/alignment/decoration/constraints/color` | All transitionable properties (same as Container) |
| `transform` | Matrix4 transforms can animate too |

## Pitfalls

::: danger duration is mandatory
`AnimatedContainer` requires `duration`; forget it and properties snap instantly. To temporarily disable animation set `Duration.zero`.
:::

::: warning decoration animates as a whole
`BoxDecoration` is rebuilt and interpolated per frame; two wildly different decorations (e.g. adding an image) may error or jump — prefer changing same-kind items like color/borderRadius/border.
:::

::: info Beyond Container
For implicit animations on any numeric value of any widget (no controller), use `TweenAnimationBuilder` (see the next page).
:::
