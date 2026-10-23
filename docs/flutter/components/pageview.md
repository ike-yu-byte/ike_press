---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# PageView 翻页

`PageView` 一次显示一页，左右（或上下）滑动切换。适合引导页、图片轮播、Tab 式全屏翻页。

## 基本翻页

三页纯色，滑动切换。

```dart
import 'package:flutter/material.dart';

/// 示例: pageview-basic —— 三页横滑
class PageViewBasicDemo extends StatelessWidget {
  const PageViewBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 300,
        height: 200,
        child: PageView(
          children: const [
            ColoredBox(color: Colors.red, child: Center(child: Text('第 1 页', style: TextStyle(color: Colors.white, fontSize: 24)))),
            ColoredBox(color: Colors.green, child: Center(child: Text('第 2 页', style: TextStyle(color: Colors.white, fontSize: 24)))),
            ColoredBox(color: Colors.blue, child: Center(child: Text('第 3 页', style: TextStyle(color: Colors.white, fontSize: 24)))),
          ],
        ),
      ),
    );
  }
}
```

## 带指示器的轮播（联动页码）

用 `PageController` + `onPageChanged` 驱动底部圆点。

```dart
import 'package:flutter/material.dart';

/// 示例: pageview-indicator —— 轮播 + 圆点指示器
class PageViewIndicatorDemo extends StatefulWidget {
  const PageViewIndicatorDemo({super.key});

  @override
  State<PageViewIndicatorDemo> createState() => _PageViewIndicatorDemoState();
}

class _PageViewIndicatorDemoState extends State<PageViewIndicatorDemo> {
  final _controller = PageController(
    initialPage: 0,
    viewportFraction: 0.9, // 每页只占 90% 视口，露出下一页边缘
  );
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose(); // controller 必须释放
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    const colors = [Colors.orange, Colors.teal, Colors.purple];
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 300,
            height: 160,
            child: PageView.builder(
              controller: _controller,
              itemCount: colors.length,
              onPageChanged: (i) => setState(() => _page = i),
              itemBuilder: (context, i) => Container(
                margin: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: colors[i], borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              for (var i = 0; i < colors.length; i++)
                AnimatedContainer(
                  duration: const Duration(milliseconds: 200),
                  margin: const EdgeInsets.symmetric(horizontal: 4),
                  width: i == _page ? 20 : 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: i == _page ? Colors.blue : Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(4),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }
}
```

## 代码跳页（下一页按钮）

`animateToPage` 平滑过渡、`jumpToPage` 直接切换。

```dart
import 'package:flutter/material.dart';

/// 示例: pageview-jump —— 按钮控制翻页
class PageViewJumpDemo extends StatefulWidget {
  const PageViewJumpDemo({super.key});

  @override
  State<PageViewJumpDemo> createState() => _PageViewJumpDemoState();
}

class _PageViewJumpDemoState extends State<PageViewJumpDemo> {
  final _controller = PageController();
  int _page = 0;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          SizedBox(
            width: 300,
            height: 160,
            child: PageView(
              controller: _controller,
              physics: const NeverScrollableScrollPhysics(), // 禁手滑，只允许按钮控制
              onPageChanged: (i) => setState(() => _page = i),
              children: const [
                ColoredBox(color: Colors.red, child: Center(child: Text('A'))),
                ColoredBox(color: Colors.green, child: Center(child: Text('B'))),
                ColoredBox(color: Colors.blue, child: Center(child: Text('C'))),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Text('当前第 $_page 页'),
          FilledButton.tonalIcon(
            onPressed: () {
              _controller.animateToPage(
                (_page + 1) % 3,
                duration: const Duration(milliseconds: 300),
                curve: Curves.easeInOut,
              );
            },
            icon: const Icon(Icons.skip_next),
            label: const Text('下一页'),
          ),
        ],
      ),
    );
  }
}
```

## 竖向翻页

`scrollDirection: Axis.vertical`，全屏引导页常见。

```dart
import 'package:flutter/material.dart';

/// 示例: pageview-vertical —— 上下滑翻页
class PageViewVerticalDemo extends StatelessWidget {
  const PageViewVerticalDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SizedBox(
        width: 220,
        height: 260,
        child: PageView(
          scrollDirection: Axis.vertical,
          children: const [
            ColoredBox(color: Colors.indigo, child: Center(child: Text('向上滑', style: TextStyle(color: Colors.white)))),
            ColoredBox(color: Colors.teal, child: Center(child: Text('第二屏', style: TextStyle(color: Colors.white)))),
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
| `controller` | `PageController(initialPage:)` 初始页；代码跳页入口 |
| `onPageChanged` | 切页回调 |
| `scrollDirection` | 翻页方向，默认水平 |
| `physics` | `NeverScrollableScrollPhysics` 可禁手滑（纯按钮控制） |

## 易错点

::: danger controller 必须 dispose
`PageController` 持有 ScrollPosition，StatefulWidget 销毁时不释放会泄漏。
:::

::: warning 无限循环靠取模
要"无限轮播"没有原生参数，通用做法是 `itemCount` 给大数 + `index % 真实长度`，或用 `CyclePageView` 类第三方封装。
:::
