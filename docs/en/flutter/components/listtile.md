---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# ListTile

> 🟢 Stateless widget · `StatelessWidget`

`ListTile` is the Material standard "one list row" layout with five preset slots -- leading icon, title, subtitle, trailing widget -- plus built-in tap and ripple. Settings rows and message lists almost always use it.

## The five slots at once

leading / title / subtitle / trailing all configured in one go.

```dart
import 'package:flutter/material.dart';

/// Example: listtile-basic —— avatar + title + subtitle + chevron
class ListTileBasicDemo extends StatelessWidget {
  const ListTileBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: ListTile(
          leading: const CircleAvatar(child: Icon(Icons.person)),
          title: const Text('John Doe'),
          subtitle: const Text('Online · active just now'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {},
        ),
      ),
    );
  }
}
```

## Selected state

`selected` tints the title; combine with `selectedTileColor` to paint the whole row.

```dart
import 'package:flutter/material.dart';

/// Example: listtile-selected —— tap to switch selection
class ListTileSelectedDemo extends StatefulWidget {
  const ListTileSelectedDemo({super.key});

  @override
  State<ListTileSelectedDemo> createState() => _ListTileSelectedDemoState();
}

class _ListTileSelectedDemoState extends State<ListTileSelectedDemo> {
  int _current = 0;
  final options = ['WeChat Pay', 'Alipay', 'Bank card'];

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < options.length; i++)
              ListTile(
                title: Text(options[i]),
                selected: _current == i,
                selectedTileColor: Colors.blue.shade50,
                selectedColor: Colors.blue,
                trailing: _current == i ? const Icon(Icons.check, color: Colors.blue) : null,
                onTap: () => setState(() => _current = i),
              ),
          ],
        ),
      ),
    );
  }
}
```

## Three-line rows (isThreeLine)

When the subtitle may wrap to two lines, declare `isThreeLine: true` so vertical spacing is allocated correctly.

```dart
import 'package:flutter/material.dart';

/// Example: listtile-threeline —— long subtitle wraps
class ListTileThreeLineDemo extends StatelessWidget {
  const ListTileThreeLineDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: const ListTile(
          leading: Icon(Icons.article),
          title: Text('A long article'),
          subtitle: Text('When the subtitle content gets long it wraps onto another line; isThreeLine reserves enough vertical space for three lines'),
          isThreeLine: true,
        ),
      ),
    );
  }
}
```

## Dense mode

For packed settings pages use `dense: true` to compress row height.

```dart
import 'package:flutter/material.dart';

/// Example: listtile-dense —— default vs dense row heights
class ListTileDenseDemo extends StatelessWidget {
  const ListTileDenseDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ListTile(title: Text('Default height')),
            const ListTile(title: Text('Default height')),
            const ListTile(dense: true, title: Text('Dense compact')),
            const ListTile(dense: true, title: Text('Dense compact')),
          ],
        ),
      ),
    );
  }
}
```

## Ready-made Checkbox / Radio / Switch rows

When you need "whole row tappable + control", use `CheckboxListTile` / `RadioListTile` / `SwitchListTile` rather than hand-assembling a Row.

```dart
import 'package:flutter/material.dart';

/// Example: listtile-controls —— the three ListTile variants
class ListTileControlsDemo extends StatefulWidget {
  const ListTileControlsDemo({super.key});

  @override
  State<ListTileControlsDemo> createState() => _ListTileControlsDemoState();
}

class _ListTileControlsDemoState extends State<ListTileControlsDemo> {
  bool _notify = true;
  String _pay = 'wechat';
  bool _dark = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CheckboxListTile(
              title: const Text('Receive notifications'),
              value: _notify,
              onChanged: (v) => setState(() => _notify = v ?? false),
            ),
            RadioListTile<String>(
              title: const Text('WeChat Pay'),
              value: 'wechat',
              groupValue: _pay,
              onChanged: (v) => setState(() => _pay = v!),
            ),
            SwitchListTile(
              title: const Text('Dark mode'),
              value: _dark,
              onChanged: (v) => setState(() => _dark = v),
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
| `leading` / `trailing` | Left / right slot widgets |
| `title` / `subtitle` | Main / secondary text (usually Text) |
| `onTap` / `onLongPress` | Tap / long-press; null disables |
| `selected` / `selectedColor` / `selectedTileColor` | Selected state |
| `enabled` | false greys the whole row |
| `isThreeLine` / `dense` / `visualDensity` | Row height and density |
| `contentPadding` / `minLeadingWidth` | Padding / minimum leading width |

## Pitfalls

::: warning Ripple eaten by Container
Wrapping ListTile in `Container(decoration:)` hides the ink (same issue as InkWell) -- use `tileColor` / `selectedTileColor` for the background instead.
:::

::: warning Long titles squash the trailing
An over-long title deforms the trailing widget; add `overflow: TextOverflow.ellipsis` to the title Text, or control layout with `Row + Expanded`.
:::
