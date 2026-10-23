---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# BottomNavigationBar

`BottomNavigationBar` is the most common primary navigation in apps (Home/Explore/Me). It lives in `Scaffold.bottomNavigationBar`; tapping different items updates `currentIndex` and swaps the body.

## Basic three tabs

```dart
import 'package:flutter/material.dart';

/// Example: bottomnav-basic —— home / explore / me
class BottomNavBasicDemo extends StatefulWidget {
  const BottomNavBasicDemo({super.key});

  @override
  State<BottomNavBasicDemo> createState() => _BottomNavBasicDemoState();
}

class _BottomNavBasicDemoState extends State<BottomNavBasicDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [
          Center(child: Text('Home')),
          Center(child: Text('Explore')),
          Center(child: Text('Me')),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.explore), label: 'Explore'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Me'),
        ],
      ),
    );
  }
}
```

## fixed vs shifting styles

`type: shifting` shows only icons when unselected and icon+label when selected, with flashier animation; often used past 3 items.

```dart
import 'package:flutter/material.dart';

/// Example: bottomnav-shifting —— selected item carries a background pill
class BottomNavShiftingDemo extends StatefulWidget {
  const BottomNavShiftingDemo({super.key});

  @override
  State<BottomNavShiftingDemo> createState() => _BottomNavShiftingDemoState();
}

class _BottomNavShiftingDemoState extends State<BottomNavShiftingDemo> {
  int _index = 1;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('Tab $_index')),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.shifting,
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home', backgroundColor: Colors.blue),
          BottomNavigationBarItem(icon: Icon(Icons.search), label: 'Search', backgroundColor: Colors.teal),
          BottomNavigationBarItem(icon: Icon(Icons.notifications), label: 'Alerts', backgroundColor: Colors.purple),
        ],
      ),
    );
  }
}
```

## Keeping page state (IndexedStack)

Swapping the body directly destroys and rebuilds pages; use `IndexedStack` to preserve each tab's state (scroll position, etc.).

```dart
import 'package:flutter/material.dart';

/// Example: bottomnav-indexedstack —— tab switches keep state
class BottomNavIndexedStackDemo extends StatefulWidget {
  const BottomNavIndexedStackDemo({super.key});

  @override
  State<BottomNavIndexedStackDemo> createState() => _BottomNavIndexedStackDemoState();
}

class _BottomNavIndexedStackDemoState extends State<BottomNavIndexedStackDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // IndexedStack: builds all children, only shows the one at index
      body: IndexedStack(
        index: _index,
        children: [
          ListView.builder(itemCount: 50, itemBuilder: (c, i) => ListTile(title: Text('Home $i'))),
          ListView.builder(itemCount: 50, itemBuilder: (c, i) => ListTile(title: Text('Explore $i'))),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.explore), label: 'Explore'),
        ],
      ),
    );
  }
}
```

## The M3 successor: NavigationBar

Material 3's `NavigationBar` is the new-generation bottom nav (automatic pill highlight, theme-driven styling); prefer it in new projects.

```dart
import 'package:flutter/material.dart';

/// Example: bottomnav-m3-navigationbar —— the new NavigationBar widget
class BottomNavM3Demo extends StatefulWidget {
  const BottomNavM3Demo({super.key});

  @override
  State<BottomNavM3Demo> createState() => _BottomNavM3DemoState();
}

class _BottomNavM3DemoState extends State<BottomNavM3Demo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('Page $_index')),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: 'Home'),
          NavigationDestination(icon: Icon(Icons.search_outlined), selectedIcon: Icon(Icons.search), label: 'Search'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: 'Me'),
        ],
      ),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `currentIndex` / `onTap` | Controlled selection / tap callback |
| `items` | `BottomNavigationBarItem(icon:, label:, backgroundColor:)` |
| `type` | `fixed` (labels always shown) / `shifting` (label only when selected) |
| `fixedColor` / `selectedItemColor` / `unselectedItemColor` | Colors |
| `selectedFontSize` / `iconSize` | Font size / icon size |

## Pitfalls

::: danger Swapping the body widget loses state
On tab switches the old page is disposed (scroll position, typed input all gone). Standard fix: `IndexedStack`; for heavy pages use `AutomaticKeepAliveClientMixin` or lift state up.
:::

::: warning Past 5 items the UX breaks
Don't put more than 5 items in bottom navigation; fold extra entries into "More" or a home grid.
:::

::: info Old and new coexist
`BottomNavigationBar` is an M2 component and still works; if it looks off under an M3 theme, switch to `NavigationBar` — its API is cleaner.
:::
