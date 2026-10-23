# Navigator Routing

> For readers with a JavaScript background. Navigator ≈ the frontend's **router + browser history stack** (react-router / vue-router / `history.pushState`), but by default it's **imperative**: you `push` a page and `pop` back in code, like operating a stack.

## The mental model: a page stack

Flutter uses a `Navigator` to manage a **stack of routes**:

- `push` = push a new page on top (≈ `history.push` / `router.push`); the old page stays on the stack, not destroyed
- `pop` = remove the top page to go back (≈ `history.back()`)
- The system back button / iOS swipe-back defaults to popping the top route

| Web frontend | Flutter Navigator | Note |
| --- | --- | --- |
| `router.push('/detail', { id: 1 })` | `Navigator.push(context, MaterialPageRoute(builder: (_) => Detail(id: 1)))` | navigate with args |
| `route.query.id` / `props` | the target page's constructor params | prefer constructor passing |
| `router.back()` | `Navigator.pop(context)` | go back |
| `pushState` replacing the current entry | `Navigator.pushReplacement(...)` | replace top of stack |
| `await a route's result` | `await Navigator.push(...)` | see "returning a result" |
| named route table `routes: {...}` | `MaterialApp(routes: {...})` + `pushNamed` | string paths |

## Basic navigation and going back

```dart
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        home: HomePage(),
        debugShowCheckedModeBanner: false,
      );
}

class HomePage extends StatelessWidget {
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Home')),
        body: Center(
          child: ElevatedButton(
            // push: put DetailPage on top of the stack; pass args straight via the constructor
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const DetailPage(id: 42)),
            ),
            child: const Text('View details'),
          ),
        ),
      );
}

class DetailPage extends StatelessWidget {
  final int id;
  const DetailPage({required this.id}); // ← pass args via constructor: type-safe, IDE-jumpable
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Details')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('received id = $id'),
              const SizedBox(height: 16),
              // pop: remove the top route to go back
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('Back'),
              ),
            ],
          ),
        ),
      );
}
```

::: tip Prefer constructor args over `arguments`
`pushNamed('/detail', arguments: 42)` with `ModalRoute.of(context)!.settings.arguments` also works, but `arguments` is `Object?` — you cast manually and typos bite at runtime. **Giving the target page a typed constructor** is the community norm, equivalent to passing props to a React component.
:::

## Returning a result (await a route)

On the web you often "open a dialog, wait for the user to choose, get a value back" with a `Promise`. Flutter's `Navigator.push` already returns a `Future` — **the value passed to `pop` when the top route closes is its completion result**:

```dart
// When the details page pops, it carries a String result back
final result = await Navigator.push<String>(
  context,
  MaterialPageRoute(builder: (_) => const PickerPage()),
);
// User picked → result is the picked value; cancelled via back button → result is null
if (result != null) {
  print('User picked: $result');
}

// Inside PickerPage, pass the result back via pop's second argument:
Navigator.pop(context, 'apple');
```

A complete runnable example (pick one, return it):

```dart
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(home: Home());
}

class Home extends StatefulWidget {
  @override
  State<Home> createState() => _HomeState();
}

class _HomeState extends State<Home> {
  String? _picked;

  Future<void> _openPicker() async {
    // ① await the route: get the result the next page pops back
    final value = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (_) => const PickerPage()),
    );
    if (value != null) setState(() => _picked = value);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(_picked == null ? 'Nothing picked' : 'You picked: $_picked'),
              ElevatedButton(onPressed: _openPicker, child: const Text('Go pick')),
            ],
          ),
        ),
      );
}

class PickerPage extends StatelessWidget {
  const PickerPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('Pick one')),
        body: Column(
          children: [
            for (final fruit in ['apple', 'banana', 'cherry'])
              ListTile(
                title: Text(fruit),
                // ② on tap, carry the result back via pop
                onTap: () => Navigator.pop(context, fruit),
              ),
          ],
        ),
      );
}
```

## Named routes

As pages multiply, register "path string → page" in a `routes` table, ≈ vue-router / react-router config:

```dart
MaterialApp(
  initialRoute: '/',
  routes: {
    '/': (_) => HomePage(),
    '/detail': (ctx) {
      // Named routes can only receive args via settings.arguments (Object?), needs a cast
      final id = ModalRoute.of(ctx)!.settings.arguments as int;
      return DetailPage(id: id);
    },
  },
  onUnknownRoute: (_) => MaterialPageRoute(
        builder: (_) => const Scaffold(body: Center(child: Text('404 Not Found'))),
      ), // ≈ a catch-all / NotFound route
);

// Navigate:
Navigator.pushNamed(context, '/detail', arguments: 42);
```

::: warning Named-route args are weakly typed
`arguments` is `Object?`; the receiving end casts with `as`, and a wrong path only errors at runtime. That's why small/medium projects mostly prefer **direct constructor passing** (the earlier style). Named routes earn their keep with "URL-ability, deep links, central management" — if you truly need that, go straight to `go_router` (a declarative wrapper over Navigator 2.0, ≈ react-router's data loading / deep links).
:::

## Handy stack operations

```dart
Navigator.pushReplacement(context, route);        // replace top of stack (post-login: Home replaces Login, no back)
Navigator.pushAndRemoveUntil(                     // go to a page and clear everything below it
  context, route, (route) => false,
);
Navigator.popUntil(context, ModalRoute.withName('/')); // pop all the way back to a given route
Navigator.canPop(context);                        // can we go back? (checks stack depth)
```

## Dialogs and bottom sheets are routes too

`showDialog` / `showModalBottomSheet` push a route onto the stack, so they can be `await`ed for a result as well:

```dart
final confirmed = await showDialog<bool>(
  context: context,
  builder: (ctx) => AlertDialog(
    title: const Text('Notice'),
    content: const Text('Delete this?'),
    actions: [
      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
      TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
    ],
  ),
);
if (confirmed == true) { /* perform delete */ }
```

## Intercepting the back button (PopScope)

To implement "if there are unsaved changes, confirm before going back", use `PopScope` (the modern API, replacing the old `WillPopScope`):

```dart
PopScope(
  canPop: false, // first, disallow direct pop
  onPopInvokedWithResult: (didPop, result) {
    if (didPop) return;         // already popped, nothing to do
    // decide whether to allow it: show a confirm dialog, then Navigator.pop if the user agrees
  },
  child: const Scaffold(body: EditorPage()),
)
```

## Frequent pitfalls

::: danger Don't misuse BuildContext after an await
Using `context` after an `await` to `Navigator.push` / `showDialog` may target an already-destroyed page. Either check `if (!context.mounted) return;` first, or capture what you need before the `await`. This is Flutter's version of "setState after unmount".
:::

::: info Navigator.of(context) vs rootNavigator
`Navigator.of(context)` finds the **nearest** Navigator; with nested navigation (each bottom tab has its own stack) it returns the current tab's stack. To reach the app-wide outer stack (e.g. push a full-screen page from a tab), use `Navigator.of(context, rootNavigator: true)`.
:::

::: info Don't forget the import
Every example above starts with `import 'package:flutter/material.dart';` — copy and run. `MaterialPageRoute` gives Material-style transitions; for iOS-style use `CupertinoPageRoute` (`import 'package:flutter/cupertino.dart';`).
:::

## Next steps

- How push/pop affects when components are created and destroyed — see [setState & the Widget lifecycle](/en/flutter/widget-lifecycle)
- For global coordination beyond "notify + get a result", use an [event bus](/en/flutter/event-bus)
