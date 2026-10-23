---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Hero 跨页动画

`Hero` 实现页面跳转时，某个元素从**上一页平滑飞行到下一页**的共享元素过渡（列表缩略图点开大图详情最经典）。

## 基本用法：两页同 tag

列表页与详情页各放一个相同 `tag` 的 Hero，跳转即自动飞。

```dart
import 'package:flutter/material.dart';

/// 示例: hero-basic —— 缩略图点开大图页
class HeroListDemo extends StatelessWidget {
  const HeroListDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('相册')),
      body: GridView.count(
        crossAxisCount: 2,
        padding: const EdgeInsets.all(8),
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        children: [
          for (final id in const ['a', 'b', 'c', 'd'])
            InkWell(
              onTap: () => Navigator.push(
                context,
                MaterialPageRoute(builder: (context) => HeroDetailDemo(imageId: id)),
              ),
              child: Hero(
                tag: 'photo-$id', // 唯一标识
                child: Image.network(
                  'https://picsum.photos/seed/$id/300/300',
                  fit: BoxFit.cover,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class HeroDetailDemo extends StatelessWidget {
  const HeroDetailDemo({super.key, required this.imageId});

  final String imageId;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Hero(
          tag: 'photo-$imageId', // 与列表页同一个 tag
          child: Image.network(
            'https://picsum.photos/seed/$imageId/900/900',
            fit: BoxFit.contain,
          ),
        ),
      ),
    );
  }
}
```

>
> 两页的 Hero widget 结构不必完全相同（缩略图 → 大图正依赖差异才有飞行动画）；注意 InkWell 包 Hero 时水波纹会被图片盖住，纯跳转用 GestureDetector 即可。

## 自定义飞行途中效果（flightShuttleBuilder）

默认飞行是直接拉伸源/目标 widget 插值；想让途中先淡出再飞，接管 `flightShuttleBuilder`。

```dart
import 'package:flutter/material.dart';

/// 示例: hero-flight-shuttle —— 飞行途中带缩放淡入
final _bigUrl = 'https://picsum.photos/seed/shuttle/900/900';

class HeroShuttleListDemo extends StatelessWidget {
  const HeroShuttleListDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Hero(
        tag: 'shuttle-demo',
        // 飞行途中显示的内容：用 animation（0→1）做淡入
        flightShuttleBuilder: (context, animation, direction, heroContext, flightContext) =>
            FadeTransition(
          opacity: animation,
          child: Image.network(_bigUrl, width: 160, height: 160, fit: BoxFit.cover),
        ),
        child: GestureDetector(
          onTap: () => Navigator.push(context,
              MaterialPageRoute(builder: (context) => const HeroShuttleDetailDemo())),
          child: Image.network(_bigUrl, width: 80, height: 80, fit: BoxFit.cover),
        ),
      ),
    );
  }
}

class HeroShuttleDetailDemo extends StatelessWidget {
  const HeroShuttleDetailDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Center(
        child: Hero(
          tag: 'shuttle-demo',
          child: Image.network(_bigUrl, fit: BoxFit.contain),
        ),
      ),
    );
  }
}
```

## 列表里 tag 防撞

::: tip 动态列表的 tag 写法
`tag: 'photo-${photos[i].id}'` —— 用业务 id 而不是 index（删除/插行后 index 会串位导致飞行错乱）；同一时刻路由栈内绝不允许重复 tag。
:::

## 属性速查

| 属性 | 说明 |
| --- | --- |
| `tag` | 必填，两页一致、同一时刻全局唯一 |
| `child` | 飞行的内容 |
| `flightShuttleBuilder` | 自定义飞行途中的 widget |
| `rectTween` / `placeholderStrategy` | 路径矩形插值 / 占位时机（`HeroPlaceholderStrategy`） |
| `createRectTween` | 已废弃，用 `rectTween` 替代 |

## 易错点

::: danger tag 冲突直接崩
同一时刻路由栈里出现两个相同 tag 的 Hero（比如列表滚动复用 + 详情页）会抛 `There multiple Hero widgets` 异常；tag 必须带业务唯一 id。
:::

::: warning 只跟 Navigator 走
Hero 动画依赖页面路由切换；用 `Visibility`/`IndexedStack` 同页显隐不会触发。
:::

::: info 详情页返回也飞
动画是双向的：pop 回列表时大图飞回缩略图位置，无需额外代码。
:::
