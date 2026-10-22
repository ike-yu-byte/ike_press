---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# ListTile 列表项

`ListTile` 是 Material 标准的"一行列表项"布局，预置了左图标、标题、副标题、右组件五个槽位，点击/水波纹都自带。设置里的选项、消息列表基本都用它。

## 五槽位基本形态

leading / title / subtitle / trailing 一次配齐。

```dart
/// 示例: listtile-basic —— 头像 + 标题 + 副标题 + 右箭头
class ListTileBasicDemo extends StatelessWidget {
  const ListTileBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: ListTile(
          leading: const CircleAvatar(child: Icon(Icons.person)),
          title: const Text('张三'),
          subtitle: const Text('在线 · 刚刚活跃'),
          trailing: const Icon(Icons.chevron_right),
          onTap: () {},
        ),
      ),
    );
  }
}
```

## 选中态

`selected` 高亮标题颜色，配合 `selectedTileColor` 给整行铺底色。

```dart
/// 示例: listtile-selected —— 点击切换选中高亮
class ListTileSelectedDemo extends StatefulWidget {
  const ListTileSelectedDemo({super.key});

  @override
  State<ListTileSelectedDemo> createState() => _ListTileSelectedDemoState();
}

class _ListTileSelectedDemoState extends State<ListTileSelectedDemo> {
  int _current = 0;
  final options = ['微信支付', '支付宝', '银行卡'];

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            for (var i = 0; i < options.length; i++)
              ListTile(
                title: Text(options[i]),
                selected: _current == i,
                selectedTileColor: Colors.blue.shade50,
                selectedColor: Colors.blue,
                trailing: _current == i ? const Icon(Icons.check, color: Colors.blue) : null,
                onTap: () => setState(() => _current = i),
              ),
          ],
        ),
      ),
    );
  }
}
```

## 三行标题（isThreeLine）

副标题可能占两行时声明 `isThreeLine: true`，让垂直留白正确分配。

```dart
/// 示例: listtile-threeline —— 长副标题换行
class ListTileThreeLineDemo extends StatelessWidget {
  const ListTileThreeLineDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: const ListTile(
          leading: Icon(Icons.article),
          title: Text('一篇长文章'),
          subtitle: Text('副标题内容比较长的时候会换行显示，isThreeLine 会给足三行的垂直空间'),
          isThreeLine: true,
        ),
      ),
    );
  }
}
```

## dense 紧凑模式

设置页等密排场景用 `dense: true` 压缩行高。

```dart
/// 示例: listtile-dense —— 紧凑行高对比
class ListTileDenseDemo extends StatelessWidget {
  const ListTileDenseDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const ListTile(title: Text('默认行高')),
            const ListTile(title: Text('默认行高')),
            const ListTile(dense: true, title: Text('dense 紧凑')),
            const ListTile(dense: true, title: Text('dense 紧凑')),
          ],
        ),
      ),
    );
  }
}
```

## 与 Checkbox / Radio / Switch 组合的现成版本

需要“整行可点 + 控件”时，用 `CheckboxListTile` / `RadioListTile` / `SwitchListTile`，比手动 Row 拼装更规范。

```dart
/// 示例: listtile-controls —— 三种 ListTile 变体
class ListTileControlsDemo extends StatefulWidget {
  const ListTileControlsDemo({super.key});

  @override
  State<ListTileControlsDemo> createState() => _ListTileControlsDemoState();
}

class _ListTileControlsDemoState extends State<ListTileControlsDemo> {
  bool _notify = true;
  String _pay = 'wechat';
  bool _dark = false;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CheckboxListTile(
              title: const Text('接收通知'),
              value: _notify,
              onChanged: (v) => setState(() => _notify = v ?? false),
            ),
            RadioListTile<String>(
              title: const Text('微信支付'),
              value: 'wechat',
              groupValue: _pay,
              onChanged: (v) => setState(() => _pay = v!),
            ),
            SwitchListTile(
              title: const Text('深色模式'),
              value: _dark,
              onChanged: (v) => setState(() => _dark = v),
            ),
          ],
        ),
      ),
    );
  }
}
```

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `leading` / `trailing` | 左 / 右槽位 widget |
| `title` / `subtitle` | 主 / 副标题（通常 Text） |
| `onTap` / `onLongPress` | 点击 / 长按，传 null 即禁用 |
| `selected` / `selectedColor` / `selectedTileColor` | 选中态 |
| `enabled` | false 整行置灰 |
| `isThreeLine` / `dense` / `visualDensity` | 行高与密度 |
| `contentPadding` / `minLeadingWidth` | 内边距 / leading 最小宽 |

## 易错点

::: warning 水波纹被 Container 吃掉
给 ListTile 外套 `Container(decoration:)` 时波纹不可见（同 InkWell 问题），改用 `tileColor` / `selectedTileColor` 设背景。
:::

::: warning trailing 挤压标题
title 过长会把 trailing 挤变形，给 title 的 Text 加 `overflow: TextOverflow.ellipsis`，或用 `Row + Expanded` 自控。
:::
