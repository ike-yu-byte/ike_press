---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# ProgressIndicator

> 🟢 Stateless widget · `StatelessWidget`

Progress indicators come in two flavors: **indeterminate** (spinning, unknown remaining time) and **determinate** (percentage). They map to `CircularProgressIndicator` and `LinearProgressIndicator`.

## Indeterminate progress (loading)

```dart
import 'package:flutter/material.dart';

/// Example: progress-indeterminate —— circular + linear spinners
class ProgressIndeterminateDemo extends StatelessWidget {
  const ProgressIndeterminateDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircularProgressIndicator(),
          SizedBox(height: 24),
          SizedBox(width: 200, child: LinearProgressIndicator()),
          SizedBox(height: 24),
          // custom color and thickness
          CircularProgressIndicator(color: Colors.green, strokeWidth: 6),
        ],
      ),
    );
  }
}
```

## Determinate progress (with value)

Giving `value` (0.0~1.0) switches to determinate mode, filled proportionally.

```dart
import 'package:flutter/material.dart';

/// Example: progress-determinate —— download at 60%
class ProgressDeterminateDemo extends StatelessWidget {
  const ProgressDeterminateDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const progress = 0.6;
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          LinearProgressIndicator(value: progress, minHeight: 10, borderRadius: BorderRadius.all(Radius.circular(5))),
          SizedBox(height: 16),
          CircularProgressIndicator(value: progress),
          SizedBox(height: 8),
          Text('Downloading 60%'),
        ],
      ),
    );
  }
}
```

## Loading/content conditional swap

The most common async page pattern: pick between a loading state and the content state.

```dart
import 'package:flutter/material.dart';

/// Example: progress-conditional —— show content after simulated loading
class ProgressConditionalDemo extends StatefulWidget {
  const ProgressConditionalDemo({super.key});

  @override
  State<ProgressConditionalDemo> createState() => _ProgressConditionalDemoState();
}

class _ProgressConditionalDemoState extends State<ProgressConditionalDemo> {
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    Future.delayed(const Duration(seconds: 2), () {
      if (mounted) setState(() => _loading = false);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: _loading
          ? const Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(),
                SizedBox(height: 12),
                Text('Loading…'),
              ],
            )
          : Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Text('Content ready'),
                const SizedBox(height: 12),
                OutlinedButton(
                  onPressed: () {
                    setState(() => _loading = true);
                    Future.delayed(const Duration(seconds: 2), () {
                      if (mounted) setState(() => _loading = false);
                    });
                  },
                  child: const Text('Reload'),
                ),
              ],
            ),
    );
  }
}
```

## Stepped progress

Newer versions express "done x/total" segment-style progress (M3).

```dart
import 'package:flutter/material.dart';

/// Example: progress-steps —— step progress
class ProgressStepsDemo extends StatelessWidget {
  const ProgressStepsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: SizedBox(
        width: 240,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            LinearProgressIndicator(value: 2 / 5, color: Colors.indigo),
            SizedBox(height: 8),
            Text('Step 2 / 5'),
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
| `value` | null = indeterminate spinner; 0.0~1.0 = determinate progress |
| `color` / `backgroundColor` / `strokeWidth` | Foreground / track / thickness |
| `minHeight` / `semanticsLabel` | Height / accessibility readout |
| borderRadius (Linear) | Rounded progress bar |
| `CircularProgressIndicator(minValue:)` | New-version range progress |

## Pitfalls

::: danger value out of bounds
`value` must be in `[0.0, 1.0]` (debug assertion); divide-by-zero and NaN both crash — clamp division-based progress first.
:::

::: warning Full-screen loading needs Center
Progress widgets try to fill their constraints by default; dropped straight into a Column they stretch huge. Common fix: `Center(child: SizedBox(width: 32, height: 32, child: CircularProgressIndicator()))`.
:::

::: info Tiny spinner inside a button
Button loading state: `ElevatedButton(onPressed: null, child: SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2)))` — passing null for onPressed disables it.
:::
