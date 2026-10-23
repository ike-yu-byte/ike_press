# Dart 基础语法

> 本篇面向有 JavaScript / TypeScript 经验、正在转向 Flutter 开发的读者。每个知识点都与 JS 生态做对照，示例可直接保存为 `main.dart` 后用 `dart run main.dart` 执行。

## 为什么先学 Dart

Flutter 的一切都是 Widget，但 Widget 只是"带样式的类"——写不好 Dart，就看不懂 Flutter。Dart 对前端来说上手极快：**它本质上是一门"加了静态类型、编译型和类语法糖的 Java 风格 JavaScript"**。会 JS 的人大约一天能过完语法。

## 工程结构与工具链对照

| Web 前端 | Dart / Flutter | 说明 |
| --- | --- | --- |
| `package.json` | `pubspec.yaml` | 项目清单：名称、依赖、SDK 版本约束 |
| `node_modules` | `.dart_tool` + 本地 Pub 缓存 | 依赖不在项目目录里平铺，全局缓存按版本共享 |
| npm / yarn / pnpm | `dart pub` / `flutter pub` | 命令几乎一一对应：`pub get` ≈ `npm install` |
| `import { v4 as uuidv4 } from 'uuid';`（npm 包名导入） | `import 'package:uuid/uuid.dart';` | 同一个包 uuid；Dart 的 `package:` URI 指向 pub.dev 包或本包 lib 下文件 |
| ES Modules `import/export` | `import` / `export` / `part` | 详见[模块与导入](#模块与导入) |
| `tsc --watch` | `dart compile` / Flutter 热重载 | Dart 是 AOT 编译 + JIT 开发模式双轨 |
| `.d.ts` 类型声明 | 类型直接写在源码里 | Dart 原生可选类型标注 |
| Create React App / Vite | `flutter create` | 一条命令生成完整脚手架 |

一个纯 Dart 包的最小结构：

```
my_pkg/
├── pubspec.yaml        # ≈ package.json
├── lib/                # ≈ src，对外公开的代码
│   └── my_pkg.dart     # 通常有一个与包同名的入口文件做统一导出
├── test/               # ≈ __tests__
└── bin/                # 可执行脚本入口（Flutter 应用没有这个目录）
```

## 变量与类型

### var / final / const

```dart
void main() {
  var name = 'Alice';        // 类型被推断为 String，≈ JS 的 let（可重新赋值）
  name = 'Bob';              // ✅ var 可以再赋值

  final time = DateTime.now(); // ≈ JS 的 const：运行时确定，只赋值一次
  // time = DateTime.now();    // ❌ 编译错误

  const pi = 3.14159;          // 编译期常量：值必须在编译时就能算出来
  // JS 没有对应物——const 对象内部仍可改，Dart 的 const 是深度不可变
}
```

三者记忆法：

- `var` ≈ `let`
- `final` ≈ `const`（但只锁**引用**，对象内部仍可变，与 JS 语义一致）
- `const` ≈ 真正的编译期常量，比 JS 的 `const` 更强：`const` 值相同的对象**共享同一实例**（规范化的，canonicalized）。

### 静态类型 vs 动态类型

Dart 是**静态类型**语言：类型在编译期检查，但标注可省略（自动推断）。这和 TypeScript 的哲学一致——`let x: string = 'a'` 与 `let x = 'a'` 等价。

```dart
int count = 3;                 // 整数
double ratio = 1.5;            // 浮点数——注意：写 1 不行，必须 1.0（见易错点）
num either = 3;                // int 和 double 的公共父类型
either = 3.5;                  // ✅ num 两者都能接
String s = 'hello';            // 大写 S：String 是类名，遵循大驼峰命名规范
bool flag = true;
var inferred = 3.5;            // 推断为 double，之后再赋 int 会报错
// inferred = 3;               // ❌ double 变量不能放 int
```

为什么 `String` 大写开头而 `int` / `double` / `bool` 小写？Dart 里**一切皆对象，没有基本类型**——这些全是 `dart:core` 里的类名。`String`、`List`、`Map`、`Future` 遵循类名大驼峰的常规规范；`int` / `num` / `double` / `bool` 是官方刻意保留的小写特例，为的是让写起来像其他语言的原始类型。TS 转来的读者注意别顺手写 `string s`——编译直接报错。

`dynamic` 类型才是 Dart 世界里那个"真正的 JS"——关闭一切编译期检查：

```dart
dynamic anything = 'string now';
anything = 42;                 // ✅ 不做检查
anything.someMethod();         // ✅ 编译通过，运行时才报 NoSuchMethodError
```

日常开发几乎不该写 `dynamic`；需要"不确定类型但受检"时用 `Object?`。

### 空安全（Null Safety）

Dart 的空安全比 TypeScript 的 `strictNullChecks` 更彻底、默认开启：

```dart
void main() {
  String a = 'hi';
  // a = null;                 // ❌ 默认不可为空

  String? b = 'hi';            // ? 声明"可能为 null"，≈ TS 的 string | null
  // print(b.length);          // ❌ 编译期就拦住：b 可能为 null

  print(b?.length);            // ✅ 条件访问，b 为 null 时整体得 null（同 JS 可选链）
  print(b ?? 'fallback');      // ✅ 空合并，同 JS 的 ??

  print(b!);                   // ⚠️ 断言非空（同 TS 的 !）：撒谎就运行时崩

  b = 'changed';
  print(b.length);             // ✅ 智能类型推断：赋值后本作用域内自动收窄为 String

  late String c;               // "我保证用之前会赋值"——延迟检查
  c = 'assigned later';
  print(c.length);             // 使用点检查，未赋值先读会抛 LateInitializationError
}
```

前端最容易困惑的一点：**`?` 只出现在声明和访问处，没有 TS 那种 `?.` 之外的类型位置差异**；函数签名 `String? foo(String? x)` 读作"参数可空、返回可空"。

## 字符串

单双引号完全等价（不像 JS 里只有反引号能插值），插值统一用 `$`：

```dart
void main() {
  String name = 'Alice';
  print('Hello, $name!');            // 简单插值：$变量名
  print('Length: ${name.length}');   // 表达式插值：${...}，同 JS 的 ${...}

  var multiline = '''
第一行
第二行
''';                                 // 三引号 = JS 模板字符串的多行能力

  var raw = r'不插值的 $name 原文输出'; // r'' 原始字符串，≈ 反引号但不解释 \$ 和 \n

  // 常用方法与 JS 对照：
  ' a b '.trim();            // ≈ trim()
  'a,b,c'.split(',');        // ≈ split()
  'hello'.contains('ell');   // ≈ includes()
  'hello'.replaceAll('l', 'L'); // ≈ replaceAll()
  'abc'.codeUnits;           // UTF-16 码元数组，≈ charCodeAt 的批量版
  'abc'.characters.length;   // 需要 package:characters，处理 emoji 等字素簇
}
```

## 集合：List / Map / Set

### List ≈ Array

```dart
void main() {
  var nums = [1, 2, 3];               // 字面量创建，推断为 List<int>
  List<String> names = ['a', 'b'];    // 显式泛型，≈ TS 的 Array<string>

  nums.add(4);                  // 尾部追加，≈ push
  nums.insert(0, 0);            // 指定位置插入，≈ splice(0, 0, 0)
  nums.remove(2);               // 按“值”删除第一个等于 2 的元素，不是按索引！按索引删用 removeAt(i)
  nums.removeLast();            // 移除并返回末尾元素，≈ pop（Dart 没有叫 pop 的方法）；另有 removeFirst()，只看用 last / first 属性
  print(nums.length);                 // 是属性不是方法！JS 的 .length 在这里也写作 .length（Dart 属性语法）
  print(nums[0]);
  print(nums.sublist(1, 3));          // ≈ slice
  print(nums.map((e) => e * 2).toList()); // ≈ map（JS 直接返回数组，Dart 返回惰性 Iterable 要 toList）
  print(nums.where((e) => e > 2));    // ≈ filter
  print(nums.contains(1));            // ≈ includes
  print([...nums, 99]);               // 展开语法与 JS 相同

  var frozen = const [1, 2, 3];       // 编译期不可变列表，≈ Object.freeze 但更严格
  // frozen.add(4);                   // ❌ UnsupportedError

  var empty = List<String>.empty();     // 不可变空列表，≈ Object.freeze([])；要可变空列表直接写 <String>[]
  var filled = List.filled(3, 0);     // [0, 0, 0]
  var generated = List.generate(3, (i) => i * i); // [0, 1, 4]
}
```

### Map ≈ JS 对象 / Map

Dart 里"字符串键的字典"不是 `{}` 对象字面量，而是显式的 Map——JS 那种"对象既当字典又当结构体"的用法在这里被拆开了：

```dart
void main() {
  // 若写 var user = {'name': 'Alice', 'age': 20}：值有 String 有 int，会按公共父类型推断为 Map<String, Object>
  Map<String, dynamic> user = {'name': 'Alice', 'age': 20, 'vip': true}; // 混合值常用 dynamic

  user['name'];                 // 取值，键不存在得 null（同 JS obj['x']）
  user['email'] ??= 'a@b.c';    // 不存在才赋默认值——JS 没有直接语法
  user.remove('age');
  user.containsKey('vip');
  user.forEach((k, v) => print('$k: $v'));
  print(user.entries.map((e) => '${e.key}=${e.value}').toList()); // ≈ Object.entries().map()
  print({...user, 'city': 'NY'}); // 展开合并，≈ { ...obj1, city: 'NY' }
}
```

> 有固定字段的结构应该用**类**（或 Dart 3 的 Record），而不是 Map——这是从 JS 转来最需要转变的观念：动态对象传数据在 Dart 里是坏味道。

### Set ≈ Set

```dart
void main() {
  var tags = <String>{'a', 'b', 'a'};  // Set 字面量：尖括号声明元素类型，重复元素自动去重
  print(tags.length);                   // 2，'a' 只保留一份

  tags.addAll({'a', 'c'});              // 批量加入多个元素，已存在的不会重复：现在是 {a, b, c}
  print(tags.intersection({'a', 'c'})); // 交集 {a, c}：取两个集合的公共元素；JS 没有原生方法，需手写 [...a].filter(x => b.has(x))
  print(tags.union({'d'}));             // 并集 {a, b, c, d}，≈ new Set([...a, ...b])
  print(tags.difference({'a'}));        // 差集 {b, c}：在 tags 中但不在参数中的元素
  print(tags.contains('b'));            // ≈ Set.has
}
```

### 集合字面量里的 if / for

Dart 把 JSX 式的条件/循环渲染搬进了集合语法：

```dart
void main() {
  bool showBanner = true;
  var errors = ['e1', 'e2'];

  var config = {
    'theme': 'dark',
    // 条件条目：showBanner 为 true 才把 'banner': 'welcome' 放进 Map；
    // 为 false 时这个键压根不存在（不是 null，是没这个键）。
    // 等价于：先建 Map 再 if (showBanner) config['banner'] = 'welcome'
    if (showBanner) 'banner': 'welcome',
    // 循环条目：遍历 errors，每个元素 e 展开为一对键值 e: true → 'e1': true, 'e2': true
    for (final e in errors) e: true,
  };
  print(config); // {theme: dark, banner: welcome, e1: true, e2: true}
}
```

## 函数

### 基础与箭头函数

```dart
int add(int a, int b) => a + b;          // 单表达式函数 =>，同 JS 箭头函数
int addLong(int a, int b) { return a + b; } // 多行必须 {} + return

var toDouble = (int n) => n * 2.0;       // 函数可以存进变量（一等公民，同 JS）
```

### 可选参数：两种，比 JS 丰富

Dart 没有 JS 的"少传就是 undefined"，参数匹配在编译期检查。可选参数分两种，**不能混用**：

```dart
// 1) 位置可选参数 []：按顺序可选
String join(String a, [String sep = '-', String? b]) =>
    b == null ? a : '$a$sep$b';
join('x');          // 'x'
join('x', '_');     // 用 '_' 作 sep，但 b 仍为空
join('x', '_', 'y');

// 2) 命名参数 {}：像 JS 的配置对象，但编译期校验名字和类型
void createServer({int port = 8080, bool https = false, required String host}) {
  print('$host:$port https=$https');
}
createServer(host: 'localhost');                 // 其余走默认值
createServer(host: '0.0.0.0', port: 443, https: true); // 顺序随意
// createServer();                               // ❌ required 的 host 没传，编译错误
```

Flutter 源码里铺天盖地的是**命名参数**——`Padding(padding: ..., child: ...)` 全是这一机制，`required` 关键字让必填项在调用点显式出现，可读性远超 JS 位置参数。

### 闭包与高阶函数

这两个概念来自同一个前提：**函数是一等公民**——可以存进变量、放进集合、当参数传递、从函数返回，和数字字符串没区别。

- **闭包（Closure）**：函数和它捕获的外部局部变量绑在一起形成的“数据包”。外层函数执行完毕后，它栈帧里的局部变量本应销毁，但只要内层函数还引用着它们，这些变量就一直活着——每个闭包各自持有独立的一份，互不干扰。JS 里的闭包就是这个行为，Dart 完全一致，下面的 `makeCounter` 例子可以直接平移到 JS 运行。
- **高阶函数（Higher-order function）**：参数或返回值是函数的函数。你早就天天在用：JS 的 `arr.map(x => x * 2)` 里，`map` 就是高阶函数，回调就是参数。Dart 的集合操作、异步回调、Flutter 的事件处理全是这个模式。

在 Flutter 里这两者无处不在：`onPressed: () => setState(...)` 是一个捕获了组件状态的闭包回调；`ListView.builder(itemBuilder: (context, i) => ...)` 则是接收函数作为参数的高阶函数——看懂闭包就看懂了 Flutter 的回调体系。

```dart
void main() {
  Function makeCounter() {
    int count = 0;                 // 被下方函数捕获，行为与 JS 闭包完全一致
    return () => ++count;
  }
  var c = makeCounter();
  print(c()); // 1
  print(c()); // 2

  // 匿名函数传参：JS 的 arr.map(x => x * 2) 在 Dart 里：
  print([1, 2, 3].map((x) => x * 2).toList());
  // 若只被调用一次，可直接写函数名：
  print(['a', 'b'].map(String.toUpperCase)); // 方法 tear-off，≈ 较新 JS 的 .map(String.prototype.toUpperCase.call)
}
```

## 控制流

`if / else / for / while / break / continue / switch` 与 JS 几乎相同，只有几处差异：

```dart
void main() {
  // 1) 条件必须是真 bool：if (0) / if ('') 在 JS 里合法，Dart 直接编译错误
  // if (0) {}   // ❌ 没有 falsy 概念！判空要显式：if (list.isEmpty)、if (s == null)

  // 2) switch 不再穿透，每个 case 自动 break；fallthrough 要显式写 continue
  var command = 'quit';
  switch (command) {
    case 'start':
      print('go');
    case 'quit':
      print('bye');            // ✅ 不需要 break
    default:
      print('unknown');
  }

  // 3) Dart 3 起 switch 是“表达式”：能直接产生值赋给变量，每个分支写成“模式 => 结果”。
  //    假设这是接口返回：状态码 + 说明文字，把二者组合成 Record（元组）(code, message) 去匹配
  var code = 404;
  var message = 'not found';
  var status = switch ((code, message)) {
    // 模式 1：第 1 位必须等于 200；_ 是通配符，表示第 2 位任意值都接受
    (200, _) => 'ok',
    // 模式 2：第 1 位落在 400~499 区间（范围模式）；final msg 把第 2 位的值绑定成变量 msg，供结果插值
    (>= 400 && < 500, final msg) => 'client error: $msg',
    // 模式 3：_ 兜底，等同 default，前面都不命中才走这里
    _ => 'other',
  };
  print(status); // (404, 'not found') 命中模式 2 → client error: not found

  // 4) for-in 遍历可迭代对象，≈ JS 的 for...of（没有 for...in）
  for (final item in [1, 2, 3]) {
    print(item);
  }
}
```

## 面向对象

这是与 JS 差异最大的部分：**Dart 是真正的基于类**，没有原型链。

### 类与构造

```dart
import 'dart:math' as math;

class Point {
  double x;
  double y;

  // 默认构造函数——方法名等于类名，无 constructor 关键字
  Point(this.x, this.y);                    // this.参数 语法糖：声明+赋值一步完成

  // 命名构造函数：JS 只能靠工厂函数模拟，Dart 原生支持
  Point.origin() : x = 0, y = 0;            // : 后面是初始化列表，构造体执行前赋值

  // 工厂构造函数：可以返回缓存实例或子类，≈ 静态 create 方法
  factory Point.shared() => _shared ??= Point(0, 0);
  static Point? _shared;

  // getter：JS 的 get/set 几乎原样平移
  double get distance => math.sqrt(x * x + y * y);
}

void main() {
  var p = Point(3, 4);
  print('${p.x}, ${p.y}');   // 3.0, 4.0
  print(p.distance);          // 5.0
}
```

### 继承、接口、混入

```dart
class Animal {
  final String name;
  Animal(this.name);

  void speak() => print('$name makes a sound');
}

// 单继承 extends；implements 实现接口（Dart 没有 interface 关键字，类即可被实现）
class Dog extends Animal {
  Dog() : super('Dog');                     // super 调用父类构造

  @override
  void speak() => print('Dog barks');       // @override 注解防签名漂移

  void fetch() => print('fetching');
}

// 混入：复用"横切能力"，≈ 更受控的 mixin 模式 / React 高阶组件思想
mixin Swimmer {
  void swim() => print('swimming');
}

class Duck extends Animal with Swimmer {    // with 混入多个能力
  Duck() : super('Duck');
}

void main() {
  // Dart 一切皆对象，数字也是；多态与 JS 相同
  for (final a in [Dog(), Duck()]) {
    a.speak();
  }
  (Duck() as Swimmer).swim();
}
```

私有约定：Dart 用 **`_` 前缀**表示库级私有（编译期强制），不是 JS 社区约定的"假装私有"。

### 级联操作符 `..`

Dart 独有、Flutter 中高频出现的语法：对同一对象连续调用，返回**对象本身**而非每步结果：

```dart
void main() {
  var list = <int>[]
    ..add(1)
    ..add(2)
    ..addAll([3, 4]);          // JS 想这么写得靠 Object.assign 或链式 API 设计
  print(list);                 // [1, 2, 3, 4]

  // 对比：单点 . 返回方法结果，级联 .. 返回接收者
  var log = StringBuffer()
    ..writeln('line 1')
    ..writeln('line 2');
  print(log.toString());
}
```

Flutter 里常见 `Padding(padding: ..., child: Column(...)..add(...))` 风格的 builder 代码，看懂 `..` 就通了。

## 异步：Future / Stream ≈ Promise / 可观察流

Dart 的异步模型与 JS **同构**：单隔离区事件循环、微任务优先。`async/await` 写法几乎可以原样平移。

### Future ≈ Promise

```dart
Future<String> fetchUser(int id) async {
  // ≈ JS: async function fetchUser(id) { await new Promise(r => setTimeout(r, 100)); ... }
  await Future.delayed(const Duration(milliseconds: 100)); // ≈ setTimeout 的 Promise 化
  return 'user-$id';
}

Future<void> main() async {
  // 链式：.then 与 Promise.then 一一对应
  fetchUser(1).then((name) => print(name));

  // await：注意 Dart 的 await 不要求函数在 async 上下文"诞生"，语义同 JS
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

  // 错误处理：try/catch/finally 与 JS 完全相同
  try {
    throw StateError('boom');
  } on StateError catch (e) {    // on 子句按类型捕获，≈ catch (e) + instanceof 判断
    print('caught: $e');
  } catch (e) {
    print('any: $e');
  }
}
```

关键差异：Dart 没有 `unhandledRejection` 这种全局兜底事件；未 await 的 Future 异常默认打印到控制台，异步函数返回 `Future<T>` 的签名是**强制**的（JS 的 async 函数隐式返回 Promise，Dart 必须写出来）。

### Stream ≈ AsyncIterator / RxJS

一个持续产出值的异步序列，WebSocket、事件总线、`http` 响应流都是它：

```dart
Future<void> listenDemo() async {
  var stream = Stream.fromIterable([1, 2, 3]);

  await for (final value in stream) {   // ≈ for await...of (JS 异步迭代器)
    print(value);
  }

  // 转换管道：map/where 返回的还是 Stream，≈ RxJS 操作符链
  stream.map((x) => x * 10).where((x) => x > 10).listen(print);

  // 手动订阅要记得取消——JS 里忘关 WebSocket 是泄漏，Dart 里忘 cancel StreamSubscription 同理
  var sub = Stream.periodic(const Duration(milliseconds: 50), (x) => x).listen(print);
  await Future.delayed(const Duration(milliseconds: 160));
  await sub.cancel();
}
```

Flutter 的 `StreamBuilder` 就是"把 Stream 绑到 UI 上自动重绘"，概念 ≈ React 里 `useSyncExternalStore` 订阅事件源。

### Isolate：与 Web Worker 对应

Dart 单线程跑事件循环，**CPU 重活会卡 UI**——和 JS 完全同样的问题，同样的解法：

```dart
// 主线程
// await compute(heavyTask, 42);   // Flutter 提供的封装，≈ new Worker + postMessage 的样板全免
//
// Isolate.spawn(heavyMain, message) 则更接近裸 new Worker()，
// 隔离区间不共享内存，只能传消息（且消息必须可序列化，比 Web Worker 的 structuredClone 限制多）。
```

## 模块与导入

```dart
// 三种 import 路径：
import 'dart:core';                          // 1) SDK 内置库（集合、异步、数学等），≈ 浏览器全局对象但需显式引入的部分
import 'package:http/http.dart';             // 2) 第三方包，≈ npm 包名导入
import 'package:http/http.dart' as http;     //    命名空间导入，≈ import * as http from 'http'
import './utils/string_util.dart';           // 3) 相对路径，≈ ES Modules 相对导入（限同包内）

// 只导入部分符号：
import 'dart:math' show Random, pi;          // ≈ import { Random, pi }（但 Dart 按符号名而非对象）
import 'dart:io' hide exit;                  // ≈ 解构剩余剔除

// 库文件内部统一导出（lib/my_pkg.dart 常见做法）：
// export 'src/a.dart'; export 'src/b.dart';

// part：把一个库拆成多文件且共享私有成员（≈ TS 已废弃的 namespace 合并），Flutter SDK 源码常见，业务代码少用
// part of 'my_pkg.dart';
```

懒加载（≈ `import()` 动态导入 / React.lazy）：

```dart
import 'heavy_math.dart' deferred as math;

Future<void> useIt() async {
  await math.load();            // 动态加载 chunk，≈ await import('./heavy_math')
  math.compute();
}
```

## Dart 3 新语法速览（前端会秒懂的部分）

```dart
void main() {
  // Record：轻量元组/匿名结构，≈ JS 的 { x, y } 字面量但带类型
  (int, String) pair = (1, 'one');          // 位置字段
  ({required int id, String? name}) user = (id: 7, name: 'xyz'); // 命名字段，≈ TS 对象字面量
  print('${pair.$1} ${user.id}');

  // 模式匹配：if-case / switch 表达式，≈ 更强大的解构 + 判别联合收窄
  if (pair case (final n, _) when n > 0) {
    print('positive: $n');
  }

  // sealed class：可穷尽的"判别联合"，≈ TS discriminated union，编译器帮你查分支覆盖
  var shape = Circle(2.0);
  var area = switch (shape) {
    Circle(radius: final r) => 3.14159 * r * r,
    Rectangle() => shape.width * shape.height, // 示意
  };
  print(area);
}

class Circle { final double radius; const Circle(this.radius); }
class Rectangle { final double width = 1, height = 1; const Rectangle(); }
```

## JS → Dart 语法速查表

| JavaScript | Dart | 备注 |
| --- | --- | --- |
| `let x = 1` | `var x = 1;` | Dart 的 var 可重新赋值 |
| `const x = 1` | `final x = 1;` | 运行时一次性赋值 |
| 编译期字面量常量 | `const x = 1;` | JS 无对应 |
| `function f(a, b = 1) {}` | `void f(int a, [int b = 1]) {}` | 位置可选参数 |
| `function f({a, b}) {}` | `void f({int? a, int? b}) {}` | 命名参数，调用需 `a: 1` |
| `obj?.x ?? dft` | `obj?.x ?? dft` | 相同 |
| `` `Hi ${name}` `` | `'Hi $name'` / `'Hi ${expr}'` | 单引号即可插值 |
| `[...arr, x]` | `[...arr, x]` | 相同 |
| `{...o, k: v}` | `{...o, 'k': v}` | Map 展开 |
| `arr.map(f).filter(g)` | `arr.map(f).where(g).toList()` | Dart 中间是惰性 Iterable |
| `class A extends B {}` | `class A extends B {}` | 真类，无原型 |
| `super()` | `super()` / 初始化列表 `: super(x)` | |
| `get x() {}` | `int get x => _x;` | 相同 |
| `Promise` / `async` / `await` | `Future` / `async` / `await` | 语义一致 |
| `Promise.all` | `Future.wait` | |
| `for await (const x of s)` | `await for (final x in s)` | Stream |
| `new Worker()` | `Isolate.spawn()` / `compute()` | |
| `import * as ns from 'm'` | `import 'm.dart' as ns;` | |
| `typeof x === 'string'` | `x is String` | `is!` 取反 |
| `x as string`（TS） | `x as String` | 运行时也会检查 |
| `interface Foo {}` | 直接 `class Foo` 或 `abstract class` | 无 interface 关键字 |
| `#private` / `_约定` | `_name` | 编译期强制库私有 |
| 无 | `..method()` 级联 | Dart 特色 |
| 无 | `late`、初始化列表 `: x = 1` | Dart 特色 |
| `undefined` | 不存在，只有 `null` | |
| falsy（0/''/null） | 只有 `bool` 能进 `if` | 必须显式判断 |

## 前端转 Dart 高频踩坑

::: danger int 不是 double
`double x = 1;` 编译错误，必须写 `1.0`。JS 里数字只有一种，Dart 的 `int`/`double` 是两个类。除法注意 `/` 永远得 `double`，整除用 `~/`。
:::

::: danger 没有 truthy / falsy
`if (0)`、`if ('')`、`if ([])` 在 JS 里都成立或都 falsy，Dart 里直接编译失败——条件必须是 `bool`。判空写 `list.isEmpty`、`s.isEmpty`、`x == null`。
:::

::: warning 分号必须
Dart 不做自动分号插入（ASI），每条语句以 `;` 结尾。忘了就编译错误，好在报错位置很明确。
:::

::: warning `==` 比较值，且可为运算符重载
`[1,2] == [1,2]` 是 `false`（List 没重载 `==`，比的是引用，同 JS）；但 `String == String` 比内容（JS 也如此）。需要深度比较用 `package:collection` 的 `ListEquality`。`identical(a, b)` 才是"同一实例"判断。
:::

::: info final 的 List/Map 仍可修改
`final list = [1, 2]; list.add(3);` ✅ 合法——`final` 锁的是变量绑定不是对象内容（与 JS `const` 完全一样）。要真不可变用 `const [...]` 或运行时冻结。
:::

::: info 一切皆表达式的世界更近 TS
类、函数、数字、`null` 全是对象（JS 里数字字符串是原始值）；`new` 关键字可省略，直接 `Point(1, 2)` 构造。
:::

## 下一步

- 官方导览（有英文版）：[dart.dev/language](https://dart.dev/language)
- 交互式练习：[Dart Pad](https://dartpad.dev) —— 相当于 Dart 版 CodePen
- 学完语法回到组件实战：[Text 文本](/flutter/components/text)、[Container 容器](/flutter/components/container)
