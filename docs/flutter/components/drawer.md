---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Drawer 抽屉

`Drawer` 是从屏幕侧边滑出的面板，常放账号信息、次要导航。挂到 `Scaffold.drawer`，AppBar 会自动出现 ☰ 按钮。

## 基本抽屉

菜单头 + 列表项，点项先关抽屉再跳转。

```dart
import 'package:flutter/material.dart';

/// 示例: drawer-basic —— 标准侧边菜单
class DrawerBasicDemo extends StatefulWidget {
  const DrawerBasicDemo({super.key});

  @override
  State<DrawerBasicDemo> createState() => _DrawerBasicDemoState();
}

class _DrawerBasicDemoState extends State<DrawerBasicDemo> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('首页')), // 有 drawer 时自动出现 ☰
      drawer: Drawer(
        child: ListView(
          padding: EdgeInsets.zero, // 关键：否则 DrawerHeader 右侧露白边
          children: [
            const DrawerHeader(
              decoration: BoxDecoration(color: Colors.blue),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(radius: 24, child: Icon(Icons.person)),
                  SizedBox(height: 8),
                  Text('张三', style: TextStyle(color: Colors.white, fontSize: 16)),
                ],
              ),
            ),
            ListTile(
              leading: const Icon(Icons.person),
              title: const Text('个人中心'),
              onTap: () {
                Navigator.pop(context); // 先关抽屉
                // 再执行跳转
              },
            ),
            ListTile(
              leading: const Icon(Icons.settings),
              title: const Text('设置'),
              onTap: () => Navigator.pop(context),
            ),
          ],
        ),
      ),
      body: const Center(child: Text('点左上角 ☰ 打开抽屉')),
    );
  }
}
```

## 编程开合

`GlobalKey<ScaffoldState>` 或 `Scaffold.of` 控制开关。

```dart
import 'package:flutter/material.dart';

/// 示例: drawer-programmatic —— 按钮唤开抽屉
class DrawerProgrammaticDemo extends StatefulWidget {
  const DrawerProgrammaticDemo({super.key});

  @override
  State<DrawerProgrammaticDemo> createState() => _DrawerProgrammaticDemoState();
}

class _DrawerProgrammaticDemoState extends State<DrawerProgrammaticDemo> {
  final _scaffoldKey = GlobalKey<ScaffoldState>();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      appBar: AppBar(title: const Text('首页')),
      drawer: const Drawer(
        child: Center(child: Text('抽屉内容')),
      ),
      body: Center(
        child: FilledButton.icon(
          onPressed: () => _scaffoldKey.currentState?.openDrawer(),
          icon: const Icon(Icons.menu_open),
          label: const Text('代码打开抽屉'),
        ),
      ),
    );
  }
}
```

## 右侧抽屉 endDrawer

```dart
import 'package:flutter/material.dart';

/// 示例: drawer-end —— 右侧筛选面板
class EndDrawerDemo extends StatefulWidget {
  const EndDrawerDemo({super.key});

  @override
  State<EndDrawerDemo> createState() => _EndDrawerDemoState();
}

class _EndDrawerDemoState extends State<EndDrawerDemo> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('商品列表')),
      endDrawer: SizedBox(
        width: 260, // endDrawer 默认更宽，常自限宽度
        child: Drawer(
          child: ListView(
            children: const [
              Padding(padding: EdgeInsets.all(16), child: Text('筛选', style: TextStyle(fontWeight: FontWeight.bold))),
              ListTile(title: Text('价格从低到高')),
              ListTile(title: Text('仅看有货')),
            ],
          ),
        ),
      ),
      body: const Center(child: Text('点右上角图标开右抽屉')),
    );
  }
}
```

## 属性/形态速查

| 形态 | 说明 |
| --- | --- |
| `Drawer` | 标准抽屉，宽约 304dp，从左侧滑入 |
| `endDrawer` | 右侧对应物 |
| `DrawerController` | 不挂 Scaffold 时独立使用（自定义边缘手势） |
| `navigationDrawer`（M3） | Flutter 3.27+ 新 M3 抽屉，支持分栏展开（Permanent/Secondary 形态） |
| `semanticsLabel` | 无障碍标签 |

## 易错点

::: warning ListView 要 padding: EdgeInsets.zero
Drawer 内容默认有 8dp 内边距，DrawerHeader 会露出白边；惯例是内容 ListView 设 `padding: EdgeInsets.zero`，自己控制各项边距。
:::

::: danger 点项必须先 pop 再跳转
onTap 里先 `Navigator.pop(context)` 关抽屉再 push 新页，顺序反了会在抽屉上面盖页面、视觉上"抽屉卡住"。
:::

::: info 抽屉里的 context
`Navigator.of(context)` 的 context 必须是 Scaffold 之下的（抽屉内容本身就满足）；在 AppBar 外侧拿 context 调 openDrawer 会找不到 Scaffold。
:::
