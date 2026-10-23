# setState 与 Widget 生命周期

> 面向有 JavaScript 经验的读者。这一页讲清 Flutter 最基础也最容易懵的两件事：**UI 怎么随数据更新（`setState`）**、**一个组件从出生到销毁经历了哪些阶段（生命周期）**。全程与 React 对照。

## 先建立心智模型：三棵树

Flutter 里你写的 `Widget` 只是**不可变的配置描述**（"我要一个红色 60×60 的方块"），每次刷新都重新 new 一堆，很廉价。真正干活的是它背后：

| 层 | 是什么 | 生命周期 | 类比前端 |
| --- | --- | --- | --- |
| **Widget** | 配置快照（immutable） | 每帧都可能重建 | React 的 JSX / 元素描述 |
| **Element** | Widget 在树中的实例，持有状态、负责 diff | 尽量长期存活 | Fiber 节点 |
| **RenderObject** | 真正布局、绘制、命中测试 | 随 Element 复用 | 真实 DOM 节点 |

关键结论：**Widget 被重建 ≠ State 被重建**。只要 Element 复用成功（同类型 + 同 key），它的 `State` 就存活、`initState` 不会重跑。这解释了为什么"父组件一直 rebuild，子组件的输入框内容却没丢"。

## StatelessWidget vs StatefulWidget

| | StatelessWidget | StatefulWidget |
| --- | --- | --- |
| 有内部可变状态？ | 无 | 有（放在配对的 `State` 类里） |
| 何时重建 | 父级 rebuild 或自身被 rebuild | 同左，外加自身 `setState` |
| 类比 | 纯展示函数组件 | 带 `useState`/`useEffect` 的组件 |

纯展示、数据全从构造函数来 → `StatelessWidget`。需要"自己会变的东西"（计数、输入、动画、订阅）→ `StatefulWidget`。

## setState：标记脏、异步重建

`setState` 做两件事：**登记"我变了"** + **调度一次 rebuild**。它**不是立即重画**，而是把该 Element 标记为 dirty，Flutter 在**下一帧**统一重建——这和 React 的批量更新 / `requestAnimationFrame` 合帧是一个思路。

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
  int _count = 0; // 可变状态，放在 State 类里，不放 Widget 里

  void _increment() {
    // ① 先改变量  ② 再 setState 通知重建。顺序反了也常见，但必须"改+setState"成对
    setState(() => _count++);
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        body: Center(child: Text('$_count', style: const TextStyle(fontSize: 48))),
        floatingActionButton: FloatingActionButton(onPressed: _increment, child: const Icon(Icons.add)),
      );
}
```

::: danger 只改变量、不 setState → UI 不动
`_count++` 不会自动触发重绘（Flutter 没有 Vue 那种响应式代理）。**改了要 `setState`，或让 `setState` 的回调里改**。忘了 setState 是前端转来第一大坑。
:::

::: danger 不能在 build 里 setState，也不能 dispose 后 setState
- `build` 过程中调 `setState` → 报错（重建还没结束又调度重建）。
- 异步回调（`Future`/`Timer`/事件）回来时组件可能已销毁，`setState` 会抛异常。**先判 `if (!mounted) return;`**（`mounted` 是 State 的属性，表示"还挂在树上"）。
:::

## 生命周期方法全序

一个 `StatefulWidget` 的 `State` 从生到死，方法调用顺序：

```
createState()
  → initState()                 // 只一次：建 controller、订阅、定时器
  → didChangeDependencies()     // initState 后必调一次；此后依赖(InheritedWidget/Provider)变化时再调
  → build()                     // 首次 + 每次 setState / 父级重建
      ⇅ （反复）
  → didUpdateWidget()           // 父级用"新 Widget 实例"重建它时（配置变了）
  → build()
  → deactivate()                // 从树移除（可能只是临时摘下，GlobalKey 移动会走这）
  → dispose()                   // 永久移除：取消订阅、释放 controller，对应"卸载清理"
```

与 React（函数组件 hooks 视角）对照：

| Flutter | React 等价 | 典型用途 |
| --- | --- | --- |
| `initState` | `useEffect(fn, [])` 首次 / 构造函数 | 初始化 controller、订阅事件总线 |
| `build` | 函数组件体本身（每次渲染执行） | 描述 UI |
| `setState` | `setState` / `useState` 的 setter | 触发重渲染 |
| `didUpdateWidget` | `useEffect` 依赖变化 / `componentDidUpdate` | 外部参数变了要同步内部状态 |
| `dispose` | `useEffect` 的 cleanup / `componentWillUnmount` | 取消 Timer、Stream、controller |
| `mounted` | 判断组件是否还挂载 | 异步回调里安全 setState |

## 带资源清理的完整例子

最典型的 `initState` + `dispose` 配对：起一个每秒自增的定时器，销毁时务必取消（≈ `useEffect` 里 `setInterval` 必配 `clearInterval`）。

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
    super.initState();                 // ① 必须先调 super
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (!mounted) return;            // ③ 异步回调里判存活
      setState(() => _seconds++);
    });
  }

  @override
  void dispose() {
    _timer?.cancel();                  // ② 释放资源：忘取消 = 定时器泄漏、销毁后 setState
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Center(child: Text('已运行 $_seconds 秒'));
}
```

## didUpdateWidget：外部参数变了怎么同步内部状态

场景：一个倒计时组件，父级可以传不同的"起始秒数"。起始值变了要重置内部计时——这正是 `didUpdateWidget` 的用途（≈ React 里 `useEffect` 监听 props 变化去重置 state）。

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
    // 只有当外部传入的起始值真的变了，才重置，避免无谓刷新
    if (oldWidget.startSeconds != widget.startSeconds) {
      setState(() => _remaining = widget.startSeconds);
    }
  }

  @override
  Widget build(BuildContext context) => Text('剩余 $_remaining 秒');
}
```

::: tip 为什么不在 build 里判断重置
在 `build` 里比较 `widget.xxx` 再改状态是反模式（build 应纯粹产 UI）。`didUpdateWidget` 给了你"配置变化时做一次副作用"的正确时机。React 里对应"不要在 render 函数体里直接 setState 副作用"。
:::

## 该用 setState 还是状态管理？

- **临时状态（ephemeral）**：只这个组件关心（当前 tab、输入框文本、动画进度）→ `setState` 足够。
- **应用状态（app state）**：多处共享（登录用户、购物车、主题）→ 用 `Provider` / `Riverpod` / `Bloc`，或本页之外的方案。

别把 `setState` 当全局状态库用，也别给一个只有本地计数的组件硬上 Riverpod——按状态作用域选工具，和前端"局部 useState vs 全局 store"是同一判断。

## 常见坑清单

::: danger 忘了 super.initState() / super.dispose()
`initState`、`dispose`、`didUpdateWidget` 里都要先（dispose 里是后）调用 `super`，漏了 Flutter 会告警甚至异常。
:::

::: danger 把可变状态写进 StatelessWidget
StatelessWidget 是 immutable 的，你改它的字段也不会触发重建。要会变就配 `StatefulWidget`，把状态放 `State` 里。
:::

::: info 列表重排状态错位，是 key 的问题不是生命周期的问题
如果 `StatefulWidget` 放在可增删排序的列表里，务必给每项稳定的 `ValueKey`，否则 Flutter 按位置复用 Element 会让内部状态"串位"。详见 [GlobalKey](/flutter/global-key)。
:::

## 下一步

- 组件销毁要取消的订阅，多来自 [事件总线](/flutter/event-bus)
- 页面进出（push/pop）如何影响生命周期，见 [Navigator 路由](/flutter/navigator)
