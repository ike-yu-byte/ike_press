---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# SnackBar

> 🟢 Stateless widget · `StatelessWidget`

`SnackBar` is a brief message sliding up from the bottom of the screen ("Saved", "Send failed"). It doesn't interrupt, disappears after a few seconds, and can carry one action like "Undo".

## Basic message

```dart
import 'package:flutter/material.dart';

/// Example: snackbar-basic —— success hint after an action
class SnackBarBasicDemo extends StatelessWidget {
  const SnackBarBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton(
        onPressed: () {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Saved to gallery'),
              duration: Duration(seconds: 2),
            ),
          );
        },
        child: const Text('Save image'),
      ),
    );
  }
}
```

## With an undo action

`SnackBarAction` adds a single button that fires a callback when tapped.

```dart
import 'package:flutter/material.dart';

/// Example: snackbar-undo —— delete + undo
class SnackBarUndoDemo extends StatefulWidget {
  const SnackBarUndoDemo({super.key});

  @override
  State<SnackBarUndoDemo> createState() => _SnackBarUndoDemoState();
}

class _SnackBarUndoDemoState extends State<SnackBarUndoDemo> {
  final items = ['Entry A', 'Entry B', 'Entry C'];

  void _remove(int index) {
    final removed = items.removeAt(index);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('Deleted "$removed"'),
        action: SnackBarAction(
          label: 'Undo',
          onPressed: () => setState(() => items.insert(index, removed)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < items.length; i++)
              ListTile(
                title: Text(items[i]),
                trailing: IconButton(
                  icon: const Icon(Icons.delete_outline),
                  onPressed: () => _remove(i),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
```

## Style and position

Styling: `behavior: floating` lifts it off the edge and `backgroundColor` carries success/error semantics (both stay at the bottom). Position: `ScaffoldMessenger` always pins a `SnackBar` to the **bottom**; `floating` only adds margins and **can't move it to the top or center** -- for a different position, reach for the right tool:

- **Bottom**: `SnackBar` (its native spot, with fixed / floating / semantic-color styles)
- **Top**: `MaterialBanner` (`showMaterialBanner`, pinned to the top)
- **Center**: neither can do it -- draw your own toast with an `Overlay` / `Stack`

```dart
import 'dart:async';
import 'package:flutter/material.dart';

/// Example: snackbar-styles —— three styles + top/center positions
class SnackBarStylesDemo extends StatefulWidget {
  const SnackBarStylesDemo({super.key});

  @override
  State<SnackBarStylesDemo> createState() => _SnackBarStylesDemoState();
}

class _SnackBarStylesDemoState extends State<SnackBarStylesDemo> {
  bool _showCenter = false;
  Timer? _timer;

  void _showCenterToast() {
    _timer?.cancel();
    setState(() => _showCenter = true);
    _timer = Timer(const Duration(milliseconds: 1600), () {
      if (mounted) setState(() => _showCenter = false);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Local ScaffoldMessenger + Scaffold: keep the popup inside the box, not the whole screen
    return ScaffoldMessenger(
      child: Scaffold(
        body: Builder(
          builder: (context) {
            final messenger = ScaffoldMessenger.of(context);
            return Stack(
              children: [
                Align(
                  alignment: Alignment.topCenter,
                  child: Padding(
                    padding: const EdgeInsets.only(top: 24),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        // —— styles (all at the bottom) ——
                        OutlinedButton(
                          onPressed: () {
                            messenger
                              ..clearSnackBars()
                              ..showSnackBar(const SnackBar(
                                content: Text('Flush against the bottom'),
                                backgroundColor: Colors.teal,
                              ));
                          },
                          child: const Text('Bottom-fixed'),
                        ),
                        const SizedBox(height: 8),
                        OutlinedButton(
                          onPressed: () {
                            messenger
                              ..clearSnackBars()
                              ..showSnackBar(const SnackBar(
                                content: Text('floating leaves margins'),
                                behavior: SnackBarBehavior.floating,
                                margin: EdgeInsets.all(16),
                              ));
                          },
                          child: const Text('Floating'),
                        ),
                        const SizedBox(height: 8),
                        OutlinedButton(
                          onPressed: () {
                            messenger
                              ..clearSnackBars()
                              ..showSnackBar(const SnackBar(
                                content: Row(children: [Icon(Icons.error, color: Colors.white), SizedBox(width: 8), Text('Action failed')]),
                                backgroundColor: Colors.redAccent,
                                behavior: SnackBarBehavior.floating,
                              ));
                          },
                          child: const Text('Error red'),
                        ),
                        const SizedBox(height: 8),
                        // —— positions (top / center) ——
                        OutlinedButton(
                          onPressed: () {
                            messenger
                              ..clearMaterialBanners()
                              ..showMaterialBanner(MaterialBanner(
                                content: const Text('Use MaterialBanner for a top popup'),
                                leading: const Icon(Icons.info, color: Colors.blue),
                                actions: [
                                  TextButton(
                                    onPressed: () => messenger.clearMaterialBanners(),
                                    child: const Text('Dismiss'),
                                  ),
                                ],
                              ));
                          },
                          child: const Text('Top · MaterialBanner'),
                        ),
                        const SizedBox(height: 8),
                        OutlinedButton(
                          onPressed: _showCenterToast,
                          child: const Text('Center · custom Toast'),
                        ),
                      ],
                    ),
                  ),
                ),
                if (_showCenter)
                  Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                      decoration: BoxDecoration(
                        color: Colors.black87,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.check_circle, color: Colors.white, size: 20),
                          SizedBox(width: 8),
                          Text('Centered custom toast', style: TextStyle(color: Colors.white)),
                        ],
                      ),
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}
```

::: tip About styling
`backgroundColor` carries semantics (green success / red error), and `behavior: floating` + `margin`/`width` control margins and width -- these only change the look, never the bottom-pinned fact.
:::

## Replacing the current message

Multiple messages queue by default; `clearSnackBars()` wipes the queue so only the newest shows.

```dart
import 'package:flutter/material.dart';

/// Example: snackbar-replace —— clear stale bars before showing the latest
void _showFresh(BuildContext context) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.clearSnackBars(); // avoid a queue on rapid actions
  messenger.showSnackBar(const SnackBar(content: Text('Latest news')));
}
```

## Property reference

| Property | Description |
| --- | --- |
| `content` | Main text (required; can be a Row with an icon) |
| `duration` | Display time, default 4s |
| `action` | `SnackBarAction(label:, onPressed:)` single button |
| `backgroundColor` / `elevation` | Background / shadow |
| `behavior` | `fixed` flush to bottom / `floating` lifted (cosmetic only; still bottom-pinned) |
| Popup position | SnackBar is always bottom; use `MaterialBanner` for top, `Overlay` for center |
| `margin` / `width` | Outer margin / fixed width when floating |
| `snackBarAnimationStyle` | Custom enter/exit animation |

## Pitfalls

::: danger Use ScaffoldMessenger, not Scaffold
SnackBars go through `ScaffoldMessenger.of(context)` (not `Scaffold.of`). `MaterialApp` already provides a root `ScaffoldMessenger`, so you normally don't wrap one yourself.
:::

::: warning Tapping dismisses it
A tap closes the bar; don't make critical undoable operations depend solely on a SnackBar -- the important state should be recoverable in the UI.
:::

::: info Don't set duration too short
Durations below the animation floor get clamped up; don't use 0 either, the bar vanishes instantly.
:::
