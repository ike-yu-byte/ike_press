---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Draggable

> 🔵 Stateful widget · `StatefulWidget`

`Draggable` lets a widget be picked up and dragged; releasing over a `DragTarget` completes a delivery. Common uses: drag-to-reorder, dropping content into zones, tagging/classifying items.

## The pair: Draggable + DragTarget

Drag a box into the drop zone.

```dart
import 'package:flutter/material.dart';

/// Example: drag-target-basic —— full drag-and-deliver flow
class DragTargetBasicDemo extends StatefulWidget {
  const DragTargetBasicDemo({super.key});

  @override
  State<DragTargetBasicDemo> createState() => _DragTargetBasicDemoState();
}

class _DragTargetBasicDemoState extends State<DragTargetBasicDemo> {
  int _received = 0;
  bool _holding = false; // whether a drag hovers over the target (for highlighting)

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          // drag source
          Draggable<String>(
            data: 'box', // carried payload
            feedback: Material(
              color: Colors.transparent,
              child: Container(
                width: 60, height: 60,
                decoration: BoxDecoration(color: Colors.blue, borderRadius: BorderRadius.circular(8)),
                child: const Icon(Icons.dragging, color: Colors.white),
              ),
            ),
            childWhenDragging: Container(
              width: 60, height: 60,
              decoration: BoxDecoration(color: Colors.blue.shade100, borderRadius: BorderRadius.circular(8)),
            ),
            child: Container(
              width: 60, height: 60,
              decoration: BoxDecoration(color: Colors.blue, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.drag_handle, color: Colors.white),
            ),
          ),
          const SizedBox(width: 48),
          // drop target
          DragTarget<String>(
            onWillAcceptWithDetails: (d) {
              setState(() => _holding = true);
              return d.data == 'box'; // return false to reject
            },
            onLeave: (_) => setState(() => _holding = false),
            onMove: (d) {},
            onAcceptWithDetails: (_) {
              setState(() {
                _received++;
                _holding = false;
              });
            },
            builder: (context, candidateData, rejectedData) => Container(
              width: 100,
              height: 100,
              decoration: BoxDecoration(
                color: _holding ? Colors.green.shade100 : Colors.grey.shade200,
                border: Border.all(color: _holding ? Colors.green : Colors.grey, width: 2),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Center(child: Text('Received $_received times')),
            ),
          ),
        ],
      ),
    );
  }
}
```

## Drag anywhere (no target checking)

If you just want "drag something away / throw it out", use one full-screen DragTarget or judge position in onDragEnd.

```dart
import 'package:flutter/material.dart';

/// Example: drag-end-anywhere —— handle on release, no DragTarget needed
class DragEndDemo extends StatefulWidget {
  const DragEndDemo({super.key});

  @override
  State<DragEndDemo> createState() => _DragEndDemoState();
}

class _DragEndDemoState extends State<DragEndDemo> {
  String _log = 'Drag the box anywhere and release';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Draggable<String>(
            data: 'trash',
            feedback: const Material(
              color: Colors.transparent,
              child: Icon(Icons.delete_forever, size: 48, color: Colors.red),
            ),
            onDragEnd: (details) {
              // details.offset: release position; details.didDropToTarget: whether a target was hit
              setState(() => _log = 'Released at (${details.offset.dx.round()}, ${details.offset.dy.round()})');
            },
            child: Container(
              width: 60, height: 60,
              decoration: BoxDecoration(color: Colors.red.shade200, borderRadius: BorderRadius.circular(8)),
              child: const Icon(Icons.delete_outline),
            ),
          ),
          const SizedBox(height: 24),
          Text(_log),
        ],
      ),
    );
  }
}
```

## Multiple sources into one target (dispatch by data)

```dart
import 'package:flutter/material.dart';

/// Example: drag-multi-source —— color sorting game
class DragMultiSourceDemo extends StatefulWidget {
  const DragMultiSourceDemo({super.key});

  @override
  State<DragMultiSourceDemo> createState() => _DragMultiSourceDemoState();
}

class _DragMultiSourceDemoState extends State<DragMultiSourceDemo> {
  final _colors = [Colors.red, Colors.blue, Colors.green];
  Color? _lastDrop;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (final c in _colors)
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 6),
                  child: Draggable<Color>(
                    data: c,
                    feedback: Material(color: Colors.transparent, child: CircleAvatar(backgroundColor: c, radius: 20)),
                    child: CircleAvatar(backgroundColor: c, radius: 24),
                  ),
                ),
            ],
          ),
          const SizedBox(height: 28),
          DragTarget<Color>(
            onAcceptWithDetails: (d) => setState(() => _lastDrop = d.data),
            builder: (context, candidates, rejected) => Container(
              width: 120,
              height: 60,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                border: Border.all(color: candidates.isNotEmpty ? candidates.first : Colors.grey, width: 3),
                borderRadius: BorderRadius.circular(8),
                color: _lastDrop?.withAlpha(30),
              ),
              child: Text(_lastDrop == null ? 'Catch a color' : 'Got $_lastDrop'),
            ),
          ),
        ],
      ),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `data` | Payload carried by the drag (must match the DragTarget generic) |
| `feedback` | The preview widget that follows the finger |
| `childWhenDragging` | Ghost left at the original spot |
| `maxSimultaneousDrags` | Limit concurrent drags |
| `onDragStart` / `onDragEnd` / `onDraggableCanceled` | Lifecycle callbacks (canceled = released off-target) |
| DragTarget `onWillAcceptWithDetails` / `onAcceptWithDetails` | Accept check / post-accept handling (old onWillAccept/onAccept deprecated) |
| DragTarget `builder(candidates, rejected)` | Adapt appearance live from candidate data |

## Pitfalls

::: danger Generics must match
`Draggable<T>` and `DragTarget<T>` with different types never connect (no error thrown — drops just "don't arrive"), wasting hours of debugging.
:::

::: warning feedback needs a Material ancestor
feedback is mounted on the Overlay, outside the original widget tree; forget `Material(color: transparent)` and things like InkWell break.
:::

::: info Don't hand-roll reordering
For list drag-to-reorder use the built-in `ReorderableListView` — it's a finished wrapper over this very drag mechanism.
:::
