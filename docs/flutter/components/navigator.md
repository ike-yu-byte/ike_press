---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Navigator 路由跳转

`Navigator` 管理页面的入栈/出栈，实现页面跳转。Flutter 有两种写法：**命令式**（`push` 一个 `MaterialPageRoute`）和**命名路由**（`pushNamed`）。

## 跳转到新页面（命令式）

参数通过目标页构造函数传，最直接。

```dart
import 'package:flutter/material.dart';

/// 示例: navigator-push —— 带参跳转详情页
class NavigatorPushDemo extends StatelessWidget {
  const NavigatorPushDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: FilledButton.icon(
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => const DetailPage(id: 42, name: '张三'),
            ),
          );
        },
        icon: const Icon(Icons.arrow_forward),
        label: const Text('去详情'),
      ),
    );
  }
}

// 目标页：参数就是普通构造函数字段
class DetailPage extends StatelessWidget {
  const DetailPage({super.key, required this.id, required this.name});

  final int id;
  final String name;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('详情 #$id')),
      body: Center(child: Text('姓名：$name，点左上角返回')),
    );
  }
}
```

## 接收返回值

`push` 返回 `Future`，`pop(context, value)` 时拿到结果。

```dart
import 'package:flutter/material.dart';

/// 示例: navigator-result —— 选择页回传结果
class NavigatorResultDemo extends StatefulWidget {
  const NavigatorResultDemo({super.key});

  @override
  State<NavigatorResultDemo> createState() => _NavigatorResultDemoState();
}

class _NavigatorResultDemoState extends State<NavigatorResultDemo> {
  String? _picked;

  Future<void> _pickCity() async {
    final result = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (context) => const CityPickerPage()),
    );
    if (result != null) setState(() => _picked = result); // 取消时为 null
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Text(_picked ?? '还没选城市'),
          const SizedBox(height: 8),
          FilledButton(onPressed: _pickCity, child: const Text('去选城市')),
        ],
      ),
    );
  }
}

class CityPickerPage extends StatelessWidget {
  const CityPickerPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('选择城市')),
      body: ListView(
        children: [
          for (final city in const ['北京', '上海', '广州', '深圳'])
            ListTile(
              title: Text(city),
              onTap: () => Navigator.pop(context, city), // 带值出栈
            ),
        ],
      ),
    );
  }
}
```

## 返回与替换

```dart
import 'package:flutter/material.dart';

/// 示例: navigator-pop-replace —— 返回 / 替换当前页
void _back(BuildContext context) {
  Navigator.pop(context); // 关闭当前页
}

void _replace(BuildContext context) {
  // 登录成功后常用：不让返回键回到登录页
  Navigator.pushReplacement(
    context,
    MaterialPageRoute(builder: (context) => const HomePage()),
  );
}

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) =>
      Scaffold(appBar: AppBar(title: const Text('主页')), body: const SizedBox.shrink());
}
```

## 命名路由

`MaterialApp.routes` 注册表，按路径名跳转；参数走 `arguments`。

```dart
import 'package:flutter/material.dart';

/// 示例: navigator-named —— 命名路由与参数
// main.dart 注册：
void main() {
  runApp(MaterialApp(
    initialRoute: '/',
    routes: {
      '/': (context) => const NamedRouteHome(),
      '/detail': (context) => const NamedRouteDetail(),
    },
  ));
}

class NamedRouteHome extends StatelessWidget {
  const NamedRouteHome({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('首页')),
      body: Center(
        child: FilledButton(
          // 参数用 ModalRoute 在目标页取出
          onPressed: () => Navigator.pushNamed(context, '/detail', arguments: {'id': 7}),
          child: const Text('去详情'),
        ),
      ),
    );
  }
}

class NamedRouteDetail extends StatelessWidget {
  const NamedRouteDetail({super.key});

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)!.settings.arguments as Map<String, dynamic>;
    return Scaffold(
      appBar: AppBar(title: Text('详情 #${args['id']}')),
    );
  }
}
```

## 返回拦截（有未保存内容）

`PopScope` 在用户点返回/侧滑手势时先行拦截。

```dart
import 'package:flutter/material.dart';

/// 示例: navigator-popscope —— 返回前弹确认
class NavigatorPopScopeDemo extends StatelessWidget {
  const NavigatorPopScopeDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false, // 禁止直接 pop
      onPopInvokedWithResult: (didPop, result) async {
        if (didPop) return;
        final shouldPop = await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: const Text('放弃编辑？'),
            actions: [
              TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('继续编辑')),
              FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('放弃')),
            ],
          ),
        );
        if (shouldPop == true && context.mounted) {
          Navigator.pop(context);
        }
      },
      child: const Scaffold(
        body: Center(child: Text('点系统返回试试')),
      ),
    );
  }
}
```

## API 速查

| API | 说明 |
| --- | --- |
| `push` / `pop` | 入栈 / 出栈（可带返回值） |
| `pushReplacement` | 替换当前页（不留返回） |
| `pushAndRemoveUntil` | 跳到新页并清空栈（登录进主页） |
| `pushNamed` / `popUntil` | 命名路由 / 回到指定页（如首页） |
| `maybePop` | 能 pop 才 pop（首屏无返回键时不崩） |
| `PopScope` | 拦截返回手势/按键 |

## 易错点

::: danger await push 后 context 可能已失效
异步间隙页面可能被销毁，回调里用 context 前先 `if (!context.mounted) return;`。
:::

::: warning 命名路由参数无类型约束
`arguments` 是 `Object?`，强转写错直接崩；复杂项目直接上命令式或 go_router 等类型安全方案。
:::

::: info 大型项目路由方案
命令式/命名路由适合简单场景；页面多、要深链（Deep Link）时社区标配是 [go_router](https://pub.dev/packages/go_router)。
:::
