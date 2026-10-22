---
pageClass: flutter-doc # 配合 var.css 加宽右栏预览列
preview: '' # 该页 Flutter Web 预览地址（后续传入）
---

# Icon 图标

`Icon` 渲染单色矢量图标，内置 Material Icons 字库，通过 `Icons` 静态常量引用。

## 基础图标

尺寸与颜色。

```dart
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
:::
