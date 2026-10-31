---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: 'https://ike-yu-byte.github.io/flutter_press/#/components/icon' # 该页 Flutter Web 预览地址
---

# Icon 图标

> 🟢 无状态组件 · `StatelessWidget`

`Icon` 渲染单色矢量图标，内置 <a href="https://fonts.google.com/icons" target="_blank" rel="noopener noreferrer">Material Icons 字库</a>，通过 `Icons` 静态常量引用。

## 基础图标

尺寸与颜色。

```dart
import 'package:flutter/material.dart';

/// 示例: icon-basic —— 不同尺寸颜色
class IconBasicDemo extends StatelessWidget {
  const IconBasicDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.favorite, size: 24),
          SizedBox(width: 16),
          Icon(Icons.favorite, size: 36, color: Colors.red),
          SizedBox(width: 16),
          Icon(Icons.favorite_border, size: 36, color: Colors.pink),
        ],
      ),
    );
  }
}
```

## 图标变体

同一图标有 `_border`/`_outlined`/`_rounded`/`_sharp` 等变体。

```dart
import 'package:flutter/material.dart';

/// 示例: icon-variants —— 实心/描边/圆角
class IconVariantsDemo extends StatelessWidget {
  const IconVariantsDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.home, size: 32),
          SizedBox(width: 20),
          Icon(Icons.home_outlined, size: 32),
          SizedBox(width: 20),
          Icon(Icons.home_rounded, size: 32),
        ],
      ),
    );
  }
}
```

## 图标按钮

`IconButton` 给图标加点击与水波纹。

```dart
import 'package:flutter/material.dart';

/// 示例: icon-button —— IconButton
class IconButtonDemo extends StatelessWidget {
  const IconButtonDemo({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(onPressed: () {}, icon: const Icon(Icons.share)),
          IconButton(onPressed: () {}, icon: const Icon(Icons.delete_outline)),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.notifications),
            tooltip: '通知',
          ),
        ],
      ),
    );
  }
}
```

## API

| 属性 | 说明 |
| --- | --- |
| `icon` | `IconData`（首位置参） |
| `size` | 逻辑像素，默认 24 |
| `color` | 缺省时继承 `IconTheme` |
| `semanticLabel` | 无障碍朗读文本 |

::: tip 查找图标
去 [fonts.google.com/icons](https://fonts.google.com/icons) 搜索，点一下即复制 `Icons.xxx` 名称。

注意：该页默认展示的是新版 **Material Symbols**，而 Flutter 内置的是旧版 **Material Icons**。旧版带 `_border` 后缀的描边图标，在新版里是同名图标的 **Outlined** 样式——例如 `Icons.favorite_border` 直接搜不到，搜 `favorite` 再把左侧 Style 选为 Outlined 即可；也可把 Style 下拉切到 "Material Icons (old)" 浏览 Flutter 同款图标集。
:::
