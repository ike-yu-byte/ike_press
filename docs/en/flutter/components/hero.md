---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# Hero

> 🔵 Stateful widget · `StatefulWidget`

`Hero` creates a shared-element transition where an element **flies smoothly from the old page to the new one** during navigation (the classic: tapping a list thumbnail to open a full-size detail page).

## Basic usage: same tag on both pages

Place a Hero with an identical `tag` on the list page and the detail page — the flight animation is automatic on navigation.

```dart
import 'package:flutter/material.dart';

/// Example: hero-basic —— thumbnail opens the big-image page
class HeroListDemo extends StatelessWidget {
  const HeroListDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Album')),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(8),
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        children: [
          for (final id in const ['a', 'b', 'c', 'd'])
            InkWell(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => HeroDetailDemo(imageId: id)),
              ),
              child: Hero(
                tag: 'photo-$id', // unique identifier
                child: Image.network(
                  'https://picsum.photos/seed/$id/300/300',
                  fit: BoxFit.cover,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class HeroDetailDemo extends StatelessWidget {
  const HeroDetailDemo({super.key, required this.imageId});

  final String imageId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Hero(
          tag: 'photo-$imageId', // the same tag as the list page
          child: Image.network(
            'https://picsum.photos/seed/$imageId/900/900',
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }
}
```

> The two Hero widgets don't need identical structure (thumbnail → full image relies on that difference to produce the flight); note that wrapping Hero inside an InkWell hides the ripple under the image — for pure navigation a GestureDetector suffices.

## Customizing the in-flight look (flightShuttleBuilder)

By default the flight stretches/interpolates source and target widgets; to fade in mid-flight, take over `flightShuttleBuilder`.

```dart
import 'package:flutter/material.dart';

/// Example: hero-flight-shuttle —— scale + fade during the flight
final _bigUrl = 'https://picsum.photos/seed/shuttle/900/900';

class HeroShuttleListDemo extends StatelessWidget {
  const HeroShuttleListDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Hero(
        tag: 'shuttle-demo',
        // content shown mid-flight: use the animation (0→1) for a fade-in
        flightShuttleBuilder: (context, animation, direction, heroContext, flightContext) =>
            FadeTransition(
          opacity: animation,
          child: Image.network(_bigUrl, width: 160, height: 160, fit: BoxFit.cover),
        ),
        child: GestureDetector(
          onTap: () => Navigator.push(context,
              MaterialPageRoute(builder: (context) => const HeroShuttleDetailDemo())),
          child: Image.network(_bigUrl, width: 80, height: 80, fit: BoxFit.cover),
        ),
      ),
    );
  }
}

class HeroShuttleDetailDemo extends StatelessWidget {
  const HeroShuttleDetailDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Hero(
          tag: 'shuttle-demo',
          child: Image.network(_bigUrl, fit: BoxFit.contain),
        ),
      ),
    );
  }
}
```

## Avoiding tag collisions in lists

::: tip Tag style for dynamic lists
`tag: 'photo-${photos[i].id}'` — use the business id rather than the index (after deletes/inserts the index shifts and flights get scrambled); a tag must never appear twice in the route stack at the same moment.
:::

## Property reference

| Property | Description |
| --- | --- |
| `tag` | Required; identical on both pages, globally unique at any moment |
| `child` | The flying content |
| `flightShuttleBuilder` | Custom in-flight widget |
| `rectTween` / `placeholderStrategy` | Rect interpolation / placeholder timing (`HeroPlaceholderStrategy`) |
| `createRectTween` | Deprecated, replaced by `rectTween` |

## Pitfalls

::: danger Duplicate tags crash outright
Two Heroes with the same tag in the route stack at once (e.g. list recycling + detail page) throws a `There multiple Hero widgets` exception; tags must carry a unique business id.
:::

::: warning It only rides the Navigator
Hero animations depend on route transitions; showing/hiding within one page via `Visibility`/`IndexedStack` won't trigger them.
:::

::: info The return flight works too
The animation is bidirectional: popping back to the list flies the big image home to its thumbnail, no extra code needed.
:::
