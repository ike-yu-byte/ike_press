# Event Bus

> For readers with a JavaScript background. An event bus ≈ the frontend's `EventEmitter` / `mitt` / `new EventTarget()` / RxJS `Subject`: **let two pieces of code that don't know each other talk via "fire event / listen event"**, instead of threading callbacks down many layers (prop drilling).

## Why Flutter needs one

Flutter's officially-blessed data flow is "pass down via constructor, call back up" (≈ React props + callbacks). But some scenarios involve two components that are far apart and unrelated:

- The network layer detects "session expired" and any page must show a toast
- A user changes their nickname on screen A, screen B must refresh instantly
- A cart badge count needs to sync globally wherever it's incremented

Plumbing an `onXxx` callback through every layer is painful — that's exactly the event bus's job.

| Web frontend | Flutter / Dart | Note |
| --- | --- | --- |
| `new EventTarget()` / `addEventListener` | `Stream` + `.listen()` | "event stream" is native in Dart |
| Node `EventEmitter` / `mitt` | build your own on `StreamController.broadcast()` | no built-in global bus |
| RxJS `Subject` / `BehaviorSubject` | `StreamController` (+ optional seed) | nearly identical semantics |
| `emit('x', data)` | `sink.add(data)` | fire an event |
| `on('x', cb)` | `stream.listen(cb)` | receive an event |

## Minimal implementation: a broadcast stream

Dart's `StreamController` is a two-ended object: `sink` is the input (push events in), `stream` is the output (subscribe). **The key is `.broadcast()`** — by default it's a single-subscription stream that can only be `listen`ed once; a bus must be broadcast (≈ EventEmitter naturally supports many listeners).

```dart
import 'dart:async';

Future<void> main() async {
  // Broadcast controller: allows multiple subscribers — the base of an event bus
  final controller = StreamController<String>.broadcast();

  // Two unrelated listeners
  final subA = controller.stream.listen((e) => print('A got: $e'));
  final subB = controller.stream.listen((e) => print('B got: $e'));

  controller.sink.add('hello');   // fire once → both A and B print

  await Future.delayed(const Duration(milliseconds: 10));
  await subA.cancel();            // cancel when done (see "pitfalls" below)
  await subB.cancel();
  await controller.close();       // shut down the bus
}
```

::: tip A broadcast stream only delivers events fired *after* you subscribe
Unlike `EventEmitter`, a `broadcast` stream **does not replay past events**: a listener that subscribes after an `add` won't receive it. If you need "new subscribers immediately get the latest value" (≈ RxJS `BehaviorSubject` / a state snapshot), re-emit on listen via `StreamController.broadcast(onListen: ...)` or use a real `BehaviorSubject` (the `rxdart` package).
:::

## Wrapping it as a global singleton bus

In real projects you won't pass a `controller` around; you'll wrap a global singleton. Use **types** to distinguish events (safer than string names — IDE jump-to-def and compile-time typo checks):

```dart
import 'dart:async';

// 1) Define events: one small class per event, carrying its own data
class UserLoggedIn {
  final String name;
  UserLoggedIn(this.name);
}

class CartChanged {
  final int count;
  CartChanged(this.count);
}

// 2) Global bus singleton
class EventBus {
  EventBus._internal();
  static final EventBus instance = EventBus._internal();

  final _controller = StreamController<dynamic>.broadcast();

  /// Fire an event
  void fire(dynamic event) => _controller.sink.add(event);

  /// Subscribe: take only one event type (a type-filtered stream)
  Stream<T> on<T>() => _controller.stream.where((e) => e is T).cast<T>();

  void dispose() => _controller.close();
}

final eventBus = EventBus.instance;
```

Usage becomes clean — the firing side and the listening side never need to know each other:

```dart
// Anywhere, after login succeeds:
eventBus.fire(UserLoggedIn('ike'));

// In a completely unrelated component:
eventBus.on<UserLoggedIn>().listen((e) => print('Welcome back, ${e.name}'));
```

## Subscribing and cancelling inside a Widget

**This is where leaks happen most.** The rule: subscribe in `initState`, store the `StreamSubscription`, cancel it in `dispose` — exactly like `addEventListener` in a React `useEffect` must be paired with `removeEventListener` in cleanup. Forgetting to cancel ≈ leaking a WebSocket / forgetting `clearInterval`: callbacks keep firing, and `setState` after disposal throws.

```dart
import 'dart:async';
import 'package:flutter/material.dart';

class ProfileCard extends StatefulWidget {
  const ProfileCard({super.key});

  @override
  State<ProfileCard> createState() => _ProfileCardState();
}

class _ProfileCardState extends State<ProfileCard> {
  String _name = 'Not logged in';
  StreamSubscription<UserLoggedIn>? _sub;   // keep the handle to cancel in dispose

  @override
  void initState() {
    super.initState();
    _sub = eventBus.on<UserLoggedIn>().listen((e) {
      if (!mounted) return;                 // the widget may already be gone; check before setState
      setState(() => _name = e.name);       // event received → refresh UI
    });
  }

  @override
  void dispose() {
    _sub?.cancel();                         // must cancel, or leak + setState-after-dispose
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Text(_name);
}
```

> `eventBus` and `UserLoggedIn` come from the wrapper above — put them in a shared file and `import` it.

## A complete runnable example

A minimal app you can `flutter run`: a bottom button "fires an event", and two unrelated widgets at the top each subscribe and refresh independently.

```dart
import 'dart:async';
import 'package:flutter/material.dart';

// —— Event definition ——
class CounterEvent {
  final int step;
  CounterEvent(this.step);
}

// —— Global bus: one broadcast controller exposing stream (subscribe) and sink (fire) ——
final _bus = StreamController<CounterEvent>.broadcast();
final Stream<CounterEvent> eventStream = _bus.stream;
final StreamSink<CounterEvent> eventSink = _bus.sink;

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        home: const HomePage(),
        debugShowCheckedModeBanner: false,
      );
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: const Center(
        // Two sibling widgets with no parent-child data flow between them — they sync purely via the bus
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [EvenLabel(), OddLabel()],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => eventSink.add(CounterEvent(1)), // fire: +1
        child: const Icon(Icons.add),
      ),
    );
  }
}

// A widget that only tracks the running count
class EvenLabel extends StatefulWidget {
  const EvenLabel({super.key});
  @override
  State<EvenLabel> createState() => _EvenLabelState();
}

class _EvenLabelState extends State<EvenLabel> {
  int _count = 0;
  StreamSubscription<CounterEvent>? _sub;

  @override
  void initState() {
    super.initState();
    _sub = eventStream.listen((e) {
      setState(() => _count += e.step);
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Text('count: $_count', style: const TextStyle(fontSize: 24));
}

// A widget that only counts how many events arrived
class OddLabel extends StatefulWidget {
  const OddLabel({super.key});
  @override
  State<OddLabel> createState() => _OddLabelState();
}

class _OddLabelState extends State<OddLabel> {
  int _received = 0;
  StreamSubscription<CounterEvent>? _sub;

  @override
  void initState() {
    super.initState();
    _sub = eventStream.listen((_) {
      setState(() => _received++);
    });
  }

  @override
  void dispose() {
    _sub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Text('events received: $_received');
}
```

::: warning The bus is global here only for brevity
In production, wrap the `StreamController` in an injectable singleton (see the `EventBus` above) and `close()` it on app shutdown; for cross-page events whose lifecycle should reset with theme/login state, managing the bus via Provider/Riverpod is more robust.
:::

## Other communication approaches compared

An event bus isn't the only tool, and picking wrong makes things harder:

| Scenario | Preferred approach | Frontend analogy |
| --- | --- | --- |
| Parent→child, child→parent callback | Constructor params + callbacks | React props + `onXxx` |
| A small shared state (theme, locale, current user) | `InheritedWidget` / `Provider` / `Riverpod` | Context / Pinia / Redux |
| Cross-tree, cross-page, system-wide broadcasts (session expired, global refresh) | **Event bus** | Global `EventBus` / `window` events |
| One-off "the next page returns a result" | `Navigator`'s `await pop(result)` | route return value |

Rule of thumb: **if parent-child params suffice, don't reach for the bus**. Reserve it for "far apart yet must be decoupled" communication. Don't use it as global state management, or your data flow becomes untraceable — the same lesson frontend devs learn when "everything goes into a global event bus and nobody dares delete anything".

## Common pitfalls

::: danger Forgetting to cancel a subscription = memory leak
The `StreamSubscription` returned by `listen()` must be `cancel()`ed in `dispose()`. Otherwise events keep invoking the callback after the widget is gone, triggering a `setState after dispose` error. This is Flutter's version of "forgot to remove a listener".
:::

::: danger Using a single-subscription stream as the bus
A `StreamController()` without `.broadcast()` can only be `listen`ed once; a second subscriber throws `Bad state`. A bus must be `.broadcast()`.
:::

::: info Check `mounted` before touching UI after an await
When an async callback (including event listeners) fires, the widget may already be disposed. Guard with `if (!mounted) return;` before `setState`.
:::

## Quick reference

| JavaScript (EventEmitter/mitt) | Dart event bus |
| --- | --- |
| `bus.on('evt', cb)` | `bus.on<Evt>().listen(cb)` |
| `bus.emit('evt', data)` | `bus.fire(Evt(data))` |
| `bus.off('evt', cb)` | keep the `sub` from `listen()`, then `sub.cancel()` |
| `bus.removeAllListeners()` | `controller.close()` |
| `once` | `stream.first` (completes after one value) |

## Next steps

- To refresh UI when events arrive, you need [setState & the Widget lifecycle](/en/flutter/widget-lifecycle)
- To grab "a specific widget's position/state" rather than broadcast events, see [GlobalKey](/en/flutter/global-key)
- For cross-page "notify + get a result back", use [Navigator routing](/en/flutter/navigator)
