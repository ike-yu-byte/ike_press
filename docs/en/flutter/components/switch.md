---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Switch

> 🔵 Stateful widget · `StatefulWidget`

`Switch` is an instantly-applied on/off toggle (Wi-Fi, notifications, etc.). Like Checkbox it is controlled via `value` + `onChanged`; the difference is the sliding animation and the "flip it and it takes effect" semantics.

## Basic switch

```dart
import 'package:flutter/material.dart';

/// Example: switch-basic —— Wi-Fi toggle applied instantly
class SwitchBasicDemo extends StatefulWidget {
  const SwitchBasicDemo({super.key});

  @override
  State<SwitchBasicDemo> createState() => _SwitchBasicDemoState();
}

class _SwitchBasicDemoState extends State<SwitchBasicDemo> {
  bool _wifi = true;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Text('Wi-Fi'),
          const SizedBox(width: 12),
          Switch(
            value: _wifi,
            onChanged: (bool v) => setState(() => _wifi = v),
          ),
          Text(_wifi ? 'On' : 'Off'),
        ],
      ),
    );
  }
}
```

## Whole-row taps (SwitchListTile)

The standard settings-page shape -- tapping the title toggles too.

```dart
import 'package:flutter/material.dart';

/// Example: switch-listtile —— settings list style
class SwitchListTileDemo extends StatefulWidget {
  const SwitchListTileDemo({super.key});

  @override
  State<SwitchListTileDemo> createState() => _SwitchListTileDemoState();
}

class _SwitchListTileDemoState extends State<SwitchListTileDemo> {
  bool _notify = true;
  bool _dark = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SwitchListTile(
              title: const Text('Push notifications'),
              subtitle: const Text('Receive pushes and reminders'),
              secondary: const Icon(Icons.notifications),
              value: _notify,
              onChanged: (v) => setState(() => _notify = v),
            ),
            SwitchListTile(
              title: const Text('Dark mode'),
              secondary: const Icon(Icons.dark_mode),
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

## Material 3 color customization

The new API colors by state (selected / unselected / disabled) via `WidgetStateProperty`.

```dart
import 'package:flutter/material.dart';

/// Example: switch-colored —— M3 state-property colors
class SwitchColoredDemo extends StatefulWidget {
  const SwitchColoredDemo({super.key});

  @override
  State<SwitchColoredDemo> createState() => _SwitchColoredDemoState();
}

class _SwitchColoredDemoState extends State<SwitchColoredDemo> {
  bool _on = true;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Switch(
            value: _on,
            onChanged: (v) => setState(() => _on = v),
            activeThumbColor: Colors.white,
            activeTrackColor: Colors.green,
            inactiveThumbColor: Colors.white,
            inactiveTrackColor: Colors.grey.shade300,
          ),
          const SizedBox(height: 12),
          // legacy properties still work: activeColor covers simple cases
          Switch(
            value: !_on,
            activeColor: Colors.red,
            onChanged: (v) => setState(() => _on = !v),
          ),
        ],
      ),
    );
  }
}
```

## Disabled while confirming asynchronously

```dart
import 'package:flutter/material.dart';

/// Example: switch-async —— async confirm after flipping, shows progress meanwhile
class SwitchAsyncDemo extends StatefulWidget {
  const SwitchAsyncDemo({super.key});

  @override
  State<SwitchAsyncDemo> createState() => _SwitchAsyncDemoState();
}

class _SwitchAsyncDemoState extends State<SwitchAsyncDemo> {
  bool _bluetooth = false;
  bool _pending = false;

  Future<void> _toggle(bool v) async {
    setState(() => _pending = true);
    await Future.delayed(const Duration(seconds: 1)); // simulate slow Bluetooth start-up
    if (!mounted) return;
    setState(() {
      _bluetooth = v;
      _pending = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_pending ? 'Working…' : 'Bluetooth'),
          const SizedBox(width: 12),
          Switch(
            value: _bluetooth,
            // disabled during the async operation to prevent double flips
            onChanged: _pending ? null : _toggle,
          ),
        ],
      ),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `value` / `onChanged` | Controlled state / callback (null disables) |
| `activeColor` / `activeTrackColor` | Legacy: thumb / track color when on |
| `activeThumbColor` / `inactiveThumbColor` / `activeTrackColor` / `inactiveTrackColor` | M3 state colors |
| `thumbIcon` / `trackIcon` / `selectedOverlayColor` | M3 thumb icon / track icon / pressed overlay |
| `SwitchListTile` | Whole-row version with title / subtitle / secondary |

## Pitfalls

::: danger null onChanged means disabled
Same convention as Checkbox: `onChanged: null` greys it out. For "unclickable while an async effect runs", temporarily pass null.
:::

::: warning Controlled widget needs setState
Don't update value in onChanged and the switch springs back forever.
:::

::: info Switch vs Checkbox semantics
Instant effect (flip = execute) -> Switch; checks that need a submit step (agreeing to terms) -> Checkbox. Don't mix them up.
:::
