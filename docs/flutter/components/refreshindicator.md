---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# RefreshIndicator 下拉刷新

> 🔵 有状态组件 · `StatefulWidget`

`RefreshIndicator` 包裹一个可滚动组件，用户下拉时显示加载圈，松手触发异步刷新任务。

## 基本下拉刷新

列表下拉 → 转圈 → 数据更新后自动收起。

```dart
import 'package:flutter/material.dart';

/// 示例: refresh-basic —— 下拉重新生成列表数据
class RefreshBasicDemo extends StatefulWidget {
  const RefreshBasicDemo({super.key});

  @override
  State<RefreshBasicDemo> createState() => _RefreshBasicDemoState();
}

class _RefreshBasicDemoState extends State<RefreshBasicDemo> {
  List<String> items = List.generate(20, (i) => '数据 $i');

  Future<void> _onRefresh() async {
    await Future.delayed(const Duration(seconds: 1)); // 模拟网络请求
    setState(() {
      items = List.generate(20, (i) => '刷新后 $i');
    });
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 260,
        child: RefreshIndicator(
          onRefresh: _onRefresh,
          child: ListView.builder(
            physics: const AlwaysScrollableScrollPhysics(), // 关键：内容不满一屏也能下拉
            itemCount: items.length,
            itemBuilder: (context, i) => ListTile(title: Text(items[i])),
          ),
        ),
      ),
    );
  }
}
```

## 编程触发刷新

`GlobalKey<RefreshIndicatorState>` 可以在不手滑时代码唤起刷新（如页面首次加载）。

```dart
import 'package:flutter/material.dart';

/// 示例: refresh-programmatic —— 按钮触发下拉刷新动画
class RefreshProgrammaticDemo extends StatefulWidget {
  const RefreshProgrammaticDemo({super.key});

  @override
  State<RefreshProgrammaticDemo> createState() => _RefreshProgrammaticDemoState();
}

class _RefreshProgrammaticDemoState extends State<RefreshProgrammaticDemo> {
  final _refreshKey = GlobalKey<RefreshIndicatorState>();
  int _count = 0;

  Future<void> _onRefresh() async {
    await Future.delayed(const Duration(seconds: 1));
    setState(() => _count++);
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 300,
            height: 160,
            child: RefreshIndicator(
              key: _refreshKey,
              onRefresh: _onRefresh,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  ListTile(title: Text('已刷新 $_count 次')),
                  const ListTile(title: Text('↓ 或用下面按钮触发')),
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          FilledButton.icon(
            onPressed: () => _refreshKey.currentState?.show(), // 代码唤起刷新
            icon: const Icon(Icons.refresh),
            label: const Text('编程触发刷新'),
          ),
        ],
      ),
    );
  }
}
```

## 自定义样式

颜色、背景色、位移高度都可调。

```dart
import 'package:flutter/material.dart';

/// 示例: refresh-styled —— 自定义加载圈外观
class RefreshStyledDemo extends StatefulWidget {
  const RefreshStyledDemo({super.key});

  @override
  State<RefreshStyledDemo> createState() => _RefreshStyledDemoState();
}

class _RefreshStyledDemoState extends State<RefreshStyledDemo> {
  Future<void> _onRefresh() => Future.delayed(const Duration(seconds: 1));

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 220,
        child: RefreshIndicator(
          onRefresh: _onRefresh,
          color: Colors.white,               // 转圈颜色
          backgroundColor: Colors.deepPurple, // 圆圈底板颜色
          displacement: 60,                   // 下拉多少像素触发（也是圆圈位置）
          child: ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: const [
              ListTile(title: Text('紫色刷新圈')),
              ListTile(title: Text('下拉试试')),
            ],
          ),
        ),
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `onRefresh` | 必填，返回 `Future`；Future 完成前圆圈一直转 |
| `color` / `backgroundColor` | 加载圈颜色 / 底板颜色 |
| `displacement` | 触发点与圆圈位置偏移 |
| `notificationPredicate` | 自定义哪些滚动通知能触发刷新（嵌套滚动场景） |
| `semanticsLabel` / `semanticsValue` | 无障碍朗读文案 |

## 易错点

::: danger 内容不足一屏时下拉无效
若列表内容比屏幕短，默认 physics 不允许下拉，`RefreshIndicator` 就触发不了。给子滚动组件加 `physics: AlwaysScrollableScrollPhysics()`。
:::

::: danger onRefresh 必须返回 Future
回调里忘了 await/返回 Future 会立刻收起圆圈，看起来"刷新没生效"。async 函数天然返回 Future，直接用它。
:::

::: warning 子组件必须是可滚动的
`RefreshIndicator` 需要监听滚动通知，child 里放 `Column`（不可滚）不会生效，必须 ListView / GridView / SingleChildScrollView 等。
:::
