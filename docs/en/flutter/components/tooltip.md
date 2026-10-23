---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Tooltip

`Tooltip` attaches a hover/long-press hint to a widget, most often used to explain what an icon button does.

## Basic hint

Shown on mouse hover for desktop, on long press for mobile.

```dart
import 'package:flutter/material.dart';

/// Example: tooltip-basic —— icon with explanation
class TooltipBasicDemo extends StatelessWidget {
  const TooltipBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Tooltip(
        message: 'This is the favorite button',
        child: Icon(Icons.favorite, size: 32),
      ),
    );
  }
}
```

## Trigger mode and timing

`triggerMode` switches to tap triggering; `waitDuration` / `showDuration` control the rhythm.

```dart
import 'package:flutter/material.dart';

/// Example: tooltip-trigger —— tap to show, custom duration
class TooltipTriggerDemo extends StatelessWidget {
  const TooltipTriggerDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Tooltip(
        message: 'A hint that appears on tap',
        triggerMode: TooltipTriggerMode.tap, // tap / longPress / manual
        showDuration: Duration(seconds: 2),
        child: Icon(Icons.info_outline),
      ),
    );
  }
}
```

## Position and style

```dart
import 'package:flutter/material.dart';

/// Example: tooltip-style —— preferBelow + custom decoration
class TooltipStyleDemo extends StatelessWidget {
  const TooltipStyleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Tooltip(
        message: 'I show below, rounded dark background',
        preferBelow: true, // prefer below; false prefers above
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: Colors.black87,
          borderRadius: BorderRadius.circular(8),
        ),
        textStyle: const TextStyle(color: Colors.white, fontSize: 12),
        child: Icon(Icons.location_on),
      ),
    );
  }
}
```

## Rich text hint (RICH)

`richMessage` lets the content be more than plain text.

```dart
import 'package:flutter/material.dart';

/// Example: tooltip-rich —— hint with styled layout
class TooltipRichDemo extends StatelessWidget {
  const TooltipRichDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Tooltip(
        triggerMode: TooltipTriggerMode.tap,
        richMessage: TextSpan(
          children: [
            TextSpan(text: 'Supports ', style: TextStyle(color: Colors.white)),
            TextSpan(text: 'Markdown', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.amber)),
            TextSpan(text: ' syntax', style: TextStyle(color: Colors.white)),
          ],
        ),
        child: Icon(Icons.help_outline),
      ),
    );
  }
}
```

## Manual show/hide control

With `manualTrigger: true`, external logic (e.g. keyboard focus) decides when to show.

```dart
import 'package:flutter/material.dart';

/// Example: tooltip-manual —— controlled by external state
class TooltipManualDemo extends StatefulWidget {
  const TooltipManualDemo({super.key});

  @override
  State<TooltipManualDemo> createState() => _TooltipManualDemoState();
}

class _TooltipManualDemoState extends State<TooltipManualDemo> {
  final _key = GlobalKey<TooltipState>();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Tooltip(
            key: _key, // attach the key to the Tooltip to reach its State
            manualTrigger: true,
            triggerMode: TooltipTriggerMode.manual,
            message: 'A manual-mode bubble',
            child: const Icon(Icons.touch_app),
          ),
          const SizedBox(height: 12),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              FilledButton.tonal(
                onPressed: () => _key.currentState?.showTooltip(),
                child: const Text('Show'),
              ),
              const SizedBox(width: 8),
              OutlinedButton(
                onPressed: () => _key.currentState?.hideTooltip(),
                child: const Text('Hide'),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
```

> Manual-mode trio: `key: GlobalKey<TooltipState>()` + `manualTrigger: true` + `triggerMode: TooltipTriggerMode.manual`, then call `showTooltip()` / `hideTooltip()`.

## Property reference

| Property | Description |
| --- | --- |
| `message` / `richMessage` | Hint text / rich text (pick one, rich wins) |
| `triggerMode` | `tap` / `longPress` (platform default) / `manual` |
| `waitDuration` / `showDuration` / `exitDuration` | Hover delay / display time / exit animation |
| `preferBelow` / `verticalOffset` | Position |
| `decoration` / `textStyle` / `padding` / `margin` | Appearance |
| `excludeFromSemantics` / `toolTip` | Accessibility (readout in Semantics) |

## Pitfalls

::: warning Don't rely on Tooltip on mobile
Touchscreens have no hover, and long-press discovery costs are high; hints for critical functions should be visible copy.
:::

::: danger Keep the hint short
Tooltip width is capped and long sentences get wrapped off; if it takes more than two lines you want an onboarding overlay, not a Tooltip.
:::

::: info IconButton already has Tooltip built in
`IconButton(tooltip: 'Delete')` wraps a Tooltip internally; most of the time you don't need to add one yourself.
:::
