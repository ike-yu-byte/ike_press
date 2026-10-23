---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# BottomSheet

> 🟢 Stateless widget · `StatelessWidget`

A bottom sheet slides up from the bottom of the screen. It suits medium-complexity content like "share channels", "filter panels" or "action lists", and sits closer to the thumb zone than a dialog.

## Modal bottom sheet (most common)

```dart
import 'package:flutter/material.dart';

/// Example: bottomsheet-modal —— share channel list
class BottomSheetModalDemo extends StatelessWidget {
  const BottomSheetModalDemo({super.key});

  Future<void> _showShare(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      showDragHandle: true, // top drag handle bar (M3)
      builder: (context) => Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text('Share to', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            for (final channel in const ['WeChat', 'Moments', 'Copy link', 'More'])
              ListTile(
                leading: const Icon(Icons.share),
                title: Text(channel),
                onTap: () => Navigator.pop(context), // dismiss on selection
              ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton.icon(
        onPressed: () => _showShare(context),
        icon: const Icon(Icons.ios_share),
        label: const Text('Open share panel'),
      ),
    );
  }
}
```

## Tall scrollable content

When content exceeds half the screen, use `isScrollControlled: true` plus a self-limited max height.

```dart
import 'package:flutter/material.dart';

/// Example: bottomsheet-scrollable —— long filter panel
class BottomSheetScrollableDemo extends StatelessWidget {
  const BottomSheetScrollableDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton.tonalIcon(
        onPressed: () => showModalBottomSheet(
          context: context,
          isScrollControlled: true, // allow beyond the default 9/16 height
          showDragHandle: true,
          builder: (context) => DraggableScrollableSheet(
            initialChildSize: 0.6, // starts at 60% of screen height
            maxChildSize: 0.9,
            minChildSize: 0.4,
            expand: false,
            builder: (context, scrollController) => Column(
              children: [
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Price range', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
                Expanded(
                  child: ListView.builder(
                    controller: scrollController, // key: hand scrolling to the sheet
                    itemCount: 30,
                    itemBuilder: (context, i) => ListTile(title: Text('Filter option $i')),
                  ),
                ),
              ],
            ),
          ),
        ),
        icon: const Icon(Icons.filter_alt),
        label: const Text('Open filters (draggable)'),
      ),
    );
  }
}
```

## Persistent sheet (non-modal)

`showBottomSheet` doesn't block the whole screen and can stay around; manage it manually through the returned controller.

```dart
import 'package:flutter/material.dart';

/// Example: bottomsheet-persistent —— map-style persistent panel (simplified)
class PersistentSheetDemo extends StatefulWidget {
  const PersistentSheetDemo({super.key});

  @override
  State<PersistentSheetDemo> createState() => _PersistentSheetDemoState();
}

class _PersistentSheetDemoState extends State<PersistentSheetDemo> {
  PersistentBottomSheetController? _controller;

  void _openPersistent(BuildContext context) {
    _controller?.close();
    _controller = showBottomSheet(
      context: context, // note: not showModalBottomSheet
      builder: (context) => const Padding(
        padding: EdgeInsets.all(24),
        child: Text('Non-modal sheet: tapping outside does not close it, you must call close()'),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          FilledButton(onPressed: () => _openPersistent(context), child: const Text('Open persistent sheet')),
          const SizedBox(width: 12),
          OutlinedButton(onPressed: () => _controller?.close(), child: const Text('Close')),
        ],
      ),
    );
  }
}
```

## Property reference

| Parameter (showModalBottomSheet) | Description |
| --- | --- |
| `builder` | Required, returns the sheet content |
| `isScrollControlled` | true allows over half screen; pair with DraggableScrollableSheet |
| `showDragHandle` | Top drag handle (M3) |
| `enableDrag` | Whether drag-down closes it (default true) |
| `backgroundColor` / `surfaceTintColor` | Sheet background |
| `shape` | Top rounded corners etc. (already rounded by M3 default) |
| `constraints` | Fix min/max height |
| `useSafeArea` | Avoid system navigation areas |

## Pitfalls

::: danger The builder's context is the sheet's
`onTap: () => Navigator.pop(context)` must use the context provided by the builder; a closure capturing the outer context won't dismiss the sheet.
:::

::: warning isScrollControlled without a scrolling widget
With true but no ListView/DraggableScrollableSheet, tall content overflows and throws outright.
:::

::: info The keyboard won't push the sheet up
Input-style bottom sheets must handle it themselves: wrap the outside in `Padding(bottom: MediaQuery.viewInsetsOf(context).bottom)` or the keyboard covers it.
:::
