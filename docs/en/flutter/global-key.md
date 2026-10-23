# GlobalKey

> For readers with a JavaScript background. GlobalKey ≈ the frontend's **`ref` / `document.getElementById`** combined with **React's `key` reconciliation**: it both "gets a reference to a specific component" and tells Flutter "who this component is, keep its state across rebuilds".

## First: what a Key is

Every `build`, Flutter recreates a large number of Widget objects (a Widget is a cheap, disposable "configuration description"). What's actually expensive and must survive across frames is the underlying **Element** (state holder) and **RenderObject** (paint node). Flutter uses **same-level comparison + Key** to decide whether a node in the old tree and the new tree is "the same one", and thus whether to reuse or rebuild — nearly isomorphic to React's diff / reconciliation.

| Key type | Purpose | Frontend analogy |
| --- | --- | --- |
| `ValueKey('a')` | Distinguish same-level siblings by value | React list `key="a"` |
| `ObjectKey(obj)` | Distinguish by an object's identity | keying on an object reference |
| `UniqueKey()` | A brand-new unique identity every time | force "this must be a new node" |
| `GlobalKey` | **Globally unique**, can reverse-look-up the node | `ref` + `getElementById` + a globally-unique key |

**A normal Key only compares among same-level siblings; a GlobalKey is unique across the whole tree** — which is precisely why it can offer two exclusive abilities: "track across positions" and "reverse access".

## Ability 1: preserve State when items move

The classic, highest-value scenario. When a list can be reordered, if the key is wrong the **Stateful child's internal state gets mixed up** — because Flutter reuses Elements by position.

Consider this runnable example: each `NumberItem` has an internal counter (State). Pressing "Reverse" flips the list order:

```dart
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(home: const KeyDemoPage());
}

// Each item owns internal state (a counter)
class NumberItem extends StatefulWidget {
  final int id;
  const NumberItem(this.id, {super.key});
  @override
  State<NumberItem> createState() => _NumberItemState();
}

class _NumberItemState extends State<NumberItem> {
  int _count = 0; // internal state
  @override
  Widget build(BuildContext context) => ListTile(
        title: Text('Item ${widget.id}, count $_count'),
        trailing: IconButton(
          icon: const Icon(Icons.add),
          onPressed: () => setState(() => _count++),
        ),
      );
}

class KeyDemoPage extends StatefulWidget {
  const KeyDemoPage({super.key});
  @override
  State<KeyDemoPage> createState() => _KeyDemoPageState();
}

class _KeyDemoPageState extends State<KeyDemoPage> {
  final List<int> _ids = [1, 2, 3];

  void _reverse() => setState(() => _ids = _ids.reversed.toList());

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              // Key point: give each item a ValueKey that "travels with the data".
              // Try removing the key, or switching to UniqueKey, and watch whether the counter follows the item
              for (final id in _ids)
                NumberItem(id, key: ValueKey(id)),
              const SizedBox(height: 24),
              ElevatedButton(onPressed: _reverse, child: const Text('Reverse list')),
            ],
          ),
        ),
      );
}
```

- **With `ValueKey(id)`**: after reversing, "item 3's counter" still travels with "item 3" — Flutter matches by key, not position.
- **Without a key** (default positional matching): after reversing, counters "stay in place", looking like the data got scrambled.

> Frontend analogy: this is exactly the classic React bug where a list without `key` misplaces state when order changes — same fix.

## Ability 2: get a "reference" to a component

A GlobalKey's generic binds to a State type, so from outside you can **directly access that component's State and context** — like a React `useRef` pointing at a component instance.

::: info Prerequisite: every widget has `key`, but `currentState` only works on StatefulWidget
Two things to separate:

1. **`key` is a field on the top-level base class `Widget`** (`final Key? key;`). `StatelessWidget`, `StatefulWidget` and every concrete widget inherit it — so **every widget can take a `key`** (the `super.key` you always write just forwards it to the base class). The `key` param's type is `Key?`, and `GlobalKey` is just one of `Key`'s four subtypes (the others: `ValueKey`/`ObjectKey`/`UniqueKey`).
2. **But "can take a key" ≠ "`currentState` returns something"**: `GlobalKey.currentState` returns that component's **State object**, and only `StatefulWidget`s have a State. Attach a GlobalKey to a `StatelessWidget` (e.g. `Text`, `Container`) and `currentState` is **always null** — you can only fall back to `currentContext` (its BuildContext / RenderBox).

| Widget the key is on | `key.currentState` | `key.currentContext` |
| --- | --- | --- |
| StatefulWidget (`Form`/`Scaffold`/`Navigator`…) | ✓ its State | ✓ available |
| StatelessWidget (`Text`/`Container`…) | ✗ always null (no State) | ✓ available |

The `Form` below can call `formKey.currentState!.validate()` precisely because `Form` is a StatefulWidget with a `FormState`.
:::

```dart
// Declare: bound to FormState (the State type of the Form widget)
final formKey = GlobalKey<FormState>();

Form(
  key: formKey,               // attach it
  child: const TextField(...),
);

// Trigger validation / read from anywhere, no need to thread onSubmit up through layers
if (formKey.currentState!.validate()) {
  // valid
}
```

### Common use 1: form validation

```dart
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(home: const FormPage());
}

class FormPage extends StatelessWidget {
  const FormPage({super.key});

  final _formKey = GlobalKey<FormState>(); // ① create the key
  final _nameCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Form(
          key: _formKey,                    // ② bind to the Form
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  validator: (v) => (v == null || v.isEmpty) ? 'Required' : null,
                ),
              ),
              ElevatedButton(
                // ③ reach FormState via the key and validate — no onSubmit passed down
                onPressed: () {
                  if (_formKey.currentState!.validate()) {
                    ScaffoldMessenger.of(context)
                        .showSnackBar(const SnackBar(content: Text('Submitted')));
                  }
                },
                child: const Text('Submit'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

### Common use 2: read a widget's on-screen position and size

For interactions like "show a tooltip next to a target" or "scroll an element into view", you need its coordinates. GlobalKey → `currentContext` → `RenderBox`:

```dart
final targetKey = GlobalKey();

// Attach the key to the widget you want to locate
SomeWidget(key: targetKey)

// Read its size and global position when needed
void _showTooltip() {
  final ctx = targetKey.currentContext;
  if (ctx == null) return;
  final box = ctx.findRenderObject() as RenderBox;
  final size = box.size;                          // width/height
  final topLeft = box.localToGlobal(Offset.zero); // position relative to screen origin
  print('pos: $topLeft, size: $size');
}
```

### Common use 3: drive a Scaffold (open a drawer, etc.)

```dart
final scaffoldKey = GlobalKey<ScaffoldState>();

Scaffold(
  key: scaffoldKey,
  drawer: const Drawer(),
  body: ElevatedButton(
    // Open the drawer from deep anywhere, without passing a callback up to the Scaffold
    onPressed: () => scaffoldKey.currentState?.openDrawer(),
    child: const Text('Open menu'),
  ),
);
```

### Common use 4: a global navigation service (navigate without a context)

A very common pattern in real projects. `Navigator.push(context, ...)` needs a `BuildContext`, but many places **have no context at all**: controllers, services, static methods, network interceptors (a 401 must jump to the login page)… Handing a `GlobalKey<NavigatorState>` to `MaterialApp` lets you reach the root Navigator's state from **anywhere** to navigate.

First, a global singleton holds the key:

```dart
import 'package:flutter/material.dart' show GlobalKey, NavigatorState;

class NavigationService {
  NavigationService._(); // private ctor: a pure static utility class, never instantiated

  // A globally-unique "remote control", bound to Navigator's State type
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  static Future<Object?> goNamed(String route, {Object? arguments}) =>
      navigatorKey.currentState!.pushNamed(route, arguments: arguments);

  static void back() => navigatorKey.currentState?.pop();
}
```

Then pass it to the internal `Navigator` via `MaterialApp`:

```dart
@override
Widget build(BuildContext context) {
  return MaterialApp(
    navigatorKey: NavigationService.navigatorKey, // attach the key to the root Navigator
    title: 'app.title',
    initialRoute: '/',
    // ...
  );
}
```

Now **anywhere** (even in a service with no context) you can navigate:

```dart
// A network interceptor hits a 401:
NavigationService.navigatorKey.currentState?.pushNamedAndRemoveUntil('/login', (r) => false);

// Or go through the wrapped static methods:
NavigationService.goNamed('/detail', arguments: 42);
NavigationService.back();
```

::: tip Two key insights
1. **The key is attached to the internal `Navigator`, not `MaterialApp`**: `MaterialApp.navigatorKey` merely forwards the key to the `Navigator` it builds internally. So `navigatorKey.currentState` gives you the **`NavigatorState`** (the generic says so), not MaterialApp's State.
2. **The essence is "bypassing context", not "obtaining context"**: `NavigatorState` has `pushNamed/pop` and more, so you call them imperatively directly — that's the whole point: routing from places with no `BuildContext`. `currentContext` is what fetches the Navigator's context, a secondary path.
:::

::: warning Three things to watch
- `currentState` is `null` before the Navigator is built (or after it's disposed); use `?.` or a null check, don't bare-`!`.
- It drives the **root Navigator**: if you have per-tab nested Navigators, pushing from here covers the whole app as a full-screen page, not the current tab's stack.
- One `navigatorKey` can attach to only one `Navigator`; reusing it in multiple places throws `Duplicate GlobalKey`.
:::

## Three hard rules (break them and you'll crash)

::: danger A GlobalKey may be attached to only one widget at a time
Assigning it to two widgets at once, or using the same GlobalKey for every list item, throws `Duplicate GlobalKey detected in widget tree` at runtime. "Globally unique" is a hard constraint, not a suggestion.
:::

::: danger Don't create a GlobalKey inside build()
Making a new key every `build` makes Flutter think "this is a different node", causing the subtree to be destroyed and rebuilt repeatedly, losing state and tanking performance. Keep the key **in a State field or higher**, stable across builds.
:::

::: info Don't overuse: GlobalKey is costlier than local keys
To support cross-position reverse lookup, Flutter maintains a global registry for GlobalKeys. Using a GlobalKey for every list item is unnecessary and slows reconciliation — **use `ValueKey` to identify list items; reserve GlobalKey for when you genuinely need to reference a specific node from outside**.
:::

## Mapping to the frontend mental model

| What you want | React / DOM | Flutter |
| --- | --- | --- |
| Reorder a list without scrambling state | `<li key={id}>` | `Item(key: ValueKey(id))` |
| Get a reference to an element/instance | `useRef` + `ref={}` | `GlobalKey` + `currentContext` |
| Read an element's position/size | `el.getBoundingClientRect()` | `box.localToGlobal` + `box.size` |
| Imperatively call a child method | `ref.current.doSomething()` | `key.currentState!.doSomething()` |
| Validate a whole form | `formRef.current.reportValidity()` | `formKey.currentState!.validate()` |

## Next steps

- To understand "why Widgets are rebuilt so often yet State sometimes survives", read [setState & the Widget lifecycle](/en/flutter/widget-lifecycle)
- For page navigation and return results, see [Navigator routing](/en/flutter/navigator)
