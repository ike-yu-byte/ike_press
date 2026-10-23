---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Drawer

> 🟢 Stateless widget · `StatelessWidget`

`Drawer` is a panel that slides in from the screen edge, usually holding account info and secondary navigation. Attach it to `Scaffold.drawer` and the AppBar shows a ☰ button automatically.

## Basic drawer

Menu header + list items; tapping an item closes the drawer first, then navigates.

```dart
import 'package:flutter/material.dart';

/// Example: drawer-basic —— standard side menu
class DrawerBasicDemo extends StatefulWidget {
  const DrawerBasicDemo({super.key});

  @override
  State<DrawerBasicDemo> createState() => _DrawerBasicDemoState();
}

class _DrawerBasicDemoState extends State<DrawerBasicDemo> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Home')), // a ☰ appears automatically with a drawer
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero, // key: otherwise DrawerHeader shows a white edge
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(color: Colors.blue),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(radius: 24, child: Icon(Icons.person)),
                  SizedBox(height: 8),
                  Text('Jane Doe', style: TextStyle(color: Colors.white, fontSize: 16)),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.person),
              title: const Text('Profile'),
              onTap: () {
                Navigator.pop(context); // close the drawer first
                // then navigate
              },
            ),
            ListTile(
              leading: const Icon(Icons.settings),
              title: const Text('Settings'),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
      body: const Center(child: Text('Tap ☰ at top-left to open the drawer')),
    );
  }
}
```

## Programmatic open/close

Control it with a `GlobalKey<ScaffoldState>` or `Scaffold.of`.

```dart
import 'package:flutter/material.dart';

/// Example: drawer-programmatic —— button opens the drawer
class DrawerProgrammaticDemo extends StatefulWidget {
  const DrawerProgrammaticDemo({super.key});

  @override
  State<DrawerProgrammaticDemo> createState() => _DrawerProgrammaticDemoState();
}

class _DrawerProgrammaticDemoState extends State<DrawerProgrammaticDemo> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(title: const Text('Home')),
      drawer: const Drawer(
        child: Center(child: Text('Drawer content')),
      ),
      body: Center(
        child: FilledButton.icon(
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          icon: const Icon(Icons.menu_open),
          label: const Text('Open drawer by code'),
        ),
      ),
    );
  }
}
```

## Right-side endDrawer

```dart
import 'package:flutter/material.dart';

/// Example: drawer-end —— right filter panel
class EndDrawerDemo extends StatefulWidget {
  const EndDrawerDemo({super.key});

  @override
  State<EndDrawerDemo> createState() => _EndDrawerDemoState();
}

class _EndDrawerDemoState extends State<EndDrawerDemo> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Products')),
      endDrawer: SizedBox(
        width: 260, // endDrawer defaults wider; usually self-limit it
        child: Drawer(
          child: ListView(
            children: const [
              Padding(padding: EdgeInsets.all(16), child: Text('Filters', style: TextStyle(fontWeight: FontWeight.bold))),
              ListTile(title: Text('Price: low to high')),
              ListTile(title: Text('In stock only')),
            ],
          ),
        ),
      ),
      body: const Center(child: Text('Tap the top-right icon to open the right drawer')),
    );
  }
}
```

## Form reference

| Form | Description |
| --- | --- |
| `Drawer` | Standard drawer, ~304dp wide, slides in from the left |
| `endDrawer` | Right-side counterpart |
| `DrawerController` | Standalone use without a Scaffold (custom edge gestures) |
| `navigationDrawer` (M3) | New M3 drawer since Flutter 3.27+, supports pane expansion (Permanent/Secondary forms) |
| `semanticsLabel` | Accessibility label |

## Pitfalls

::: warning ListView needs padding: EdgeInsets.zero
Drawer content carries a default 8dp padding so the DrawerHeader reveals a white edge; the convention is `padding: EdgeInsets.zero` on the inner ListView and manage item margins yourself.
:::

::: danger Pop before navigating
In onTap, call `Navigator.pop(context)` to close the drawer first, then push the new page; reversed order covers the drawer with the page and looks like "the drawer got stuck".
:::

::: info Context inside the drawer
The context for `Navigator.of(context)` must be below the Scaffold (drawer content naturally is); grabbing a context outside the AppBar to call openDrawer won't find the Scaffold.
:::
