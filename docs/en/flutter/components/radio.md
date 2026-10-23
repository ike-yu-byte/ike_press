---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Radio

> 🔵 Stateful widget · `StatefulWidget`

`Radio` picks one option from a mutually exclusive set. A lone `Radio` is meaningless -- exclusivity comes from **sharing one `groupValue`**: the radio whose `value == groupValue` is the lit one.

## Basic single choice

```dart
import 'package:flutter/material.dart';

/// Example: radio-basic —— gender two-way choice
class RadioBasicDemo extends StatefulWidget {
  const RadioBasicDemo({super.key});

  @override
  State<RadioBasicDemo> createState() => _RadioBasicDemoState();
}

class _RadioBasicDemoState extends State<RadioBasicDemo> {
  String? _gender = 'male';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Radio<String>(
            value: 'male',
            groupValue: _gender,
            onChanged: (v) => setState(() => _gender = v),
          ),
          const Text('Male'),
          Radio<String>(
            value: 'female',
            groupValue: _gender,
            onChanged: (v) => setState(() => _gender = v),
          ),
          const Text('Female'),
        ],
      ),
    );
  }
}
```

## Whole-row taps (RadioListTile recommended)

Nearly all radio scenarios should use `RadioListTile` so the label is tappable too.

```dart
import 'package:flutter/material.dart';

/// Example: radio-listtile —— payment method single choice
class RadioListTileDemo extends StatefulWidget {
  const RadioListTileDemo({super.key});

  @override
  State<RadioListTileDemo> createState() => _RadioListTileDemoState();
}

class _RadioListTileDemoState extends State<RadioListTileDemo> {
  String _pay = 'wechat';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            RadioListTile<String>(
              title: const Text('WeChat Pay'),
              secondary: const Icon(Icons.chat),
              value: 'wechat',
              groupValue: _pay,
              onChanged: (v) => setState(() => _pay = v!),
            ),
            RadioListTile<String>(
              title: const Text('Alipay'),
              secondary: const Icon(Icons.account_balance),
              value: 'alipay',
              groupValue: _pay,
              onChanged: (v) => setState(() => _pay = v!),
            ),
            RadioListTile<String>(
              title: const Text('Bank card'),
              secondary: const Icon(Icons.credit_card),
              value: 'bank',
              groupValue: _pay,
              onChanged: (v) => setState(() => _pay = v!),
            ),
          ],
        ),
      ),
    );
  }
}
```

## Enum-driven (recommended pattern)

Use an enum as the generic type instead of strings -- typos become compile errors.

```dart
import 'package:flutter/material.dart';

/// Example: radio-enum —— type-safe single choice with an enum
enum DeliverySpeed { standard, express, sameDay }

class RadioEnumDemo extends StatefulWidget {
  const RadioEnumDemo({super.key});

  @override
  State<RadioEnumDemo> createState() => _RadioEnumDemoState();
}

class _RadioEnumDemoState extends State<RadioEnumDemo> {
  DeliverySpeed _speed = DeliverySpeed.standard;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (final (i, label) in const ['Standard', 'Express', 'Same day'].indexed)
            RadioListTile<DeliverySpeed>(
              title: Text(label),
              value: DeliverySpeed.values[i],
              groupValue: _speed,
              onChanged: (v) => setState(() => _speed = v!),
            ),
          const SizedBox(height: 8),
          Text('Current: ${_speed.name}'),
        ],
      ),
    );
  }
}
```

## Disabling one option

```dart
import 'package:flutter/material.dart';

/// Example: radio-disabled —— null onChanged makes an option unselectable
class RadioDisabledDemo extends StatefulWidget {
  const RadioDisabledDemo({super.key});

  @override
  State<RadioDisabledDemo> createState() => _RadioDisabledDemoState();
}

class _RadioDisabledDemoState extends State<RadioDisabledDemo> {
  int _selected = 0;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          RadioListTile<int>(
            title: const Text('Available option'),
            value: 0,
            groupValue: _selected,
            onChanged: (v) => setState(() => _selected = v!),
          ),
          RadioListTile<int>(
            title: const Text('Sold out, unselectable'),
            value: 1,
            groupValue: _selected,
            onChanged: null, // disabled
          ),
        ],
      ),
    );
  }
}
```

## New API: RadioGroup container (Flutter 3.32+)

`groupValue` / `onChanged` are deprecated on individual radios; an ancestor `RadioGroup` now owns the group state:

```dart
import 'package:flutter/material.dart';

/// Example: radio-group-new-api —— RadioGroup manages the radio set
class RadioGroupNewDemo extends StatefulWidget {
  const RadioGroupNewDemo({super.key});

  @override
  State<RadioGroupNewDemo> createState() => _RadioGroupNewDemoState();
}

class _RadioGroupNewDemoState extends State<RadioGroupNewDemo> {
  String _pay = 'wechat';

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        // group state lives here; children only declare value
        child: RadioGroup<String>(
          groupValue: _pay,
          onChanged: (v) => setState(() => _pay = v!),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: const [
              RadioListTile<String>(title: Text('WeChat Pay'), value: 'wechat'),
              RadioListTile<String>(title: Text('Alipay'), value: 'alipay'),
              RadioListTile<String>(title: Text('Bank card'), value: 'bank'),
            ],
          ),
        ),
      ),
    );
  }
}
```

::: info Why the change
The old pattern repeated `groupValue` + `onChanged` on every option -- miss one and exclusivity breaks. `RadioGroup` lifts group state to one ancestor; children only declare `value`, and custom nested grouping becomes possible.
:::

## Property reference

| Property | Description |
| --- | --- |
| `value` / `groupValue` | This option's id / currently selected value (equal = selected) |
| `onChanged` | Callback; null disables |
| `activeColor` / `fillColor` | Selected colors |
| `RadioListTile`'s `title` / `subtitle` / `secondary` / `controlAffinity` | Whole-row layout slots |
| `groupDirection` (ListTile variant) | Radio on the left (leading) or right (trailing) |

## Pitfalls

::: danger groupValue types must match
The generic of `Radio<T>`, value, groupValue and the onChanged parameter must be the same type -- mixing String/int fails compilation.
:::

::: warning No setState = never selected
Like Checkbox this is a controlled widget; onChanged must setState a new groupValue.
:::

::: tip Prefer RadioGroup
New projects should use the `RadioGroup` container directly; the legacy groupValue pattern still works but emits deprecation warnings -- migrate as you upgrade the SDK.
:::
