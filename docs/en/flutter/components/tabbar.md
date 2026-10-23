---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# TabBar / TabBarView

> 🔵 Stateful widget · `StatefulWidget`

`TabBar` is the top tab strip, `TabBarView` is the swipeable content pager; the two sync through a `TabController`. Often placed in `AppBar.bottom`.

## DefaultTabController (least code)

No state management at all — TabBar and TabBarView line up automatically.

```dart
import 'package:flutter/material.dart';

/// Example: tabbar-default —— three linked pages
class TabBarDefaultDemo extends StatelessWidget {
  const TabBarDefaultDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('News'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Top'),
              Tab(text: 'Tech'),
              Tab(text: 'Sports'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            Center(child: Text('Top stories')),
            Center(child: Text('Tech stories')),
            Center(child: Text('Sports stories')),
          ],
        ),
      ),
    );
  }
}
```

## Manual TabController (listening / programmatic switching)

`TickerProvider` drives the animation; you can listen for page changes and jump programmatically.

```dart
import 'package:flutter/material.dart';

/// Example: tabbar-controller —— listener + button jump
class TabBarControllerDemo extends StatefulWidget {
  const TabBarControllerDemo({super.key});

  @override
  State<TabBarControllerDemo> createState() => _TabBarControllerDemoState();
}

class _TabBarControllerDemoState extends State<TabBarControllerDemo>
    with SingleTickerProviderStateMixin {
  late final TabController _controller = TabController(length: 3, vsync: this);

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      if (!_controller.indexIsChanging) {
        // indexIsChanging: mid-animation; false means the new page has settled
        print('switched to ${_controller.index}');
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose(); // must release
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Manual control'),
        bottom: TabBar(
          controller: _controller,
          tabs: const [Tab(text: 'A'), Tab(text: 'B'), Tab(text: 'C')],
        ),
      ),
      body: TabBarView(
        controller: _controller,
        children: [
          Center(
            child: FilledButton(
              onPressed: () => _controller.animateTo(2, duration: const Duration(milliseconds: 300), curve: Curves.easeOut),
              child: const Text('Jump to page C'),
            ),
          ),
          const Center(child: Text('B')),
          const Center(child: Text('C')),
        ],
      ),
    );
  }
}
```

## Icon + text + scrollable tabs

When tabs don't all fit, use `isScrollable` — scroll horizontally instead of squeezing.

```dart
import 'package:flutter/material.dart';

/// Example: tabbar-scrollable —— scrollable icon tabs
class TabBarScrollableDemo extends StatelessWidget {
  const TabBarScrollableDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const tabs = ['For You', 'Trending', 'Music', 'Games', 'Movies', 'Learn', 'Anime', 'Sports'];
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Channels'),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              for (final t in tabs) Tab(icon: const Icon(Icons.bolt), text: t),
            ],
          ),
        ),
        body: TabBarView(
          children: [for (final t in tabs) Center(child: Text(t))],
        ),
      ),
    );
  }
}
```

## Using the bar alone

Want only the tab strip without the swipeable pages (tap switches the body): give TabBar its own TabController and rebuild the body on index changes.

```dart
import 'package:flutter/material.dart';

/// Example: tabbar-only —— strip only, manual IndexedStack switching
class TabBarOnlyDemo extends StatefulWidget {
  const TabBarOnlyDemo({super.key});

  @override
  State<TabBarOnlyDemo> createState() => _TabBarOnlyDemoState();
}

class _TabBarOnlyDemoState extends State<TabBarOnlyDemo>
    with SingleTickerProviderStateMixin {
  late final TabController _controller = TabController(length: 3, vsync: this);

  @override
  void initState() {
    super.initState();
    _controller.addListener(() => setState(() {})); // rebuild body on switch
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _controller,
          tabs: const [Tab(text: 'One'), Tab(text: 'Two'), Tab(text: 'Three')],
        ),
        Expanded(
          child: IndexedStack(
            index: _controller.index,
            children: const [
              Center(child: Text('Page one')),
              Center(child: Text('Page two')),
              Center(child: Text('Page three')),
            ],
          ),
        ),
      ],
    );
  }
}
```

> When you don't need the swipe gesture, this "TabBar + IndexedStack" pattern is more controllable than TabBarView (lazy loading and state retention are entirely yours); M3's `SegmentedButton` is another option.

## Property reference

| Property | Description |
| --- | --- |
| `tabs` / `children` | TabBar labels / TabBarView pages — counts must match |
| `controller` | Shared `TabController` (same length) |
| `isScrollable` / `tabAlignment` | Scrolling when there are many tabs |
| `indicatorSize` / `dividerColor` | M3 underline width (tab/fixed) / bottom divider |
| `TabController.animateTo` / `.index` | Programmatic switch / current page |

## Pitfalls

::: danger The length must match in three places
`TabController(length)`, `TabBar(tabs)` and `TabBarView(children)` disagreeing trips an assertion immediately.
:::

::: warning TabBarView pre-builds neighbors
Adjacent pages are already constructed (lazy page sliding); if a page fires network requests, don't duplicate them in init.
:::

::: info Capsule-style segmented look
For scrolling capsule tabs M3 recommends `SegmentedButton`; the classic underline TabBar remains the mainstream pattern.
:::
