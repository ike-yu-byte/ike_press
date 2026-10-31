---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/scaffold' # Flutter Web preview URL for this page
---

# Scaffold

> 🔵 Stateful widget · `StatefulWidget`

`Scaffold` is the **skeleton container** of a Material page — the outermost widget of most pages. It wires up slots for the AppBar, body, bottom navigation, FAB, drawer and SnackBars in one place.

## Full skeleton

All major slots configured at once.

```dart
import 'package:flutter/material.dart';

/// Example: scaffold-full —— appBar + body + FAB + bottom nav + drawer
class ScaffoldFullDemo extends StatefulWidget {
  const ScaffoldFullDemo({super.key});

  @override
  State<ScaffoldFullDemo> createState() => _ScaffoldFullDemoState();
}

class _ScaffoldFullDemoState extends State<ScaffoldFullDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Home')),
      drawer: const Drawer(
        child: Center(child: Text('Drawer content')),
      ),
      body: IndexedStack(
        index: _index,
        children: const [
          Center(child: Text('Page 0')),
          Center(child: Text('Page 1')),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Me'),
        ],
      ),
    );
  }
}
```

## Safe area for body

`body` doesn't avoid system bars automatically; wrap non-scrolling content in `SafeArea`.

```dart
import 'package:flutter/material.dart';

/// Example: scaffold-safearea —— content avoids notch / gesture bar
class ScaffoldSafeAreaDemo extends StatelessWidget {
  const ScaffoldSafeAreaDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Details')),
      body: const SafeArea(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('This content is not hidden by the bottom gesture bar'),
        ),
      ),
    );
  }
}
```

## Transparent app bar (cover header)

Overlay the `AppBar` on body imagery: `transparent` + `flexibleSpace`.

```dart
import 'package:flutter/material.dart';

/// Example: scaffold-flexible-appbar —— image header + collapsing title
class ScaffoldFlexibleDemo extends StatelessWidget {
  const ScaffoldFlexibleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 180,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: const Text('Album', style: TextStyle(color: Colors.white)),
              background: Image.network(
                'https://picsum.photos/seed/scaffold/600/360',
                fit: BoxFit.cover,
              ),
            ),
          ),
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('Scroll down to watch the title bar collapse…'),
            ),
          ),
        ],
      ),
    );
  }
}
```

## Slot reference

| Slot | Purpose |
| --- | --- |
| `appBar` | Top app bar |
| `body` | Main page content (required) |
| `floatingActionButton` | FAB |
| `bottomNavigationBar` | Bottom navigation |
| `drawer` / `endDrawer` | Left / right drawer |
| `persistentFooterButtons` | Button row pinned to the bottom |
| `snackBar` (via ScaffoldMessenger) | Transient bottom message |
| `backgroundColor` / `resizeToAvoidBottomInset` | Background / whether the keyboard pushes content up |

## Pitfalls

::: warning Scaffold.of is deprecated
The old `Scaffold.of(context)` to reach Scaffold state is mostly unused; SnackBars go through `ScaffoldMessenger.of(context)`. Opening a drawer via `Scaffold.of(context).openDrawer()` still works, but the context must be below the Scaffold.
:::

::: danger One Scaffold per page
Scaffold isn't cheap and each instance is independent (its Messenger/drawer bind to itself); don't nest another Scaffold inside a child widget as a plain container — unless you truly want a separate route page.
:::

::: info Full-screen pages can drop the AppBar
Onboarding or video pages simply omit `appBar` so the body extends under the status bar; combine with `SystemChrome` to hide it entirely.
:::
