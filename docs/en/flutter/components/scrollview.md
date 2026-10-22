---
pageClass: flutter-doc # widens the right preview column (see var.css)
preview: '' # Flutter Web preview URL for this page (to be filled later)
---

# SingleChildScrollView

`SingleChildScrollView` makes **one** child scrollable. Use it when you have a single block of fixed content (a Column, a long article) that needs scrolling, but with few children and no need for lazy building.

## Vertical scrolling for long content

A Column taller than the viewport becomes scrollable with one wrapper.

```dart
/// Example: scrollview-vertical —— scroll a whole Column block
class ScrollViewVerticalDemo extends StatelessWidget {
  const ScrollViewVerticalDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 240,
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Title', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              for (var i = 0; i < 20; i++) Text('Line $i of content — scroll once it exceeds the box'),
            ],
          ),
        ),
      ),
    );
  }
}
```

## Horizontal single line

`scrollDirection: Axis.horizontal` scrolls a Row sideways (simple non-lazy horizontal content).

```dart
/// Example: scrollview-horizontal —— scroll a row of text sideways
class ScrollViewHorizontalDemo extends StatelessWidget {
  const ScrollViewHorizontalDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        height: 90,
        child: SingleChildScrollView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          child: const Row(
            children: [
              Text('a very very long line of content '),
              Text('that does not wrap '),
              Text('but scrolls sideways '),
              Icon(Icons.arrow_forward),
            ],
          ),
        ),
      ),
    );
  }
}
```

## Always scrollable (short content)

When content is shorter than the viewport it won't scroll by default; add `AlwaysScrollableScrollPhysics` to keep the overscroll bounce.

```dart
/// Example: scrollview-physics —— bounce even when underfilled
class ScrollViewPhysicsDemo extends StatelessWidget {
  const ScrollViewPhysicsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 200,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          child: Column(
            children: [
              const SizedBox(height: 20),
              const Text('Content is shorter than the box'),
              const SizedBox(height: 8),
              const Text('but still scrolls and bounces'),
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
| `child` | The single child (wrap multiple in your own Column/Row) |
| `scrollDirection` | Scroll direction, vertical by default |
| `reverse` | Start content from the bottom |
| `padding` | Inner padding of the scroll container |
| `physics` | Scroll physics (bounce / whether scrollable at all) |
| `controller` | `ScrollController` for programmatic jumps and offset listening |

## Which one to pick

| Scenario | Choice |
| --- | --- |
| One fixed block of content | `SingleChildScrollView` |
| Many homogeneous list items | `ListView.builder` (lazy) |
| List + header + grid mixed | `CustomScrollView` + slivers |

## Pitfalls

::: danger Exactly one child
As the name says, it accepts a single `child`. Multiple items must be wrapped in a `Column`/`Row` yourself -- and if they are a homogeneous list anyway, `ListView` is the better fit.
:::

::: warning Column won't fill the viewport
To make content **fill the viewport height** (e.g. chat-style bottom alignment), the Column inside `SingleChildScrollView` shrinks by default; combine `ConstrainedBox(BoxConstraints(minHeight: viewport))` + `IntrinsicHeight`.
:::
