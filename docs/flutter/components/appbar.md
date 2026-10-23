---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# AppBar 顶栏

> 🔵 有状态组件 · `StatefulWidget`

`AppBar` 是页面顶部那条栏，放标题、返回按钮、右侧操作图标，还能挂一个 `bottom`（如 TabBar）。作为 `Scaffold.appBar` 使用。

## 基本顶栏

```dart
import 'package:flutter/material.dart';

/// 示例: appbar-basic —— 居中标题 + 右侧两个操作
class AppBarBasicDemo extends StatelessWidget {
  const AppBarBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('个人资料'),
        centerTitle: true, // iOS 风格居中
        actions: [
          IconButton(icon: const Icon(Icons.search), onPressed: () {}),
          IconButton(icon: const Icon(Icons.more_vert), onPressed: () {}),
        ],
      ),
      body: const Center(child: Text('页面内容')),
    );
  }
}
```

## 自动返回按钮与抽屉按钮

有上一页时自动出现 ←；挂了 `drawer` 时自动出现 ☰，都可手动覆盖。

```dart
import 'package:flutter/material.dart';

/// 示例: appbar-leading —— 手动指定左侧按钮
class AppBarLeadingDemo extends StatelessWidget {
  const AppBarLeadingDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('设置'),
        leading: IconButton( // 覆盖默认的返回/抽屉按钮
          icon: const Icon(Icons.close),
          onPressed: () => Navigator.maybePop(context),
        ),
        automaticallyImplyLeading: true, // false 可彻底去掉返回键
      ),
      body: const Center(child: Text('左上角是 ✕ 不是 ←')),
    );
  }
}
```

## bottom 挂 TabBar

`bottom` 是最常用扩展位，优先 `PreferredSize` 定制高度。

```dart
import 'package:flutter/material.dart';

/// 示例: appbar-bottom-tab —— 顶栏下方选项卡
class AppBarBottomTabDemo extends StatelessWidget {
  const AppBarBottomTabDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('音乐'),
          bottom: const TabBar(
            tabs: [
              Tab(text: '热门'),
              Tab(text: '新歌'),
              Tab(text: '排行'),
            ],
          ),
        ),
        body: const TabBarView(
          children: [Center(child: Text('热门')), Center(child: Text('新歌')), Center(child: Text('排行'))],
        ),
      ),
    );
  }
}
```

## 搜索栏形态

标题位置换成输入框（点图标展开是常见交互）。

```dart
import 'package:flutter/material.dart';

/// 示例: appbar-search —— 标题即搜索框
class AppBarSearchDemo extends StatefulWidget {
  const AppBarSearchDemo({super.key});

  @override
  State<AppBarSearchDemo> createState() => _AppBarSearchDemoState();
}

class _AppBarSearchDemoState extends State<AppBarSearchDemo> {
  bool _searching = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: _searching
            ? const TextField(
                autofocus: true,
                decoration: InputDecoration(hintText: '搜索…'),
              )
            : const Text('商品列表'),
        actions: [
          IconButton(
            icon: Icon(_searching ? Icons.close : Icons.search),
            onPressed: () => setState(() => _searching = !_searching),
          ),
        ],
      ),
      body: const Center(child: Text('点右上角切换搜索态')),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `title` / `centerTitle` | 标题 widget / 是否居中 |
| `leading` / `actions` | 左 / 右操作区（List\<Widget\>） |
| `automaticallyImplyLeading` | 关掉自动返回键 |
| `bottom` / `flexibleSpace` | 底部挂 TabBar / 弹性空间（SliverAppBar 用） |
| `backgroundColor` / `foregroundColor` / `iconTheme` | 栏色 / 前景统一色 / 图标色 |
| `elevation` / `scrolledUnderElevation` | 静止 / 滚动到下层的阴影高度 |
| `toolbarHeight` / `titleSpacing` | 高度 / 标题与左右区间距 |

## 易错点

::: warning actions 图标点击区小
`IconButton` 自带 48dp 热区，直接塞 `Icon` 则难点中——actions 里永远用 IconButton。
:::

::: danger M3 下默认底色跟随主题
Material 3 里 AppBar 默认是 surface 色而非主色，"标题栏怎么不是蓝色了"是主题预期变化，要旧效果显式设 `backgroundColor`。
:::

::: info 滚动收起用 SliverAppBar
想要"上滑隐藏、下滑出现"的效果，`AppBar` 做不到，换 `SliverAppBar浮 + pinned/floating` 放进 CustomScrollView。
:::
