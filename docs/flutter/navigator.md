# Navigator 路由

> 面向有 JavaScript 经验的读者。Navigator ≈ 前端的**路由 + 浏览器历史栈**（react-router / vue-router / `history.pushState`），但默认是**命令式**的：你在代码里 `push` 一个页面、`pop` 回上一页，像操作一个栈。

## 心智模型：一个页面栈

Flutter 用一个 `Navigator` 管理一张 **路由栈**：

- `push` = 压入新页面（≈ `history.push` / `router.push`），旧页面留在栈底不销毁
- `pop` = 弹出栈顶回到上一页（≈ `history.back()`）
- 系统返回键 / iOS 侧滑，默认就是 `pop` 栈顶

| Web 前端 | Flutter Navigator | 说明 |
| --- | --- | --- |
| `router.push('/detail', { id: 1 })` | `Navigator.push(context, MaterialPageRoute(builder: (_) => Detail(id: 1)))` | 跳转并带参 |
| `route.query.id` / `props` | 目标页构造函数参数 | 推荐用构造函数传参 |
| `router.back()` | `Navigator.pop(context)` | 返回 |
| `pushState` 替换当前条 | `Navigator.pushReplacement(...)` | 替换栈顶 |
| `await 路由返回结果` | `await Navigator.push(...)` | 见"回传结果" |
| 命名路由表 `routes: {...}` | `MaterialApp(routes: {...})` + `pushNamed` | 字符串路径 |

## 基本跳转与返回

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
        appBar: AppBar(title: const Text('首页')),
        body: Center(
          child: ElevatedButton(
            // push：把 DetailPage 压上栈顶；参数直接用构造函数传进去
            onPressed: () => Navigator.push(
              context,
              MaterialPageRoute(builder: (_) => const DetailPage(id: 42)),
            ),
            child: const Text('去看详情'),
          ),
        ),
      );
}

class DetailPage extends StatelessWidget {
  final int id;
  const DetailPage({required this.id}); // ← 传参走构造函数，类型安全、IDE 可跳转
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('详情页')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text('收到的 id = $id'),
              const SizedBox(height: 16),
              // pop：出栈回到上一页
              ElevatedButton(
                onPressed: () => Navigator.pop(context),
                child: const Text('返回'),
              ),
            ],
          ),
        ),
      );
}
```

::: tip 优先用构造函数传参，而不是 arguments
`pushNamed('/detail', arguments: 42)` 配合 `ModalRoute.of(context)!.settings.arguments` 也能传，但 `arguments` 是 `Object?`、要手动强转、易错。**给目标页写个带类型的构造函数**是社区主流做法，等于 React 里直接给组件传 props。
:::

## 回传结果（await 一个路由）

前端里"打开一个弹窗、等用户选完拿到返回值"常用 `Promise`。Flutter 的 `Navigator.push` 本身就返回 `Future`——**栈顶 `pop` 时带的那个值，就是它的完成结果**：

```dart
// 从详情页返回时携带一个字符串结果
final result = await Navigator.push<String>(
  context,
  MaterialPageRoute(builder: (_) => const PickerPage()),
);
// 用户选了 → result 是选中值；被返回键取消 → result 为 null
if (result != null) {
  print('用户选择了: $result');
}

// 在 PickerPage 里，用 pop 的第二参数把结果带回去：
Navigator.pop(context, 'apple');
```

完整可运行示例（选一项并回传）：

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
    // ① await 路由：拿到下一页 pop 回来的结果
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
              Text(_picked == null ? '还没选' : '你选了：$_picked'),
              ElevatedButton(onPressed: _openPicker, child: const Text('去选择')),
            ],
          ),
        ),
      );
}

class PickerPage extends StatelessWidget {
  const PickerPage({super.key});
  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: const Text('选一个')),
        body: Column(
          children: [
            for (final fruit in ['apple', 'banana', 'cherry'])
              ListTile(
                title: Text(fruit),
                // ② 点击时把结果随 pop 带回上一页
                onTap: () => Navigator.pop(context, fruit),
              ),
          ],
        ),
      );
}
```

## 命名路由

页面多了，可以用一张 `routes` 表把"路径字符串 → 页面"集中登记，≈ vue-router / react-router 的路由配置：

```dart
MaterialApp(
  initialRoute: '/',
  routes: {
    '/': (_) => HomePage(),
    '/detail': (ctx) {
      // 命名路由拿参数只能靠 settings.arguments（Object?），需强转
      final id = ModalRoute.of(ctx)!.settings.arguments as int;
      return DetailPage(id: id);
    },
  },
  onUnknownRoute: (_) => MaterialPageRoute(
        builder: (_) => const Scaffold(body: Center(child: Text('404 页面不存在'))),
      ), // ≈ 兜底 / NotFound 路由
);

// 跳转：
Navigator.pushNamed(context, '/detail', arguments: 42);
```

::: warning 命名路由传参是弱类型
`arguments` 是 `Object?`，接收端要 `as` 强转、拼错路径运行时才报错。所以中小项目普遍更爱**构造函数直传**（前面的写法）。命名路由的价值在于"URL 化、可深链、可集中管理"——真要这套，直接上 `go_router`（Navigator 2.0 的声明式封装，≈ react-router 的数据加载 / 深链）。
:::

## 栈操作常用招

```dart
Navigator.pushReplacement(context, route);        // 替换栈顶（登录后从"登录页"跳"首页"不留返回）
Navigator.pushAndRemoveUntil(                     // 跳到某页并清空其下所有页
  context, route, (route) => false,
);
Navigator.popUntil(context, ModalRoute.withName('/')); // 一路弹回指定页
Navigator.canPop(context);                        // 是否还能返回（判栈深）
```

## 对话框与底部弹层也是路由

`showDialog` / `showModalBottomSheet` 本质是往栈上压一个路由，所以同样能 `await` 结果：

```dart
final confirmed = await showDialog<bool>(
  context: context,
  builder: (ctx) => AlertDialog(
    title: const Text('提示'),
    content: const Text('确定删除吗？'),
    actions: [
      TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('取消')),
      TextButton(onPressed: () => Navigator.pop(ctx, true), child: const Text('确定')),
    ],
  ),
);
if (confirmed == true) { /* 执行删除 */ }
```

## 拦截返回键（PopScope）

想实现"有未保存内容时，返回前先确认"，用 `PopScope`（新版 API，取代旧的 `WillPopScope`）：

```dart
PopScope(
  canPop: false, // 先禁止直接 pop
  onPopInvokedWithResult: (didPop, result) {
    if (didPop) return;         // 已经 pop 了就不用管
    // 自己决定要不要放行：弹确认框，用户同意再手动 Navigator.pop
  },
  child: const Scaffold(body: EditorPage()),
)
```

## 高频坑

::: danger 异步回来后别乱用 BuildContext
`await` 之后再拿 `context` 去 `Navigator.push` / `showDialog`，页面可能已被销毁。要么先判 `if (!context.mounted) return;`，要么在 `await` 前把需要的东西取好。这是 Flutter 版的"组件卸载后还 setState"。
:::

::: info Navigator.of(context) vs rootNavigator
`Navigator.of(context)` 找的是**最近的** Navigator；嵌套导航（底部 tab 各自有栈）时它拿到的是当前 tab 的栈。要跨整个 App 的最外层栈（如从某个 tab 跳到全屏页），用 `Navigator.of(context, rootNavigator: true)`。
:::

::: info 别忘了 import
本页所有示例顶部都有 `import 'package:flutter/material.dart';`，复制即可运行。`MaterialPageRoute` 提供 Material 风格转场；iOS 风格用 `CupertinoPageRoute`（`import 'package:flutter/cupertino.dart';`）。
:::

## 下一步

- 页面 `push/pop` 时组件的创建销毁时机，见 [setState 与 Widget 生命周期](/flutter/widget-lifecycle)
- 跨页面"发通知 + 拿结果"之外的全局联动，用 [事件总线](/flutter/event-bus)
