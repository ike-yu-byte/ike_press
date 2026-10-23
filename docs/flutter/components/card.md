---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Card 卡片

> 🟢 无状态组件 · `StatelessWidget`

`Card` 是一个带圆角、阴影、内边距的 Material 表面容器，用来把相关内容"成组"浮在页面上。它只是外壳，内容随便放。

## 基本信息卡

Card + 内部 Column 组合一张内容卡。

```dart
import 'package:flutter/material.dart';

/// 示例: card-basic —— 标题 + 正文的内容卡
class CardBasicDemo extends StatelessWidget {
  const CardBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Card(
          margin: const EdgeInsets.all(12),
          child: const Padding(
            padding: EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('卡片标题', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                SizedBox(height: 8),
                Text('卡片正文内容，Card 只负责表面样式，内部自由摆放任意 widget。'),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
```

## 可点击卡片

Card 本身不处理点击，内嵌 `InkWell`（注意 `clipBehavior` 让水波纹不溢出圆角）。

```dart
import 'package:flutter/material.dart';

/// 示例: card-clickable —— 整卡可点带水波纹
class CardClickableDemo extends StatelessWidget {
  const CardClickableDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Card(
          clipBehavior: Clip.antiAlias, // 水波纹按圆角裁剪
          child: InkWell(
            onTap: () {},
            child: const Padding(
              padding: EdgeInsets.all(16),
              child: Row(
                children: [
                  Icon(Icons.photo_album, color: Colors.blue),
                  SizedBox(width: 12),
                  Expanded(child: Text('点整张卡片都有水波纹')),
                  Icon(Icons.chevron_right),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
```

## 图文媒体卡

上图下文的典型 feed 卡片。

```dart
import 'package:flutter/material.dart';

/// 示例: card-media —— 图片 + 文字 + 操作区
class CardMediaDemo extends StatelessWidget {
  const CardMediaDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 280,
        child: Card(
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              Image.network(
                'https://picsum.photos/seed/card/280/150',
                height: 150,
                width: double.infinity,
                fit: BoxFit.cover,
              ),
              const Padding(
                padding: EdgeInsets.all(12),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('云南大理', style: TextStyle(fontWeight: FontWeight.bold)),
                    SizedBox(height: 4),
                    Text('风花雪月，苍山洱海。', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
              const Padding(
                padding: EdgeInsets.only(right: 8, bottom: 4),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    IconButton(icon: Icon(Icons.favorite_border), onPressed: null),
                    IconButton(icon: Icon(Icons.share), onPressed: null),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
```

## 形状与高度定制

`shape` 换边框/圆角，`elevation` 控制阴影层级（0 为无阴影扁平）。

```dart
import 'package:flutter/material.dart';

/// 示例: card-shape —— 不同圆角与阴影对比
class CardShapeDemo extends StatelessWidget {
  const CardShapeDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Card(
              elevation: 0, // 扁平无阴影
              color: Colors.amber.shade50,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
                side: const BorderSide(color: Colors.amber), // 描边卡
              ),
              child: const Padding(padding: EdgeInsets.all(16), child: Text('描边 + 无阴影')),
            ),
            Card(
              elevation: 8, // 深阴影浮起
              shape: const StadiumBorder(), // 胶囊形
              child: const Padding(padding: EdgeInsets.all(16), child: Text('胶囊形 + 深阴影')),
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
| `child` | 卡片内容（Card 不自动加内边距，需要自己 Padding） |
| `margin` | 卡片外侧间距 |
| `color` / `surfaceTintColor` | 背景色 / M3 着色 |
| `elevation` | 阴影层级，决定投影深浅 |
| `shape` | `RoundedRectangleBorder` / `StadiumBorder` 等 |
| `clipBehavior` | 子内容按卡片形状裁剪（水波纹、图片贴圆角必开） |

## 易错点

::: warning Card 没有 padding
Card 不会给内容留白，直接塞 Text 会贴边。惯例是内部包一层 `Padding`。
:::

::: danger 点击水波纹需要 InkWell
Card 不是可交互组件，`onTap` 之类要自己用 `InkWell` / `GestureDetector` 实现；用水波纹务必配 `clipBehavior: Clip.antiAlias`，否则波纹溢出圆角。
:::

::: warning 列表里慎用深阴影
大量卡片同时开高 `elevation` 在低端机上有性能开销，M3 更推荐浅阴影 + 背景色区分层级。
:::
