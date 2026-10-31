---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/bottomnavigationbar' # 该页 Flutter Web 预览地址
---

# BottomNavigationBar 底部导航

> 🔵 有状态组件 · `StatefulWidget`

`BottomNavigationBar` 是 App 最常见的底部主导航（首页/发现/我的）。放在 `Scaffold.bottomNavigationBar`，点不同项切换 `currentIndex` 并换 body。

## 基本三 Tab

```dart
import 'package:flutter/material.dart';

/// 示例: bottomnav-basic —— 首页/发现/我的
class BottomNavBasicDemo extends StatefulWidget {
  const BottomNavBasicDemo({super.key});

  @override
  State<BottomNavBasicDemo> createState() => _BottomNavBasicDemoState();
}

class _BottomNavBasicDemoState extends State<BottomNavBasicDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _index,
        children: const [
          Center(child: Text('首页')),
          Center(child: Text('发现')),
          Center(child: Text('我的')),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: '首页'),
          BottomNavigationBarItem(icon: Icon(Icons.explore), label: '发现'),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: '我的'),
        ],
      ),
    );
  }
}
```

## fixed vs shifting 两种样式

`type: shifting` 未选中只有图标、选中后图标+文字，动效更炫；超过 3 项常用。

```dart
import 'package:flutter/material.dart';

/// 示例: bottomnav-shifting —— 选中态带背景 pill
class BottomNavShiftingDemo extends StatefulWidget {
  const BottomNavShiftingDemo({super.key});

  @override
  State<BottomNavShiftingDemo> createState() => _BottomNavShiftingDemoState();
}

class _BottomNavShiftingDemoState extends State<BottomNavShiftingDemo> {
  int _index = 1;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('Tab $_index')),
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.shifting,
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: '首页', backgroundColor: Colors.blue),
          BottomNavigationBarItem(icon: Icon(Icons.search), label: '搜索', backgroundColor: Colors.teal),
          BottomNavigationBarItem(icon: Icon(Icons.notifications), label: '通知', backgroundColor: Colors.purple),
        ],
      ),
    );
  }
}
```

## 保持各页状态（IndexedStack）

直接换 body 会销毁重建页面；用 `IndexedStack` 保留各 Tab 的状态（滚动位置等）。

```dart
import 'package:flutter/material.dart';

/// 示例: bottomnav-indexedstack —— Tab 切换不丢状态
class BottomNavIndexedStackDemo extends StatefulWidget {
  const BottomNavIndexedStackDemo({super.key});

  @override
  State<BottomNavIndexedStackDemo> createState() => _BottomNavIndexedStackDemoState();
}

class _BottomNavIndexedStackDemoState extends State<BottomNavIndexedStackDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      // IndexedStack：全部子都构建，只展示 index 指向的那个
      body: IndexedStack(
        index: _index,
        children: [
          ListView.builder(itemCount: 50, itemBuilder: (c, i) => ListTile(title: Text('首页 $i'))),
          ListView.builder(itemCount: 50, itemBuilder: (c, i) => ListTile(title: Text('发现 $i'))),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _index,
        onTap: (i) => setState(() => _index = i),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: '首页'),
          BottomNavigationBarItem(icon: Icon(Icons.explore), label: '发现'),
        ],
      ),
    );
  }
}
```

## M3 替代者：NavigationBar

Material 3 的 `NavigationBar` 是新一代底部导航（自动 pill 高亮、样式跟随主题），新项目优先。

```dart
import 'package:flutter/material.dart';

/// 示例: bottomnav-m3-navigationbar —— NavigationBar 新组件
class BottomNavM3Demo extends StatefulWidget {
  const BottomNavM3Demo({super.key});

  @override
  State<BottomNavM3Demo> createState() => _BottomNavM3DemoState();
}

class _BottomNavM3DemoState extends State<BottomNavM3Demo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Center(child: Text('页面 $_index')),
      bottomNavigationBar: NavigationBar(
        selectedIndex: _index,
        onDestinationSelected: (i) => setState(() => _index = i),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.home_outlined), selectedIcon: Icon(Icons.home), label: '首页'),
          NavigationDestination(icon: Icon(Icons.search_outlined), selectedIcon: Icon(Icons.search), label: '搜索'),
          NavigationDestination(icon: Icon(Icons.person_outline), selectedIcon: Icon(Icons.person), label: '我的'),
        ],
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `currentIndex` / `onTap` | 受控选中 / 点击回调 |
| `items` | `BottomNavigationBarItem(icon:, label:, backgroundColor:)` |
| `type` | `fixed`（恒显文字）/ `shifting`（选中显文字） |
| `fixedColor` / `selectedItemColor` / `unselectedItemColor` | 配色 |
| `selectedFontSize` / `iconSize` | 字号 / 图标大小 |

## 易错点

::: danger body 直接换 widget 会丢状态
切 Tab 时旧页被 dispose（滚动位置、输入内容全没）。常规解法 `IndexedStack`；页面很重时用 `AutomaticKeepAliveClientMixin` 或状态上提。
:::

::: warning 超过 5 项体验崩坏
底部导航别放 5 个以上；更多入口收进"更多"或首页宫格。
:::

::: info 新旧并存
`BottomNavigationBar` 是 M2 组件仍可用；M3 主题下视觉违和就换 `NavigationBar`，API 更简洁。
:::
