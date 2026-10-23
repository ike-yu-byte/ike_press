# 事件总线（EventBus）

> 面向有 JavaScript 经验的读者。事件总线 ≈ 前端的 `EventEmitter` / `mitt` / `new EventTarget()` / RxJS `Subject`：**让互不相识的两段代码，靠"发事件 / 收事件"解耦通信**，而不是一层层传回调（prop drilling）。

## 为什么 Flutter 需要它

Flutter 官方推荐的数据流是"自上而下传参、自下而上回调"（≈ React 的 props + 回调）。但有些场景两个组件隔得很远、又没有父子关系：

- 网络层收到"登录态失效"，要让任意页面弹提示
- 用户在 A 页改了昵称，B 页要立刻刷新显示
- 购物车角标数量，需要在任何地方 +1 后全局同步

一层层 `onXxx` 回调传下去太痛苦——这正是事件总线的主场。

| Web 前端 | Flutter / Dart | 说明 |
| --- | --- | --- |
| `new EventTarget()` / `addEventListener` | `Stream` + `.listen()` | Dart 里"事件流"是原生概念 |
| Node `EventEmitter` / `mitt` | 用 `StreamController.broadcast()` 自建 | 无内置单例总线，需自己封装 |
| RxJS `Subject` / `BehaviorSubject` | `StreamController`（可加 `seedValue`） | 语义几乎一致 |
| `emit('x', data)` | `sink.add(data)` | 发一条事件 |
| `on('x', cb)` | `stream.listen(cb)` | 收一条事件 |

## 最小实现：一个广播流

Dart 的 `StreamController` 就是"双端对象"：`sink` 是入口（往里塞事件），`stream` 是出口（拿去订阅）。**关键是 `.broadcast()`**——默认它是单订阅流，只能被 `listen` 一次，做总线必须开广播模式（≈ EventEmitter 天然支持多监听者）。

```dart
import 'dart:async';

Future<void> main() async {
  // 广播型控制器：允许多个订阅者，是事件总线的底座
  final controller = StreamController<String>.broadcast();

  // 两个互不相识的监听者
  final subA = controller.stream.listen((e) => print('A 收到: $e'));
  final subB = controller.stream.listen((e) => print('B 收到: $e'));

  controller.sink.add('hello');   // 发一条 → A、B 都会打印

  await Future.delayed(const Duration(milliseconds: 10));
  await subA.cancel();            // 用完记得取消订阅（见下文"坑"）
  await subB.cancel();
  await controller.close();       // 关闭总线
}
```

::: tip 广播流只发给"订阅之后"产生的事件
和 `EventEmitter` 不同，`broadcast` 流**不会补发历史事件**：某监听者在 `add` 之后才 `listen`，那条事件它收不到。需要"新订阅者立刻拿到最新值"（≈ RxJS `BehaviorSubject` / 状态快照），改用 `StreamController.broadcast(onListen: ...)` 手动补发，或直接上 `BehaviorSubject`（`rxdart` 包）。
:::

## 封装成全局单例总线

真实项目里你不会到处传 `controller`，而是封装一个全局单例。事件用**类型**区分（比字符串事件名更安全，IDE 能跳转、编译期能查拼写）：

```dart
import 'dart:async';

// 1) 定义事件：每种事件一个小类，携带自己的数据
class UserLoggedIn {
  final String name;
  UserLoggedIn(this.name);
}

class CartChanged {
  final int count;
  CartChanged(this.count);
}

// 2) 全局总线单例
class EventBus {
  EventBus._internal();
  static final EventBus instance = EventBus._internal();

  final _controller = StreamController<dynamic>.broadcast();

  /// 发事件
  void fire(dynamic event) => _controller.sink.add(event);

  /// 订阅：只拿某一种事件类型（on 是 Dart 的类型过滤流）
  Stream<T> on<T>() => _controller.stream.where((e) => e is T).cast<T>();

  void dispose() => _controller.close();
}

final eventBus = EventBus.instance;
```

用法就非常干净——发的一方、收的一方完全不需要认识彼此：

```dart
// 任意角落，登录成功后：
eventBus.fire(UserLoggedIn('ike'));

// 另一个毫不相干的组件里：
eventBus.on<UserLoggedIn>().listen((e) => print('欢迎回来，${e.name}'));
```

## 在 Widget 里订阅与取消

**这是最容易泄漏的地方。** 规则：在 `initState` 订阅、存下 `StreamSubscription`，在 `dispose` 取消——和你在 React `useEffect` 里 `addEventListener` 必须在 cleanup 里 `removeEventListener` 完全同理。忘了取消 ≈ 忘关 WebSocket / 忘 `clearInterval`，回调会持续触发、组件销毁后还 `setState` 直接报错。

```dart
import 'dart:async';
import 'package:flutter/material.dart';

class ProfileCard extends StatefulWidget {
  const ProfileCard({super.key});

  @override
  State<ProfileCard> createState() => _ProfileCardState();
}

class _ProfileCardState extends State<ProfileCard> {
  String _name = '未登录';
  StreamSubscription<UserLoggedIn>? _sub;   // 存句柄，好在 dispose 里取消

  @override
  void initState() {
    super.initState();
    _sub = eventBus.on<UserLoggedIn>().listen((e) {
      if (!mounted) return;                 // 组件可能已销毁，先自查再 setState
      setState(() => _name = e.name);       // 收到事件 → 刷新 UI
    });
  }

  @override
  void dispose() {
    _sub?.cancel();                         // 必须取消，否则内存泄漏 + 销毁后 setState
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Text(_name);
}
```

> `eventBus`、`UserLoggedIn` 来自上一节的封装，放到一个公共文件里 `import` 进来即可。

## 完整可运行案例

下面是一个能直接 `flutter run` 的最小 App：底部按钮"发事件"，顶部两个互不相识的组件各自订阅、独立刷新。

```dart
import 'dart:async';
import 'package:flutter/material.dart';

// —— 事件定义 ——
class CounterEvent {
  final int step;
  CounterEvent(this.step);
}

// —— 全局总线：一个广播控制器，对外暴露 stream（订阅）与 sink（发送）——
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
        // 两个兄弟组件没有任何父子数据传递，全靠事件总线联动
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [EvenLabel(), OddLabel()],
        ),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => eventSink.add(CounterEvent(1)), // 发事件：+1
        child: const Icon(Icons.add),
      ),
    );
  }
}

// 只关心"偶数次点击"的组件
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
  Widget build(BuildContext context) => Text('计数: $_count', style: const TextStyle(fontSize: 24));
}

// 只统计"收到过几次事件"
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
  Widget build(BuildContext context) => Text('收到事件数: $_received');
}
```

::: warning 示例为求精简把总线写在了全局
生产项目建议把 `StreamController` 封进一个可注入的单例（见上文 `EventBus`），并在 App 退出时 `close()`；跨页面、需随主题/登录态重置的事件，用 Provider/Riverpod 管理总线生命周期更稳妥。
:::

## 其他通信方案对照

事件总线不是唯一解，选错反而更难维护：

| 场景 | 首选方案 | 类比前端 |
| --- | --- | --- |
| 父传子、子回调父 | 构造函数参数 + 回调 | React props + `onXxx` |
| 一小块共享状态（主题、语言、当前用户） | `InheritedWidget` / `Provider` / `Riverpod` | Context / Pinia / Redux |
| 跨层级、跨页面、系统级广播（登录失效、全局刷新） | **事件总线** | 全局 `EventBus` / `window` 事件 |
| 一次性"下一页返回结果" | `Navigator` 的 `await pop(result)` | 路由返回值 |

经验法则：**能用父子传参就别上总线**；总线专治"关系很远、又必须解耦"的通信，别拿它当全局状态管理用，否则数据流向会变得不可追踪（和前端"什么都塞全局 event bus 最后没人敢删"是同一个教训）。

## 常见坑

::: danger 忘记 cancel 订阅 = 内存泄漏
`listen()` 返回的 `StreamSubscription` 必须在 `dispose()` 里 `cancel()`。否则组件销毁后事件仍会回调，触发 `setState after dispose` 报错。这是 Flutter 版的"忘关监听器"。
:::

::: danger 用了单订阅流做总线
`StreamController()` 不加 `.broadcast()` 只能被 `listen` 一次，第二个订阅者会抛 `Bad state`。总线必须 `.broadcast()`。
:::

::: info await 之后操作 UI 要判 `mounted`
异步回调（含事件监听）触发时组件可能已被销毁。`setState` 前先 `if (!mounted) return;`。
:::

## 速查对照

| JavaScript (EventEmitter/mitt) | Dart 事件总线 |
| --- | --- |
| `bus.on('evt', cb)` | `bus.on<Evt>().listen(cb)` |
| `bus.emit('evt', data)` | `bus.fire(Evt(data))` |
| `bus.off('evt', cb)` | 保存 `listen()` 返回的 `sub`，`sub.cancel()` |
| `bus.removeAllListeners()` | `controller.close()` |
| `once` | `stream.first`（拿到一条即完成） |

## 下一步

- 事件到了要刷新 UI，就得懂 [setState 与 Widget 生命周期](/flutter/widget-lifecycle)
- 想拿"某个组件的位置/状态"而非广播事件，看 [GlobalKey](/flutter/global-key)
- 跨页面的"发通知 + 拿返回结果"，用 [Navigator 路由](/flutter/navigator)
