# GlobalKey

> 面向有 JavaScript 经验的读者。GlobalKey ≈ 前端的 **`ref` / `document.getElementById`** 再叠加 **React 的 `key` 协调**能力：它既能"拿到某个具体组件的引用"，又能告诉 Flutter"这个组件是谁、跨刷新要保持它的状态"。

## 先搞清楚：Key 是什么

Flutter 每次 `build` 都会重建一大堆 Widget 对象（Widget 是廉价、随时丢弃的"配置描述"）。真正昂贵、需要跨帧存活的是背后的 **Element**（状态载体）和 **RenderObject**（绘制节点）。Flutter 靠**同层比较 + Key** 来判断"新旧树里的某个节点是不是同一个"，从而决定复用还是重建——这与 React 的 diff / reconciliation 几乎同构。

| Key 类型 | 用途 | 类比前端 |
| --- | --- | --- |
| `ValueKey('a')` | 用值区分同层兄弟 | React 列表里的 `key="a"` |
| `ObjectKey(obj)` | 用某个对象的身份区分 | 以对象引用作 key |
| `UniqueKey()` | 每次都是全新的唯一身份 | 强制"这一定是新节点" |
| `GlobalKey` | **全局唯一**，能反查该节点 | `ref` + `getElementById` + 全局唯一 key |

**普通 Key 只在同一层兄弟间比较；GlobalKey 全树唯一**，正因唯一，它才拿得到"跨位置追踪"和"反向访问"两种独有能力。

## 能力一：跨位置移动时保住 State

这是最经典、最能体现价值的场景。列表可重排时，如果 key 不对，**Stateful 子组件的内部状态会"张冠李戴"**——因为 Flutter 按位置复用 Element。

看这个可运行例子：每个 `NumberItem` 内部有一个自增计数（State）。点"反转"把列表顺序颠倒：

```dart
import 'package:flutter/material.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(home: const KeyDemoPage());
}

// 每个条目自带内部状态（计数）
class NumberItem extends StatefulWidget {
  final int id;
  const NumberItem(this.id, {super.key});
  @override
  State<NumberItem> createState() => _NumberItemState();
}

class _NumberItemState extends State<NumberItem> {
  int _count = 0; // 内部状态
  @override
  Widget build(BuildContext context) => ListTile(
        title: Text('条目 ${widget.id}，内部计数 $_count'),
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
              // 关键：给每个条目一个"跟着数据走"的 ValueKey
              // 试试把 key 去掉，或改成 UniqueKey，观察内部计数是否跟着条目移动
              for (final id in _ids)
                NumberItem(id, key: ValueKey(id)),
              const SizedBox(height: 24),
              ElevatedButton(onPressed: _reverse, child: const Text('反转列表')),
            ],
          ),
        ),
      );
}
```

- **带 `ValueKey(id)`**：反转后，"条目 3 的内部计数"仍跟着"条目 3"走——因为 Flutter 认 key 不认位置。
- **不带 key**（默认按位置匹配）：反转后计数会"留在原位"，看起来像数据串了。

> 前端类比：这就是 React 列表不加 `key`、顺序一变状态就错位的那个经典 bug，解法一模一样。

## 能力二：拿到某个组件的"引用"

GlobalKey 泛型绑定到 State 类型，于是你能从外部**直接访问那个组件的 State 和上下文**——相当于 React `useRef` 指向一个组件实例。

::: info 前提：`key` 人人有，但 `currentState` 只对 StatefulWidget 有效
先分清两件事：

1. **`key` 是最顶层基类 `Widget` 的字段**（`final Key? key;`），`StatelessWidget`、`StatefulWidget` 及所有具体组件都继承它——所以**每个组件都能配 `key`**（平时写的 `super.key` 就是把它转发给基类）。而 `key` 的类型是 `Key?`，`GlobalKey` 只是 `Key` 的四个子类之一（还有 `ValueKey`/`ObjectKey`/`UniqueKey`）。
2. **但“能配 key” ≠ “`currentState` 拿得到值”**：`GlobalKey.currentState` 返回的是那个组件的 **State 对象**，而只有 `StatefulWidget` 才有 State。给 `StatelessWidget`（如 `Text`、`Container`）挂 GlobalKey，`currentState` **恒为 null**，只能退而用 `currentContext`（拿它的 BuildContext / RenderBox）。

| 挂 key 的组件 | `key.currentState` | `key.currentContext` |
| --- | --- | --- |
| StatefulWidget（`Form`/`Scaffold`/`Navigator`…） | ✓ 拿到它的 State | ✓ 有 |
| StatelessWidget（`Text`/`Container`…） | ✗ 恒为 null（没有 State） | ✓ 有 |

下文红框里的 `Form` 能 `formKey.currentState!.validate()`，正因 `Form` 是 StatefulWidget、有 `FormState`。
:::

```dart
// 声明：绑定到 FormState（Form 组件的 State 类型）
final formKey = GlobalKey<FormState>();

Form(
  key: formKey,               // 挂上去
  child: const TextField(...),
);

// 任意位置触发校验、读取，无需层层传回调
if (formKey.currentState!.validate()) {
  // 校验通过
}
```

### 典型用法 1：表单校验

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

  final _formKey = GlobalKey<FormState>(); // ① 建 key
  final _nameCtrl = TextEditingController();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(
        child: Form(
          key: _formKey,                    // ② 绑到 Form
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextFormField(
                  controller: _nameCtrl,
                  decoration: const InputDecoration(border: OutlineInputBorder()),
                  validator: (v) => (v == null || v.isEmpty) ? '不能为空' : null,
                ),
              ),
              ElevatedButton(
                // ③ 通过 key 拿到 FormState 并校验——不用把 onSubmit 一路传下来
                onPressed: () {
                  if (_formKey.currentState!.validate()) {
                    ScaffoldMessenger.of(context)
                        .showSnackBar(const SnackBar(content: Text('提交成功')));
                  }
                },
                child: const Text('提交'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

### 典型用法 2：读取组件在屏幕上的位置与尺寸

做"点击按钮在目标元素旁弹提示""滚动到某元素"这类交互时，需要拿到它的坐标。GlobalKey → `currentContext` → `RenderBox`：

```dart
final targetKey = GlobalKey();

// 把 key 挂到想定位的 widget 上
SomeWidget(key: targetKey)

// 需要时读取它的尺寸与全局坐标
void _showTooltip() {
  final ctx = targetKey.currentContext;
  if (ctx == null) return;
  final box = ctx.findRenderObject() as RenderBox;
  final size = box.size;                          // 宽高
  final topLeft = box.localToGlobal(Offset.zero); // 相对屏幕左上角的位置
  print('位置: $topLeft, 尺寸: $size');
}
```

### 典型用法 3：驱动 Scaffold（开抽屉等）

```dart
final scaffoldKey = GlobalKey<ScaffoldState>();

Scaffold(
  key: scaffoldKey,
  drawer: const Drawer(),
  body: ElevatedButton(
    // 从任意深处打开抽屉，不必把 callback 传到 Scaffold
    onPressed: () => scaffoldKey.currentState?.openDrawer(),
    child: const Text('打开菜单'),
  ),
);
```

### 典型用法 4：全局导航服务（无 context 也能跳转）

这是真实项目里非常常见的一个范式。`Navigator.push(context, ...)` 需要 `BuildContext`，但很多地方**根本没有 context**：控制器、service、静态方法、网络拦截器（收到 401 要跳登录页）……把 `GlobalKey<NavigatorState>` 交给 `MaterialApp`，就能在**任意角落**拿到根 Navigator 的状态实例来跳转。

先声明一个全局单例持有这把 key：

```dart
import 'package:flutter/material.dart' show GlobalKey, NavigatorState;

class NavigationService {
  NavigationService._(); // 私有构造：纯静态工具类，不实例化

  // 全局唯一的一把“遥控器”，绑定 Navigator 的 State 类型
  static final GlobalKey<NavigatorState> navigatorKey = GlobalKey<NavigatorState>();

  static Future<Object?> goNamed(String route, {Object? arguments}) =>
      navigatorKey.currentState!.pushNamed(route, arguments: arguments);

  static void back() => navigatorKey.currentState?.pop();
}
```

再在 `MaterialApp` 上把它交给内部的 `Navigator`：

```dart
@override
Widget build(BuildContext context) {
  return MaterialApp(
    navigatorKey: NavigationService.navigatorKey, // 把 key 挂到根 Navigator 上
    title: 'app.title',
    initialRoute: '/',
    // ...
  );
}
```

于是**任何地方**（哪怕在一个完全没有 context 的 service 里）都能跳转：

```dart
// 网络拦截器收到 401：
NavigationService.navigatorKey.currentState?.pushNamedAndRemoveUntil('/login', (r) => false);

// 或走封装好的静态方法：
NavigationService.goNamed('/detail', arguments: 42);
NavigationService.back();
```

::: tip 两个关键认知
1. **key 挂在内部的 `Navigator` 上，不是 `MaterialApp`**：`MaterialApp.navigatorKey` 只是把这把 key 转发给它内部创建的 `Navigator`。所以 `navigatorKey.currentState` 拿到的是 **`NavigatorState`**（泛型已写明），不是 MaterialApp 的 State。
2. **本质是“绕开 context”而非“获取 context”**：`NavigatorState` 自带 `pushNamed/pop` 等方法，直接命令式调用即可；这正是它的价值——在没有 `BuildContext` 的地方也能路由。`currentContext` 才用来拿 Navigator 的 context，是次要路径。
:::

::: warning 三个注意点
- `currentState` 在 Navigator 尚未 build 出来（或已销毁）时为 `null`，用 `?.` 或先判空，别裸 `!`。
- 它走的是**根 Navigator**：若有底部 tab 各自嵌套 Navigator，从这里 push 是盖在整个 App 之上的全屏页，而非当前 tab 内的栈。
- 一把 `navigatorKey` 只能挂一个 `Navigator`，多处复用会 `Duplicate GlobalKey`。
:::

## 三条铁律（不守必翻车）

::: danger 一个 GlobalKey 同一时刻只能挂在一个 widget 上
把它同时赋给两个 widget，或列表里每项都用同一个 GlobalKey，运行时会抛 `Duplicate GlobalKey detected in widget tree`。GlobalKey 的"全局唯一"是强约束，不是建议。
:::

::: danger 不要在 build() 里现造 GlobalKey
`build` 每次都新建一个 key，会让 Flutter 误判"这是不同节点"，导致子树反复销毁重建、状态丢失、性能骤降。Key 要**存活在 State 字段或更外层**，跨 build 保持稳定。
:::

::: info 别滥用：GlobalKey 比局部 Key 贵
GlobalKey 为了支持"跨位置反查"，Flutter 要维护一张全局注册表。列表每项都用 GlobalKey 既没必要也拖慢协调——**列表项区分身份用 `ValueKey` 就够，GlobalKey 留给"确实要从外部引用某个具体节点"的场景**。
:::

## 与前端心智对照

| 你想做的事 | React / DOM | Flutter |
| --- | --- | --- |
| 列表重排不乱状态 | `<li key={id}>` | `Item(key: ValueKey(id))` |
| 拿到某元素的 DOM/实例 | `useRef` + `ref={}` | `GlobalKey` + `currentContext` |
| 读取元素位置尺寸 | `el.getBoundingClientRect()` | `box.localToGlobal` + `box.size` |
| 命令式调用子组件方法 | `ref.current.doSomething()` | `key.currentState!.doSomething()` |
| 表单整体校验 | `formRef.current.reportValidity()` | `formKey.currentState!.validate()` |

## 下一步

- 想理解"为什么 Widget 会被反复重建、State 又何时存活"，读 [setState 与 Widget 生命周期](/flutter/widget-lifecycle)
- 页面间跳转与返回结果，用 [Navigator 路由](/flutter/navigator)
