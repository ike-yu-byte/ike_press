---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# GestureDetector

`GestureDetector` adds gesture recognition to any widget (tap, double tap, long press, drag, scale, etc.). It **handles logic only and provides zero visual feedback** (no ripple).

## Tap / double tap / long press

```dart
import 'package:flutter/material.dart';

/// Example: gesture-tap —— echo of the three basic tap gestures
class GestureTapDemo extends StatefulWidget {
  const GestureTapDemo({super.key});

  @override
  State<GestureTapDemo> createState() => _GestureTapDemoState();
}

class _GestureTapDemoState extends State<GestureTapDemo> {
  String _last = 'Try tapping me';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          GestureDetector(
            onTap: () => setState(() => _last = 'Single tap'),
            onDoubleTap: () => setState(() => _last = 'Double tap'),
            onLongPress: () => setState(() => _last = 'Long press'),
            child: Container(
              width: 140,
              height: 140,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: Colors.blue.shade100,
                borderRadius: BorderRadius.circular(16),
              ),
              child: const Text('Gesture area', style: TextStyle(fontSize: 16)),
            ),
          ),
          const SizedBox(height: 16),
          Text('Detected: $_last'),
        ],
      ),
    );
  }
}
```

## Dragging (free movement)

`onPanUpdate` delivers an incremental `delta` each frame; accumulate it into an offset.

```dart
import 'package:flutter/material.dart';

/// Example: gesture-drag —— drag the box anywhere
class GestureDragDemo extends StatefulWidget {
  const GestureDragDemo({super.key});

  @override
  State<GestureDragDemo> createState() => _GestureDragDemoState();
}

class _GestureDragDemoState extends State<GestureDragDemo> {
  Offset _pos = const Offset(20, 20);

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        Positioned(
          left: _pos.dx,
          top: _pos.dy,
          child: GestureDetector(
            onPanUpdate: (d) => setState(() => _pos += d.delta),
            child: Container(
              width: 70,
              height: 70,
              decoration: BoxDecoration(color: Colors.orange, borderRadius: BorderRadius.circular(12)),
              child: const Icon(Icons.drag_handle, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }
}
```

## Scaling (pinch)

In `onScaleUpdate`, `details.scale` is the multiplier relative to the gesture start.

```dart
import 'package:flutter/material.dart';

/// Example: gesture-scale —— pinch to zoom an image
class GestureScaleDemo extends StatefulWidget {
  const GestureScaleDemo({super.key});

  @override
  State<GestureScaleDemo> createState() => _GestureScaleDemoState();
}

class _GestureScaleDemoState extends State<GestureScaleDemo> {
  double _scale = 1;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: GestureDetector(
        onScaleUpdate: (d) => setState(() => _scale = (_scale * d.scale).clamp(0.5, 3.0)),
        onScaleEnd: (_) {},
        child: Transform.scale(
          scale: _scale,
          child: Image.network(
            'https://picsum.photos/seed/scale/200/200',
            width: 200,
            height: 200,
          ),
        ),
      ),
    );
  }
}
```

## Hit area and behavior details

```dart
import 'package:flutter/material.dart';

/// Example: gesture-behavior —— opaque makes blank areas tappable too
class GestureBehaviorDemo extends StatelessWidget {
  const GestureBehaviorDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: GestureDetector(
        behavior: HitTestBehavior.opaque, // key: transparent areas take part in hit testing
        onTap: () {},
        child: const Padding(
          padding: EdgeInsets.all(32),
          child: Text('The surrounding padding was untappable by default'),
        ),
      ),
    );
  }
}
```

## The gesture arena (conflicts with scrolling)

With scrollable widgets like ListView in the subtree, gestures "compete"; `excludeFromSemantics` and `dragStartBehavior` are the usual tuning knobs.

```dart
import 'package:flutter/material.dart';

// Common mitigations:
GestureDetector(
  onHorizontalDragUpdate: (d) {},
  dragStartBehavior: DragStartBehavior.down, // start on press (default start is more lenient)
  child: MyDraggableContent(),
)
// For full isolation from a parent scrollable, customize arena loss logic with RawGestureDetector (advanced)
```

## Callback reference

| Callback | Trigger |
| --- | --- |
| `onTapDown` / `onTapUp` / `onTap` / `onTapCancel` | Press / release / valid tap / cancelled after press |
| `onDoubleTap` / `onLongPress` | Double tap / long press |
| `onHorizontalDrag*` / `onVerticalDrag*` | One-axis drag (start/update/end) |
| `onPanStart/Update/End` | Free drag |
| `onScaleStart/Update/End` | Two-finger scale |
| `behavior` | `deferToChild` (default, only the child is hit) / `opaque` (incl. blanks) / `translucent` |

## Pitfalls

::: danger Hit area = child size
A GestureDetector's hit range is exactly its child; a small child is hard to hit. Wrap `Padding`/`SizedBox` to enlarge the tappable zone, **and transparent regions need `behavior: opaque` to receive gestures**.
:::

::: warning Zero visual feedback
For a ripple use `InkWell`; GestureDetector suits pure-logic gestures (drag, scale) or places where Material feedback isn't wanted.
:::

::: info onTap vs InkWell.onTap
For button-like tappable elements prefer semantic widgets (ElevatedButton, InkWell, ListTile.onTap); use GestureDetector to augment gestures on non-buttons.
:::
