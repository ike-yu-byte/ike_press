# setState & the Widget Lifecycle

> For readers with a JavaScript background. This page clears up the two most fundamental, most confusing things in Flutter: **how the UI updates with data (`setState`)** and **what stages a component goes through from birth to death (the lifecycle)**. Compared to React throughout.

## First, a mental model: three trees

The `Widget`s you write are just **immutable configuration descriptions** ("I want a red 60×60 box"), re-newed on every refresh — cheap. What actually does the work is behind them:

| Layer | What it is | Lifecycle | Frontend analogy |
| --- | --- | --- | --- |
| **Widget** | an immutable config snapshot | may rebuild every frame | React's JSX / element description |
| **Element** | a Widget's instance in the tree; holds state, does diffing | lives as long as possible | Fiber node |
| **RenderObject** | does layout, painting, hit-testing | reused with its Element | the real DOM node |

Key takeaway: **a Widget being rebuilt ≠ its State being rebuilt**. As long as the Element is reused successfully (same type + same key), its `State` survives and `initState` does not re-run. This explains why "a parent keeps rebuilding yet the child's text-field content isn't lost".

## StatelessWidget vs StatefulWidget

| | StatelessWidget | StatefulWidget |
| --- | --- | --- |
| Internal mutable state? | none | yes (in the paired `State` class) |
| When rebuilt | parent rebuild or self rebuild | same, plus its own `setState` |
| Analogy | a pure presentational function component | a component with `useState`/`useEffect` |

Pure display, all data from the constructor → `StatelessWidget`. Anything "that changes on its own" (a count, input, animation, subscription) → `StatefulWidget`.

## setState: mark dirty, rebuild asynchronously

`setState` does two things: **records "I changed"** + **schedules a rebuild**. It does **not repaint immediately**; it marks the Element dirty and Flutter rebuilds it in a batch on the **next frame** — the same idea as React's batching / `requestAnimationFrame` frame-coalescing.

```dart
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(home: const CounterPage());
}

class CounterPage extends StatefulWidget {
  const CounterPage({super.key});
  @override
  State<CounterPage> createState() => _CounterPageState();
}

class _CounterPageState extends State<CounterPage> {
  int _count = 0; // mutable state, in the State class, not the Widget

  void _increment() {
    // ① change the variable  ② setState to notify a rebuild. They must go together
    setState(() => _count++);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(child: Text('$_count', style: const TextStyle(fontSize: 48))),
        floatingActionButton: FloatingActionButton(onPressed: _increment, child: const Icon(Icons.add)),
      );
}
```

::: danger Change the variable without setState → UI won't move
`_count++` won't trigger a repaint on its own (Flutter has no Vue-style reactive proxy). **When you change something, call `setState`** (or change it inside the `setState` callback). Forgetting `setState` is the #1 pitfall for people coming from the frontend.
:::

::: danger You can't setState during build, nor after dispose
- Calling `setState` inside `build` → error (rebuilding again before the current rebuild finished).
- When an async callback (`Future`/`Timer`/event) returns, the widget may already be disposed, so `setState` throws. **Guard with `if (!mounted) return;`** (`mounted` is a State property meaning "still attached to the tree").
:::

## The full lifecycle order

A `StatefulWidget`'s `State`, from birth to death, calls methods in this order:

```
createState()
  → initState()                 // once: create controllers, subscribe, start timers
  → didChangeDependencies()     // once after initState; again whenever a dependency (InheritedWidget/Provider) changes
  → build()                     // first + every setState / parent rebuild
      ⇅ (repeats)
  → didUpdateWidget()           // when the parent rebuilds it with a "new Widget instance" (config changed)
  → build()
  → deactivate()                // removed from the tree (may be a temporary detach; GlobalKey moves go through here)
  → dispose()                   // permanent removal: cancel subscriptions, release controllers — "unmount cleanup"
```

Compared to React (function-component / hooks view):

| Flutter | React equivalent | Typical use |
| --- | --- | --- |
| `initState` | `useEffect(fn, [])` first run / constructor | init controllers, subscribe to the event bus |
| `build` | the function-component body itself (runs each render) | describe the UI |
| `setState` | `setState` / a `useState` setter | trigger a re-render |
| `didUpdateWidget` | `useEffect` on dep change / `componentDidUpdate` | sync internal state when external params change |
| `dispose` | `useEffect` cleanup / `componentWillUnmount` | cancel Timer, Stream, controllers |
| `mounted` | checking if still mounted | safe setState in async callbacks |

## A complete example with resource cleanup

The canonical `initState` + `dispose` pair: start a per-second timer and be sure to cancel it on disposal (≈ a `useEffect` `setInterval` that must pair with `clearInterval`).

```dart
import 'dart:async';
import 'package:flutter/material.dart';

class TimerPage extends StatefulWidget {
  const TimerPage({super.key});
  @override
  State<TimerPage> createState() => _TimerPageState();
}

class _TimerPageState extends State<TimerPage> {
  Timer? _timer;
  int _seconds = 0;

  @override
  void initState() {
    super.initState();                 // ① always call super first
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;            // ③ check liveness in the async callback
      setState(() => _seconds++);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();                  // ② release: forget to cancel = timer leak + setState after dispose
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Center(child: Text('Running for $_seconds seconds'));
}
```

## didUpdateWidget: syncing internal state when props change

Scenario: a countdown widget whose "start seconds" comes from the parent. When the start value changes you must reset the internal count — that's exactly `didUpdateWidget`'s job (≈ React's `useEffect` watching a prop to reset state).

```dart
class Countdown extends StatefulWidget {
  final int startSeconds;
  const Countdown({super.key, required this.startSeconds});
  @override
  State<Countdown> createState() => _CountdownState();
}

class _CountdownState extends State<Countdown> {
  late int _remaining = widget.startSeconds;

  @override
  void didUpdateWidget(covariant Countdown oldWidget) {
    super.didUpdateWidget(oldWidget);
    // reset only when the incoming start value actually changed, to avoid needless rebuilds
    if (oldWidget.startSeconds != widget.startSeconds) {
      setState(() => _remaining = widget.startSeconds);
    }
  }

  @override
  Widget build(BuildContext context) => Text('Remaining: $_remaining s');
}
```

::: tip Why not compare & reset inside build
Comparing `widget.xxx` and mutating state inside `build` is an anti-pattern (build should purely produce UI). `didUpdateWidget` gives you the correct place to run a side effect when configuration changes. In React terms: "don't fire setState side effects directly in the render body".
:::

## setState or a state-management library?

- **Ephemeral state**: only this widget cares (current tab, field text, animation progress) → `setState` is enough.
- **App state**: shared across places (logged-in user, cart, theme) → use `Provider` / `Riverpod` / `Bloc`, or something beyond this page.

Don't treat `setState` as a global store, and don't force Riverpod onto a widget with a single local counter — pick the tool by state scope, the same judgment as "local useState vs global store" on the web.

## Common pitfalls

::: danger Forgetting super.initState() / super.dispose()
`initState`, `dispose` and `didUpdateWidget` must call `super` (before, or after in `dispose`). Skipping it makes Flutter warn or throw.
:::

::: danger Putting mutable state in a StatelessWidget
A StatelessWidget is immutable; changing its fields won't trigger a rebuild. If it must change, use a `StatefulWidget` and keep the state in the `State`.
:::

::: info List-reorder state mix-ups are a key problem, not a lifecycle problem
If a `StatefulWidget` sits in a list that can be added/removed/reordered, give each item a stable `ValueKey`, or Flutter's positional Element reuse will misplace internal state. See [GlobalKey](/en/flutter/global-key).
:::

## Next steps

- Subscriptions you must cancel on disposal usually come from the [event bus](/en/flutter/event-bus)
- How push/pop affects the lifecycle — see [Navigator routing](/en/flutter/navigator)
