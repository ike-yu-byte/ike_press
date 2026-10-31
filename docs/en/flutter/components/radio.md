---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/radio' # Flutter Web preview URL for this page
---

# Radio

> 🔵 Stateful widget · `StatefulWidget`

`Radio` picks one option from a mutually exclusive set. A lone `Radio` is meaningless -- since Flutter 3.32+ an ancestor `RadioGroup` owns the group state: the radio whose `value == RadioGroup.groupValue` is the lit one, and children only declare `value`.

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
      // group state lives on the RadioGroup; children only declare value
      child: RadioGroup<String>(
        groupValue: _gender,
        onChanged: (v) => setState(() => _gender = v),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: const [
            Radio<String>(value: 'male'),
            Text('Male'),
            Radio<String>(value: 'female'),
            Text('Female'),
          ],
        ),
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
        child: RadioGroup<String>(
          groupValue: _pay,
          onChanged: (v) => setState(() => _pay = v!),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: const [
              RadioListTile<String>(
                title: Text('WeChat Pay'),
                secondary: Icon(Icons.chat),
                value: 'wechat',
              ),
              RadioListTile<String>(
                title: Text('Alipay'),
                secondary: Icon(Icons.account_balance),
                value: 'alipay',
              ),
              RadioListTile<String>(
                title: Text('Bank card'),
                secondary: Icon(Icons.credit_card),
                value: 'bank',
              ),
            ],
          ),
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
          RadioGroup<DeliverySpeed>(
            groupValue: _speed,
            onChanged: (v) => setState(() => _speed = v!),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                for (final (i, label) in const ['Standard', 'Express', 'Same day'].indexed)
                  RadioListTile<DeliverySpeed>(
                    title: Text(label),
                    value: DeliverySpeed.values[i],
                  ),
              ],
            ),
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

/// Example: radio-disabled —— enabled: false makes an option unselectable
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
      child: RadioGroup<int>(
        groupValue: _selected,
        onChanged: (v) => setState(() => _selected = v!),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: const [
            RadioListTile<int>(title: Text('Available option'), value: 0),
            RadioListTile<int>(title: Text('Sold out, unselectable'), value: 1, enabled: false),
          ],
        ),
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
| `RadioGroup`'s `groupValue` / `onChanged` | Group selected value / change callback (on the ancestor container) |
| `Radio` / `RadioListTile`'s `value` | This option's id; equals `groupValue` = selected |
| `enabled` | Pass `false` to disable a single option |
| `activeColor` / `fillColor` | Selected colors |
| `RadioListTile`'s `title` / `subtitle` / `secondary` / `controlAffinity` | Whole-row layout slots |
| `groupDirection` (ListTile variant) | Radio on the left (leading) or right (trailing) |

## Pitfalls

::: danger Generic types must match
The generic of `RadioGroup<T>`, its `groupValue`, and each child `Radio<T>` / `RadioListTile<T>`'s `value` must be the same type -- mixing String/int fails compilation.
:::

::: warning No setState = never selected
Like Checkbox this is a controlled widget; `RadioGroup.onChanged` must setState a new groupValue.
:::

::: tip Use RadioGroup directly
`groupValue` / `onChanged` on individual `Radio` / `RadioListTile` are deprecated (Flutter 3.32+); use an ancestor `RadioGroup` instead; disable a single option with `enabled: false` rather than `onChanged: null`.
:::
