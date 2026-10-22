---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# SnackBar

`SnackBar` is a brief message sliding up from the bottom of the screen ("Saved", "Send failed"). It doesn't interrupt, disappears after a few seconds, and can carry one action like "Undo".

## Basic message

```dart
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

`behavior: floating` lifts it off the bottom edge; `backgroundColor` carries success/error semantics.

```dart
/// Example: snackbar-styles —— three looks compared
class SnackBarStylesDemo extends StatelessWidget {
  const SnackBarStylesDemo({super.key});

  @override
  Widget build(BuildContext context) {
    void show(SnackBar bar) => ScaffoldMessenger.of(context).showSnackBar(bar);
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          OutlinedButton(
            onPressed: () => show(const SnackBar(
              content: Text('Flush against the bottom'),
              backgroundColor: Colors.teal,
            )),
            child: const Text('Bottom-fixed'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => show(const SnackBar(
              content: Text('floating leaves margins'),
              behavior: SnackBarBehavior.floating,
              margin: EdgeInsets.all(16),
            )),
            child: const Text('Floating'),
          ),
          const SizedBox(height: 8),
          OutlinedButton(
            onPressed: () => show(const SnackBar(
              content: Row(children: [Icon(Icons.error, color: Colors.white), SizedBox(width: 8), Text('Action failed')]),
              backgroundColor: Colors.red.shade700,
              behavior: SnackBarBehavior.floating,
            )),
            child: const Text('Error red'),
          ),
        ],
      ),
    );
  }
}
```

## Replacing the current message

Multiple messages queue by default; `clearSnackBars()` wipes the queue so only the newest shows.

```dart
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
| `behavior` | `fixed` flush to bottom / `floating` lifted |
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
