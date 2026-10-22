---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Badge 徽标

`Badge` 是叠在图标右上角的小红点或数字（消息数、未读点）。Material 3 提供，替代过去手写 Stack 的做法。

## 数字徽标

```dart
/// 示例: badge-count —— 通知图标带数字
class BadgeCountDemo extends StatelessWidget {
  const BadgeCountDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Badge(
        count: 5, // 0 或 null 时不显示
        child: Icon(Icons.notifications, size: 32),
      ),
    );
  }
}
```

## 小红点（不显示数字）

```dart
/// 示例: badge-dot —— 仅未读点
class BadgeDotDemo extends StatelessWidget {
  const BadgeDotDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Badge(
        isLabelVisible: false, // 只显示点
        child: Icon(Icons.mail, size: 32),
      ),
    );
  }
}
```

## 自定义外观 + 大数截断

```dart
/// 示例: badge-styled —— 颜色/位置/99+ 截断
class BadgeStyledDemo extends StatelessWidget {
  const BadgeStyledDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Badge(
            count: 99,
            backgroundColor: Colors.red,
            textColor: Colors.white,
            largeSize: 16, // 有数字时高度
            padding: EdgeInsets.symmetric(horizontal: 4),
            offset: Offset(8, -8), // 相对默认位置微调
            child: Icon(Icons.shopping_cart, size: 32),
          ),
          SizedBox(width: 40),
          Badge(
            count: 99,
            alignment: Alignment.topLeft, // 改挂左上角
            child: Icon(Icons.chat_bubble, size: 32),
          ),
        ],
      ),
    );
  }
}
```

> 超过 99 显示 "99+"：`count` 只接受 int，需要截断时自己算 `label: Text(count > 99 ? '99+' : '$count')` 并传 `count: null` 用 label 覆盖。

## 配合 IconButton / ListTile

```dart
/// 示例: badge-on-appbar-action —— 顶栏消息入口
class BadgeActionDemo extends StatelessWidget {
  const BadgeActionDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('首页'),
        actions: [
          IconButton(
            icon: const Badge(count: 3, child: Icon(Icons.notifications)),
            onPressed: () {},
          ),
        ],
      ),
      body: ListView(
        children: const [
          ListTile(
            leading: Badge(count: 12, child: Icon(Icons.email)),
            title: Text('未读邮件'),
            subtitle: Text('12 封新消息'),
          ),
        ],
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `count` | 显示数字；null/0 不显示 |
| `isLabelVisible` | 只显小红点时设 false 配合无 label |
| `label` | 自定义内容 widget（可 '99+'、图标） |
| `backgroundColor` / `textColor` / `textStyle` | 配色 |
| `smallSize` / `largeSize` | 无数字点直径 / 有数字时高度 |
| `padding` / `offset` / `alignment` | 数字内边距 / 偏移 / 挂载角 |

## 易错点

::: warning label 与 count 二选一习惯
给了 `label` 就别再给 `count`，两者都传时 label 优先，容易造成"数字不更新"的错觉。
:::

::: danger Badge 只包 Icon 不包整按钮
把 Badge 包在 IconButton 外层会遮挡点击热区扩展；惯例是 Badge 包 icon：`IconButton(icon: Badge(...))`。
:::

::: info 列表未读态更轻的做法
只需一个点时可用 `ListTile` trailing 自定义 `Container(4×4 圆)`；Badge 优势在自动对齐和语义播报（semanticsLabel）。
:::
