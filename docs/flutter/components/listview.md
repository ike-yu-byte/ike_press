---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/listview' # 该页 Flutter Web 预览地址
---

# ListView 列表

> 🟢 无状态组件 · `StatelessWidget`

`ListView` 是可滚动列表，Flutter 里最核心的长内容组件。它**懒加载**——只渲染视口内及附近的项，因此能承载成千上万条数据。

## 固定项列表

少量写死的条目直接用 `children`。

```dart
import 'package:flutter/material.dart';

/// 示例: listview-children —— 固定三项
class ListViewChildrenDemo extends StatelessWidget {
  const ListViewChildrenDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 240,
        child: ListView(
          padding: const EdgeInsets.all(8),
          children: const [
            ListTile(leading: Icon(Icons.home), title: Text('首页')),
            ListTile(leading: Icon(Icons.search), title: Text('搜索')),
            ListTile(leading: Icon(Icons.settings), title: Text('设置')),
          ],
        ),
      ),
    );
  }
}
```

## builder 懒加载

数据多时必须用 `ListView.builder`，按需构建可见项。

```dart
import 'package:flutter/material.dart';

/// 示例: listview-builder —— 100 条数据懒加载
class ListViewBuilderDemo extends StatelessWidget {
  const ListViewBuilderDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 260,
        child: ListView.builder(
          itemCount: 100,
          itemBuilder: (context, index) =>
              ListTile(title: Text('第 $index 项')),
        ),
      ),
    );
  }
}
```

## separated 带分隔符

`separatorBuilder` 在每两项之间插入分隔线，比手动塞 Divider 干净。

```dart
import 'package:flutter/material.dart';

/// 示例: listview-separated —— 项间自动插 Divider
class ListViewSeparatedDemo extends StatelessWidget {
  const ListViewSeparatedDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const items = ['苹果', '香蕉', '橙子', '葡萄', '西瓜'];
    return Center(
      child: SizedBox(
        width: 300,
        height: 260,
        child: ListView.separated(
          itemCount: items.length,
          itemBuilder: (context, i) => ListTile(title: Text(items[i])),
          separatorBuilder: (context, i) => const Divider(height: 1),
        ),
      ),
    );
  }
}
```

## 横向滚动

`scrollDirection: Axis.horizontal` 让列表横着滚，常做标签栏、卡片流。

```dart
import 'package:flutter/material.dart';

/// 示例: listview-horizontal —— 横向卡片流
class ListViewHorizontalDemo extends StatelessWidget {
  const ListViewHorizontalDemo({super.key});

  @override
  Widget build(BuildContext context) {
    const colors = [Colors.red, Colors.orange, Colors.green, Colors.blue, Colors.purple];
    return Center(
      child: SizedBox(
        height: 100,
        child: ListView(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          children: [
            for (final c in colors)
              Container(
                width: 80,
                margin: const EdgeInsets.only(right: 8),
                decoration: BoxDecoration(color: c, borderRadius: BorderRadius.circular(8)),
              ),
          ],
        ),
      ),
    );
  }
}
```

## 分组列表（自定义滚动装配）

多段不同结构拼一个滚动流时，用 `CustomScrollView` + `SliverList`。

```dart
import 'package:flutter/material.dart';

/// 示例: listview-slivers —— 头部 + 列表拼成一个滚动流
class ListViewSliversDemo extends StatelessWidget {
  const ListViewSliversDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 280,
        child: CustomScrollView(
          slivers: [
            const SliverToBoxAdapter(
              child: Padding(
                padding: EdgeInsets.all(16),
                child: Text('本周热门', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
              ),
            ),
            SliverList(
              delegate: SliverChildBuilderDelegate(
                (context, index) => ListTile(title: Text('热门项 $index')),
                childCount: 20,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
```

## 四种构造方式速查

| 构造 | 适用 |
| --- | --- |
| `ListView(children: [...])` | 少量固定项 |
| `ListView.builder` | 大数据量，懒加载 |
| `ListView.separated` | 大数据量 + 项间分隔符 |
| `CustomScrollView` + Sliver | 混合多种滚动结构（头部、网格、列表拼接） |

## 易错点

::: danger 数据量大别用 children
`ListView(children:)` 会一次性构建全部子组件，几百条以上必须换 `ListView.builder`，否则首帧卡死。
:::

::: danger 无限主轴约束
`ListView` 主轴方向必须有界：纵向 ListView 套在 Column 里不写 `Expanded` 会报 `unbounded height`。
:::
