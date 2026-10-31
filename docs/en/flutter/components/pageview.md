---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/pageview' # Flutter Web preview URL for this page
---

# PageView

> 🔵 Stateful widget · `StatefulWidget`

`PageView` shows one page at a time, switching with horizontal (or vertical) swipes. Good for onboarding guides, image carousels and tab-style full-screen paging.

## Basic paging

Three solid-color pages, swipe to switch.

```dart
import 'package:flutter/material.dart';

/// Example: pageview-basic —— three pages side scrolling
class PageViewBasicDemo extends StatelessWidget {
  const PageViewBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 200,
        child: PageView(
          children: const [
            ColoredBox(color: Colors.red, child: Center(child: Text('Page 1', style: TextStyle(color: Colors.white, fontSize: 24)))),
            ColoredBox(color: Colors.green, child: Center(child: Text('Page 2', style: TextStyle(color: Colors.white, fontSize: 24)))),
            ColoredBox(color: Colors.blue, child: Center(child: Text('Page 3', style: TextStyle(color: Colors.white, fontSize: 24)))),
          ],
        ),
      ),
    );
  }
}
```

## Carousel with dot indicator

`PageController` + `onPageChanged` drive the dots below.

```dart
import 'package:flutter/material.dart';

/// Example: pageview-indicator —— carousel + dot indicator
class PageViewIndicatorDemo extends StatefulWidget {
  const PageViewIndicatorDemo({super.key});

  @override
  State<PageViewIndicatorDemo> createState() => _PageViewIndicatorDemoState();
}

class _PageViewIndicatorDemoState extends State<PageViewIndicatorDemo> {
  final _controller = PageController(
    initialPage: 0,
    viewportFraction: 0.9, // each page covers 90% of the viewport, peeking the next edge
  );
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose(); // controller must be released
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const colors = [Colors.orange, Colors.teal, Colors.purple];
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 300,
            height: 160,
            child: PageView.builder(
              controller: _controller,
              itemCount: colors.length,
              onPageChanged: (i) => setState(() => _page = i),
              itemBuilder: (context, i) => Container(
                margin: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: colors[i], borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < colors.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: i == _page ? 20 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: i == _page ? Colors.blue : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
```

## Programmatic page jumps

`animateToPage` transitions smoothly; `jumpToPage` switches instantly.

```dart
import 'package:flutter/material.dart';

/// Example: pageview-jump —— buttons control paging
class PageViewJumpDemo extends StatefulWidget {
  const PageViewJumpDemo({super.key});

  @override
  State<PageViewJumpDemo> createState() => _PageViewJumpDemoState();
}

class _PageViewJumpDemoState extends State<PageViewJumpDemo> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
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
            child: PageView(
              controller: _controller,
              physics: const NeverScrollableScrollPhysics(), // no swipe, buttons only
              onPageChanged: (i) => setState(() => _page = i),
              children: const [
                ColoredBox(color: Colors.red, child: Center(child: Text('A'))),
                ColoredBox(color: Colors.green, child: Center(child: Text('B'))),
                ColoredBox(color: Colors.blue, child: Center(child: Text('C'))),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text('Current page: $_page'),
          FilledButton.tonalIcon(
            onPressed: () {
              _controller.animateToPage(
                (_page + 1) % 3,
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
              );
            },
            icon: const Icon(Icons.skip_next),
            label: const Text('Next page'),
          ),
        ],
      ),
    );
  }
}
```

## Vertical paging

`scrollDirection: Axis.vertical` -- common for full-screen guides.

```dart
import 'package:flutter/material.dart';

/// Example: pageview-vertical —— swipe up/down
class PageViewVerticalDemo extends StatelessWidget {
  const PageViewVerticalDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 220,
        height: 260,
        child: PageView(
          scrollDirection: Axis.vertical,
          children: const [
            ColoredBox(color: Colors.indigo, child: Center(child: Text('Swipe up', style: TextStyle(color: Colors.white)))),
            ColoredBox(color: Colors.teal, child: Center(child: Text('Second screen', style: TextStyle(color: Colors.white)))),
          ],
        ),
      ),
    );
  }
}
```

## Property reference

| Property | Description |
| --- | --- |
| `controller` | `PageController(initialPage:)` start page; entry point for programmatic jumps |
| `onPageChanged` | Page change callback |
| `scrollDirection` | Paging direction, horizontal by default |
| `physics` | `NeverScrollableScrollPhysics` disables swiping (buttons only) |

## Pitfalls

::: danger Always dispose the controller
`PageController` holds a ScrollPosition; not releasing it in the State's `dispose()` leaks.
:::

::: warning Infinite loops via modulo
There is no native "infinite carousel" parameter. The common trick is a large `itemCount` + `index % realLength`, or a wrapper package like `CyclePageView`.
:::
