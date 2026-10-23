---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Scaffold 页面脚手架

> 🔵 有状态组件 · `StatefulWidget`

`Scaffold` 是 Material 页面的**骨架容器**，一个页面通常最外层就是它。它把 AppBar、body、底部导航、悬浮按钮、抽屉、SnackBars 等槽位统一安排好了。

## 完整骨架

所有主要槽位一次配齐。

```dart
import 'package:flutter/material.dart';

/// 示例: scaffold-full —— appBar + body + FAB + 底部导航 + 抽屉
class ScaffoldFullDemo extends StatefulWidget {
  const ScaffoldFullDemo({super.key});

  @override
  State<ScaffoldFullDemo> createState() => _ScaffoldFullDemoState();
}

class _ScaffoldFullDemoState extends State<ScaffoldFullDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('首页')),
      drawer: const Drawer(
        child: Center(child: Text('抽屉内容')),
      ),
      body: IndexedStack(
        index: _index,
        children: const [
          Center(child: Text('页面 0')),
          Center(child: Text('页面 1')),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {},
        child: const Icon(Icons.add),
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: '首页'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: '我的'),
        ],
      ),
    );
  }
}
```

## body 的安全区处理

`body` 不会自动避开系统栏，非滚动内容记得包 `SafeArea`。

```dart
import 'package:flutter/material.dart';

/// 示例: scaffold-safearea —— 内容避开刘海/手势条
class ScaffoldSafeAreaDemo extends StatelessWidget {
  const ScaffoldSafeAreaDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('详情')),
      body: const SafeArea(
        child: Padding(
          padding: EdgeInsets.all(16),
          child: Text('这段内容不会被底部手势条挡住'),
        ),
      ),
    );
  }
}
```

## 透明顶栏（封面头图）

`AppBar` 叠在 body 图片上：`transparent` + `flexibleSpace`。

```dart
import 'package:flutter/material.dart';

/// 示例: scaffold-flexible-appbar —— 图片头 + 渐隐标题栏
class ScaffoldFlexibleDemo extends StatelessWidget {
  const ScaffoldFlexibleDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 180,
            pinned: true,
            flexibleSpace: FlexibleSpaceBar(
              title: const Text('相册', style: TextStyle(color: Colors.white)),
              background: Image.network(
                'https://picsum.photos/seed/scaffold/600/360',
                fit: BoxFit.cover,
              ),
            ),
          ),
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.all(16),
              child: Text('向下滚动看标题栏收缩效果……'),
            ),
          ),
        ],
      ),
    );
  }
}
```

## 槽位速查

| 槽位 | 作用 |
| --- | --- |
| `appBar` | 顶部应用栏 |
| `body` | 页面主体内容（必填） |
| `floatingActionButton` | 悬浮操作按钮 FAB |
| `bottomNavigationBar` | 底部导航 |
| `drawer` / `endDrawer` | 左 / 右抽屉 |
| `persistentFooterButtons` | 固定在底部的按钮行 |
| `snackBar`（经 ScaffoldMessenger） | 底部临时消息 |
| `backgroundColor` / `resizeToAvoidBottomInset` | 背景 / 键盘弹出时是否顶起 |

## 易错点

::: warning Scaffold.of 已废弃
取当前 Scaffold 状态的 `Scaffold.of(context)` 基本不用了；弹 SnackBar 走 `ScaffoldMessenger.of(context)`，开抽屉用 `Scaffold.of(context).openDrawer()` 仍有效但注意 context 要在 Scaffold 之下。
:::

::: danger 一个页面一个 Scaffold
Scaffold 开销不小且互相独立（Messenger/抽屉都绑定自己），别在子组件里再套一个 Scaffold 当普通容器用——除非确实要独立路由页。
:::

::: info 全屏页可去掉 AppBar
引导页、视频页直接不传 `appBar`，body 自然顶到状态栏，配合 `SystemChrome` 可隐藏状态栏。
:::
