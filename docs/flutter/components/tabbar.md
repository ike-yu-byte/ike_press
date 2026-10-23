---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# TabBar / TabBarView 选项卡

> 🔵 有状态组件 · `StatefulWidget`

`TabBar` 是顶部的标签条，`TabBarView` 是可左右滑动的内容页，两者通过 `TabController` 联动。常放在 `AppBar.bottom`。

## DefaultTabController（最省事）

不写任何状态管理，TabBar 与 TabBarView 自动对上。

```dart
import 'package:flutter/material.dart';

/// 示例: tabbar-default —— 三页联动
class TabBarDefaultDemo extends StatelessWidget {
  const TabBarDefaultDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('资讯'),
          bottom: const TabBar(
            tabs: [
              Tab(text: '热点'),
              Tab(text: '科技'),
              Tab(text: '体育'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [
            Center(child: Text('热点内容')),
            Center(child: Text('科技内容')),
            Center(child: Text('体育内容')),
          ],
        ),
      ),
    );
  }
}
```

## 手动 TabController（需监听/编程切换）

`TickerProvider` 提供动画驱动，可监听切页、代码跳页。

```dart
import 'package:flutter/material.dart';

/// 示例: tabbar-controller —— 监听 + 按钮跳页
class TabBarControllerDemo extends StatefulWidget {
  const TabBarControllerDemo({super.key});

  @override
  State<TabBarControllerDemo> createState() => _TabBarControllerDemoState();
}

class _TabBarControllerDemoState extends State<TabBarControllerDemo>
    with SingleTickerProviderStateMixin {
  late final TabController _controller = TabController(length: 3, vsync: this);

  @override
  void initState() {
    super.initState();
    _controller.addListener(() {
      if (!_controller.indexIsChanging) {
        // indexIsChanging: 动画中；false 表示已落到新页
        print('切到了 ${_controller.index}');
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose(); // 必须释放
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('手动控制'),
        bottom: TabBar(
          controller: _controller,
          tabs: const [Tab(text: 'A'), Tab(text: 'B'), Tab(text: 'C')],
        ),
      ),
      body: TabBarView(
        controller: _controller,
        children: [
          Center(
            child: FilledButton(
              onPressed: () => _controller.animateTo(2, duration: const Duration(milliseconds: 300), curve: Curves.easeOut),
              child: const Text('跳到 C 页'),
            ),
          ),
          const Center(child: Text('B')),
          const Center(child: Text('C')),
        ],
      ),
    );
  }
}
```

## 图标 + 文字 + 滚动 Tab

标签多到放不下用 `isScrollable`，横向滚而不是压缩。

```dart
import 'package:flutter/material.dart';

/// 示例: tabbar-scrollable —— 可滚动的图标标签
class TabBarScrollableDemo extends StatelessWidget {
  const TabBarScrollableDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const tabs = ['推荐', '热门', '音乐', '游戏', '影视', '知识', '动漫', '体育'];
    return DefaultTabController(
      length: tabs.length,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('频道'),
          bottom: TabBar(
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: [
              for (final t in tabs) Tab(icon: const Icon(Icons.bolt), text: t),
            ],
          ),
        ),
        body: TabBarView(
          children: [for (final t in tabs) Center(child: Text(t))],
        ),
      ),
    );
  }
}
```

## 各自独立使用

只要标签条不要滑动页（点击切 body），TabBar 单独配一个 TabController，监听 index 变化刷 body。

```dart
import 'package:flutter/material.dart';

/// 示例: tabbar-only —— 仅标签条手动切 IndexedStack
class TabBarOnlyDemo extends StatefulWidget {
  const TabBarOnlyDemo({super.key});

  @override
  State<TabBarOnlyDemo> createState() => _TabBarOnlyDemoState();
}

class _TabBarOnlyDemoState extends State<TabBarOnlyDemo>
    with SingleTickerProviderStateMixin {
  late final TabController _controller = TabController(length: 3, vsync: this);

  @override
  void initState() {
    super.initState();
    _controller.addListener(() => setState(() {})); // 切页时刷 body
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        TabBar(
          controller: _controller,
          tabs: const [Tab(text: '一'), Tab(text: '二'), Tab(text: '三')],
        ),
        Expanded(
          child: IndexedStack(
            index: _controller.index,
            children: const [
              Center(child: Text('页一')),
              Center(child: Text('页二')),
              Center(child: Text('页三')),
            ],
          ),
        ),
      ],
    );
  }
}
```

> 不需要滑动切页手势时，这种“TabBar + IndexedStack”比 TabBarView 更可控（页懒加载、状态保留都能自己掌握）；也可以用 M3 的 `SegmentedButton` 替代。

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `tabs` / `children` | TabBar 标签 / TabBarView 页，数量必须一致 |
| `controller` | 共享 `TabController`（length 一致） |
| `isScrollable` / `tabAlignment` | 标签多时滚动 |
| `indicatorSize` / `dividerColor` | M3 下划线宽度（tab/固定）/ 底部分隔线 |
| `TabController.animateTo` / `.index` | 编程切页 / 当前页 |

## 易错点

::: danger length 三处必须一致
`TabController(length)`、`TabBar(tabs)`、`TabBarView(children)` 数量不一致直接断言。
:::

::: warning TabBarView 会预构建相邻页
相邻页已被构建（懒加载滑页），页面里有网络请求时注意别在 init 重复发。
:::

::: info 顶部胶囊风格
M3 推荐滚动胶囊 Tab 用 `SegmentedButton`；传统下划线 TabBar 仍是主流做法。
:::
