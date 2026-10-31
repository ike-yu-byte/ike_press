---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/checkbox' # Flutter Web preview URL for this page
---

# Checkbox

> 🔵 Stateful widget · `StatefulWidget`

`Checkbox` is an on/off choice. It is a **controlled widget**: it stores no state itself -- the checked result is entirely determined by the external `value` + `onChanged`.

## Basic check

```dart
import 'package:flutter/material.dart';

/// Example: checkbox-basic —— a single on/off check
class CheckboxBasicDemo extends StatefulWidget {
  const CheckboxBasicDemo({super.key});

  @override
  State<CheckboxBasicDemo> createState() => _CheckboxBasicDemoState();
}

class _CheckboxBasicDemoState extends State<CheckboxBasicDemo> {
  bool _checked = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Checkbox(
            value: _checked,
            onChanged: (bool? v) => setState(() => _checked = v ?? false),
          ),
          const Text('I accept the Terms of Service'),
        ],
      ),
    );
  }
}
```

## Multiple-choice group

A set of independent options, tracked in a Set.

```dart
import 'package:flutter/material.dart';

/// Example: checkbox-group —— hobbies multi-select
class CheckboxGroupDemo extends StatefulWidget {
  const CheckboxGroupDemo({super.key});

  @override
  State<CheckboxGroupDemo> createState() => _CheckboxGroupDemoState();
}

class _CheckboxGroupDemoState extends State<CheckboxGroupDemo> {
  final _options = ['Coding', 'Reading', 'Sports', 'Music'];
  final _selected = <String>{'Coding'};

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final opt in _options)
            CheckboxListTile(
              title: Text(opt),
              value: _selected.contains(opt),
              onChanged: (v) => setState(() {
                v == true ? _selected.add(opt) : _selected.remove(opt);
              }),
            ),
          const SizedBox(height: 8),
          Text('Selected: ${_selected.join(', ')}'),
        ],
      ),
    );
  }
}
```

## Horizontal layout

To lay options out in a row, wrap a set of `Checkbox + Text` pairs in a `Row` -- or a `Wrap`, which reflows to the next line when width runs out.

```dart
import 'package:flutter/material.dart';

/// Example: checkbox-inline —— horizontally arranged multi-select tags
class CheckboxInlineDemo extends StatefulWidget {
  const CheckboxInlineDemo({super.key});

  @override
  State<CheckboxInlineDemo> createState() => _CheckboxInlineDemoState();
}

class _CheckboxInlineDemoState extends State<CheckboxInlineDemo> {
  final _options = ['WeChat', 'Alipay', 'Bank card', 'PayPal'];
  final _selected = <String>{'WeChat'};

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 4,
            alignment: WrapAlignment.center,
            children: [
              for (final opt in _options)
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Checkbox(
                      value: _selected.contains(opt),
                      onChanged: (v) => setState(() {
                        v == true ? _selected.add(opt) : _selected.remove(opt);
                      }),
                    ),
                    Text(opt),
                  ],
                ),
            ],
          ),
          const SizedBox(height: 8),
          Text('Selected: ${_selected.join(', ')}'),
        ],
      ),
    );
  }
}
```

## Tristate select-all

`tristate: true` allows null (partial selection) -- the classic "select-all + children" linkage.

```dart
import 'package:flutter/material.dart';

/// Example: checkbox-tristate —— parent tristate linked with children
class CheckboxTristateDemo extends StatefulWidget {
  const CheckboxTristateDemo({super.key});

  @override
  State<CheckboxTristateDemo> createState() => _CheckboxTristateDemoState();
}

class _CheckboxTristateDemoState extends State<CheckboxTristateDemo> {
  final _children = [false, false, false];

  bool? get _parent =>
      _children.every((c) => c) ? true : _children.every((c) => !c) ? false : null;

  void _toggleAll(bool? all) {
    setState(() {
      for (var i = 0; i < _children.length; i++) {
        _children[i] = all ?? false;
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          CheckboxListTile(
            title: const Text('Select all'),
            value: _parent,
            tristate: true, // partial selection shows the dash
            controlAffinity: ListTileControlAffinity.leading,
            onChanged: _toggleAll,
          ),
          for (var i = 0; i < _children.length; i++)
            CheckboxListTile(
              title: Text('Child $i'),
              value: _children[i],
              controlAffinity: ListTileControlAffinity.leading,
              onChanged: (v) => setState(() => _children[i] = v ?? false),
            ),
        ],
      ),
    );
  }
}
```

## Disabled state

```dart
import 'package:flutter/material.dart';

/// Example: checkbox-disabled —— null onChanged means disabled
class CheckboxDisabledDemo extends StatelessWidget {
  const CheckboxDisabledDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Checkbox(value: true, onChanged: null), // disabled but shown as checked
          Text('Not editable'),
        ],
      ),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `value` | Current state; `bool?` with `tristate` |
| `onChanged` | Callback -- **null disables** |
| `tristate` | Allows null / true / false |
| `activeColor` / `checkColor` / `side` | Checked color / tick color / outline |
| `visualDensity` / `materialTapTargetSize` | Tap target density |

## Pitfalls

::: danger null onChanged means disabled
With `onChanged: null` the Checkbox greys out and stops responding. This isn't a bug -- it's Flutter's uniform "disabled" convention (same as buttons). To keep it clickable you must pass a non-null callback.
:::

::: warning Controlled widget needs setState
Without setState in onChanged the box always springs back -- "tapping does nothing" is almost always this.
:::

::: tip Whole-row taps: CheckboxListTile
To let the label text toggle the box too, prefer `CheckboxListTile` over `Row(Checkbox + Text)`.
:::
