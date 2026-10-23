---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# AppBar

> 🔵 Stateful widget · `StatefulWidget`

`AppBar` is the bar at the top of a page: title, back button, trailing action icons, and it can carry a `bottom` widget (e.g. a TabBar). Used as `Scaffold.appBar`.

## Basic app bar

```dart
import 'package:flutter/material.dart';

/// Example: appbar-basic —— centered title + two actions
class AppBarBasicDemo extends StatelessWidget {
  const AppBarBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        centerTitle: true, // iOS-style centering
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () {}),
          IconButton(icon: const Icon(Icons.more_vert), onPressed: () {}),
        ],
      ),
      body: const Center(child: Text('Page content')),
    );
  }
}
```

## Automatic back and drawer buttons

A ← appears when there's a previous route; a ☰ appears when a `drawer` is attached — both can be overridden manually.

```dart
import 'package:flutter/material.dart';

/// Example: appbar-leading —— manually specify the leading button
class AppBarLeadingDemo extends StatelessWidget {
  const AppBarLeadingDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Settings'),
        leading: IconButton( // overrides the default back/drawer button
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.maybePop(context),
        ),
        automaticallyImplyLeading: true, // false removes the back key entirely
      ),
      body: const Center(child: Text('Top-left shows ✕ instead of ←')),
    );
  }
}
```

## TabBar in bottom

`bottom` is the most used extension slot; prefer `PreferredSize` to customize height.

```dart
import 'package:flutter/material.dart';

/// Example: appbar-bottom-tab —— tabs under the app bar
class AppBarBottomTabDemo extends StatelessWidget {
  const AppBarBottomTabDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Music'),
          bottom: const TabBar(
            tabs: [
              Tab(text: 'Popular'),
              Tab(text: 'New'),
              Tab(text: 'Charts'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [Center(child: Text('Popular')), Center(child: Text('New')), Center(child: Text('Charts'))],
        ),
      ),
    );
  }
}
```

## Search-bar look

Replace the title with an input field (tap an icon to expand is the common interaction).

```dart
import 'package:flutter/material.dart';

/// Example: appbar-search —— title becomes the search field
class AppBarSearchDemo extends StatefulWidget {
  const AppBarSearchDemo({super.key});

  @override
  State<AppBarSearchDemo> createState() => _AppBarSearchDemoState();
}

class _AppBarSearchDemoState extends State<AppBarSearchDemo> {
  bool _searching = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _searching
            ? const TextField(
                autofocus: true,
                decoration: InputDecoration(hintText: 'Search…'),
              )
            : const Text('Products'),
        actions: [
          IconButton(
            icon: Icon(_searching ? Icons.close : Icons.search),
            onPressed: () => setState(() => _searching = !_searching),
          ),
        ],
      ),
      body: const Center(child: Text('Tap the top-right icon to toggle search mode')),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `title` / `centerTitle` | Title widget / whether centered |
| `leading` / `actions` | Left / right action areas (List\<Widget\>) |
| `automaticallyImplyLeading` | Turn off the automatic back key |
| `bottom` / `flexibleSpace` | TabBar slot / flexible space (for SliverAppBar) |
| `backgroundColor` / `foregroundColor` / `iconTheme` | Bar color / unified foreground / icon color |
| `elevation` / `scrolledUnderElevation` | Resting / scrolled-under shadow height |
| `toolbarHeight` / `titleSpacing` | Height / gap between title and side areas |

## Pitfalls

::: warning action icons need hit space
`IconButton` carries a 48dp tap target; a bare `Icon` in `actions` is hard to hit — always use IconButton there.
:::

::: danger Under M3 the default color follows the theme
In Material 3 the AppBar defaults to a surface tint, not the primary color — "why isn't the title bar blue anymore" is expected theming; set `backgroundColor` explicitly for the old look.
:::

::: info Use SliverAppBar to hide on scroll
The "hide on scroll-up, reappear on scroll-down" effect is beyond `AppBar`; switch to `SliverAppBar` with floating/pinned inside a CustomScrollView.
:::
