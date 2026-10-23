---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# DropdownButton

`DropdownButton` opens an option menu on tap; after picking, the menu closes and the chosen item shows in the button's place. Good for choosing one of a few fixed options (city, category).

## Basic usage

```dart
import 'package:flutter/material.dart';

/// Example: dropdown-basic —— city single choice
class DropdownBasicDemo extends StatefulWidget {
  const DropdownBasicDemo({super.key});

  @override
  State<DropdownBasicDemo> createState() => _DropdownBasicDemoState();
}

class _DropdownBasicDemoState extends State<DropdownBasicDemo> {
  String? _city = 'Beijing';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: DropdownButton<String>(
        value: _city,
        hint: const Text('Pick a city'), // shown when value is null
        items: const [
          DropdownMenuItem(value: 'Beijing', child: Text('Beijing')),
          DropdownMenuItem(value: 'Shanghai', child: Text('Shanghai')),
          DropdownMenuItem(value: 'Guangzhou', child: Text('Guangzhou')),
          DropdownMenuItem(value: 'Shenzhen', child: Text('Shenzhen')),
        ],
        onChanged: (v) => setState(() => _city = v),
      ),
    );
  }
}
```

## Form style (bordered with label)

A bare `DropdownButton` has no border; in forms use `DropdownButtonFormField` to get an `InputDecoration` directly.

```dart
import 'package:flutter/material.dart';

/// Example: dropdown-form-field —— outlined, labeled dropdown
class DropdownFormFieldDemo extends StatefulWidget {
  const DropdownFormFieldDemo({super.key});

  @override
  State<DropdownFormFieldDemo> createState() => _DropdownFormFieldDemoState();
}

class _DropdownFormFieldDemoState extends State<DropdownFormFieldDemo> {
  String? _category;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 280,
        child: DropdownButtonFormField<String>(
          value: _category,
          decoration: const InputDecoration(
            labelText: 'Category',
            border: OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(value: 'food', child: Text('Food')),
            DropdownMenuItem(value: 'travel', child: Text('Travel')),
            DropdownMenuItem(value: 'tech', child: Text('Tech')),
          ],
          onChanged: (v) => setState(() => _category = v),
        ),
      ),
    );
  }
}
```

## Rich option content

Menu items can hold icons, colors -- any widget.

```dart
import 'package:flutter/material.dart';

/// Example: dropdown-rich —— options with icons
class DropdownRichDemo extends StatefulWidget {
  const DropdownRichDemo({super.key});

  @override
  State<DropdownRichDemo> createState() => _DropdownRichDemoState();
}

class _DropdownRichDemoState extends State<DropdownRichDemo> {
  int _priority = 1;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: DropdownButton<int>(
        value: _priority,
        items: const [
          DropdownMenuItem(
            value: 0,
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.flag, color: Colors.grey), Text(' Low'),
            ]),
          ),
          DropdownMenuItem(
            value: 1,
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.flag, color: Colors.orange), Text(' Medium'),
            ]),
          ),
          DropdownMenuItem(
            value: 2,
            child: Row(mainAxisSize: MainAxisSize.min, children: [
              Icon(Icons.flag, color: Colors.red), Text(' High'),
            ]),
          ),
        ],
        onChanged: (v) => setState(() => _priority = v ?? 1),
      ),
    );
  }
}
```

## Too many options: use a picker

Dropdown menus suit short lists (over ~10 items scrolling gets painful) -- switch to a bottom sheet or dialog list.

```dart
import 'package:flutter/material.dart';

/// Example: dropdown-bottom-sheet —— long lists go to a bottom picker
class DropdownBottomSheetDemo extends StatefulWidget {
  const DropdownBottomSheetDemo({super.key});

  @override
  State<DropdownBottomSheetDemo> createState() => _DropdownBottomSheetDemoState();
}

class _DropdownBottomSheetDemoState extends State<DropdownBottomSheetDemo> {
  String _bank = 'ICBC';
  final _banks = ['ICBC', 'CCB', 'ABC', 'Bank of China', 'CMB', 'Bank of Communications', 'Postal Savings', 'CITIC'];

  Future<void> _pick() async {
    final result = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            for (final b in _banks)
              ListTile(
                title: Text(b),
                trailing: b == _bank ? const Icon(Icons.check) : null,
                onTap: () => Navigator.pop(context, b),
              ),
          ],
        ),
      ),
    );
    if (result != null) setState(() => _bank = result);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 280,
        child: OutlinedButton.icon(
          onPressed: _pick,
          icon: const Icon(Icons.account_balance),
          label: Text(_bank),
        ),
      ),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `value` / `items` / `onChanged` | The core trio; null value shows the hint |
| `hint` | Placeholder text when nothing is selected |
| `underline` / `iconEnabledColor` | Underline / arrow color |
| `isExpanded` | true makes the button full-width with left-aligned text |
| `itemBuilder` (FormField variant) | Form integration + validator |
| `menuMaxHeight` | Max menu height, scrolls beyond it |

## Pitfalls

::: danger value must match an item
`value` must equal some `DropdownMenuItem.value` (or be null to show the hint). An initial value missing from the list triggers an assertion error.
:::

::: warning Long labels blow up the menu
Menu width follows the widest item; one very long entry distorts the whole button -- set `overflow` + a fixed width on long items.
:::

::: info M3 alternatives
For Material 3 menu-style pickers (search, grouping) the docs suggest `MenuAnchor` or third-party dropdown packages; `DropdownButtonFormField` is enough for simple forms.
:::
