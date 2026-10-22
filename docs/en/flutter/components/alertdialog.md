---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# AlertDialog

Dialogs interrupt the user to request confirmation or show critical information. You open them with `showDialog`, placing an `AlertDialog` inside.

## Confirmation dialog

```dart
/// Example: alert-confirm —— delete double confirmation
class AlertDialogConfirmDemo extends StatefulWidget {
  const AlertDialogConfirmDemo({super.key});

  @override
  State<AlertDialogConfirmDemo> createState() => _AlertDialogConfirmDemoState();
}

class _AlertDialogConfirmDemoState extends State<AlertDialogConfirmDemo> {
  String _status = 'Awaiting action';

  Future<void> _confirmDelete() async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete for good?'),
        content: const Text('This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () => Navigator.pop(context, true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    setState(() => _status = ok == true ? 'Deleted' : 'Cancelled');
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_status),
          const SizedBox(height: 8),
          FilledButton.tonalIcon(
            onPressed: _confirmDelete,
            icon: const Icon(Icons.delete),
            label: const Text('Delete file'),
          ),
        ],
      ),
    );
  }
}
```

## Dialog with an input field

Put a form inside the dialog, read the controller on confirm.

```dart
/// Example: alert-input —— rename input dialog
class AlertDialogInputDemo extends StatefulWidget {
  const AlertDialogInputDemo({super.key});

  @override
  State<AlertDialogInputDemo> createState() => _AlertDialogInputDemoState();
}

class _AlertDialogInputDemoState extends State<AlertDialogInputDemo> {
  final _controller = TextEditingController(text: 'old-file.txt');
  String _name = 'old-file.txt';

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  Future<void> _rename() async {
    _controller.text = _name;
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename'),
        content: TextField(controller: _controller, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.pop(context, _controller.text),
            child: const Text('OK'),
          ),
        ],
      ),
    );
    if (result != null && result.isNotEmpty) setState(() => _name = result);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Current name: $_name'),
          const SizedBox(height: 8),
          OutlinedButton(onPressed: _rename, child: const Text('Rename')),
        ],
      ),
    );
  }
}
```

## Choice list dialog (SimpleDialog)

For pure "pick one" scenarios use `SimpleDialog` -- every option is a button.

```dart
/// Example: alert-simple-dialog —— "open with" chooser
class SimpleDialogDemo extends StatefulWidget {
  const SimpleDialogDemo({super.key});

  @override
  State<SimpleDialogDemo> createState() => _SimpleDialogDemoState();
}

class _SimpleDialogDemoState extends State<SimpleDialogDemo> {
  String _opened = 'Default';

  Future<void> _pick() async {
    final app = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Open with'),
        children: [
          for (final app in const ['Browser', 'PDF reader', 'Editor'])
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, app),
              child: Text(app),
            ),
        ],
      ),
    );
    if (app != null) setState(() => _opened = app);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text('Opening with "$_opened"'),
          const SizedBox(height: 8),
          FilledButton(onPressed: _pick, child: const Text('Choose an app')),
        ],
      ),
    );
  }
}
```

## Uncancelable & rich styling

```dart
/// Example: alert-unclosable —— barrierDismissible false + custom icon/shape
class AlertDialogStyledDemo extends StatelessWidget {
  const AlertDialogStyledDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton(
        onPressed: () => showDialog(
          context: context,
          barrierDismissible: false, // tapping outside won't close it, a button must be pressed
          builder: (context) => AlertDialog(
            icon: const Icon(Icons.warning_amber, color: Colors.orange, size: 36),
            title: const Text('Sign in required'),
            content: const Text('You must sign in to continue.'),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            actions: [
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Sign in'),
                ),
              ),
            ],
          ),
        ),
        child: const Text('Open forced login dialog'),
      ),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `title` / `content` | Title / body (content takes any widget) |
| `actions` | Bottom button row; `actionsPadding` adjusts insets |
| `icon` | Top icon (M3 style) |
| `shape` / `backgroundColor` / `elevation` | Appearance |
| `showDialog(barrierDismissible:)` | Whether tapping outside closes it (default true) |
| `showDialog(useRootNavigator:)` | Which Navigator level the dialog attaches to |

## Pitfalls

::: tip Return values travel via Navigator.pop(context, value)
The `showDialog<T>` Future resolves to the value passed in `pop(context, value)`; closing without a value (tapping the barrier) yields null -- always null-check.
:::

::: warning Don't reuse the dialog's context after it closes
After the await, the dialog-level context is defunct; the outer State's context remains valid -- do the value handling in the outer callback.
:::

::: danger Never call showDialog directly in build
That re-opens the dialog endlessly (very visible on hot reload); only call it from user-interaction callbacks.
:::
