---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/refreshindicator' # Flutter Web preview URL for this page
---

# RefreshIndicator

> 🔵 Stateful widget · `StatefulWidget`

`RefreshIndicator` wraps a scrollable widget: pulling down shows a spinner, releasing kicks off an async refresh task.

## Basic pull-to-refresh

Pull the list down -> spinner -> auto hides once data updates.

```dart
import 'package:flutter/material.dart';

/// Example: refresh-basic —— regenerate list data on pull
class RefreshBasicDemo extends StatefulWidget {
  const RefreshBasicDemo({super.key});

  @override
  State<RefreshBasicDemo> createState() => _RefreshBasicDemoState();
}

class _RefreshBasicDemoState extends State<RefreshBasicDemo> {
  List<String> items = List.generate(20, (i) => 'Item $i');

  Future<void> _onRefresh() async {
    await Future.delayed(const Duration(seconds: 1)); // simulate a network call
    setState(() {
      items = List.generate(20, (i) => 'Refreshed $i');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 260,
        child: RefreshIndicator(
          onRefresh: _onRefresh,
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(), // key: pullable even when underfilled
            itemCount: items.length,
            itemBuilder: (context, i) => ListTile(title: Text(items[i])),
          ),
        ),
      ),
    );
  }
}
```

## Programmatic trigger

A `GlobalKey<RefreshIndicatorState>` can summon the refresh without a swipe (e.g. first page load).

```dart
import 'package:flutter/material.dart';

/// Example: refresh-programmatic —— button triggers the refresh animation
class RefreshProgrammaticDemo extends StatefulWidget {
  const RefreshProgrammaticDemo({super.key});

  @override
  State<RefreshProgrammaticDemo> createState() => _RefreshProgrammaticDemoState();
}

class _RefreshProgrammaticDemoState extends State<RefreshProgrammaticDemo> {
  final _refreshKey = GlobalKey<RefreshIndicatorState>();
  int _count = 0;

  Future<void> _onRefresh() async {
    await Future.delayed(const Duration(seconds: 1));
    setState(() => _count++);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 300,
            height: 160,
            child: RefreshIndicator(
              key: _refreshKey,
              onRefresh: _onRefresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  ListTile(title: Text('Refreshed $_count time(s)')),
                  const ListTile(title: Text('↓ or use the button below')),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () => _refreshKey.currentState?.show(), // trigger in code
            icon: const Icon(Icons.refresh),
            label: const Text('Trigger refresh'),
          ),
        ],
      ),
    );
  }
}
```

## Custom styling

Color, background and displacement are all adjustable.

```dart
import 'package:flutter/material.dart';

/// Example: refresh-styled —— custom spinner look
class RefreshStyledDemo extends StatefulWidget {
  const RefreshStyledDemo({super.key});

  @override
  State<RefreshStyledDemo> createState() => _RefreshStyledDemoState();
}

class _RefreshStyledDemoState extends State<RefreshStyledDemo> {
  Future<void> _onRefresh() => Future.delayed(const Duration(seconds: 1));

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 220,
        child: RefreshIndicator(
          onRefresh: _onRefresh,
          color: Colors.white,               // spinner color
          backgroundColor: Colors.deepPurple, // circle backing color
          displacement: 60,                   // pull distance before trigger (also circle position)
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: const [
              ListTile(title: Text('Purple refresh circle')),
              ListTile(title: Text('Try pulling down')),
            ],
          ),
        ),
      ),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `onRefresh` | Required, returns a `Future`; spinner keeps turning until it completes |
| `color` / `backgroundColor` | Spinner color / backing color |
| `displacement` | Trigger point and circle offset |
| `notificationPredicate` | Which scroll notifications may trigger refresh (nested scroll) |
| `semanticsLabel` / `semanticsValue` | Accessibility readout |

## Pitfalls

::: danger No pull when content is short
If the list is shorter than the screen, default physics disallows pulling and `RefreshIndicator` never fires. Add `physics: AlwaysScrollableScrollPhysics()` to the scrollable child.
:::

::: danger onRefresh must return a Future
Forgetting await/return makes the circle close immediately -- it looks like "refresh did nothing". An async function returns a Future naturally; just use one.
:::

::: warning The child must be scrollable
`RefreshIndicator` listens to scroll notifications; a bare `Column` child will never fire it. Use ListView / GridView / SingleChildScrollView etc.
:::
