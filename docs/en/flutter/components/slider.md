---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Slider

`Slider` lets users drag within a range to pick a value -- volume, brightness, price filters.

## Basic continuous slider

```dart
import 'package:flutter/material.dart';

/// Example: slider-basic —— continuous drag from 0 to 100
class SliderBasicDemo extends StatefulWidget {
  const SliderBasicDemo({super.key});

  @override
  State<SliderBasicDemo> createState() => _SliderBasicDemoState();
}

class _SliderBasicDemoState extends State<SliderBasicDemo> {
  double _value = 30;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Slider(
              value: _value,
              min: 0,
              max: 100,
              onChanged: (v) => setState(() => _value = v),
            ),
            Text('Current: ${_value.toStringAsFixed(1)}'),
          ],
        ),
      ),
    );
  }
}
```

## Discrete steps + bubble label

`divisions` snaps to steps; `label` shows a bubble while dragging.

```dart
import 'package:flutter/material.dart';

/// Example: slider-divisions —— 5-step price picker
class SliderDivisionsDemo extends StatefulWidget {
  const SliderDivisionsDemo({super.key});

  @override
  State<SliderDivisionsDemo> createState() => _SliderDivisionsDemoState();
}

class _SliderDivisionsDemoState extends State<SliderDivisionsDemo> {
  double _price = 50;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Slider(
              value: _price,
              min: 10,
              max: 90,
              divisions: 4, // 10 / 30 / 50 / 70 / 90 five steps
              label: '¥${_price.round()}',
              onChanged: (v) => setState(() => _price = v),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Range slider

Pick a span in one gesture (price range filters).

```dart
import 'package:flutter/material.dart';

/// Example: slider-range —— RangeSlider two-thumb selection
class SliderRangeDemo extends StatefulWidget {
  const SliderRangeDemo({super.key});

  @override
  State<SliderRangeDemo> createState() => _SliderRangeDemoState();
}

class _SliderRangeDemoState extends State<SliderRangeDemo> {
  RangeValues _range = const RangeValues(20, 80);

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RangeSlider(
              values: _range,
              min: 0,
              max: 100,
              divisions: 10,
              labels: RangeLabels(
                '¥${_range.start.round()}',
                '¥${_range.end.round()}',
              ),
              onChanged: (v) => setState(() => _range = v),
            ),
            Text('Range: ¥${_range.start.round()} - ¥${_range.end.round()}'),
          ],
        ),
      ),
    );
  }
}
```

## Commit on release (onChanged vs onChangeEnd)

Only update UI while dragging, fire requests on release -- avoids request storms.

```dart
import 'package:flutter/material.dart';

/// Example: slider-commit —— actually applied only on release
class SliderCommitDemo extends StatefulWidget {
  const SliderCommitDemo({super.key});

  @override
  State<SliderCommitDemo> createState() => _SliderCommitDemoState();
}

class _SliderCommitDemoState extends State<SliderCommitDemo> {
  double _dragging = 40;
  double _applied = 40;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Slider(
              value: _dragging,
              min: 0,
              max: 100,
              onChanged: (v) => setState(() => _dragging = v), // fires continuously while dragging
              onChangeEnd: (v) {
                // "send the request" only after release
                setState(() => _applied = v);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Applied: $v'), duration: const Duration(seconds: 1)),
                );
              },
            ),
            Text('Dragging: ${_dragging.round()}  Applied: ${_applied.round()}'),
          ],
        ),
      ),
    );
  }
}
```

## M3 style (with end icons)

```dart
import 'package:flutter/material.dart';

/// Example: slider-m3-icons —— icons flanking a theme-colored slider
class SliderM3IconsDemo extends StatefulWidget {
  const SliderM3IconsDemo({super.key});

  @override
  State<SliderM3IconsDemo> createState() => _SliderM3IconsDemoState();
}

class _SliderM3IconsDemoState extends State<SliderM3IconsDemo> {
  double _volume = 0.6;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Row(
          children: [
            const Icon(Icons.volume_down),
            Expanded(
              child: Slider(
                value: _volume,
                onChanged: (v) => setState(() => _volume = v),
              ),
            ),
            const Icon(Icons.volume_up),
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
| `value` / `min` / `max` | Current value and bounds; value must lie in [min, max] |
| `divisions` | Number of discrete steps (equal splits) |
| `label` | Bubble text while dragging |
| `onChanged` / `onChangeStart` / `onChangeEnd` | While dragging / on touch-down / on release |
| `inactiveColor` / `activeColor` / `thumbColor` | Unfilled track / filled track / thumb colors |
| `allowedInteraction` | M3: restrict tap/drag interactions |

## Pitfalls

::: danger Out-of-range value asserts and crashes
A `value` outside `[min, max]` throws an assertion in debug mode. Clamp initial and API-populated values first.
:::

::: warning null onChanged means disabled
Same disabled convention as buttons and switches.
:::

::: info Don't fire requests while dragging
`onChanged` fires every frame -- put network calls in `onChangeEnd` or debounce them.
:::
