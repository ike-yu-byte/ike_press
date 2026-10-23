---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Wrap

`Wrap` works like Row/Column but automatically flows children onto the next line when they run out of room. Ideal for tag clouds and emoji pickers.

## Auto-wrapping tags

`spacing` = gap along the main axis, `runSpacing` = gap between lines.

```dart
import 'package:flutter/material.dart';

/// Example: wrap-chips —— tags flow onto new lines
class WrapChipsDemo extends StatelessWidget {
  const WrapChipsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const tags = ['Flutter', 'Dart', 'Mobile', 'Cross-platform', 'Open-source', 'Hot-reload', 'Widget'];
    return Center(
      child: SizedBox(
        width: 280,
        child: Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            for (final t in tags)
              Chip(label: Text(t)),
          ],
        ),
      ),
    );
  }
}
```

## Alignment

`alignment` distributes children within each line.

```dart
import 'package:flutter/material.dart';

/// Example: wrap-alignment —— spaceEvenly distribution
class WrapAlignmentDemo extends StatelessWidget {
  const WrapAlignmentDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Wrap(
          alignment: WrapAlignment.spaceEvenly,
          spacing: 8,
          runSpacing: 8,
          children: [
            Container(width: 60, height: 40, color: Colors.blue),
            Container(width: 60, height: 40, color: Colors.blue),
            Container(width: 60, height: 40, color: Colors.blue),
            Container(width: 60, height: 40, color: Colors.blue),
          ],
        ),
      ),
    );
  }
}
```

## API

| Property | Description |
| --- | --- |
| `direction` | Main axis direction |
| `alignment` | Main axis alignment |
| `spacing` | Gap between adjacent children |
| `runSpacing` | Gap between lines |
| `runAlignment` | Cross axis (line) alignment |

::: warning No Expanded inside Wrap
`Wrap` gives children loose constraints -- `Expanded`/`Flexible` inside a `Wrap` throws. For equal-width columns use `GridView` instead.
:::
