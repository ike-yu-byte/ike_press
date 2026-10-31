---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/dismissible' # Flutter Web preview URL for this page
---

# Dismissible

> 🔵 Stateful widget · `StatefulWidget`

`Dismissible` lets its child be **swiped away in a direction**; once dismissed a callback fires (usually removing it from a list). This is the left-swipe delete in mail and to-do apps.

## Basic swipe-to-delete

Swipe right-to-left to delete an item, revealing a red background with a delete icon.

```dart
import 'package:flutter/material.dart';

/// Example: dismissible-basic —— swipe to delete
class DismissibleBasicDemo extends StatefulWidget {
  const DismissibleBasicDemo({super.key});

  @override
  State<DismissibleBasicDemo> createState() => _DismissibleBasicDemoState();
}

class _DismissibleBasicDemoState extends State<DismissibleBasicDemo> {
  final items = ['Mail one', 'Mail two', 'Mail three', 'Mail four'];

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final item in items)
              Dismissible(
                key: Key(item), // required and unique!
                direction: DismissDirection.endToStart, // swipe right-to-left
                background: Container(
                  color: Colors.red,
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.only(right: 24),
                  child: const Icon(Icons.delete, color: Colors.white),
                ),
                onDismissed: (dir) {
                  setState(() => items.remove(item)); // actually remove the data
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Deleted "$item"')),
                  );
                },
                child: ListTile(
                  title: Text(item),
                  tileColor: Colors.grey.shade100,
                ),
              ),
          ],
        ),
      ),
    );
  }
}
```

## Two directions, two backgrounds

Swipe one way to archive, the other to delete -- per-direction backgrounds and handling.

```dart
import 'package:flutter/material.dart';

/// Example: dismissible-twoway —— different action per direction
class DismissibleTwoWayDemo extends StatefulWidget {
  const DismissibleTwoWayDemo({super.key});

  @override
  State<DismissibleTwoWayDemo> createState() => _DismissibleTwoWayDemoState();
}

class _DismissibleTwoWayDemoState extends State<DismissibleTwoWayDemo> {
  final items = ['Task A', 'Task B', 'Task C'];

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final item in items)
              Dismissible(
                key: Key(item),
                // swipe right shows red "delete", swipe left shows green "archive"
                secondaryBackground: Container(
                  color: Colors.red,
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.only(right: 24),
                  child: const Icon(Icons.delete_forever, color: Colors.white),
                ),
                background: Container(
                  color: Colors.green,
                  alignment: Alignment.centerLeft,
                  padding: const EdgeInsets.only(left: 24),
                  child: const Icon(Icons.archive, color: Colors.white),
                ),
                onDismissed: (dir) {
                  final msg = dir == DismissDirection.startToEnd ? 'Archived' : 'Deleted';
                  setState(() => items.remove(item));
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('$msg: $item')),
                  );
                },
                child: ListTile(title: Text(item), tileColor: Colors.grey.shade100),
              ),
          ],
        ),
      ),
    );
  }
}
```

## Confirm before deleting (confirmDismiss)

Swiping open is not deleting -- pop a dialog in `confirmDismiss` and only return true when the user agrees.

```dart
import 'package:flutter/material.dart';

/// Example: dismissible-confirm —— second confirmation after swipe
class DismissibleConfirmDemo extends StatefulWidget {
  const DismissibleConfirmDemo({super.key});

  @override
  State<DismissibleConfirmDemo> createState() => _DismissibleConfirmDemoState();
}

class _DismissibleConfirmDemoState extends State<DismissibleConfirmDemo> {
  final items = ['Important file 1', 'Important file 2'];

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (final item in items)
              Dismissible(
                key: Key(item),
                background: Container(
                  color: Colors.orange,
                  alignment: Alignment.centerRight,
                  padding: const EdgeInsets.only(right: 24),
                  child: const Icon(Icons.warning, color: Colors.white),
                ),
                confirmDismiss: (dir) async {
                  // dialog decides; returning false springs the row back
                  return await showDialog<bool>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Delete for good?'),
                          content: Text('"$item" cannot be recovered'),
                          actions: [
                            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete')),
                          ],
                        ),
                      ) ??
                      false;
                },
                onDismissed: (_) => setState(() => items.remove(item)),
                child: ListTile(title: Text(item), tileColor: Colors.grey.shade100),
              ),
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
| `key` | **Required and globally unique** -- usually the data id |
| `direction` | Allowed swipe directions, defaults to `horizontal` (both) |
| `background` | Background revealed on startToEnd (left swipe) |
| `secondaryBackground` | Background revealed on endToStart (right swipe) |
| `confirmDismiss` | Must return true for the dismiss to actually happen (secondary confirmation) |
| `onDismissed` | Fired after the swipe completes (remove data here) |
| `movementDuration` | Spring-back animation duration when unconfirmed |

## Pitfalls

::: danger Keys must be unique and stable
Almost every `Duplicate GlobalKey` assertion comes from using the index (duplicates after removal) or a hard-coded constant as the key. Use the item's own id.
:::

::: danger onDismissed must delete the data
If only the widget swipes away but the data source remains, the next setState rebuild recreates the same row -- it looks like "it won't delete".
:::

::: warning Undo needs a stash
Dismiss means gone. To offer "undo", stash the item plus its index in onDismissed and re-insert via SnackBarAction.
:::
