---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# NavigationRail

`NavigationRail` is a vertical navigation bar, common on tablets/desktop/wide layouts (a left-side vertical nav). It's the vertical counterpart of `BottomNavigationBar`.

## Basic usage

```dart
/// Example: rail-basic —— two-destination left rail
class RailBasicDemo extends StatefulWidget {
  const RailBasicDemo({super.key});

  @override
  State<RailBasicDemo> createState() => _RailBasicDemoState();
}

class _RailBasicDemoState extends State<RailBasicDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        NavigationRail(
          selectedIndex: _index,
          onDestinationSelected: (i) => setState(() => _index = i),
          labelType: NavigationRailLabelType.all, // always show labels
          destinations: const [
            NavigationRailDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: Text('Home'),
            ),
            NavigationRailDestination(
              icon: Icon(Icons.settings_outlined),
              selectedIcon: Icon(Icons.settings),
              label: Text('Settings'),
            ),
          ],
        ),
        const VerticalDivider(thickness: 1, width: 1),
        Expanded(child: Center(child: Text('Content area $_index'))),
      ],
    );
  }
}
```

## Extended: labels slide out, collapsible

`NavigationRail.extended` is the expanded form: text slides out next to the selected item — typical on desktop.

```dart
/// Example: rail-extended —— expandable desktop style
class RailExtendedDemo extends StatefulWidget {
  const RailExtendedDemo({super.key});

  @override
  State<RailExtendedDemo> createState() => _RailExtendedDemoState();
}

class _RailExtendedDemoState extends State<RailExtendedDemo> {
  int _index = 0;
  bool _extended = true;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        NavigationRail.extended(
          extended: _extended, // collapses to a narrow strip when false
          indicatorColor: Colors.blue.shade100,
          leading: IconButton(icon: const Icon(Icons.menu), onPressed: () => setState(() => _extended = !_extended)),
          selectedIndex: _index,
          onDestinationSelected: (i) => setState(() => _index = i),
          labelType: NavigationRailLabelType.selected,
          destinations: const [
            NavigationRailDestination(icon: Icon(Icons.dashboard), label: Text('Dashboard')),
            NavigationRailDestination(icon: Icon(Icons.mail), label: Text('Mail')),
            NavigationRailDestination(icon: Icon(Icons.calendar_month), label: Text('Calendar')),
          ],
        ),
        const VerticalDivider(thickness: 1, width: 1),
        Expanded(child: Center(child: Text('Page $_index (tap ☰ to expand/collapse)'))),
      ],
    );
  }
}
```

## Leading / trailing areas

Put a logo/menu button in `leading`, secondary actions like settings in `trailing`.

```dart
/// Example: rail-leading-trailing —— top/bottom extension slots
class RailSlotsDemo extends StatelessWidget {
  const RailSlotsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        NavigationRail(
          leading: Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: FlutterLogo(size: 32),
          ),
          trailing: Expanded(child: Align(
            alignment: Alignment.bottomCenter,
            child: Padding(padding: EdgeInsets.only(bottom: 8), child: Icon(Icons.help_outline)),
          )),
          labelType: NavigationRailLabelType.all,
          destinations: [
            NavigationRailDestination(icon: Icon(Icons.star), label: Text('Featured')),
            NavigationRailDestination(icon: Icon(Icons.video_library), label: Text('Courses')),
          ],
        ),
        VerticalDivider(thickness: 1, width: 1),
        Expanded(child: Center(child: Text('Main content'))),
      ],
    );
  }
}
```

## Responsive: rail on wide, bottom bar on narrow

Same index state, switch between two navigations by width.

```dart
/// Example: rail-responsive —— adapts to window width
class RailResponsiveDemo extends StatefulWidget {
  const RailResponsiveDemo({super.key});

  @override
  State<RailResponsiveDemo> createState() => _RailResponsiveDemoState();
}

class _RailResponsiveDemoState extends State<RailResponsiveDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final wide = c.maxWidth >= 600;
        return Scaffold(
          body: Row(
            children: [
              if (wide)
                NavigationRail(
                  selectedIndex: _index,
                  onDestinationSelected: (i) => setState(() => _index = i),
                  labelType: NavigationRailLabelType.all,
                  destinations: const [
                    NavigationRailDestination(icon: Icon(Icons.home), label: Text('Home')),
                    NavigationRailDestination(icon: Icon(Icons.person), label: Text('Me')),
                  ],
                ),
              Expanded(child: Center(child: Text('Page $_index (currently ${wide ? 'wide sidebar' : 'narrow bottom bar'})'))),
            ],
          ),
          bottomNavigationBar: wide
              ? null
              : BottomNavigationBar(
                  currentIndex: _index,
                  onTap: (i) => setState(() => _index = i),
                  items: const [
                    BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
                    BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Me'),
                  ],
                ),
        );
      },
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `selectedIndex` / `onDestinationSelected` | Controlled selection |
| `destinations` | `NavigationRailDestination(icon:, selectedIcon:, label:)` |
| `labelType` | `all` / `selected` / `tooltip` (hover hint) / `none` |
| `extended` | `NavigationRail.extended` constructor for the expandable form |
| `leading` / `trailing` / `groupAlignment` | Top/bottom extras / vertical position of the main group |
| `indicatorColor` / `indicatorShape` | Selected highlight block |
| `minWidth` / `minExtendedWidth` | Collapsed / expanded width |

## Pitfalls

::: warning Pair with a Divider and an Expanded content area
When the rail sits in a `Row`, the content must be `Expanded`, otherwise you hit the unbounded-width assertion; use `VerticalDivider(width: 1)` as the separator.
:::

::: info The M3 direction
For wide-screen navigation under Material 3, prefer `NavigationRail` with unified `NavigationDestination` semantics, or an adaptive solution (e.g. community `adaptive_navigation`) — one declaration rendered across form factors.
:::
