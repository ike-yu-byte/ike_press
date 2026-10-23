---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# PopupMenuButton

`PopupMenuButton` reveals a small menu of choices on tap (commonly the ⋮ at the top-right of an AppBar); selecting an item fires `onSelected`.

## Basic usage

```dart
import 'package:flutter/material.dart';

/// Example: popup-basic —— edit / delete pair
class PopupBasicDemo extends StatelessWidget {
  const PopupBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PopupMenuButton<String>(
        onSelected: (value) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Tapped: $value'), duration: const Duration(seconds: 1)),
          );
        },
        itemBuilder: (context) => const [
          PopupMenuItem(value: 'edit', child: Text('Edit')),
          PopupMenuItem(value: 'delete', child: Text('Delete')),
        ],
      ),
    );
  }
}
```

## Custom trigger button and offset

The default button is ⋮; swap the icon or provide a whole `child`; `offset` controls where the menu pops.

```dart
import 'package:flutter/material.dart';

/// Example: popup-custom-trigger —— text button trigger + menu below
class PopupCustomTriggerDemo extends StatelessWidget {
  const PopupCustomTriggerDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PopupMenuButton<String>(
        offset: const Offset(0, 48), // menu appears under the button
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            border: Border.all(color: Colors.blue),
            borderRadius: BorderRadius.circular(20),
          ),
          child: const Text('Sort by', style: TextStyle(color: Colors.blue)),
        ),
        itemBuilder: (context) => const [
          PopupMenuItem(value: 'time', child: Text('By time')),
          PopupMenuItem(value: 'price', child: Text('By price')),
          PopupMenuItem(value: 'sales', child: Text('By sales')),
        ],
        onSelected: (v) {},
      ),
    );
  }
}
```

## Menu with icons and grouping

`CheckedPopupMenuItem` for checkable options, `PopupMenuDivider` for grouping.

```dart
import 'package:flutter/material.dart';

/// Example: popup-rich —— icons + checked state + divider
class PopupRichDemo extends StatefulWidget {
  const PopupRichDemo({super.key});

  @override
  State<PopupRichDemo> createState() => _PopupRichDemoState();
}

class _PopupRichDemoState extends State<PopupRichDemo> {
  String _view = 'list';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PopupMenuButton<String>(
        icon: const Icon(Icons.view_array),
        initialValue: _view, // drives CheckedPopupMenuItem checkmarks
        onSelected: (v) => setState(() => _view = v),
        itemBuilder: (context) => [
          const CheckedPopupMenuItem(value: 'list', child: Text('List view')),
          const CheckedPopupMenuItem(value: 'grid', child: Text('Grid view')),
          const PopupMenuDivider(),
          PopupMenuItem(
            value: 'setting',
            child: const Row(children: [Icon(Icons.tune, size: 18), SizedBox(width: 8), Text('Display settings')]),
          ),
        ],
      ),
    );
  }
}
```

## Callback style (actions, not values)

Each item carries its own `onTap`; when you don't need a unified `onSelected`, use `onClosed` / a void generic.

```dart
import 'package:flutter/material.dart';

/// Example: popup-callback —— independent per-item callbacks
class PopupCallbackDemo extends StatelessWidget {
  const PopupCallbackDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PopupMenuButton<void>(
        itemBuilder: (context) => [
          PopupMenuItem(
            onTap: () => print('share'),
            child: const Text('Share'),
          ),
          PopupMenuItem(
            onTap: () => print('favorite'),
            child: const Text('Favorite'),
          ),
        ],
      ),
    );
  }
}
```

## Enabled condition

```dart
import 'package:flutter/material.dart';

/// Example: popup-disabled —— disabled state
class PopupDisabledDemo extends StatelessWidget {
  const PopupDisabledDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: PopupMenuButton<String>(
        enabled: false, // greyed out and untappable (e.g. insufficient permission)
        tooltip: 'Not available',
        itemBuilder: (context) => const [PopupMenuItem(value: 'a', child: Text('A'))],
      ),
    );
  }
}
```

> Want long-press to open the menu? PopupMenuButton has no triggerAction parameter; use `GestureDetector(onLongPress:) + showMenu()` and control the anchor position yourself.

## Property reference

| Property | Description |
| --- | --- |
| `itemBuilder` | Required, returns the item List |
| `onSelected` / `onCanceled` / `onOpened` | Select / cancel / open callbacks |
| `icon` / `child` / `shape` | Trigger button appearance |
| `offset` / `position` | Menu offset from the button / overlay vs. below (`PopupMenuPosition.under`) |
| `initialValue` | Pairs with `CheckedPopupMenuItem` checkmarks |
| `enabled` / `tooltip` | Disable / accessibility & long-press hint |
| `PopupMenuItem(enabled:)` | Disable a single item |

## Pitfalls

::: warning Keep the item count small
Past 5-6 items switch to a BottomSheet list; tapping row-by-row in a PopupMenu is poor UX.
:::

::: danger Tapping outside is a cancel, not a select
Dismissing via the scrim only fires `onCanceled`; never put must-run logic in `onSelected` expecting it as a fallback.
:::

::: info The more M3 alternative
Material 3 guidelines suggest `MenuAnchor` for complex menus (nested submenus, custom anchor); PopupMenuButton suits simple action sets.
:::
