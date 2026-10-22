---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# NavigationRail 侧边导航

`NavigationRail` 是竖向的导航栏，常用于平板/桌面/宽屏布局（左侧竖排导航）。它是 `BottomNavigationBar` 的"竖版"对应物。

## 基本用法

```dart
/// 示例: rail-basic —— 左侧双项导航
class RailBasicDemo extends StatefulWidget {
  const RailBasicDemo({super.key});

  @override
  State<RailBasicDemo> createState() => _RailBasicDemoState();
}

class _RailBasicDemoState extends State<RailBasicDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        NavigationRail(
          selectedIndex: _index,
          onDestinationSelected: (i) => setState(() => _index = i),
          labelType: NavigationRailLabelType.all, // 始终显示文字
          destinations: const [
            NavigationRailDestination(
              icon: Icon(Icons.home_outlined),
              selectedIcon: Icon(Icons.home),
              label: Text('首页'),
            ),
            NavigationRailDestination(
              icon: Icon(Icons.settings_outlined),
              selectedIcon: Icon(Icons.settings),
              label: Text('设置'),
            ),
          ],
        ),
        const VerticalDivider(thickness: 1, width: 1),
        Expanded(child: Center(child: Text('内容区 $_index'))),
      ],
    );
  }
}
```

## 选中文字、悬停隐藏（extended）

`NavigationRail.extended` 展开态：选中项旁边滑出文字，桌面端典型。

```dart
/// 示例: rail-extended —— 可展开的桌面风格
class RailExtendedDemo extends StatefulWidget {
  const RailExtendedDemo({super.key});

  @override
  State<RailExtendedDemo> createState() => _RailExtendedDemoState();
}

class _RailExtendedDemoState extends State<RailExtendedDemo> {
  int _index = 0;
  bool _extended = true;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        NavigationRail.extended(
          extended: _extended, // false 时收成窄条
          indicatorColor: Colors.blue.shade100,
          leading: IconButton(icon: const Icon(Icons.menu), onPressed: () => setState(() => _extended = !_extended)),
          selectedIndex: _index,
          onDestinationSelected: (i) => setState(() => _index = i),
          labelType: NavigationRailLabelType.selected,
          destinations: const [
            NavigationRailDestination(icon: Icon(Icons.dashboard), label: Text('仪表盘')),
            NavigationRailDestination(icon: Icon(Icons.mail), label: Text('邮件')),
            NavigationRailDestination(icon: Icon(Icons.calendar_month), label: Text('日历')),
          ],
        ),
        const VerticalDivider(thickness: 1, width: 1),
        Expanded(child: Center(child: Text('页面 $_index（点 ☰ 收展）'))),
      ],
    );
  }
}
```

## 顶部/底部附加区

`leading` 放 logo/菜单键，`trailing` 放设置按钮等次要项。

```dart
/// 示例: rail-leading-trailing —— 上下扩展槽位
class RailSlotsDemo extends StatelessWidget {
  const RailSlotsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Row(
      children: [
        NavigationRail(
          leading: Padding(
            padding: EdgeInsets.symmetric(vertical: 8),
            child: FlutterLogo(size: 32),
          ),
          trailing: Expanded(child: Align(
            alignment: Alignment.bottomCenter,
            child: Padding(padding: EdgeInsets.only(bottom: 8), child: Icon(Icons.help_outline)),
          )),
          labelType: NavigationRailLabelType.all,
          destinations: [
            NavigationRailDestination(icon: Icon(Icons.star), label: Text('精选')),
            NavigationRailDestination(icon: Icon(Icons.video_library), label: Text('课程')),
          ],
        ),
        VerticalDivider(thickness: 1, width: 1),
        Expanded(child: Center(child: Text('主内容'))),
      ],
    );
  }
}
```

## 响应式：宽屏侧栏、窄屏底栏

同一套 index 状态，按宽度切换两种导航。

```dart
/// 示例: rail-responsive —— 窗口宽窄自适应
class RailResponsiveDemo extends StatefulWidget {
  const RailResponsiveDemo({super.key});

  @override
  State<RailResponsiveDemo> createState() => _RailResponsiveDemoState();
}

class _RailResponsiveDemoState extends State<RailResponsiveDemo> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, c) {
        final wide = c.maxWidth >= 600;
        return Scaffold(
          body: Row(
            children: [
              if (wide)
                NavigationRail(
                  selectedIndex: _index,
                  onDestinationSelected: (i) => setState(() => _index = i),
                  labelType: NavigationRailLabelType.all,
                  destinations: const [
                    NavigationRailDestination(icon: Icon(Icons.home), label: Text('首页')),
                    NavigationRailDestination(icon: Icon(Icons.person), label: Text('我的')),
                  ],
                ),
              Expanded(child: Center(child: Text('页面 $_index（当前 ${wide ? '宽屏侧栏' : '窄屏底栏'}）'))),
            ],
          ),
          bottomNavigationBar: wide
              ? null
              : BottomNavigationBar(
                  currentIndex: _index,
                  onTap: (i) => setState(() => _index = i),
                  items: const [
                    BottomNavigationBarItem(icon: Icon(Icons.home), label: '首页'),
                    BottomNavigationBarItem(icon: Icon(Icons.person), label: '我的'),
                  ],
                ),
        );
      },
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `selectedIndex` / `onDestinationSelected` | 受控选中 |
| `destinations` | `NavigationRailDestination(icon:, selectedIcon:, label:)` |
| `labelType` | `all` / `selected` / `tooltip`（悬停提示）/ `none` |
| `extended` | 构造 `NavigationRail.extended` 可展开态 |
| `leading` / `trailing` / `groupAlignment` | 上下附加区 / 主组垂直位置 |
| `indicatorColor` / `indicatorShape` | 选中高亮块 |
| `minWidth` / `minExtendedWidth` | 收起 / 展开宽度 |

## 易错点

::: warning 必须配合 Divider 和内容 Expanded
Rail 放 `Row` 里时内容区要 `Expanded`，否则无界宽度断言；分隔线用 `VerticalDivider(width: 1)`。
:::

::: info M3 的对应趋势
Material 3 宽屏导航更推荐 `NavigationRail` 配合 `NavigationDestination` 语义统一，或直接用 adaptive 方案（如社区 `adaptive_navigation`）一套声明多端渲染。
:::
