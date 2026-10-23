---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Button

> 🔵 Stateful widget · `StatefulWidget`

Flutter ships a family of Material button widgets in `package:flutter/material.dart` -- no third-party package needed. They all derive from `ButtonStyleButton`, **so the parameters are nearly identical; only the default styling differs**.

Division of labor under Material 3:

| Widget | Look | Typical use |
| --- | --- | --- |
| `FilledButton` | Solid fill (primary background, primary text) | Highest-priority action on a page (submit, save) |
| `ElevatedButton` | Solid fill + shadow | Actions that need to lift and stand out |
| `OutlinedButton` | Transparent background + border | Secondary actions |
| `TextButton` | Plain text, no fill no border | Lightest actions (dialog buttons, cancel) |
| `IconButton` | Icon only | Toolbars, compact action areas |
| `FloatingActionButton` | Round floating button | The single primary action of a page (create, send) |

::: warning Deprecated
`RaisedButton` / `FlatButton` / `OutlineButton` / bare `MaterialButton` are deprecated in Flutter 3.x. Migration map: `RaisedButton → ElevatedButton`, `FlatButton → TextButton`, `OutlineButton → OutlinedButton`.
:::

## The button family

A side-by-side comparison of the four text buttons plus the icon button.

```dart
import 'package:flutter/material.dart';

/// Example: button-family —— the whole family at a glance
class ButtonFamilyDemo extends StatelessWidget {
  const ButtonFamilyDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Wrap(
        spacing: 12,
        runSpacing: 12,
        alignment: WrapAlignment.center,
        children: [
          FilledButton(onPressed: () {}, child: const Text('Filled')),
          ElevatedButton(onPressed: () {}, child: const Text('Elevated')),
          OutlinedButton(onPressed: () {}, child: const Text('Outlined')),
          TextButton(onPressed: () {}, child: const Text('Text')),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.favorite_border),
            tooltip: 'Favorite',
          ),
        ],
      ),
    );
  }
}
```

## Disabled state

Passing `null` for `onPressed` disables the button -- it greys out and stops responding. There is **no** separate `disabled` parameter.

```dart
import 'package:flutter/material.dart';

/// Example: button-disabled —— null onPressed means disabled
class ButtonDisabledDemo extends StatelessWidget {
  const ButtonDisabledDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const bool canSubmit = false;
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          ElevatedButton(
            onPressed: canSubmit ? () {} : null, // null == disabled
            child: const Text('Submit (disabled)'),
          ),
          const SizedBox(height: 12),
          ElevatedButton(
            onPressed: () {},
            child: const Text('Enabled'),
          ),
        ],
      ),
    );
  }
}
```

## Icon buttons

`IconButton` shows an icon only; `ElevatedButton.icon` / `FilledButton.icon` etc. provide icon + label combinations.

```dart
import 'package:flutter/material.dart';

/// Example: button-icon —— pure icon buttons and icon+label buttons
class ButtonIconDemo extends StatelessWidget {
  const ButtonIconDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              IconButton(onPressed: () {}, icon: const Icon(Icons.share)),
              IconButton(onPressed: () {}, icon: const Icon(Icons.delete_outline)),
              IconButton(onPressed: () {}, icon: const Icon(Icons.settings)),
            ],
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () {},
            icon: const Icon(Icons.download),
            label: const Text('Download'),
          ),
        ],
      ),
    );
  }
}
```

## FloatingActionButton

Put it in `Scaffold.floatingActionButton` -- usually the one primary action of a page. `FloatingActionButton.extended` supports icon + label.

```dart
import 'package:flutter/material.dart';

/// Example: button-fab —— regular FAB and extended FAB
class ButtonFabDemo extends StatelessWidget {
  const ButtonFabDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          FloatingActionButton(
            onPressed: () {},
            child: const Icon(Icons.add),
          ),
          const SizedBox(height: 16),
          FloatingActionButton.extended(
            onPressed: () {},
            icon: const Icon(Icons.edit),
            label: const Text('New post'),
          ),
        ],
      ),
    );
  }
}
```

## Loading state

Flutter has no built-in `loading` property. The common pattern is swapping the child yourself and disabling taps while loading.

```dart
import 'package:flutter/material.dart';

/// Example: button-loading —— shows a spinner and disables while submitting
class ButtonLoadingDemo extends StatefulWidget {
  const ButtonLoadingDemo({super.key});

  @override
  State<ButtonLoadingDemo> createState() => _ButtonLoadingDemoState();
}

class _ButtonLoadingDemoState extends State<ButtonLoadingDemo> {
  bool _isLoading = false;

  Future<void> _submit() async {
    setState(() => _isLoading = true);
    await Future<void>.delayed(const Duration(seconds: 2));
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: ElevatedButton(
        onPressed: _isLoading ? null : _submit,
        child: _isLoading
            ? const SizedBox(
                height: 20,
                width: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Text('Submit'),
      ),
    );
  }
}
```

## Custom styling

Every button has `style`; the more convenient shortcut is `WidgetName.styleFrom()`.

```dart
import 'package:flutter/material.dart';

/// Example: button-style —— styleFrom for color/size/radius
class ButtonStyleDemo extends StatelessWidget {
  const ButtonStyleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton(
        onPressed: () {},
        style: FilledButton.styleFrom(
          backgroundColor: Colors.deepOrange,
          foregroundColor: Colors.white,
          minimumSize: const Size(160, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(24),
          ),
        ),
        child: const Text('Big pill button'),
      ),
    );
  }
}
```

## State-dependent styling

When hover / pressed / disabled need different values, use `WidgetStateProperty`.

```dart
import 'package:flutter/material.dart';

/// Example: button-state-style —— per-state colors via WidgetStateProperty
class ButtonStateStyleDemo extends StatelessWidget {
  const ButtonStateStyleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton(
        onPressed: () {},
        style: ButtonStyle(
          backgroundColor: WidgetStateProperty.resolveWith((states) {
            if (states.contains(WidgetState.disabled)) return Colors.grey;
            if (states.contains(WidgetState.pressed)) return Colors.red.shade700;
            if (states.contains(WidgetState.hovered)) return Colors.red.shade300;
            return Colors.red;
          }),
        ),
        child: const Text('Hover / press recolor'),
      ),
    );
  }
}
```

::: tip App-wide consistency
Don't repeat `style` everywhere -- configure `elevatedButtonTheme` / `filledButtonTheme` etc. in `MaterialApp.theme` and every button in the app updates at once.
:::

## API

### ElevatedButton / FilledButton / OutlinedButton / TextButton (shared parameters)

| Name | Type | Default | Description | Required |
| --- | --- | --- | --- | --- |
| onPressed | `VoidCallback?` | required | Tap callback; `null` disables | ✅ |
| onLongPress | `VoidCallback?` | `null` | Long-press callback | No |
| onHover | `ValueChanged<bool>?` | `null` | Mouse hover callback (web/desktop) | No |
| style | `ButtonStyle?` | `null` | Style override, usually built with `.styleFrom()` | No |
| autofocus | `bool` | `false` | Auto-focus when the page appears | No |
| clipBehavior | `Clip` | `none` | Clipping, used with `shape` to clip overflow | No |
| child | `Widget` | required | Button content, usually a `Text` | ✅ |

### IconButton

| Name | Type | Default | Description | Required |
| --- | --- | --- | --- | --- |
| icon | `Widget` | required | The icon, usually an `Icon` | ✅ |
| onPressed | `VoidCallback?` | required | Tap callback, `null` disables | ✅ |
| iconSize | `double` | `24.0` | Icon size | No |
| color | `Color?` | `null` | Icon color (overrides theme) | No |
| tooltip | `String?` | `null` | Long-press/hover hint text | No |

### FloatingActionButton

| Name | Type | Default | Description | Required |
| --- | --- | --- | --- | --- |
| onPressed | `VoidCallback?` | required | Tap callback, `null` disables | ✅ |
| child | `Widget?` | `null` | Content (usually an `Icon`) | No |
| heroTag | `Object?` | auto | `Hero` animation tag; distinguish when several FABs share a screen | No |
| tooltip | `String?` | `null` | Hint text | No |
| shape | `ShapeBorder?` | circle | Outline, e.g. `StadiumBorder` | No |

## FAQ

::: details Why is my button text all uppercase?
Under a Material 2 theme buttons default to `textTransform: uppercase`. Material 3 (the default since Flutter 3.16) removed it; on an M2 theme disable it with `styleFrom(textCase: TextCase.none)`.
:::

::: details Want iOS-style buttons?
Use `CupertinoButton` (`package:flutter/cupertino.dart`) -- not part of the Material family: no shadow concept, the whole button fades on press.
:::
