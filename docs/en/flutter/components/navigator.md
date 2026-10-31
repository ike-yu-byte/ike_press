---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/navigator' # Flutter Web preview URL for this page
---

# Navigator

> 🔵 Stateful widget · `StatefulWidget`

`Navigator` manages pushing and popping pages to implement navigation. Flutter has two styles: **imperative** (`push` a `MaterialPageRoute`) and **named routes** (`pushNamed`).

## Push a new page (imperative)

Arguments go through the target page's constructor — the most direct way.

```dart
import 'package:flutter/material.dart';

/// Example: navigator-push —— go to detail page with params
class NavigatorPushDemo extends StatelessWidget {
  const NavigatorPushDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton.icon(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const DetailPage(id: 42, name: 'Jane'),
            ),
          );
        },
        icon: const Icon(Icons.arrow_forward),
        label: const Text('Open details'),
      ),
    );
  }
}

// Target page: params are ordinary constructor fields
class DetailPage extends StatelessWidget {
  const DetailPage({super.key, required this.id, required this.name});

  final int id;
  final String name;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Detail #$id')),
      body: Center(child: Text('Name: $name, use the back button top-left')),
    );
  }
}
```

## Receiving a result

`push` returns a `Future`; read the outcome when the page calls `pop(context, value)`.

```dart
import 'package:flutter/material.dart';

/// Example: navigator-result —— picker page returns a value
class NavigatorResultDemo extends StatefulWidget {
  const NavigatorResultDemo({super.key});

  @override
  State<NavigatorResultDemo> createState() => _NavigatorResultDemoState();
}

class _NavigatorResultDemoState extends State<NavigatorResultDemo> {
  String? _picked;

  Future<void> _pickCity() async {
    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (context) => const CityPickerPage()),
    );
    if (result != null) setState(() => _picked = result); // null when cancelled
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_picked ?? 'No city picked yet'),
          const SizedBox(height: 8),
          FilledButton(onPressed: _pickCity, child: const Text('Pick a city')),
        ],
      ),
    );
  }
}

class CityPickerPage extends StatelessWidget {
  const CityPickerPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Choose city')),
      body: ListView(
        children: [
          for (final city in const ['Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen'])
            ListTile(
              title: Text(city),
              onTap: () => Navigator.pop(context, city), // pop with a value
            ),
        ],
      ),
    );
  }
}
```

## Back and replace

```dart
import 'package:flutter/material.dart';

/// Example: navigator-pop-replace —— pop / replace current page
void _back(BuildContext context) {
  Navigator.pop(context); // close current page
}

void _replace(BuildContext context) {
  // Common after login success: don't let the back key return to the login page
  Navigator.pushReplacement(
    context,
    MaterialPageRoute(builder: (context) => const HomePage()),
  );
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('Home')), body: const SizedBox.shrink());
}
```

## Named routes

Register a table in `MaterialApp.routes` and jump by path name; arguments travel in `arguments`.

```dart
import 'package:flutter/material.dart';

/// Example: navigator-named —— named routes with arguments
// Registered in main.dart:
void main() {
  runApp(MaterialApp(
    initialRoute: '/',
    routes: {
      '/': (context) => const NamedRouteHome(),
      '/detail': (context) => const NamedRouteDetail(),
    },
  ));
}

class NamedRouteHome extends StatelessWidget {
  const NamedRouteHome({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      body: Center(
        child: FilledButton(
          // read args via ModalRoute on the target page
          onPressed: () => Navigator.pushNamed(context, '/detail', arguments: {'id': 7}),
          child: const Text('Open details'),
        ),
      ),
    );
  }
}

class NamedRouteDetail extends StatelessWidget {
  const NamedRouteDetail({super.key});

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    return Scaffold(
      appBar: AppBar(title: Text('Detail #${args['id']}')),
    );
  }
}
```

## Back interception (unsaved content)

`PopScope` intercepts first when the user hits back or uses the predictive-back gesture.

```dart
import 'package:flutter/material.dart';

/// Example: navigator-popscope —— confirm dialog before leaving
class NavigatorPopScopeDemo extends StatelessWidget {
  const NavigatorPopScopeDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, // forbid direct pop
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldPop = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('Discard edits?'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Keep editing')),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('Discard')),
            ],
          ),
        );
        if (shouldPop == true && context.mounted) {
          Navigator.pop(context);
        }
      },
      child: const Scaffold(
        body: Center(child: Text('Try pressing the system back button')),
      ),
    );
  }
}
```

## API reference

| API | Description |
| --- | --- |
| `push` / `pop` | Push / pop (optionally with a return value) |
| `pushReplacement` | Replace current page (no back to it) |
| `pushAndRemoveUntil` | Jump to a page and clear the stack (login → home) |
| `pushNamed` / `popUntil` | Named route / return to a given page (e.g. home) |
| `maybePop` | Pop only if possible (won't crash on the first screen) |
| `PopScope` | Intercept back gestures/keys |

## Pitfalls

::: danger context may be stale after await push
During the async gap the page may be destroyed; before using context in a callback, guard with `if (!context.mounted) return;`.
:::

::: warning named-route args have no type safety
`arguments` is `Object?`; a wrong cast crashes on the spot. For complex projects go imperative or use a type-safe solution like go_router.
:::

::: info Routing in large projects
Imperative/named routes fit simple cases; with many pages and deep links, the community standard is [go_router](https://pub.dev/packages/go_router).
:::
