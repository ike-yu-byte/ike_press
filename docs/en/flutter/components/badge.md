---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/badge' # Flutter Web preview URL for this page
---

# Badge

> 🟢 Stateless widget · `StatelessWidget`

`Badge` is a small red dot or count overlaid on the top-right of an icon (message counts, unread dots). Provided by Material 3, replacing the old hand-rolled Stack approach.

## Count badge

```dart
import 'package:flutter/material.dart';

/// Example: badge-count —— notification icon with number
class BadgeCountDemo extends StatelessWidget {
  const BadgeCountDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Badge(
        count: 5, // hidden when 0 or null
        child: Icon(Icons.notifications, size: 32),
      ),
    );
  }
}
```

## Red dot (no number)

```dart
import 'package:flutter/material.dart';

/// Example: badge-dot —— unread dot only
class BadgeDotDemo extends StatelessWidget {
  const BadgeDotDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Badge(
        isLabelVisible: false, // show just the dot
        child: Icon(Icons.mail, size: 32),
      ),
    );
  }
}
```

## Custom look + big-number truncation

```dart
import 'package:flutter/material.dart';

/// Example: badge-styled —— color/position/99+ truncation
class BadgeStyledDemo extends StatelessWidget {
  const BadgeStyledDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Badge(
            count: 99,
            backgroundColor: Colors.red,
            textColor: Colors.white,
            largeSize: 16, // height when showing a number
            padding: EdgeInsets.symmetric(horizontal: 4),
            offset: Offset(8, -8), // nudge from the default position
            child: Icon(Icons.shopping_cart, size: 32),
          ),
          SizedBox(width: 40),
          Badge(
            count: 99,
            alignment: Alignment.topLeft, // hang from top-left instead
            child: Icon(Icons.chat_bubble, size: 32),
          ),
        ],
      ),
    );
  }
}
```

> To show "99+" beyond 99: `count` only takes an int, so compute it yourself with `label: Text(count > 99 ? '99+' : '$count')` and pass `count: null` to let label take over.

## With IconButton / ListTile

```dart
import 'package:flutter/material.dart';

/// Example: badge-on-appbar-action —— app bar message entry
class BadgeActionDemo extends StatelessWidget {
  const BadgeActionDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Home'),
        actions: [
          IconButton(
            icon: const Badge(count: 3, child: Icon(Icons.notifications)),
            onPressed: () {},
          ),
        ],
      ),
      body: ListView(
        children: const [
          ListTile(
            leading: Badge(count: 12, child: Icon(Icons.email)),
            title: Text('Unread mail'),
            subtitle: Text('12 new messages'),
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
| `count` | Shows a number; null/0 hides the badge |
| `isLabelVisible` | Set false with no label to show just the dot |
| `label` | Custom content widget ('99+', icon, etc.) |
| `backgroundColor` / `textColor` / `textStyle` | Colors |
| `smallSize` / `largeSize` | Dot diameter / height with number |
| `padding` / `offset` / `alignment` | Number padding / shift / attach corner |

## Pitfalls

::: warning Pick label or count, not both
If you pass `label`, don't also pass `count` — label wins and creates a confusing "number never updates" illusion.
:::

::: danger Badge should wrap the icon, not the whole button
Wrapping Badge around an IconButton blocks tap-hit expansion; the convention is `IconButton(icon: Badge(...))`.
:::

::: info Lighter unread marker in lists
When you only need a dot, a custom `Container(4×4 circle)` in `ListTile` trailing works; Badge's edge is auto alignment and semantics readout (semanticsLabel).
:::
