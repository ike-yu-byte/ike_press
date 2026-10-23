---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# GridView 网格

> 🟢 无状态组件 · `StatelessWidget`

`GridView` 以固定的行列网格展示内容，典型场景是图片墙、功能入口九宫格。同样支持懒加载。

## 固定列数 count

`crossAxisCount` 指定每行几列，最常用。

```dart
import 'package:flutter/material.dart';

/// 示例: gridview-count —— 3 列等宽网格
class GridViewCountDemo extends StatelessWidget {
  const GridViewCountDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 260,
        child: GridView.count(
          crossAxisCount: 3,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          padding: const EdgeInsets.all(8),
          children: [
            for (var i = 1; i <= 9; i++)
              Container(
                alignment: Alignment.center,
                color: Colors.blue.shade100,
                child: Text('$i'),
              ),
          ],
        ),
      ),
    );
  }
}
```

## 固定最大宽度 extent

`maxCrossAxisExtent` 每格最宽多少、能塞几列塞几列，响应式友好。

```dart
import 'package:flutter/material.dart';

/// 示例: gridview-extent —— 每格最宽 100，自动决定列数
class GridViewExtentDemo extends StatelessWidget {
  const GridViewExtentDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 320,
        height: 220,
        child: GridView.extent(
          maxCrossAxisExtent: 100,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          padding: const EdgeInsets.all(8),
          children: [
            for (var i = 0; i < 12; i++)
              Container(
                alignment: Alignment.center,
                color: Colors.green.shade100,
                child: Text('$i'),
              ),
          ],
        ),
      ),
    );
  }
}
```

## builder 懒加载

数据多时用 `GridView.builder` + `SliverGridDelegate`。

```dart
import 'package:flutter/material.dart';

/// 示例: gridview-builder —— 100 项懒加载网格
class GridViewBuilderDemo extends StatelessWidget {
  const GridViewBuilderDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 260,
        child: GridView.builder(
          padding: const EdgeInsets.all(8),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 4,
            mainAxisSpacing: 6,
            crossAxisSpacing: 6,
          ),
          itemCount: 100,
          itemBuilder: (context, index) => Container(
            alignment: Alignment.center,
            color: Colors.primaries[index % Colors.primaries.length].shade100,
            child: Text('$index'),
          ),
        ),
      ),
    );
  }
}
```

## 图片墙（宽高比 + 裁剪）

`childAspectRatio` 控制单元格宽高比，配合 `Image.network` 做瀑布式图片墙。

```dart
import 'package:flutter/material.dart';

/// 示例: gridview-image —— 2 列图片墙
class GridViewImageDemo extends StatelessWidget {
  const GridViewImageDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 300,
        child: GridView.builder(
          padding: const EdgeInsets.all(4),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            mainAxisSpacing: 4,
            crossAxisSpacing: 4,
            childAspectRatio: 1, // 正方形格子
          ),
          itemCount: 8,
          itemBuilder: (context, index) => Image.network(
            'https://picsum.photos/seed/$index/200/200',
            fit: BoxFit.cover,
          ),
        ),
      ),
    );
  }
}
```

## 构造方式速查

| 构造 | 适用 |
| --- | --- |
| `GridView.count` | 固定每行列数 |
| `GridView.extent` | 固定每格最大宽度（响应式） |
| `GridView.builder` | 大数据量懒加载，配 `SliverGridDelegate` |

## 易错点

::: danger 主轴必须有界
和 ListView 一样，GridView 放在 Column 里要用 `Expanded` 撑出确定高度，否则 `unbounded height` 报错。
:::

::: warning childAspectRatio 决定变形
格子非正方形（如带文字的两行卡片）时，`childAspectRatio` 要按比例调，否则内容被拉伸或压缩。
:::
