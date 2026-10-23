---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# ListView

> 🟢 Stateless widget · `StatelessWidget`

`ListView` is Flutter's core scrollable list widget for long content. It is **lazy** -- only items inside (and near) the viewport are built, so it easily carries thousands of rows.

## Fixed item list

A handful of hard-coded entries can go straight into `children`.

```dart
import 'package:flutter/material.dart';

/// Example: listview-children —— three fixed rows
class ListViewChildrenDemo extends StatelessWidget {
  const ListViewChildrenDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 240,
        child: ListView(
          padding: const EdgeInsets.all(8),
          children: const [
            ListTile(leading: Icon(Icons.home), title: Text('Home')),
            ListTile(leading: Icon(Icons.search), title: Text('Search')),
            ListTile(leading: Icon(Icons.settings), title: Text('Settings')),
          ],
        ),
      ),
    );
  }
}
```

## Lazy building

With lots of data you must use `ListView.builder`, building only visible items.

```dart
import 'package:flutter/material.dart';

/// Example: listview-builder —— 100 items built lazily
class ListViewBuilderDemo extends StatelessWidget {
  const ListViewBuilderDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 260,
        child: ListView.builder(
          itemCount: 100,
          itemBuilder: (context, index) =>
              ListTile(title: Text('Item $index')),
        ),
      ),
    );
  }
}
```

## separated with dividers

`separatorBuilder` inserts a divider between each pair of items -- cleaner than stuffing Dividers in manually.

```dart
import 'package:flutter/material.dart';

/// Example: listview-separated —— auto dividers between rows
class ListViewSeparatedDemo extends StatelessWidget {
  const ListViewSeparatedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const items = ['Apple', 'Banana', 'Orange', 'Grapes', 'Watermelon'];
    return Center(
      child: SizedBox(
        width: 300,
        height: 260,
        child: ListView.separated(
          itemCount: items.length,
          itemBuilder: (context, i) => ListTile(title: Text(items[i])),
          separatorBuilder: (context, i) => const Divider(height: 1),
        ),
      ),
    );
  }
}
```

## Horizontal scrolling

`scrollDirection: Axis.horizontal` scrolls sideways -- often used for tag strips and card flows.

```dart
import 'package:flutter/material.dart';

/// Example: listview-horizontal —— horizontal card strip
class ListViewHorizontalDemo extends StatelessWidget {
  const ListViewHorizontalDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const colors = [Colors.red, Colors.orange, Colors.green, Colors.blue, Colors.purple];
    return Center(
      child: SizedBox(
        height: 100,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          children: [
            for (final c in colors)
              Container(
                width: 80,
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(8)),
              ),
          ],
        ),
      ),
    );
  }
}
```

## Mixed layouts (slivers)

To compose one scroll stream from differently structured sections, use `CustomScrollView` + `SliverList`.

```dart
import 'package:flutter/material.dart';

/// Example: listview-slivers —— header + list in one scroll stream
class ListViewSliversDemo extends StatelessWidget {
  const ListViewSliversDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 280,
        child: CustomScrollView(
          slivers: [
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text('Trending this week', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              ),
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => ListTile(title: Text('Hot item $index')),
                childCount: 20,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

## The four constructors at a glance

| Constructor | Use when |
| --- | --- |
| `ListView(children: [...])` | Few fixed items |
| `ListView.builder` | Large data, lazy building |
| `ListView.separated` | Large data + separators |
| `CustomScrollView` + slivers | Mixed scroll structures (headers, grids, lists stitched together) |

## Pitfalls

::: danger Don't use children for large data
`ListView(children:)` builds every child up front. Beyond a few hundred rows switch to `ListView.builder` or the first frame janks badly.
:::

::: danger Main axis must be bounded
A `ListView` needs a bounded main axis: a vertical ListView inside a Column without `Expanded` throws `unbounded height`.
:::
