# Dart Basics

> Written for readers with JavaScript / TypeScript experience who are moving into Flutter development. Every topic is contrasted with the JS ecosystem; examples run standalone via `dart run main.dart`.

## Why Dart first

Everything in Flutter is a Widget, but a Widget is just "a class with styling" — if you can't write Dart, you can't read Flutter. Dart is quick to pick up for frontend folks: **it is essentially a Java-flavored JavaScript with static types, AOT compilation and class syntax sugar**. A JS developer gets through the grammar in about a day.

## Project layout & toolchain mapping

| Web frontend | Dart / Flutter | Notes |
| --- | --- | --- |
| `package.json` | `pubspec.yaml` | Project manifest: name, dependencies, SDK constraints |
| `node_modules` | `.dart_tool` + shared Pub cache | Deps aren't flattened per project; a global cache stores each version once |
| npm / yarn / pnpm | `dart pub` / `flutter pub` | Near 1:1 commands: `pub get` ≈ `npm install` |
| `import { v4 as uuidv4 } from 'uuid';` | `import 'package:uuid/uuid.dart';` | Same package (uuid); Dart's `package:` URI points into a pub.dev package or this package's lib |
| ES Modules import/export | `import` / `export` / `part` | See [Modules & imports](#modules-imports) |
| `tsc --watch` | `dart compile` / Flutter hot reload | Dual-track: AOT for release, JIT for development |
| `.d.ts` type declarations | Types live inline in source | Optional type annotations, natively |
| Create React App / Vite | `flutter create` | One command, full scaffold |

Minimal pure-Dart package layout:

```
my_pkg/
├── pubspec.yaml        # ≈ package.json
├── lib/                # ≈ src, the public code
│   └── my_pkg.dart     # usually one entry file re-exporting the package
├── test/               # ≈ __tests__
└── bin/                # executable entry points (Flutter apps don't have this)
```

## Variables & types

### var / final / const

```dart
void main() {
  var name = 'Alice';        // inferred as String, ≈ JS let (reassignable)
  name = 'Bob';              // ✅ var can be reassigned

  final time = DateTime.now(); // ≈ JS const: decided at runtime, assigned once
  // time = DateTime.now();    // ❌ compile error

  const pi = 3.14159;          // compile-time constant: value must be computable at compile time
  // JS has no equivalent — a const object can still mutate inside; Dart's const is deeply immutable
}
```

Mnemonic:

- `var` ≈ `let`
- `final` ≈ `const` (locks the **reference** only; object contents stay mutable — same semantics as JS)
- `const` ≈ a true compile-time constant, stronger than JS `const`: two `const` values that are equal **share one canonicalized instance**.

### Static vs dynamic typing

Dart is **statically typed**: types are checked at compile time, but annotations can be omitted (inference kicks in). Same philosophy as TypeScript — `let x: string = 'a'` equals `let x = 'a'`.

```dart
int count = 3;                 // integer
double ratio = 1.5;            // floating point — note: writing 1 is invalid, must be 1.0 (see pitfalls)
num either = 3;                // common supertype of int and double
either = 3.5;                  // ✅ num accepts both
String s = 'hello';            // capital S: String is a class name, UpperCamelCase by convention
bool flag = true;
var inferred = 3.5;            // inferred double; assigning an int later fails
// inferred = 3;               // ❌ a double variable can't hold an int
```

Why is `String` capitalized while `int` / `double` / `bool` are not? In Dart **everything is an object — there are no primitives**; all of these are class names from `dart:core`. `String`, `List`, `Map`, `Future` follow the regular UpperCamelCase class-name convention, while `int` / `num` / `double` / `bool` are deliberate lowercase exceptions the language keeps so they read like primitives elsewhere. Coming from TS, don't type `string s` — that's an immediate compile error.

The `dynamic` type is the "real JavaScript" inside Dart — it switches off compile-time checking:

```dart
dynamic anything = 'string now';
anything = 42;                 // ✅ no check
anything.someMethod();         // ✅ compiles; only crashes at runtime with NoSuchMethodError
```

You should almost never write `dynamic` in day-to-day code; for "unknown but checked" use `Object?`.

### Null safety

Dart's null safety is more thorough than TypeScript's `strictNullChecks`, and on by default:

```dart
void main() {
  String a = 'hi';
  // a = null;                 // ❌ non-nullable by default

  String? b = 'hi';            // ? declares "may be null", ≈ TS string | null
  // print(b.length);          // ❌ blocked at compile time: b may be null

  print(b?.length);            // ✅ conditional access, whole expression null (same as JS optional chaining)
  print(b ?? 'fallback');      // ✅ null-aware fallback, same JS ??

  print(b!);                   // ⚠️ non-null assertion (same TS !): lie and it crashes at runtime

  b = 'changed';
  print(b.length);             // ✅ smart cast: after assignment, narrowed to String in this scope

  late String c;               // "promise I'll assign before use" — deferred checking
  c = 'assigned later';
  print(c.length);             // checked at use; reading before assignment throws LateInitializationError
}
```

The part that confuses frontend devs most: **`?` appears only at declaration and access sites**; a signature `String? foo(String? x)` reads "nullable parameter, nullable return".

## Strings

Single and double quotes are fully interchangeable (unlike JS where only backticks interpolate); interpolation always uses `$`:

```dart
void main() {
  String name = 'Alice';
  print('Hello, $name!');            // simple interpolation: $identifier
  print('Length: ${name.length}');   // expression interpolation: ${...}, same as JS ${...}

  var multiline = '''
line one
line two
''';                                 // triple quotes = multi-line strings like template literals

  var raw = r'no interpolation: $name stays literal'; // r'' raw strings

  // Common methods vs JS:
  ' a b '.trim();            // ≈ trim()
  'a,b,c'.split(',');        // ≈ split()
  'hello'.contains('ell');   // ≈ includes()
  'hello'.replaceAll('l', 'L'); // ≈ replaceAll()
  'abc'.codeUnits;           // UTF-16 code units, batch charCodeAt
  'abc'.characters.length;   // needs package:characters for grapheme clusters (emoji etc.)
}
```

## Collections: List / Map / Set

### List ≈ Array

```dart
void main() {
  var nums = [1, 2, 3];               // literal, inferred List<int>
  List<String> names = ['a', 'b'];    // explicit generic, ≈ TS Array<string>

  nums.add(4);                  // append to the end, ≈ push
  nums.insert(0, 0);            // insert at an index, ≈ splice(0, 0, 0)
  nums.remove(2);               // removes the first element equal to the value 2 — by value, not by index! use removeAt(i) for that
  nums.removeLast();            // remove & return the last item, ≈ pop (there is no method literally named pop); also removeFirst(), or peek via last / first properties
  print(nums.length);                 // a property, not a method — and it's spelled .length here too
  print(nums[0]);
  print(nums.sublist(1, 3));          // ≈ slice
  print(nums.map((e) => e * 2).toList()); // ≈ map (JS returns an array; Dart returns a lazy Iterable — toList it)
  print(nums.where((e) => e > 2));    // ≈ filter
  print(nums.contains(1));            // ≈ includes
  print([...nums, 99]);               // spread syntax identical to JS

  var frozen = const [1, 2, 3];       // compile-time immutable list, stricter than Object.freeze
  // frozen.add(4);                   // ❌ UnsupportedError

  var empty = List<String>.empty();     // immutable empty list, ≈ Object.freeze([]); for a growable one just write <String>[]
  var filled = List.filled(3, 0);     // [0, 0, 0]
  var generated = List.generate(3, (i) => i * i); // [0, 1, 4]
}
```

### Map ≈ JS object / Map

In Dart, a string-keyed dictionary is not an `{}` object literal but an explicit Map — the JS habit of objects serving as both dictionary and struct is split apart here:

```dart
void main() {
  // var user = {'name': 'Alice', 'age': 20} would infer Map<String, Object> — the common supertype of the mixed value types
  Map<String, dynamic> user = {'name': 'Alice', 'age': 20, 'vip': true}; // mixed values → dynamic

  user['name'];                 // read; missing key yields null (like JS obj['x'])
  user['email'] ??= 'a@b.c';    // assign only if absent — no direct JS syntax
  user.remove('age');
  user.containsKey('vip');
  user.forEach((k, v) => print('$k: $v'));
  print(user.entries.map((e) => '${e.key}=${e.value}').toList()); // ≈ Object.entries().map()
  print({...user, 'city': 'NY'}); // spread-merge, ≈ { ...obj1, city: 'NY' }
}
```

> Fixed-shape data should use a **class** (or a Dart 3 Record), not a Map — the single biggest mindset shift coming from JS: passing around dynamic objects is a smell in Dart.

### Set ≈ Set

```dart
void main() {
  var tags = <String>{'a', 'b', 'a'};  // Set literal: angle brackets declare the element type, duplicates auto-removed
  print(tags.length);                   // 2 — 'a' kept once

  tags.addAll({'a', 'c'});              // add many at once, existing elements stay unique: now {a, b, c}
  print(tags.intersection({'a', 'c'})); // {a, c} — shared elements; JS has no native method, hand-roll [...a].filter(x => b.has(x))
  print(tags.union({'d'}));             // union {a, b, c, d}, ≈ new Set([...a, ...b])
  print(tags.difference({'a'}));        // difference {b, c}: in tags but not in the argument
  print(tags.contains('b'));            // ≈ Set.has
}
```

### if / for inside collection literals

Dart brings JSX-style conditional/loop rendering into collection syntax:

```dart
void main() {
  bool showBanner = true;
  var errors = ['e1', 'e2'];

  var config = {
    'theme': 'dark',
    // Conditional entry: 'banner': 'welcome' goes into the Map only when showBanner is true;
    // when false the key doesn't exist at all (not null — the key is simply absent).
    // Equivalent to: build the Map, then if (showBanner) config['banner'] = 'welcome'
    if (showBanner) 'banner': 'welcome',
    // Looped entry: iterates errors, each element e expands to one pair e: true → 'e1': true, 'e2': true
    for (final e in errors) e: true,
  };
  print(config); // {theme: dark, banner: welcome, e1: true, e2: true}
}
```

## Functions

### Basics and arrow functions

```dart
int add(int a, int b) => a + b;          // single-expression =>, same as JS arrow functions
int addLong(int a, int b) { return a + b; } // multi-line needs {} + return

var toDouble = (int n) => n * 2.0;       // functions are first-class values, like JS
```

### Optional parameters: two flavors, richer than JS

Dart has no "pass fewer args and get undefined"; arity is checked at compile time. The two flavors **cannot be mixed**:

```dart
// 1) positional optional []: optional in order
String join(String a, [String sep = '-', String? b]) =>
    b == null ? a : '$a$sep$b';
join('x');          // 'x'
join('x', '_');     // '_' as sep, b still null
join('x', '_', 'y');

// 2) named parameters {}: like a JS options object, but names/types are validated
void createServer({int port = 8080, bool https = false, required String host}) {
  print('$host:$port https=$https');
}
createServer(host: 'localhost');                 // rest take defaults
createServer(host: '0.0.0.0', port: 443, https: true); // order-free
// createServer();                               // ❌ required host missing — compile error
```

Flutter source is full of **named parameters** — `Padding(padding: ..., child: ...)` is exactly this mechanism; `required` makes mandatory fields explicit at every call site, far more readable than JS positional arguments.

### Closures and higher-order functions

Both concepts rest on one premise: **functions are first-class citizens** — they can be stored in variables, put in collections, passed as arguments, and returned from functions, just like numbers and strings.

- **Closure**: a function bundled with the external local variables it captures. After the outer function returns, its locals would normally be destroyed — but as long as an inner function still references them, they stay alive. Each closure holds its own independent copy. This behaves exactly like JS closures; the `makeCounter` example below ports to JS verbatim.
- **Higher-order function**: a function that takes or returns another function. You've used them forever — in JS's `arr.map(x => x * 2)`, `map` is the higher-order function and the callback is the argument. Dart's collection ops, async callbacks, and Flutter event handlers all follow this pattern.

In Flutter the two are everywhere: `onPressed: () => setState(...)` is a closure callback capturing the widget's state; `ListView.builder(itemBuilder: (context, i) => ...)` is a higher-order function taking a builder as a parameter — understand closures and you've understood Flutter's entire callback system.

```dart
void main() {
  Function makeCounter() {
    int count = 0;                 // captured by the returned function — behaves exactly like a JS closure
    return () => ++count;
  }
  var c = makeCounter();
  print(c()); // 1
  print(c()); // 2

  // JS arr.map(x => x * 2) in Dart:
  print([1, 2, 3].map((x) => x * 2).toList());
  // Pass a method directly (tear-off) when used once:
  print(['a', 'b'].map(String.toUpperCase));
}
```

## Control flow

`if / else / for / while / break / continue / switch` are nearly identical to JS, with a few differences:

```dart
void main() {
  // 1) Conditions must be real bools: if (0) / if ('') compile in JS, fail in Dart
  // if (0) {}   // ❌ no falsiness! Check explicitly: list.isEmpty, s == null

  // 2) switch cases no longer fall through; each case breaks automatically
  var command = 'quit';
  switch (command) {
    case 'start':
      print('go');
    case 'quit':
      print('bye');            // ✅ no break needed
    default:
      print('unknown');
  }

  // 3) Since Dart 3, switch is an *expression*: it produces a value you can assign, and each branch reads "pattern => result".
  //    Say this is an API response: a status code plus a message — combine them into a Record (tuple) (code, message) to match
  var code = 404;
  var message = 'not found';
  var status = switch ((code, message)) {
    // Pattern 1: slot 1 must equal 200; _ is the wildcard, accepting any value in slot 2
    (200, _) => 'ok',
    // Pattern 2: slot 1 falls in the 400-499 range (range pattern); final msg binds slot 2 to a variable for interpolation
    (>= 400 && < 500, final msg) => 'client error: $msg',
    // Pattern 3: _ is the catch-all, like default — reached only when nothing above matches
    _ => 'other',
  };
  print(status); // (404, 'not found') matches pattern 2 → client error: not found

  // 4) for-in iterates iterables ≈ JS for...of (there is no for...in)
  for (final item in [1, 2, 3]) {
    print(item);
  }
}
```

## Object-oriented programming

The biggest departure from JS: **Dart is class-based, full stop** — no prototype chain.

### Classes and constructors

```dart
import 'dart:math' as math;

class Point {
  double x;
  double y;

  // Default constructor — named after the class, no constructor keyword
  Point(this.x, this.y);                    // this-param sugar: declare + assign in one step

  // Named constructor: JS can only fake this with factory functions
  Point.origin() : x = 0, y = 0;            // : starts the initializer list, runs before the body

  // Factory constructor: may return cached instances or subtypes ≈ a static create method
  factory Point.shared() => _shared ??= Point(0, 0);
  static Point? _shared;

  // getter: JS get/set port over almost unchanged
  double get distance => math.sqrt(x * x + y * y);
}

void main() {
  var p = Point(3, 4);
  print('${p.x}, ${p.y}');   // 3.0, 4.0
  print(p.distance);          // 5.0
}
```

### Inheritance, interfaces, mixins

```dart
class Animal {
  final String name;
  Animal(this.name);

  void speak() => print('$name makes a sound');
}

// Single inheritance via extends; implements consumes any class as an interface (no interface keyword)
class Dog extends Animal {
  Dog() : super('Dog');                     // super calls the parent constructor

  @override
  void speak() => print('Dog barks');       // @override guards against signature drift

  void fetch() => print('fetching');
}

// Mixins: reuse cross-cutting ability ≈ a more disciplined mixin pattern / HOC idea
mixin Swimmer {
  void swim() => print('swimming');
}

class Duck extends Animal with Swimmer {    // with mixes in capabilities
  Duck() : super('Duck');
}

void main() {
  for (final a in [Dog(), Duck()]) {
    a.speak();
  }
  (Duck() as Swimmer).swim();
}
```

Privacy convention: Dart uses a **`_` prefix** for library privacy (enforced at compile time), not the JS community's "private by comment".

### The cascade operator `..`

Dart-only and extremely common in Flutter: chain calls on one object, returning **the object itself** rather than each call's result:

```dart
void main() {
  var list = <int>[]
    ..add(1)
    ..add(2)
    ..addAll([3, 4]);          // JS would need Object.assign or a purpose-built chainable API
  print(list);                 // [1, 2, 3, 4]

  // Contrast: . returns the method result, .. returns the receiver
  var log = StringBuffer()
    ..writeln('line 1')
    ..writeln('line 2');
  print(log.toString());
}
```

Once you see builder code like `Column(children: [...])` combined with `..add(...)`, cascades are what make it tick.

## Async: Future / Stream ≈ Promises / observable streams

Dart's async model is **isomorphic** with JS: single-threaded event loop, microtasks first. `async/await` ports over almost verbatim.

### Future ≈ Promise

```dart
Future<String> fetchUser(int id) async {
  // ≈ JS: async function fetchUser(id) { await new Promise(r => setTimeout(r, 100)); ... }
  await Future.delayed(const Duration(milliseconds: 100)); // promisified setTimeout
  return 'user-$id';
}

Future<void> main() async {
  // Chaining: .then maps 1:1 to Promise.then
  fetchUser(1).then((name) => print(name));

  final name = await fetchUser(2);
  print(name);

  // Promise.all ≈ Future.wait
  final results = await Future.wait([fetchUser(3), fetchUser(4)]);
  print(results); // [user-3, user-4]

  // Promise.race ≈ Future.any
  final fastest = await Future.any([
    fetchUser(5),
    Future.delayed(const Duration(milliseconds: 10), () => 'timeout'),
  ]);
  print(fastest);

  // Error handling: try/catch/finally identical to JS
  try {
    throw StateError('boom');
  } on StateError catch (e) {    // on-clauses catch by type ≈ catch (e) + instanceof
    print('caught: $e');
  } catch (e) {
    print('any: $e');
  }
}
```

Key differences: Dart has no global `unhandledRejection` backstop; an un-awaited Future's error is printed to the console, and the `Future<T>` return type is **mandatory** in signatures (JS async functions return a Promise implicitly; Dart spells it out).

### Stream ≈ AsyncIterator / RxJS

A continuous async sequence — WebSockets, event buses and http response streams are all this:

```dart
Future<void> listenDemo() async {
  var stream = Stream.fromIterable([1, 2, 3]);

  await for (final value in stream) {   // ≈ for await...of
    print(value);
  }

  // Transformation pipes: map/where return Streams ≈ RxJS operator chains
  stream.map((x) => x * 10).where((x) => x > 10).listen(print);

  // Manual subscriptions must be cancelled — leaking a StreamSubscription is like leaking a WebSocket
  var sub = Stream.periodic(const Duration(milliseconds: 50), (x) => x).listen(print);
  await Future.delayed(const Duration(milliseconds: 160));
  await sub.cancel();
}
```

Flutter's `StreamBuilder` is exactly "bind a Stream to the UI for automatic rebuilds", conceptually ≈ React's `useSyncExternalStore` over an event source.

### Isolates: the Web Worker counterpart

Dart runs its event loop on one thread; **CPU-heavy work blocks the UI** — the same problem JS has, the same solution:

```dart
// Main thread:
// await compute(heavyTask, 42);   // Flutter's wrapper — all the new Worker + postMessage boilerplate gone
//
// Isolate.spawn(heavyMain, message) is closer to a raw new Worker();
// isolates share no memory and communicate by message only (with stricter serialization rules
// than the Web Worker structuredClone).
```

## Modules & imports

```dart
// Three import path flavors:
import 'dart:core';                          // 1) SDK libraries (collections, async, math…), explicit unlike browser globals
import 'package:http/http.dart';             // 2) third-party packages, ≈ npm imports
import 'package:http/http.dart' as http;     //    namespace import, ≈ import * as http from 'http'
import './utils/string_util.dart';           // 3) relative path, ES-module style (within the same package)

// Import a subset of symbols:
import 'dart:math' show Random, pi;          // ≈ import { Random, pi }
import 'dart:io' hide exit;                  // ≈ exclude by destructuring rest

// A library file re-exporting internals (the common lib/my_pkg.dart pattern):
// export 'src/a.dart'; export 'src/b.dart';

// part: split one library across files sharing private members (≈ deprecated TS namespace merging);
// seen in Flutter SDK source, rare in app code
// part of 'my_pkg.dart';
```

Lazy loading (≈ dynamic `import()` / React.lazy):

```dart
import 'heavy_math.dart' deferred as math;

Future<void> useIt() async {
  await math.load();            // loads the chunk on demand, ≈ await import('./heavy_math')
  math.compute();
}
```

## Dart 3 highlights frontend devs will instantly get

```dart
void main() {
  // Records: lightweight typed tuples/structs, ≈ JS { x, y } but with types
  (int, String) pair = (1, 'one');                       // positional fields
  ({required int id, String? name}) user = (id: 7, name: 'xyz'); // named fields ≈ typed object literal
  print('${pair.$1} ${user.id}');

  // Pattern matching: if-case / switch expressions ≈ destructuring + discriminated-union narrowing
  if (pair case (final n, _) when n > 0) {
    print('positive: $n');
  }

  // sealed classes: exhaustible discriminated unions — the compiler checks branch coverage
  var shape = Circle(2.0);
  var area = switch (shape) {
    Circle(radius: final r) => 3.14159 * r * r,
    Rectangle() => 1.0, // illustration
  };
  print(area);
}

class Circle { final double radius; const Circle(this.radius); }
class Rectangle { const Rectangle(); }
```

## JS → Dart quick-reference table

| JavaScript | Dart | Notes |
| --- | --- | --- |
| `let x = 1` | `var x = 1;` | Dart's var is reassignable |
| `const x = 1` | `final x = 1;` | one runtime assignment |
| compile-time literal constant | `const x = 1;` | no JS equivalent |
| `function f(a, b = 1) {}` | `void f(int a, [int b = 1]) {}` | positional optional |
| `function f({a, b}) {}` | `void f({int? a, int? b}) {}` | named params, call with `a: 1` |
| `obj?.x ?? dft` | `obj?.x ?? dft` | identical |
| `` `Hi ${name}` `` | `'Hi $name'` / `'Hi ${expr}'` | single quotes interpolate |
| `[...arr, x]` | `[...arr, x]` | identical |
| `{...o, k: v}` | `{...o, 'k': v}` | Map spread |
| `arr.map(f).filter(g)` | `arr.map(f).where(g).toList()` | middle steps are lazy Iterables |
| `class A extends B {}` | `class A extends B {}` | real classes, no prototypes |
| `super()` | `super()` / initializer list `: super(x)` | |
| `get x() {}` | `int get x => _x;` | identical |
| `Promise` / `async` / `await` | `Future` / `async` / `await` | same semantics |
| `Promise.all` | `Future.wait` | |
| `for await (const x of s)` | `await for (final x in s)` | Stream |
| `new Worker()` | `Isolate.spawn()` / `compute()` | |
| `import * as ns from 'm'` | `import 'm.dart' as ns;` | |
| `typeof x === 'string'` | `x is String` | negate with `is!` |
| `x as string` (TS) | `x as String` | also checked at runtime |
| `interface Foo {}` | any `class Foo` / `abstract class` | no interface keyword |
| `#private` / `_by convention` | `_name` | compile-enforced library privacy |
| none | `..method()` cascades | Dart signature move |
| none | `late`, initializer lists `: x = 1` | Dart-only |
| `undefined` | doesn't exist — only `null` | |
| falsy (0/''/null) | only `bool` in conditions | judge explicitly |

## Common pitfalls when switching from frontend

::: danger int is not double
`double x = 1;` is a compile error — write `1.0`. JS has one number type; Dart has two classes. Division: `/` always yields `double`; integer division is `~/`.
:::

::: danger There is no truthy / falsy
`if (0)`, `if ('')`, `if ([])` all work in JS; in Dart they fail to compile — conditions must be `bool`. Write `list.isEmpty`, `s.isEmpty`, `x == null` explicitly.
:::

::: warning Semicolons are required
Dart has no automatic semicolon insertion (ASI). Every statement ends with `;`. Miss one and you get a compile error — at least a precise one.
:::

::: warning `==` compares values, and can be operator-overloaded
`[1,2] == [1,2]` is `false` (List compares by reference, same as JS); but `String == String` compares content. For deep equality use `ListEquality` from `package:collection`. `identical(a, b)` is the "same instance" test.
:::

::: info A final List/Map is still mutable
`final list = [1, 2]; list.add(3);` ✅ legal — `final` locks the binding, not the contents (exactly like JS `const`). For true immutability use `const [...]` or freeze at runtime.
:::

::: info Everything-is-an-expression, closer to TS
Classes, functions, numbers and `null` are all objects (JS has primitives); the `new` keyword is optional — just call `Point(1, 2)`.
:::

## What's next

- Official tour: [dart.dev/language](https://dart.dev/language)
- Interactive playground: [Dart Pad](https://dartpad.dev) — the CodePen of Dart
- Back to component practice: [Text](/en/flutter/components/text), [Container](/en/flutter/components/container)
